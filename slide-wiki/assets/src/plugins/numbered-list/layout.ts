import { Option as O } from "effect"
import {
  SLIDE_WIDTH,
  SLIDE_HEIGHT,
  MARGIN_X,
  MARGIN_Y,
} from "../../constants.js"
import {
  NUMBERED_LIST_ITEM_GAP,
  NUMBERED_LIST_CIRCLE_DIAMETER,
  NUMBERED_LIST_CIRCLE_TEXT_GAP,
  NUMBERED_LIST_BAR_BADGE_SIZE,
  NUMBERED_LIST_BAR_WIDTH,
  NUMBERED_LIST_BAR_TEXT_GAP,
} from "./constants.js"
import type { SlideLayout, Theme } from "../../schema/index.js"
import { TextBlock } from "../../schema/index.js"
import type {
  TextBox,
  ShapeBox,
  LayoutResult,
} from "../../renderer/layout/types.js"
import {
  reservedForTakeaway,
  withTakeaway,
} from "../../renderer/layout/helpers.js"
import { NumberedListLayout } from "./schema.js"

// NumberedList Circle variant
export function layoutNumberedListCircle(
  items: readonly TextBlock[],
  titleY: number,
  theme: Theme,
  takeaway?: string
): LayoutResult {
  const reservedBottom = reservedForTakeaway(takeaway)
  const availableHeight = SLIDE_HEIGHT - titleY - MARGIN_Y - reservedBottom
  const contentWidth = SLIDE_WIDTH - 2 * MARGIN_X
  const itemCount = items.length
  const totalGaps = (itemCount - 1) * NUMBERED_LIST_ITEM_GAP
  const itemHeight = (availableHeight - totalGaps) / itemCount
  const badgeColors = theme.numberedList.badgeColors

  const textBoxes: TextBox[] = []
  const shapeBoxes: ShapeBox[] = []

  items.forEach((item, i) => {
    const itemY = titleY + i * (itemHeight + NUMBERED_LIST_ITEM_GAP)
    const badgeColor = badgeColors[i % badgeColors.length]

    // Compact text layout: fixed heights for heading and body
    const headingH = 0.22
    const bodyH = 0.22
    const headingBodyGap = 0.02
    const textBlockH = headingH + headingBodyGap + bodyH
    const textTopY = itemY + (itemHeight - textBlockH) / 2

    // Badge (circle) — vertically centered against text block
    const badgeCenterY = textTopY + (textBlockH - NUMBERED_LIST_CIRCLE_DIAMETER) / 2
    shapeBoxes.push({
      x: MARGIN_X,
      y: badgeCenterY,
      w: NUMBERED_LIST_CIRCLE_DIAMETER,
      h: NUMBERED_LIST_CIRCLE_DIAMETER,
      shapeType: "ellipse",
      fillColor: badgeColor,
      text: String(i + 1),
      textColor: theme.numberedList.badgeTextColor,
      fontSize: 14,
      isBold: true,
    })

    // Text area to the right of badge
    const textX = MARGIN_X + NUMBERED_LIST_CIRCLE_DIAMETER + NUMBERED_LIST_CIRCLE_TEXT_GAP
    const textW = contentWidth - NUMBERED_LIST_CIRCLE_DIAMETER - NUMBERED_LIST_CIRCLE_TEXT_GAP

    // Heading
    if (item.heading) {
      textBoxes.push({
        x: textX,
        y: textTopY,
        w: textW,
        h: headingH,
        text: item.heading,
        isBold: true,
        fontSize: theme.numberedList.headingSize,
        color: theme.contentSlide.headingColor,
        valign: "bottom",
      })
    }

    // Body
    if (item.body) {
      textBoxes.push({
        x: textX,
        y: textTopY + headingH + headingBodyGap,
        w: textW,
        h: bodyH,
        text: item.body,
        fontSize: theme.numberedList.bodySize,
        color: theme.contentSlide.textColor,
        valign: "top",
      })
    }

    // Separator line (except last item)
    if (i < itemCount - 1) {
      const sepY = itemY + itemHeight
      shapeBoxes.push({
        x: MARGIN_X,
        y: sepY,
        w: contentWidth,
        h: 0,
        shapeType: "line",
        fillColor: "",
        lineWidth: 1,
        lineColor: theme.numberedList.separatorColor,
      })
    }
  })

  return withTakeaway({ textBoxes, shapeBoxes }, takeaway, theme)
}

