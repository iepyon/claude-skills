import {
  SLIDE_WIDTH,
  SLIDE_HEIGHT,
  MARGIN_X,
  MARGIN_Y,
  CELL_GAP,
} from "../../constants.js"
import { TextBlock, Theme } from "../../schema/index.js"
import {
  TextBox,
  BorderBox,
  LayoutResult,
  SectionContext,
} from "./types.js"
import {
  reservedForTakeaway,
  withTakeaway,
  calculateColumnDimensions,
  calculateRowDimensions,
  calculateGridDimensions,
  calculateGridSpacing,
  buildSectionBoxes,
} from "./helpers.js"

// TitleSlideのレイアウト
export function layoutTitleSlide(
  slide: { _tag: "TitleSlide"; title: string; subtitle?: string },
  theme: Theme
): LayoutResult {
  const boxes: TextBox[] = []

  // タイトル: 中央
  boxes.push({
    x: MARGIN_X,
    y: SLIDE_HEIGHT / 2 - 0.5,
    w: SLIDE_WIDTH - 2 * MARGIN_X,
    h: 1.0,
    text: slide.title,
    isBold: true,
    fontSize: theme.titleSlide.titleSize,
    color: theme.titleSlide.titleColor,
  })

  // サブタイトル: 下部
  if (slide.subtitle) {
    const subtitleY = SLIDE_HEIGHT / 2 + 0.6
    const subtitleH = SLIDE_HEIGHT - MARGIN_Y - subtitleY
    boxes.push({
      x: MARGIN_X,
      y: subtitleY,
      w: SLIDE_WIDTH - 2 * MARGIN_X,
      h: subtitleH,
      text: slide.subtitle,
      fontSize: theme.titleSlide.subtitleSize,
      color: theme.titleSlide.subtitleColor,
    })
  }

  return { textBoxes: boxes }
}

// DefaultLayoutのレイアウト（上寄せ）
export function layoutDefault(sections: readonly TextBlock[], titleY: number, theme: Theme, takeaway?: string): LayoutResult {
  const availableHeight = SLIDE_HEIGHT - titleY - MARGIN_Y - reservedForTakeaway(takeaway)

  const context: SectionContext = {
    baseX: MARGIN_X,
    baseY: titleY,
    contentWidth: SLIDE_WIDTH - 2 * MARGIN_X,
    padding: 0, // No padding for default layout
    theme,
    availableHeight,
  }

  const { textBoxes } = buildSectionBoxes(sections, context)
  return withTakeaway({ textBoxes }, takeaway, theme)
}

// LeftRightLayoutのレイアウト（上寄せ）
export function layoutLeftRight(
  leftRatio: number,
  rightRatio: number,
  leftSections: readonly TextBlock[],
  rightSections: readonly TextBlock[],
  titleY: number,
  theme: Theme,
  takeaway?: string
): LayoutResult {
  const dims = calculateColumnDimensions(leftRatio, rightRatio, titleY, reservedForTakeaway(takeaway))

  const borderBoxes: BorderBox[] = [
    { x: MARGIN_X, y: titleY, w: dims.leftWidth, h: dims.availableHeight },
    { x: dims.rightX, y: titleY, w: dims.rightWidth, h: dims.availableHeight },
  ]

  // Left column
  const leftContext: SectionContext = {
    baseX: MARGIN_X,
    baseY: titleY,
    contentWidth: dims.leftWidth,
    padding: 0.1,
    theme,
    availableHeight: dims.availableHeight,
  }
  const leftResult = buildSectionBoxes(leftSections, leftContext)

  // Right column
  const rightContext: SectionContext = {
    baseX: dims.rightX,
    baseY: titleY,
    contentWidth: dims.rightWidth,
    padding: 0.1,
    theme,
    availableHeight: dims.availableHeight,
  }
  const rightResult = buildSectionBoxes(rightSections, rightContext)

  const textBoxes = [...leftResult.textBoxes, ...rightResult.textBoxes]
  return withTakeaway({ textBoxes, borderBoxes }, takeaway, theme)
}

// TopBottomLayoutのレイアウト（上下分割）
export function layoutTopBottom(
  topRatio: number,
  bottomRatio: number,
  topSections: readonly TextBlock[],
  bottomSections: readonly TextBlock[],
  titleY: number,
  theme: Theme,
  takeaway?: string
): LayoutResult {
  const dims = calculateRowDimensions(topRatio, bottomRatio, titleY, reservedForTakeaway(takeaway))

  const borderBoxes: BorderBox[] = [
    { x: MARGIN_X, y: titleY, w: dims.availableWidth, h: dims.topHeight },
    { x: MARGIN_X, y: dims.bottomY, w: dims.availableWidth, h: dims.bottomHeight },
  ]

  // Top row
  const topContext: SectionContext = {
    baseX: MARGIN_X,
    baseY: titleY,
    contentWidth: dims.availableWidth,
    padding: 0.1,
    theme,
    availableHeight: dims.topHeight,
  }
  const topResult = buildSectionBoxes(topSections, topContext)

  // Bottom row
  const bottomContext: SectionContext = {
    baseX: MARGIN_X,
    baseY: dims.bottomY,
    contentWidth: dims.availableWidth,
    padding: 0.1,
    theme,
    availableHeight: dims.bottomHeight,
  }
  const bottomResult = buildSectionBoxes(bottomSections, bottomContext)

  const textBoxes = [...topResult.textBoxes, ...bottomResult.textBoxes]
  return withTakeaway({ textBoxes, borderBoxes }, takeaway, theme)
}

/**
 * GridLayoutのレイアウト（各セル内で上寄せ）
 *
 * Algorithm:
 * 1. Calculate cell dimensions by dividing available space evenly (rows x cols) with CELL_GAP.
 * 2. Scale font sizes based on grid density via calculateGridSpacing().
 * 3. For each cell: place at (col * cellWidth, row * cellHeight) with a border box,
 *    then render sections inside using buildSectionBoxes with dynamic height distribution.
 */
export function layoutGrid(rows: number, cols: number, cells: readonly TextBlock[], titleY: number, theme: Theme, takeaway?: string): LayoutResult {
  const dims = calculateGridDimensions(rows, cols, titleY, reservedForTakeaway(takeaway))
  const spacing = calculateGridSpacing(rows, cols, theme)

  const borderBoxes: BorderBox[] = []
  const allTextBoxes: TextBox[] = []

  // Create a theme variant with dynamic grid font sizes
  const gridTheme: Theme = {
    ...theme,
    contentSlide: {
      ...theme.contentSlide,
      headingSize: spacing.headingSize,
      bodySize: spacing.bodySize,
    },
  }

  cells.forEach((cell, i) => {
    const row = Math.floor(i / cols)
    const col = i % cols
    const cellX = MARGIN_X + col * (dims.cellWidth + CELL_GAP)
    const cellY = titleY + row * (dims.cellHeight + CELL_GAP)

    borderBoxes.push({ x: cellX, y: cellY, w: dims.cellWidth, h: dims.cellHeight })

    const cellContext: SectionContext = {
      baseX: cellX,
      baseY: cellY,
      contentWidth: dims.cellWidth,
      padding: spacing.padding,
      theme: gridTheme,
      headingBodyGap: spacing.headingBodyGap,
      availableHeight: dims.cellHeight,
      // Don't pass headingHeight/bodyHeight - let dynamic calculation handle it
    }

    const { textBoxes } = buildSectionBoxes([cell], cellContext)
    allTextBoxes.push(...textBoxes)
  })

  return withTakeaway({ textBoxes: allTextBoxes, borderBoxes }, takeaway, theme)
}
