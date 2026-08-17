import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { tokenize } from "../src/parser/tokenizer.js"
import { parseMarkdown } from "../src/parser/index.js"
import { layoutSlide, detectOverflow } from "../src/renderer/layout/index.js"
import type { TextBox } from "../src/renderer/layout/types.js"
import { textBoxToHtml } from "../src/renderer/html/element-renderers.js"
import { slidesToInventory } from "../src/tools/inventory.js"
import { DEFAULT_THEME, mergeTheme } from "../src/schema/theme.js"
import { SLIDE_WIDTH, SLIDE_HEIGHT, MARGIN_X, MARGIN_Y, CONTENT_START_Y, CELL_GAP } from "../src/constants.js"
import type { DashboardLayout, DashboardCell } from "../src/plugins/dashboard/schema.js"
import "../src/plugins/index.js" // side-effect: self-registration

const parse = (markdown: string) => Effect.runSync(parseMarkdown(markdown))

const dashboardLayout = (markdown: string): DashboardLayout => {
  const slide = parse(markdown).slides[0]
  if (slide._tag !== "ContentSlide") throw new Error("expected ContentSlide")
  return slide.layout as DashboardLayout
}

const KPI_DECK = [
  "## 経営ダッシュボード",
  "<!--dashboard:1,3,1-->",
  "### 今四半期ハイライト",
  "売上・新規顧客ともに前年同期を上回った。",
  "### 売上高",
  "<!--kpi-->",
  "¥1.2億",
  "+12% 前年同期比",
  "- 80",
  "- 95",
  "- 100",
  "- 120",
  "### 新規顧客",
  "<!--kpi-->",
  "3,450件",
  "▲8% 前四半期比",
  "### 解約率",
  "<!--kpi-->",
  "1.8%",
  "-0.3pt 前四半期比",
  "### 補足",
  "数値は月次締めの速報値。",
].join("\n")

const CHART_DECK = [
  "## 売上ダッシュボード",
  "<!--dashboard:1,2-->",
  "### 月次売上推移",
  "<!--chart:line-->",
  "| 月 | 売上 |",
  "| --- | --- |",
  "| 4月 | 100 |",
  "| 5月 | 112 |",
  "### チャネル別構成",
  "<!--chart:donut-->",
  "| チャネル | 構成比 |",
  "| --- | --- |",
  "| 直販 | 45 |",
  "| 代理店 | 35 |",
  "| オンライン | 20 |",
  "### 地域別売上",
  "<!--chart:bar-->",
  "| 地域 | 売上 |",
  "| --- | --- |",
  "| 東日本 | 1,200 |",
  "| 西日本 | 95 |",
].join("\n")

describe("dashboard tokenizer", () => {
  it("recognizes <!--dashboard:1,3,1--> as a PluginDirective carrying the row spec", () => {
    const [token] = tokenize("<!--dashboard:1,3,1-->")
    expect(token).toEqual({ type: "PluginDirective", pluginId: "dashboard:1,3,1", line: 1 })
  })

  it("recognizes <!--kpi--> as a KpiMarker", () => {
    const [token] = tokenize("<!--kpi-->")
    expect(token).toEqual({ type: "KpiMarker", line: 1 })
  })

  it("recognizes <!--chart:line--> as a ChartDirective", () => {
    const [token] = tokenize("<!--chart:line-->")
    expect(token).toEqual({ type: "ChartDirective", chartType: "line", line: 1 })
  })

  it("does not recognize an undeclared chart type", () => {
    const [token] = tokenize("<!--chart:pie-->")
    expect(token.type).toBe("BodyText")
  })
})