// NumberedList Bar variant
export function layoutNumberedListBar(
  items: readonly TextBlock[],
  titleY: number,
  theme: Theme,
  takeaway?: string
): LayoutResult {
  const reservedBottom = reservedForTakeaway(takeaway)
  const availableHeight = SLIDE_HEIGHT - titleY - MARGIN_Y - reservedBottom
  const contentWidth = SLIDE_WIDTH - 2 * MARGIN_X
  const itemCount = items.length
  const totalGaps = (itemCount - 1) * NUMBERED_LIST_ITEM_GAP
  const itemHeight = (availableHeight - totalGaps) / itemCount
  const badgeColors = theme.numberedList.badgeColors

  const textBoxes: TextBox[] = []
  const shapeBoxes: ShapeBox[] = []

  items.forEach((item, i) => {
    const itemY = titleY + i * (itemHeight + NUMBERED_LIST_ITEM_GAP)
    const badgeColor = badgeColors[i % badgeColors.length]

    // Alternating row background (odd rows)
    if (i % 2 === 1) {
      shapeBoxes.push({
        x: MARGIN_X,
        y: itemY,
        w: contentWidth,
        h: itemHeight,
        shapeType: "rect",
        fillColor: theme.numberedList.altRowColor,
      })
    }

    // Badge (rect)
    const badgeCenterY = itemY + itemHeight / 2 - NUMBERED_LIST_BAR_BADGE_SIZE / 2
    shapeBoxes.push({
      x: MARGIN_X + 0.1,
      y: badgeCenterY,
      w: NUMBERED_LIST_BAR_BADGE_SIZE,
      h: NUMBERED_LIST_BAR_BADGE_SIZE,
      shapeType: "rect",
      fillColor: badgeColor,
      text: String(i + 1),
      textColor: theme.numberedList.badgeTextColor,
      fontSize: 12,
      isBold: true,
      rectRadius: 0.04,
    })

    // Accent bar
    const barX = MARGIN_X + 0.1 + NUMBERED_LIST_BAR_BADGE_SIZE + 0.08
    shapeBoxes.push({
      x: barX,
      y: itemY + 0.06,
      w: NUMBERED_LIST_BAR_WIDTH,
      h: itemHeight - 0.12,
      shapeType: "rect",
      fillColor: badgeColor,
    })

    // Text area: heading and body side by side
    const textX = barX + NUMBERED_LIST_BAR_WIDTH + NUMBERED_LIST_BAR_TEXT_GAP
    const totalTextW = contentWidth - (textX - MARGIN_X)
    const headingW = totalTextW * 0.22 // 見出し幅（9文字想定）
    const bodyGap = 0.05
    const bodyX = textX + headingW + bodyGap
    const bodyW = totalTextW - headingW - bodyGap

    // Heading (left side)
    if (item.heading) {
      textBoxes.push({
        x: textX,
        y: itemY,
        w: headingW,
        h: itemHeight,
        text: item.heading,
        isBold: true,
        fontSize: theme.numberedList.headingSize,
        color: theme.contentSlide.headingColor,
        valign: "middle",
      })
    }

    // Body (right side, aligned)
    if (item.body) {
      textBoxes.push({
        x: bodyX,
        y: itemY,
        w: bodyW,
        h: itemHeight,
        text: item.body,
        fontSize: theme.numberedList.bodySize,
        color: theme.contentSlide.textColor,
        valign: "middle",
      })
    }
  })

  return withTakeaway({ textBoxes, shapeBoxes }, takeaway, theme)
}

// NumberedList layout dispatch
export function layoutNumberedList(
  variant: "circle" | "bar",
  items: readonly TextBlock[],
  titleY: number,
  theme: Theme,
  takeaway?: string
): LayoutResult {
  return variant === "circle"
    ? layoutNumberedListCircle(items, titleY, theme, takeaway)
    : layoutNumberedListBar(items, titleY, theme, takeaway)
}

// Layout handler for plugin dispatch
export const handleNumberedListLayout = (
  layout: SlideLayout,
  titleY: number,
  theme: Theme
): O.Option<LayoutResult> => {
  if (layout._tag !== "NumberedList") return O.none()
  const l = layout as NumberedListLayout
  return O.some(layoutNumberedList(l.variant, l.items, titleY, theme, l.takeaway))
}
