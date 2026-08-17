import { Option as O } from "effect"
import { SLIDE_WIDTH, SLIDE_HEIGHT, MARGIN_X, MARGIN_Y, CELL_GAP } from "../../constants.js"
import type { SlideLayout } from "../../schema/presentation.js"
import type { Theme } from "../../schema/theme.js"
import type {
  TextBox,
  BorderBox,
  ShapeBox,
  LayoutResult,
  InlineTextRun,
} from "../../renderer/layout/types.js"
import { buildSectionBoxes, visualWidthInEm } from "../../renderer/layout/helpers.js"
import {
  DASH_CELL_PADDING,
  HEADING_BAND_HEIGHT,
  HEADING_BAND_TEXT_HEIGHT,
  DELTA_PILL_HEIGHT,
  DELTA_PILL_PADDING,
  DELTA_PILL_GAP,
  KPI_VALUE_HEIGHT,
  KPI_INNER_GAP,
  KPI_SPARK_MIN_HEIGHT,
  KPI_SPARK_MAX_HEIGHT,
  CHART_HEADING_GAP,
} from "./constants.js"
import { DashboardLayout, type DashboardCell, type KpiValue } from "./schema.js"
import { renderBarChart, renderDonutChart, renderLineChart, renderSparkline } from "./svg-charts.js"

