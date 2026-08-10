import { Option as O } from "effect"
import {
  SLIDE_WIDTH,
  SLIDE_HEIGHT,
  MARGIN_X,
  MARGIN_Y,
} from "../../constants.js"
import type { SlideLayout } from "../../schema/presentation.js"
import type { Theme } from "../../schema/theme.js"
import type {
  TextBox,
  ShapeBox,
  LayoutResult,
} from "../../renderer/layout/types.js"
import { TableLayout } from "./schema.js"
import { reservedForTakeaway, withTakeaway } from "../../renderer/layout/helpers.js"
import { TABLE_HEADER_HEIGHT, TABLE_CELL_PADDING, TABLE_ROW_GAP } from "./constants.js"

/**
 * Layout a table as ShapeBox backgrounds + TextBox cells.
 *
 * Algorithm:
 * 1. Equal-width columns spanning the content area.
 * 2. Header row with dark background, white bold text, centered.
 * 3. Data rows with alternating background colors.
 * 4. Horizontal separator lines between rows.
 * 5. First column is bold + left-aligned; other columns are centered.
 */
export function layoutTable(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
  titleY: number,
  theme: Theme,
  takeaway?: string
): LayoutResult {
  const availableHeight = SLIDE_HEIGHT - titleY - MARGIN_Y - reservedForTakeaway(takeaway)
  const contentWidth = SLIDE_WIDTH - 2 * MARGIN_X
  const numCols = headers.length
  const numRows = rows.length
  const colWidth = contentWidth / numCols

  const tableTheme = theme.table

  // Row height calculation
  const dataAreaHeight = availableHeight - TABLE_HEADER_HEIGHT - numRows * TABLE_ROW_GAP
  const rowHeight = numRows > 0 ? dataAreaHeight / numRows : 0

  const textBoxes: TextBox[] = []
  const shapeBoxes: ShapeBox[] = []

  const startX = MARGIN_X
  const startY = titleY

  // --- Header row ---
  // Full-width header background
  shapeBoxes.push({
    x: startX,
    y: startY,
    w: contentWidth,
    h: TABLE_HEADER_HEIGHT,
    shapeType: "rect",
    fillColor: tableTheme.headerBackground,
  })

  // Header text cells
  headers.forEach((header, colIdx) => {
    textBoxes.push({
      x: startX + colIdx * colWidth + TABLE_CELL_PADDING,
      y: startY,
      w: colWidth - 2 * TABLE_CELL_PADDING,
      h: TABLE_HEADER_HEIGHT,
      text: header,
      isBold: true,
      fontSize: tableTheme.headerFontSize,
      color: tableTheme.headerTextColor,
      align: "center",
      valign: "middle",
    })
  })

  // --- Data rows ---
  rows.forEach((row, rowIdx) => {
    const rowY = startY + TABLE_HEADER_HEIGHT + TABLE_ROW_GAP + rowIdx * (rowHeight + TABLE_ROW_GAP)

    // Alternating row background (even rows get altRowColor)
    if (rowIdx % 2 === 1) {
      shapeBoxes.push({
        x: startX,
        y: rowY,
        w: contentWidth,
        h: rowHeight,
        shapeType: "rect",
        fillColor: tableTheme.altRowColor,
      })
    }

    // Horizontal separator line above this row
    shapeBoxes.push({
      x: startX,
      y: rowY,
      w: contentWidth,
      h: 0,
      shapeType: "line",
      fillColor: tableTheme.borderColor,
      lineWidth: 0.5,
      lineColor: tableTheme.borderColor,
    })

    // Cell text
    row.forEach((cell, colIdx) => {
      const isFirstCol = colIdx === 0
      textBoxes.push({
        x: startX + colIdx * colWidth + TABLE_CELL_PADDING,
        y: rowY,
        w: colWidth - 2 * TABLE_CELL_PADDING,
        h: rowHeight,
        text: cell,
        isBold: isFirstCol,
        fontSize: tableTheme.bodyFontSize,
        color: theme.contentSlide.textColor,
        align: isFirstCol ? "left" : "center",
        valign: "middle",
      })
    })
  })

  // Bottom border line
  if (numRows > 0) {
    const bottomY = startY + TABLE_HEADER_HEIGHT + TABLE_ROW_GAP + numRows * (rowHeight + TABLE_ROW_GAP)
    shapeBoxes.push({
      x: startX,
      y: bottomY,
      w: contentWidth,
      h: 0,
      shapeType: "line",
      fillColor: tableTheme.borderColor,
      lineWidth: 0.5,
      lineColor: tableTheme.borderColor,
    })
  }

  return withTakeaway({ textBoxes, shapeBoxes }, takeaway, theme)
}

// Layout handler for plugin registration
export const handleTableLayout = (
  layout: SlideLayout,
  titleY: number,
  theme: Theme
): O.Option<LayoutResult> => {
  if (layout._tag !== "Table") return O.none()
  const l = layout as TableLayout
  return O.some(layoutTable(l.headers, l.rows, titleY, theme, l.takeaway))
}
