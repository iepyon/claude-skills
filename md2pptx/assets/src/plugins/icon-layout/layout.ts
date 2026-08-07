import { Option as O } from "effect"
import {
  SLIDE_WIDTH,
  MARGIN_X,
} from "../../constants.js"
import {
  ICON_COL_HEADING_HEIGHT,
  ICON_COL_ICON_HEIGHT,
  ICON_COL_BODY_HEIGHT,
  ICON_COL_TAKEAWAY_HEIGHT,
  ICON_COL_INNER_GAP,
  ICON_COL_TAKEAWAY_GAP,
  ICON_CARD_ACCENT_HEIGHT,
  ICON_CARD_ICON_HEIGHT,
  ICON_CARD_HEADING_HEIGHT,
  ICON_CARD_BODY_HEIGHT,
  ICON_CARD_PADDING,
  ICON_CARD_INNER_GAP,
  ICON_CARD_TAKEAWAY_HEIGHT,
  ICON_CARD_TAKEAWAY_GAP,
} from "./constants.js"
import type { Theme } from "../../schema/theme.js"
import type { SlideLayout } from "../../schema/presentation.js"
import type {
  TextBox,
  BorderBox,
  IconBox,
  LayoutResult,
} from "../../renderer/layout/types.js"
import type { IconColumnLayout, IconCardLayout } from "./schema.js"

// IconColumn dimensions (3 columns fixed)
interface IconColumnDimensions {
  readonly colWidth: number
  readonly colGap: number
}

function calculateIconColumnDimensions(titleY: number): IconColumnDimensions {
  const contentWidth = SLIDE_WIDTH - 2 * MARGIN_X
  const colGap = 0.2
  const colWidth = (contentWidth - 2 * colGap) / 3
  return { colWidth, colGap }
}

// IconColumnLayoutのレイアウト
export function layoutIconColumns(
  columns: readonly [{ heading: string; icon: string; body?: string }, { heading: string; icon: string; body?: string }, { heading: string; icon: string; body?: string }],
  takeaway: string | undefined,
  titleY: number,
  theme: Theme
): LayoutResult {
  const dims = calculateIconColumnDimensions(titleY)
  const borderBoxes: BorderBox[] = []
  const allTextBoxes: TextBox[] = []
  const iconBoxes: IconBox[] = []
  const padding = 0.1

  columns.forEach((col, i) => {
    const colX = MARGIN_X + i * (dims.colWidth + dims.colGap)
    let currentY = titleY + padding

    // Border box for column
    const colHeight = ICON_COL_HEADING_HEIGHT + ICON_COL_INNER_GAP + ICON_COL_ICON_HEIGHT + ICON_COL_INNER_GAP + ICON_COL_BODY_HEIGHT + 2 * padding
    borderBoxes.push({ x: colX, y: titleY, w: dims.colWidth, h: colHeight })

    // Heading
    allTextBoxes.push({
      x: colX + padding,
      y: currentY,
      w: dims.colWidth - 2 * padding,
      h: ICON_COL_HEADING_HEIGHT,
      text: col.heading,
      isBold: true,
      fontSize: theme.contentSlide.headingSize,
      color: theme.contentSlide.headingColor,
      align: "center",
      valign: "top",
    })
    currentY += ICON_COL_HEADING_HEIGHT + ICON_COL_INNER_GAP

    // Icon
    iconBoxes.push({
      x: colX + padding,
      y: currentY,
      w: dims.colWidth - 2 * padding,
      h: ICON_COL_ICON_HEIGHT,
      icon: col.icon,
      color: theme.contentSlide.iconColor,
    })
    currentY += ICON_COL_ICON_HEIGHT + ICON_COL_INNER_GAP

    // Body
    if (col.body) {
      allTextBoxes.push({
        x: colX + padding,
        y: currentY,
        w: dims.colWidth - 2 * padding,
        h: ICON_COL_BODY_HEIGHT,
        text: col.body,
        fontSize: theme.contentSlide.bodySize,
        color: theme.contentSlide.textColor,
        align: "center",
        valign: "top",
      })
    }
  })

  // Takeaway (icon-column uses its own takeaway positioning)
  if (takeaway) {
    const colHeight = ICON_COL_HEADING_HEIGHT + ICON_COL_INNER_GAP + ICON_COL_ICON_HEIGHT + ICON_COL_INNER_GAP + ICON_COL_BODY_HEIGHT + 2 * padding
    const takeawayY = titleY + colHeight + ICON_COL_TAKEAWAY_GAP
    allTextBoxes.push({
      x: MARGIN_X,
      y: takeawayY,
      w: SLIDE_WIDTH - 2 * MARGIN_X,
      h: ICON_COL_TAKEAWAY_HEIGHT,
      text: takeaway,
      isBold: true,
      fontSize: theme.contentSlide.takeawaySize,
      color: theme.contentSlide.takeawayColor,
      align: "center",
      valign: "middle",
    })
  }

  return { textBoxes: allTextBoxes, borderBoxes, iconBoxes }
}