interface CellRect {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
const lcm = (a: number, b: number): number => (a / gcd(a, b)) * b

/**
 * 行ごとの列数から各セルの矩形を書いた順（行優先）で返す。
 *
 * 列数の最小公倍数の細かいグリッドを敷き、行ごとに colSpan で束ねる
 * （lean-canvas の colStart/colSpan と同じ考え方。あちらはマスが固定、
 * こちらは行構成が引数）。GAP をまたぐスパンは GAP ぶんも幅に含めるので、
 * 1列の行は必ず全幅と一致する。
 */
export function calculateDashboardGrid(rows: readonly number[], titleY: number): CellRect[] {
  const gridCols = rows.reduce((acc, cols) => lcm(acc, cols), 1)
  const contentWidth = SLIDE_WIDTH - 2 * MARGIN_X
  const colWidth = (contentWidth - (gridCols - 1) * CELL_GAP) / gridCols
  const rowHeight = (SLIDE_HEIGHT - titleY - MARGIN_Y - (rows.length - 1) * CELL_GAP) / rows.length

  const rects: CellRect[] = []
  rows.forEach((cols, rowIndex) => {
    const colSpan = gridCols / cols
    const y = titleY + rowIndex * (rowHeight + CELL_GAP)
    for (let c = 0; c < cols; c++) {
      rects.push({
        x: MARGIN_X + c * colSpan * (colWidth + CELL_GAP),
        y,
        w: colSpan * colWidth + (colSpan - 1) * CELL_GAP,
        h: rowHeight,
      })
    }
  })
  return rects
}

/** 値の run 列。数字は箱の fontSize（=valueSize）のまま、前後の単位だけ縮める */
function kpiValueRuns(value: KpiValue, theme: Theme): InlineTextRun[] {
  const unitSize = Math.round(theme.dashboard.valueSize * theme.dashboard.kpiUnitScale)
  const runs: InlineTextRun[] = []
  if (value.prefix) runs.push({ text: value.prefix, fontSize: unitSize })
  runs.push({ text: value.number })
  if (value.suffix) runs.push({ text: value.suffix, fontSize: unitSize })
  return runs
}

interface CellBoxes {
  readonly borderBox: BorderBox
  readonly textBoxes: TextBox[]
  readonly shapeBoxes: ShapeBox[]
}

/**
 * セル上端の見出し帯。ダッシュボードらしさの要で、全セル種が同じ帯を敷く。
 * 見出しは帯の中で**左上**に置く（中央寄せにしない — カードは左上から読む）。
 */
function buildHeadingBand(
  rect: CellRect,
  heading: string | undefined,
  fontSize: number,
  theme: Theme
): { band: ShapeBox; text?: TextBox } {
  const band: ShapeBox = {
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: HEADING_BAND_HEIGHT,
    shapeType: "rect",
    fillColor: theme.dashboard.headingBackground,
    rectRadius: 0.05,
  }
  if (!heading) return { band }
  return {
    band,
    text: {
      x: rect.x + DASH_CELL_PADDING + 0.04,
      y: rect.y + (HEADING_BAND_HEIGHT - HEADING_BAND_TEXT_HEIGHT) / 2,
      w: rect.w - 2 * DASH_CELL_PADDING - 0.04,
      h: HEADING_BAND_TEXT_HEIGHT,
      text: heading,
      isBold: true,
      fontSize,
      color: theme.dashboard.headingTextColor,
      valign: "middle",
    },
  }
}

function layoutTextCell(
  cell: Extract<DashboardCell, { kind: "text" }>,
  rect: CellRect,
  theme: Theme
): CellBoxes {
  const { band, text } = buildHeadingBand(rect, cell.block.heading, theme.dashboard.headingSize, theme)
  const bodyTop = rect.y + HEADING_BAND_HEIGHT
  const { textBoxes } = buildSectionBoxes([{ body: cell.block.body }], {
    baseX: rect.x,
    baseY: bodyTop,
    contentWidth: rect.w,
    padding: DASH_CELL_PADDING,
    theme,
    availableHeight: rect.h - HEADING_BAND_HEIGHT,
    // dispatchLayout の段階的な縮小を受けないサイズ（theme.dashboard）。
    // 見積もりと描画がずれるので、必ず両方を渡す（SectionContext の注意書き）
    headingSize: theme.dashboard.headingSize,
    bodySize: theme.dashboard.bodySize,
  })
  return {
    borderBox: { ...rect },
    textBoxes: [...(text ? [text] : []), ...textBoxes],
    shapeBoxes: [band],
  }
}

/** 前期比を「記号つき数値のピル」と「比較基準の脚注」に割る（最初の空白まで） */
function splitDelta(text: string): { pill: string; basis: string } {
  const [pill, ...rest] = text.trim().split(/\s+/)
  return { pill, basis: rest.join(" ") }
}

function layoutKpiTile(
  cell: Extract<DashboardCell, { kind: "kpi" }>,
  rect: CellRect,
  theme: Theme
): CellBoxes {
  const pad = DASH_CELL_PADDING
  const innerX = rect.x + pad + 0.04
  const innerW = rect.w - 2 * (pad + 0.04)

  const { band, text: label } = buildHeadingBand(rect, cell.label, theme.dashboard.labelSize, theme)

  const textBoxes: TextBox[] = label ? [label] : []
  const shapeBoxes: ShapeBox[] = [band]

  let currentY = rect.y + HEADING_BAND_HEIGHT + KPI_INNER_GAP

  textBoxes.push({
    x: innerX,
    y: currentY,
    w: innerW,
    h: KPI_VALUE_HEIGHT,
    paragraphs: [{ runs: kpiValueRuns(cell.value, theme) }],
    isBold: true,
    fontSize: theme.dashboard.valueSize,
    color: theme.contentSlide.textColor,
    valign: "middle",
  })
  currentY += KPI_VALUE_HEIGHT

  if (cell.delta) {
    currentY += KPI_INNER_GAP
    const { pill, basis } = splitDelta(cell.delta.text)
    if (cell.delta.direction === "flat") {
      // 向きの無い前期比はピルにしない（色が意味を運ばないので脚注と同じ扱い）
      textBoxes.push({
        x: innerX,
        y: currentY,
        w: innerW,
        h: DELTA_PILL_HEIGHT,
        text: cell.delta.text,
        fontSize: theme.dashboard.deltaSize,
        color: theme.dashboard.basisColor,
        valign: "middle",
      })
    } else {
      const up = cell.delta.direction === "up"
      const pillW =
        visualWidthInEm(pill) * (theme.dashboard.deltaSize / 72) + DELTA_PILL_PADDING
      shapeBoxes.push({
        x: innerX,
        y: currentY,
        w: pillW,
        h: DELTA_PILL_HEIGHT,
        shapeType: "rect",
        rectRadius: DELTA_PILL_HEIGHT / 2,
        fillColor: up ? theme.dashboard.deltaUpBackground : theme.dashboard.deltaDownBackground,
        text: pill,
        textColor: up ? theme.dashboard.deltaUpColor : theme.dashboard.deltaDownColor,
        fontSize: theme.dashboard.deltaSize,
        isBold: true,
      })
      if (basis) {
        const basisX = innerX + pillW + DELTA_PILL_GAP
        textBoxes.push({
          x: basisX,
          y: currentY,
          w: rect.x + rect.w - pad - basisX,
          h: DELTA_PILL_HEIGHT,
          text: basis,
          fontSize: theme.dashboard.deltaSize,
          color: theme.dashboard.basisColor,
          valign: "middle",
        })
      }
    }
    currentY += DELTA_PILL_HEIGHT
  }

  if (cell.spark) {
    const sparkAvailable = rect.y + rect.h - pad - (currentY + KPI_INNER_GAP)
    if (sparkAvailable >= KPI_SPARK_MIN_HEIGHT) {
      const sparkHeight = Math.min(sparkAvailable, KPI_SPARK_MAX_HEIGHT)
      shapeBoxes.push({
        x: innerX,
        y: rect.y + rect.h - pad - sparkHeight,
        w: innerW,
        h: sparkHeight,
        shapeType: "svg",
        svgContent: renderSparkline(cell.spark, innerW, sparkHeight, theme),
      })
    }
  }

  return {
    borderBox: { ...rect, fillColor: theme.dashboard.tileBackground },
    textBoxes,
    shapeBoxes,
  }
}

function layoutChartCell(
  cell: Extract<DashboardCell, { kind: "chart" }>,
  rect: CellRect,
  theme: Theme
): CellBoxes {
  const pad = DASH_CELL_PADDING
  const { band, text: heading } = buildHeadingBand(rect, cell.heading, theme.dashboard.headingSize, theme)

  const svgY = rect.y + HEADING_BAND_HEIGHT + CHART_HEADING_GAP
  const svgH = rect.y + rect.h - pad - svgY
  const svgW = rect.w - 2 * pad
  const render =
    cell.chartType === "bar"
      ? renderBarChart
      : cell.chartType === "line"
        ? renderLineChart
        : renderDonutChart

  const svg: ShapeBox = {
    x: rect.x + pad,
    y: svgY,
    w: svgW,
    h: svgH,
    shapeType: "svg",
    svgContent: render(cell.data, svgW, svgH, theme),
  }

  return {
    borderBox: { ...rect },
    textBoxes: heading ? [heading] : [],
    shapeBoxes: [band, svg],
  }
}

export function layoutDashboard(layout: DashboardLayout, titleY: number, theme: Theme): LayoutResult {
  const rects = calculateDashboardGrid(layout.rows, titleY)

  const borderBoxes: BorderBox[] = []
  const textBoxes: TextBox[] = []
  const shapeBoxes: ShapeBox[] = []

  layout.cells.forEach((cell, i) => {
    const rect = rects[i]
    const boxes =
      cell.kind === "kpi"
        ? layoutKpiTile(cell, rect, theme)
        : cell.kind === "chart"
          ? layoutChartCell(cell, rect, theme)
          : layoutTextCell(cell, rect, theme)
    borderBoxes.push(boxes.borderBox)
    textBoxes.push(...boxes.textBoxes)
    shapeBoxes.push(...boxes.shapeBoxes)
  })

  return { textBoxes, borderBoxes, shapeBoxes }
}

// Layout handler for plugin registration
export const handleDashboardLayout = (
  layout: SlideLayout,
  titleY: number,
  theme: Theme
): O.Option<LayoutResult> => {
  if (layout._tag !== "Dashboard") return O.none()
  return O.some(layoutDashboard(layout as DashboardLayout, titleY, theme))
}
