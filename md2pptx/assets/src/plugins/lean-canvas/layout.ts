import { Option as O } from "effect"
import {
  SLIDE_WIDTH,
  SLIDE_HEIGHT,
  MARGIN_X,
  MARGIN_Y,
  CELL_GAP,
} from "../../constants.js"
import {
  LEAN_CANVAS_COLS,
  LEAN_CANVAS_ROW_RATIOS,
  LEAN_CANVAS_CELL_PADDING,
  LEAN_CANVAS_HEADING_BODY_GAP,
} from "./constants.js"
import type { SlideLayout } from "../../schema/presentation.js"
import { TextBlock, Theme } from "../../schema/index.js"
import { LeanCanvasLayout } from "./schema.js"
import {
  TextBox,
  BorderBox,
  LayoutResult,
  SectionContext,
  LeanCanvasCellSpec,
  LeanCanvasDimensions,
} from "../../renderer/layout/types.js"
import { buildSectionBoxes } from "../../renderer/layout/helpers.js"

// --- LeanCanvas helpers ---

/**
 * LeanCanvas cell definitions (9 cells).
 *
 * Grid mapping: The Lean Canvas maps 9 logical business model blocks onto a
 * 10-column x 3-row grid. Some cells span 2 rows (Problem, UVP, Customer)
 * while others occupy single rows. The bottom row is split into Cost (left 5 cols)
 * and Revenue (right 5 cols).
 *
 * Layout (colStart, colSpan, rowStart, rowSpan):
 *   Row 0-1: |Problem(0,2)|Solution(2,2)|UVP(4,2)  |Advantage(6,2)|Customer(8,2)|
 *   Row 1:   |            |Metrics(2,2) |           |Channels(6,2) |             |
 *   Row 2:   |Cost(0,5)                 |Revenue(5,5)                            |
 */
const LEAN_CANVAS_CELLS: readonly LeanCanvasCellSpec[] = [
  { name: "problem", colStart: 0, colSpan: 2, rowStart: 0, rowSpan: 2 },
  { name: "solution", colStart: 2, colSpan: 2, rowStart: 0, rowSpan: 1 },
  { name: "uvp", colStart: 4, colSpan: 2, rowStart: 0, rowSpan: 2 },
  { name: "advantage", colStart: 6, colSpan: 2, rowStart: 0, rowSpan: 1 },
  { name: "customer", colStart: 8, colSpan: 2, rowStart: 0, rowSpan: 2 },
  { name: "metrics", colStart: 2, colSpan: 2, rowStart: 1, rowSpan: 1 },
  { name: "channels", colStart: 6, colSpan: 2, rowStart: 1, rowSpan: 1 },
  { name: "cost", colStart: 0, colSpan: 5, rowStart: 2, rowSpan: 1 },
  { name: "revenue", colStart: 5, colSpan: 5, rowStart: 2, rowSpan: 1 },
] as const

// Mapping from heading keywords to cell indices
const LEAN_CANVAS_HEADING_MAP: Record<string, number> = {
  problem: 0,
  "課題": 0,
  solution: 1,
  "ソリューション": 1,
  "解決策": 1,
  "unique value proposition": 2,
  uvp: 2,
  "独自の価値提案": 2,
  "価値提案": 2,
  "unfair advantage": 3,
  advantage: 3,
  "圧倒的な優位性": 3,
  "優位性": 3,
  "customer segments": 4,
  customer: 4,
  "顧客セグメント": 4,
  "顧客": 4,
  "key metrics": 5,
  metrics: 5,
  "主要指標": 5,
  "指標": 5,
  channels: 6,
  "チャネル": 6,
  "cost structure": 7,
  cost: 7,
  "コスト構造": 7,
  "コスト": 7,
  "revenue streams": 8,
  revenue: 8,
  "収益の流れ": 8,
  "収益": 8,
}

function findCellIndex(heading: string): number | undefined {
  const normalized = heading.toLowerCase().trim()
  return LEAN_CANVAS_HEADING_MAP[normalized]
}