// IconCardLayoutのレイアウト（カード背景 + アクセントバー + アイコン → 見出し → 本文）
export function layoutIconCards(
  columns: readonly [{ heading: string; icon: string; body?: string }, { heading: string; icon: string; body?: string }, { heading: string; icon: string; body?: string }],
  takeaway: string | undefined,
  titleY: number,
  theme: Theme
): LayoutResult {
  const contentWidth = SLIDE_WIDTH - 2 * MARGIN_X
  const colGap = 0.2
  const colWidth = (contentWidth - 2 * colGap) / 3
  const padding = ICON_CARD_PADDING

  const borderBoxes: BorderBox[] = []
  const allTextBoxes: TextBox[] = []
  const iconBoxes: IconBox[] = []

  const accentColors = theme.contentSlide.iconCardAccentColors
  const cardBg = theme.contentSlide.iconCardBackground

  columns.forEach((col, i) => {
    const colX = MARGIN_X + i * (colWidth + colGap)
    let currentY = titleY

    // Card height = accent + padding + icon + gap + heading + gap + body + padding
    const cardHeight = ICON_CARD_ACCENT_HEIGHT + padding + ICON_CARD_ICON_HEIGHT + ICON_CARD_INNER_GAP + ICON_CARD_HEADING_HEIGHT + ICON_CARD_INNER_GAP + ICON_CARD_BODY_HEIGHT + padding

    // Border box for card (background + accent)
    borderBoxes.push({
      x: colX,
      y: titleY,
      w: colWidth,
      h: cardHeight,
      fillColor: cardBg,
      accentColor: accentColors[i % accentColors.length],
    })

    // Move past accent bar
    currentY += ICON_CARD_ACCENT_HEIGHT + padding

    // Icon (colored to match accent)
    iconBoxes.push({
      x: colX + padding,
      y: currentY,
      w: colWidth - 2 * padding,
      h: ICON_CARD_ICON_HEIGHT,
      icon: col.icon,
      color: accentColors[i % accentColors.length],
    })
    currentY += ICON_CARD_ICON_HEIGHT + ICON_CARD_INNER_GAP

    // Heading (bold, centered)
    allTextBoxes.push({
      x: colX + padding,
      y: currentY,
      w: colWidth - 2 * padding,
      h: ICON_CARD_HEADING_HEIGHT,
      text: col.heading,
      isBold: true,
      fontSize: theme.contentSlide.iconCardHeadingSize,
      color: theme.contentSlide.headingColor,
      align: "center",
      valign: "top",
    })
    currentY += ICON_CARD_HEADING_HEIGHT + ICON_CARD_INNER_GAP

    // Body (left-aligned)
    if (col.body) {
      allTextBoxes.push({
        x: colX + padding,
        y: currentY,
        w: colWidth - 2 * padding,
        h: ICON_CARD_BODY_HEIGHT,
        text: col.body,
        fontSize: theme.contentSlide.iconCardBodySize,
        color: theme.contentSlide.textColor,
        align: "left",
        valign: "top",
      })
    }
  })

  // Takeaway (icon-card uses its own takeaway positioning)
  if (takeaway) {
    const cardHeight = ICON_CARD_ACCENT_HEIGHT + padding + ICON_CARD_ICON_HEIGHT + ICON_CARD_INNER_GAP + ICON_CARD_HEADING_HEIGHT + ICON_CARD_INNER_GAP + ICON_CARD_BODY_HEIGHT + padding
    const takeawayY = titleY + cardHeight + ICON_CARD_TAKEAWAY_GAP
    allTextBoxes.push({
      x: MARGIN_X,
      y: takeawayY,
      w: SLIDE_WIDTH - 2 * MARGIN_X,
      h: ICON_CARD_TAKEAWAY_HEIGHT,
      text: takeaway,
      isBold: true,
      fontSize: theme.contentSlide.takeawaySize,
      color: theme.contentSlide.takeawayColor,
      align: "center",
      valign: "middle",
    })
  }

  return { textBoxes: allTextBoxes, borderBoxes, iconBoxes }
}

// Layout handlers for plugin registration
export const handleIconColumnLayout = (
  layout: SlideLayout,
  titleY: number,
  theme: Theme
): O.Option<LayoutResult> => {
  if (layout._tag !== "IconColumn") return O.none()
  const l = layout as IconColumnLayout
  return O.some(layoutIconColumns(l.columns, l.takeaway, titleY, theme))
}

export const handleIconCardLayout = (
  layout: SlideLayout,
  titleY: number,
  theme: Theme
): O.Option<LayoutResult> => {
  if (layout._tag !== "IconCard") return O.none()
  const l = layout as IconCardLayout
  return O.some(layoutIconCards(l.columns, l.takeaway, titleY, theme))
}
