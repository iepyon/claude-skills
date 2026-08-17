import { Option as O } from "effect"
import { ContentSlide, TextBlock } from "../../schema/presentation.js"
import { ParseError } from "../../errors.js"
import type { RawSlide, RawSection } from "../../parser/builder-types.js"
import type { Slide } from "../../schema/presentation.js"
import { DashboardLayout, type DashboardCell, type KpiDelta, type KpiValue } from "./schema.js"

// 値を 接頭辞（非数字）/ 数字部（数字・カンマ・小数点）/ 接尾辞（単位） に割る。
// 数字を含まない値はマッチせず、全体を数字部として1つの大きさで描く。
const VALUE_PATTERN = /^(\D*?)([\d,]+(?:\.\d+)?)(.*)$/

export function splitKpiValue(text: string): KpiValue {
  const m = text.match(VALUE_PATTERN)
  if (!m) return { prefix: "", number: text, suffix: "" }
  return { prefix: m[1], number: m[2], suffix: m[3] }
}

// 会計の「▲=減」ではなく矢印としての「▲=増」で読む。宣言（ontology.yaml の
// Dashboard.guidance）と揃えてあり、色分けの根拠は書き手が打った記号に残る
const UP_SIGNS = ["+", "＋", "▲", "△", "↑"]
const DOWN_SIGNS = ["-", "−", "▼", "▽", "↓"]

export function parseDelta(text: string): KpiDelta {
  const head = text.trim().charAt(0)
  const direction = UP_SIGNS.includes(head) ? "up" : DOWN_SIGNS.includes(head) ? "down" : "flat"
  return { text, direction }
}

function parseNumber(text: string, context: string): number {
  const value = text.trim() === "" ? NaN : Number(text.replace(/,/g, ""))
  if (Number.isNaN(value)) {
    throw new ParseError({ message: `${context}の値 '${text}' が数値として読めない` })
  }
  return value
}

const BULLET = /^[-*+]\s+/

function toKpiCell(section: RawSection): DashboardCell {
  const label = section.heading ?? ""
  const lines = (section.body ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "")
  const plain = lines.filter((l) => !BULLET.test(l))
  const bullets = lines.filter((l) => BULLET.test(l))

  if (plain.length === 0) {
    throw new ParseError({ message: `KPI タイル「${label}」に値の行が無い（本文1行目が値）` })
  }
  if (plain.length > 2) {
    throw new ParseError({
      message: `KPI タイル「${label}」の本文が多すぎる（1行目=値、2行目=前期比、以降は - <数値> のみ）`,
    })
  }

  const spark = bullets.map((l) =>
    parseNumber(l.replace(BULLET, ""), `KPI タイル「${label}」のスパークライン`)
  )

  return {
    kind: "kpi",
    label,
    value: splitKpiValue(plain[0]),
    ...(plain[1] !== undefined ? { delta: parseDelta(plain[1]) } : {}),
    ...(spark.length > 0 ? { spark } : {}),
  }
}

function toChartCell(section: RawSection): DashboardCell {
  const heading = section.heading ?? ""
  const rows = section.chartRows ?? []
  if (rows.length === 0) {
    throw new ParseError({
      message: `チャート「${heading}」にパイプ区切りの表が無い（1列目=ラベル、2列目=値）`,
    })
  }
  for (const row of [section.chartHeader ?? [], ...rows]) {
    if (row.length > 2) {
      throw new ParseError({
        message: `チャート「${heading}」: 単一系列のみ（表は「ラベル | 値」の2列）`,
      })
    }
  }
  return {
    kind: "chart",
    chartType: section.chartType!,
    heading,
    data: rows.map((row) => ({
      label: row[0] ?? "",
      value: parseNumber(row[1] ?? "", `チャート「${heading}」`),
    })),
  }
}

function toCell(section: RawSection): DashboardCell {
  if (section.kpi && section.chartType) {
    throw new ParseError({
      message: `セル「${section.heading ?? ""}」に <!--kpi--> と <!--chart:--> の両方がある（どちらか1つ）`,
    })
  }
  if (section.kpi) return toKpiCell(section)
  if (section.chartType) return toChartCell(section)
  return { kind: "text", block: new TextBlock({ heading: section.heading, body: section.body }) }
}

export const convertDashboard = (raw: RawSlide): O.Option<Slide[]> => {
  const rows = raw.pluginData?.["dashboardRows"] as number[] | undefined
  if (!rows) return O.none()

  const sections = (raw.pluginData?.["dashboardCells"] as RawSection[] | undefined) ?? []
  const expected = rows.reduce((sum, n) => sum + n, 0)
  if (sections.length !== expected) {
    throw new ParseError({
      message:
        `ダッシュボード「${raw.title}」のセル数が合わない: ` +
        `<!--dashboard:${rows.join(",")}--> は ${expected} セルを期待するが ### は ${sections.length} 個`,
    })
  }

  return O.some([
    new ContentSlide({
      title: raw.title,
      layout: new DashboardLayout({ rows, cells: sections.map(toCell) }),
    }),
  ])
}