describe("dashboard converter", () => {
  it("builds a Dashboard layout with the declared rows and cells in written order", () => {
    const layout = dashboardLayout(KPI_DECK)
    expect(layout._tag).toBe("Dashboard")
    expect(layout.rows).toEqual([1, 3, 1])
    expect(layout.cells.map((c: DashboardCell) => c.kind)).toEqual([
      "text",
      "kpi",
      "kpi",
      "kpi",
      "text",
    ])
  })

  it("splits a KPI value into prefix, number and suffix", () => {
    const layout = dashboardLayout(KPI_DECK)
    const kpi = layout.cells[1]
    if (kpi.kind !== "kpi") throw new Error("expected kpi cell")
    expect(kpi.label).toBe("売上高")
    expect(kpi.value).toEqual({ prefix: "¥", number: "1.2", suffix: "億" })
  })

  it("keeps digit grouping in the number and reads a bare suffix", () => {
    const layout = dashboardLayout(KPI_DECK)
    const kpi = layout.cells[2]
    if (kpi.kind !== "kpi") throw new Error("expected kpi cell")
    expect(kpi.value).toEqual({ prefix: "", number: "3,450", suffix: "件" })
  })

  it("reads the delta direction from the leading sign", () => {
    const layout = dashboardLayout(KPI_DECK)
    const [, up, up2, down] = layout.cells
    if (up.kind !== "kpi" || up2.kind !== "kpi" || down.kind !== "kpi") {
      throw new Error("expected kpi cells")
    }
    expect(up.delta).toEqual({ text: "+12% 前年同期比", direction: "up" })
    expect(up2.delta).toEqual({ text: "▲8% 前四半期比", direction: "up" })
    expect(down.delta).toEqual({ text: "-0.3pt 前四半期比", direction: "down" })
  })

  it("collects bullet lines in a KPI body as sparkline data", () => {
    const layout = dashboardLayout(KPI_DECK)
    const kpi = layout.cells[1]
    if (kpi.kind !== "kpi") throw new Error("expected kpi cell")
    expect(kpi.spark).toEqual([80, 95, 100, 120])
  })

  it("parses chart cells from a pipe table, skipping header and separator", () => {
    const layout = dashboardLayout(CHART_DECK)
    expect(layout.rows).toEqual([1, 2])
    const [line, donut, bar] = layout.cells
    if (line.kind !== "chart" || donut.kind !== "chart" || bar.kind !== "chart") {
      throw new Error("expected chart cells")
    }
    expect(line.chartType).toBe("line")
    expect(line.heading).toBe("月次売上推移")
    expect(line.data).toEqual([
      { label: "4月", value: 100 },
      { label: "5月", value: 112 },
    ])
    expect(donut.chartType).toBe("donut")
    expect(donut.data.map((d) => d.value)).toEqual([45, 35, 20])
    expect(bar.chartType).toBe("bar")
    expect(bar.data).toEqual([
      { label: "東日本", value: 1200 },
      { label: "西日本", value: 95 },
    ])
  })

  it("rejects a cell count that does not match the row spec", () => {
    const short = [
      "## D",
      "<!--dashboard:1,2-->",
      "### A",
      "a",
      "### B",
      "b",
    ].join("\n")
    expect(() => parse(short)).toThrow(/3 セルを期待するが ### は 2 個/)
  })

  it("rejects a zero column count in the row spec", () => {
    const zero = ["## D", "<!--dashboard:1,0-->", "### A", "a"].join("\n")
    expect(() => parse(zero)).toThrow(/列数に 0 は書けない/)
  })

  it("rejects a KPI cell without a value line", () => {
    const noValue = ["## D", "<!--dashboard:1-->", "### 売上", "<!--kpi-->"].join("\n")
    expect(() => parse(noValue)).toThrow(/KPI タイル「売上」に値の行が無い/)
  })

  it("rejects a chart cell without a pipe table", () => {
    const noData = ["## D", "<!--dashboard:1-->", "### 推移", "<!--chart:line-->"].join("\n")
    expect(() => parse(noData)).toThrow(/チャート「推移」にパイプ区切りの表が無い/)
  })

  it("rejects a chart value that is not a number", () => {
    const bad = [
      "## D",
      "<!--dashboard:1-->",
      "### 推移",
      "<!--chart:bar-->",
      "| 月 | 売上 |",
      "| --- | --- |",
      "| 4月 | 好調 |",
    ].join("\n")
    expect(() => parse(bad)).toThrow(/値 '好調' が数値として読めない/)
  })

  it("rejects a table with more than two columns (single series only)", () => {
    const multi = [
      "## D",
      "<!--dashboard:1-->",
      "### 推移",
      "<!--chart:line-->",
      "| 月 | 今年 | 去年 |",
      "| --- | --- | --- |",
      "| 4月 | 100 | 90 |",
    ].join("\n")
    expect(() => parse(multi)).toThrow(/単一系列のみ/)
  })
})

describe("theme.dashboard", () => {
  it("merges partial overrides and keeps the other defaults", () => {
    const theme = mergeTheme({ dashboard: { valueSize: 40 } })
    expect(theme.dashboard.valueSize).toBe(40)
    expect(theme.dashboard.kpiUnitScale).toBe(DEFAULT_THEME.dashboard.kpiUnitScale)
    expect(theme.dashboard.deltaUpColor).toBe(DEFAULT_THEME.dashboard.deltaUpColor)
    expect(theme.dashboard.headingBackground).toBe(DEFAULT_THEME.dashboard.headingBackground)
  })

  it("defaults to DEFAULT_THEME.dashboard when nothing is given", () => {
    expect(mergeTheme({}).dashboard).toEqual(DEFAULT_THEME.dashboard)
  })
})

const kpiSlide = () => parse(KPI_DECK).slides[0]
const chartSlide = () => parse(CHART_DECK).slides[0]

const boxText = (box: TextBox): string =>
  box.paragraphs
    ? box.paragraphs.map((p) => p.runs.map((r) => r.text).join("")).join("\n")
    : box.richText
      ? box.richText.map((r) => r.text).join("")
      : (box.text ?? "")

describe("dashboard layout geometry", () => {
  const contentWidth = SLIDE_WIDTH - 2 * MARGIN_X

  it("draws one border box per cell", () => {
    const result = layoutSlide(kpiSlide(), DEFAULT_THEME)
    expect(result.borderBoxes).toHaveLength(5)
  })

  it("spans a 1-column row across the full content width", () => {
    const result = layoutSlide(kpiSlide(), DEFAULT_THEME)
    const first = result.borderBoxes![0]
    expect(first.x).toBeCloseTo(MARGIN_X, 5)
    expect(first.w).toBeCloseTo(contentWidth, 5)
    expect(first.y).toBeCloseTo(CONTENT_START_Y, 5)
  })

  it("splits a 3-column row into equal tiles and divides rows evenly", () => {
    const result = layoutSlide(kpiSlide(), DEFAULT_THEME)
    const [, t1, t2, t3, last] = result.borderBoxes!
    const tileWidth = (contentWidth - 2 * CELL_GAP) / 3
    const rowHeight = (SLIDE_HEIGHT - CONTENT_START_Y - MARGIN_Y - 2 * CELL_GAP) / 3
    for (const tile of [t1, t2, t3]) {
      expect(tile.w).toBeCloseTo(tileWidth, 5)
      expect(tile.h).toBeCloseTo(rowHeight, 5)
      expect(tile.y).toBeCloseTo(CONTENT_START_Y + rowHeight + CELL_GAP, 5)
    }
    expect(t2.x).toBeCloseTo(MARGIN_X + tileWidth + CELL_GAP, 5)
    expect(t3.x).toBeCloseTo(MARGIN_X + 2 * (tileWidth + CELL_GAP), 5)
    expect(last.y).toBeCloseTo(CONTENT_START_Y + 2 * (rowHeight + CELL_GAP), 5)
  })

  it("renders the KPI value as one paragraph with small units around a large number", () => {
    const result = layoutSlide(kpiSlide(), DEFAULT_THEME)
    const valueBox = result.textBoxes.find((b) => boxText(b) === "¥1.2億")
    expect(valueBox).toBeDefined()
    const runs = valueBox!.paragraphs![0].runs
    expect(runs.map((r) => r.text)).toEqual(["¥", "1.2", "億"])
    // kpiUnitScale 0.55 × valueSize 32 = 17.6 → 18pt
    expect(runs.map((r) => r.fontSize)).toEqual([18, undefined, 18])
    expect(valueBox!.fontSize).toBe(DEFAULT_THEME.dashboard.valueSize)
    // ダッシュボードのカードは左上から読む（中央寄せにしない）
    expect(valueBox!.align).not.toBe("center")
  })

  it("puts every cell heading top-left on a colored heading band", () => {
    const kpi = layoutSlide(kpiSlide(), DEFAULT_THEME)
    const chart = layoutSlide(chartSlide(), DEFAULT_THEME)
    // 帯: セルごとに1本、BorderBox と同じ幅で上端に敷く
    for (const [result, cellCount] of [
      [kpi, 5],
      [chart, 3],
    ] as const) {
      const bands = (result.shapeBoxes ?? []).filter(
        (s) => s.shapeType === "rect" && s.fillColor === DEFAULT_THEME.dashboard.headingBackground
      )
      expect(bands).toHaveLength(cellCount)
      for (const band of bands) {
        const cell = result.borderBoxes!.find((b) => b.x === band.x && b.y === band.y)
        expect(cell, "帯はセルの上端に重なる").toBeDefined()
        expect(band.w).toBeCloseTo(cell!.w, 5)
      }
    }
    // 見出しは帯の中で左寄せ・帯の文字色
    const label = kpi.textBoxes.find((b) => boxText(b) === "売上高")!
    expect(label.color).toBe(DEFAULT_THEME.dashboard.headingTextColor)
    expect(label.align).not.toBe("center")
    const chartHeading = chart.textBoxes.find((b) => boxText(b) === "月次売上推移")!
    expect(chartHeading.color).toBe(DEFAULT_THEME.dashboard.headingTextColor)
  })

  it("keeps a unit-less value as a single full-size run", () => {
    const result = layoutSlide(kpiSlide(), DEFAULT_THEME)
    const valueBox = result.textBoxes.find((b) => boxText(b) === "3,450件")
    const runs = valueBox!.paragraphs![0].runs
    expect(runs.map((r) => r.text)).toEqual(["3,450", "件"])
    expect(runs[0].fontSize).toBeUndefined()
  })

  it("renders the delta as a colored pill plus a gray basis footnote", () => {
    const result = layoutSlide(kpiSlide(), DEFAULT_THEME)
    const pills = (result.shapeBoxes ?? []).filter((s) => s.shapeType === "rect" && s.text)
    const up = pills.find((p) => p.text === "+12%")!
    expect(up.fillColor).toBe(DEFAULT_THEME.dashboard.deltaUpBackground)
    expect(up.textColor).toBe(DEFAULT_THEME.dashboard.deltaUpColor)
    const down = pills.find((p) => p.text === "-0.3pt")!
    expect(down.fillColor).toBe(DEFAULT_THEME.dashboard.deltaDownBackground)
    expect(down.textColor).toBe(DEFAULT_THEME.dashboard.deltaDownColor)
    // 比較基準はピルの隣にグレーの脚注として置く
    const basis = result.textBoxes.find((b) => boxText(b) === "前年同期比")!
    expect(basis.color).toBe(DEFAULT_THEME.dashboard.basisColor)
  })

  it("draws a sparkline SVG with an area fill for a KPI with trend data", () => {
    const result = layoutSlide(kpiSlide(), DEFAULT_THEME)
    const sparks = (result.shapeBoxes ?? []).filter((s) => s.shapeType === "svg")
    expect(sparks).toHaveLength(1) // 売上高だけが - <数値> を持つ
    expect(sparks[0].svgContent).toContain("<path")
    expect(sparks[0].svgContent).toContain(DEFAULT_THEME.dashboard.sparklineColor)
    expect(sparks[0].svgContent).toContain("fill-opacity")
  })

  it("draws the line chart with light gridlines and an area fill", () => {
    const result = layoutSlide(chartSlide(), DEFAULT_THEME)
    const line = (result.shapeBoxes ?? []).find((s) => s.svgContent?.includes("4月"))!
    expect(line.svgContent).toContain(DEFAULT_THEME.dashboard.chartGridColor)
    expect(line.svgContent).toContain("fill-opacity")
  })

  it("shows the largest segment in the donut's center", () => {
    const result = layoutSlide(chartSlide(), DEFAULT_THEME)
    const donut = (result.shapeBoxes ?? []).find((s) => s.svgContent?.includes("オンライン"))!
    expect(donut.svgContent).toContain(">45%<")
    expect(donut.svgContent).toContain(">直販<")
  })

  it("draws each chart cell as an SVG shape box with its heading as a text box", () => {
    const result = layoutSlide(chartSlide(), DEFAULT_THEME)
    const svgs = (result.shapeBoxes ?? []).filter((s) => s.shapeType === "svg")
    expect(svgs).toHaveLength(3)
    expect(svgs[0].svgContent).toContain("<path") // line
    expect(svgs[1].svgContent).toContain("<path") // donut arcs
    expect(svgs[2].svgContent).toContain("<rect") // bar
    for (const heading of ["月次売上推移", "チャネル別構成", "地域別売上"]) {
      expect(result.textBoxes.some((b) => boxText(b) === heading)).toBe(true)
    }
  })

  it("anchors the line chart's edge labels inward so they stay inside the viewBox", () => {
    const result = layoutSlide(chartSlide(), DEFAULT_THEME)
    const line = (result.shapeBoxes ?? []).find((s) => s.svgContent?.includes("4月"))!
    // 両端の点はラベルを中央揃えにすると半分が viewBox の外に出る
    expect(line.svgContent).toContain('text-anchor="start">100<')
    expect(line.svgContent).toContain('text-anchor="end">112<')
  })

  it("never emits SVG features that break cloneNode or the html-inspector", () => {
    const boxes = [
      ...(layoutSlide(chartSlide(), DEFAULT_THEME).shapeBoxes ?? []),
      ...(layoutSlide(kpiSlide(), DEFAULT_THEME).shapeBoxes ?? []),
    ].filter((s) => s.shapeType === "svg")
    expect(boxes.length).toBeGreaterThan(0)
    for (const box of boxes) {
      for (const forbidden of ["id=", "<defs", "<style", "<div", "<foreignObject"]) {
        expect(box.svgContent, forbidden).not.toContain(forbidden)
      }
    }
  })

  it("stays inside the slide bounds on both sample decks", () => {
    expect(detectOverflow(layoutSlide(kpiSlide(), DEFAULT_THEME))).toEqual([])
    expect(detectOverflow(layoutSlide(chartSlide(), DEFAULT_THEME))).toEqual([])
  })

  it("matches the layout snapshot", () => {
    expect(layoutSlide(kpiSlide(), DEFAULT_THEME)).toMatchSnapshot()
  })
})

/**
 * run 単位の fontSize は3脚（AST インベントリ / HTML / PPTX）が「段落の先頭 run」
 * 規則で同じ値を報告する。共有規則は3者比較では守れない（3脚とも揃って間違うと
 * 比較は緑のまま）ので、ここに明示的に留める — text-style.test.ts と同じ扱い。
 */
describe("per-run fontSize follows the first-run rule on every leg", () => {
  const valueBox = (): TextBox =>
    layoutSlide(kpiSlide(), DEFAULT_THEME).textBoxes.find((b) => boxText(b) === "¥1.2億")!

  it("AST inventory reports the first run's size", () => {
    const inventory = Effect.runSync(slidesToInventory(parse(KPI_DECK).slides, DEFAULT_THEME))
    const shapes = Object.values(inventory["slide-0"])
    const value = shapes.find((s) => s.paragraphs.some((p) => p.text === "¥1.2億"))!
    expect(value.paragraphs[0].font_size).toBe(18)
    const plain = shapes.find((s) => s.paragraphs.some((p) => p.text === "3,450件"))!
    expect(plain.paragraphs[0].font_size).toBe(DEFAULT_THEME.dashboard.valueSize)
  })

  it("HTML stamps data-font-size from the first run and sizes each run inline", () => {
    const html = textBoxToHtml(valueBox())
    expect(html).toContain('data-font-size="18"')
    expect(html).toContain("font-size: 18pt")
  })
})