function calculateLeanCanvasDimensions(titleY: number): LeanCanvasDimensions {
  const availableHeight = SLIDE_HEIGHT - titleY - MARGIN_Y
  const contentWidth = SLIDE_WIDTH - 2 * MARGIN_X
  const colWidth = (contentWidth - (LEAN_CANVAS_COLS - 1) * CELL_GAP) / LEAN_CANVAS_COLS

  const totalRatio = LEAN_CANVAS_ROW_RATIOS.reduce((sum, r) => sum + r, 0)
  const availableRowHeight = availableHeight - 2 * CELL_GAP
  const rowHeights: [number, number, number] = [
    (availableRowHeight * LEAN_CANVAS_ROW_RATIOS[0]) / totalRatio,
    (availableRowHeight * LEAN_CANVAS_ROW_RATIOS[1]) / totalRatio,
    (availableRowHeight * LEAN_CANVAS_ROW_RATIOS[2]) / totalRatio,
  ]

  return { colWidth, rowHeights }
}

function calculateRowY(rowIndex: number, rowHeights: readonly [number, number, number], titleY: number): number {
  let y = titleY
  for (let i = 0; i < rowIndex; i++) {
    y += rowHeights[i] + CELL_GAP
  }
  return y
}

function calculateCellHeight(
  rowStart: number,
  rowSpan: number,
  rowHeights: readonly [number, number, number]
): number {
  let height = 0
  for (let i = rowStart; i < rowStart + rowSpan; i++) {
    height += rowHeights[i]
    if (i < rowStart + rowSpan - 1) {
      height += CELL_GAP
    }
  }
  return height
}

// LeanCanvas layout implementation
export function layoutLeanCanvas(blocks: readonly TextBlock[], titleY: number, theme: Theme): LayoutResult {
  const dims = calculateLeanCanvasDimensions(titleY)

  const borderBoxes: BorderBox[] = []
  const allTextBoxes: TextBox[] = []

  const gridTheme: Theme = {
    ...theme,
    contentSlide: {
      ...theme.contentSlide,
      headingSize: theme.contentSlide.gridHeadingSize,
      bodySize: theme.contentSlide.gridBodySize,
    },
  }

  const blocksByCell = new Map<number, TextBlock>()
  for (const block of blocks) {
    if (!block.heading) continue
    const cellIndex = findCellIndex(block.heading)
    if (cellIndex !== undefined) {
      blocksByCell.set(cellIndex, block)
    }
  }

  LEAN_CANVAS_CELLS.forEach((cellSpec, i) => {
    const cellX = MARGIN_X + cellSpec.colStart * (dims.colWidth + CELL_GAP)
    const cellY = calculateRowY(cellSpec.rowStart, dims.rowHeights, titleY)
    const cellWidth = cellSpec.colSpan * dims.colWidth + (cellSpec.colSpan - 1) * CELL_GAP
    const cellHeight = calculateCellHeight(cellSpec.rowStart, cellSpec.rowSpan, dims.rowHeights)

    borderBoxes.push({ x: cellX, y: cellY, w: cellWidth, h: cellHeight })

    const block = blocksByCell.get(i)
    if (block) {
      const cellContext: SectionContext = {
        baseX: cellX,
        baseY: cellY,
        contentWidth: cellWidth,
        padding: LEAN_CANVAS_CELL_PADDING,
        theme: gridTheme,
        headingBodyGap: LEAN_CANVAS_HEADING_BODY_GAP,
        availableHeight: cellHeight,
      }

      const { textBoxes } = buildSectionBoxes([block], cellContext)
      allTextBoxes.push(...textBoxes)
    }
  })

  return { textBoxes: allTextBoxes, borderBoxes }
}

// Layout handler for plugin registration
export const handleLeanCanvasLayout = (
  layout: SlideLayout,
  titleY: number,
  theme: Theme
): O.Option<LayoutResult> => {
  if (layout._tag !== "LeanCanvas") return O.none()
  const l = layout as LeanCanvasLayout
  return O.some(layoutLeanCanvas(l.blocks, titleY, theme))
}
