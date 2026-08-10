import { Option as O } from "effect"
import {
  SLIDE_WIDTH,
  SLIDE_HEIGHT,
  MARGIN_X,
  MARGIN_Y,
} from "../../constants.js"
import type { SlideLayout, Theme } from "../../schema/index.js"
import type {
  TextBox,
  BorderBox,
  LayoutResult,
} from "../../renderer/layout/types.js"
import { CustomerJourneyLayout, CustomerJourneyRow } from "./schema.js"

/**
 * HOOK: CustomerJourneyLayoutのレイアウト
 *
 * Algorithm (4-row journey map):
 * 1. Fixed-width columns: label column (0.52") + N phase columns (2.1" each).
 * 2. Header row (0.29" height) with phase names on primary-color background.
 * 3. 4 data rows (equal height) for タッチ/行動/判断/感情.
 * 4. Each cell contains bullet-pointed items from the journey phases.
 * 5. Grid gap of 0.02" between all cells.
 */
export function layoutCustomerJourney(
  phases: readonly string[],
  rows: readonly [CustomerJourneyRow, CustomerJourneyRow, CustomerJourneyRow, CustomerJourneyRow],
  titleY: number,
  theme: Theme
): LayoutResult {
  const availableHeight = SLIDE_HEIGHT - titleY - MARGIN_Y
  const contentWidth = SLIDE_WIDTH - 2 * MARGIN_X

  // グリッド寸法計算
  const LABEL_COL_WIDTH = 0.52 // ラベル列の幅（約50px相当）
  const HEADER_ROW_HEIGHT = 0.29 // ヘッダー行の高さ（約28px相当）
  const GRID_GAP = 0.02 // セル間のギャップ（約2px相当）
  const PHASE_COL_WIDTH = 2.1 // フェーズ列の固定幅（インチ）

  // データ行の高さ計算（4行）
  const dataRowHeight = (availableHeight - HEADER_ROW_HEIGHT - 4 * GRID_GAP) / 4

  const textBoxes: TextBox[] = []
  const borderBoxes: BorderBox[] = []

  const gridStartX = MARGIN_X
  const gridStartY = titleY

  // ヘッダー行の描画
  // (0, 0): "フェーズ" ラベル
  const headerLabelX = gridStartX
  const headerLabelY = gridStartY
  const PRIMARY_COLOR = "0891B2" // プライマリカラー（md2html2pptxと同じ）
  const ROW_LABEL_COLOR = "E2E8F0" // 行ラベルの背景色（グレー）

  textBoxes.push({
    x: headerLabelX,
    y: headerLabelY,
    w: LABEL_COL_WIDTH,
    h: HEADER_ROW_HEIGHT,
    text: "フェーズ",
    isBold: true,
    fontSize: 7,
    color: "FFFFFF", // 白文字
    align: "center",
    valign: "middle",
  })
  borderBoxes.push({
    x: headerLabelX,
    y: headerLabelY,
    w: LABEL_COL_WIDTH,
    h: HEADER_ROW_HEIGHT,
    fillColor: PRIMARY_COLOR, // プライマリカラー背景
  })

  // フェーズ名ヘッダー
  phases.forEach((phase, i) => {
    const phaseX = gridStartX + LABEL_COL_WIDTH + GRID_GAP + i * (PHASE_COL_WIDTH + GRID_GAP)
    textBoxes.push({
      x: phaseX,
      y: headerLabelY,
      w: PHASE_COL_WIDTH,
      h: HEADER_ROW_HEIGHT,
      text: phase,
      isBold: true,
      fontSize: 9,
      color: "FFFFFF", // 白文字
      align: "center",
      valign: "middle",
    })
    borderBoxes.push({
      x: phaseX,
      y: headerLabelY,
      w: PHASE_COL_WIDTH,
      h: HEADER_ROW_HEIGHT,
      fillColor: PRIMARY_COLOR, // プライマリカラー背景
    })
  })

  // データ行の描画
  rows.forEach((row, rowIndex) => {
    const rowY = gridStartY + HEADER_ROW_HEIGHT + GRID_GAP + rowIndex * (dataRowHeight + GRID_GAP)

    // 行ラベル
    textBoxes.push({
      x: gridStartX,
      y: rowY,
      w: LABEL_COL_WIDTH,
      h: dataRowHeight,
      text: row.label,
      isBold: true,
      fontSize: 7,
      color: theme.contentSlide.textColor,
      align: "center",
      valign: "middle",
    })
    borderBoxes.push({
      x: gridStartX,
      y: rowY,
      w: LABEL_COL_WIDTH,
      h: dataRowHeight,
      fillColor: ROW_LABEL_COLOR, // グレー背景
    })

    // セルの描画
    row.cells.forEach((cell, colIndex) => {
      const cellX = gridStartX + LABEL_COL_WIDTH + GRID_GAP + colIndex * (PHASE_COL_WIDTH + GRID_GAP)

      // セルの背景ボーダー
      borderBoxes.push({
        x: cellX,
        y: rowY,
        w: PHASE_COL_WIDTH,
        h: dataRowHeight,
      })

      // セル内の箇条書き項目
      if (cell.items.length > 0) {
        const bulletText = cell.items.map(item => `• ${item}`).join('\n')
        textBoxes.push({
          x: cellX + 0.03, // 左パディング
          y: rowY + 0.02, // 上パディング
          w: PHASE_COL_WIDTH - 0.06,
          h: dataRowHeight - 0.04,
          text: bulletText,
          fontSize: 8,
          color: theme.contentSlide.textColor,
          align: "left",
          valign: "top",
        })
      }
    })
  })

  return { textBoxes, borderBoxes }
}

// Layout handler for plugin registration
export const handleCustomerJourneyLayout = (
  layout: SlideLayout,
  titleY: number,
  theme: Theme
): O.Option<LayoutResult> => {
  if (layout._tag !== "CustomerJourney") return O.none()
  const l = layout as CustomerJourneyLayout
  return O.some(layoutCustomerJourney(l.phases, l.rows, titleY, theme))
}
