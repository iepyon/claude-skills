import { Option as O } from "effect"
import {
  SLIDE_WIDTH,
  SLIDE_HEIGHT,
  MARGIN_X,
  MARGIN_Y,
} from "../../constants.js"
import type { SlideLayout, Theme } from "../../schema/index.js"
import type { TextBox, BorderBox, ShapeBox, LayoutResult } from "../../renderer/layout/types.js"
import { reservedForTakeaway, withTakeaway } from "../../renderer/layout/helpers.js"
import { hasListMarker, parseBlockToParagraphs } from "../../parser/block-formatter.js"
import { TextOnlyLayout } from "./schema.js"

const PADDING = 0.15
const ACCENT_BAR_WIDTH = 0.06

export function layoutTextOnly(
  body: string,
  takeaway: string | undefined,
  titleY: number,
  theme: Theme
): LayoutResult {
  const contentWidth = SLIDE_WIDTH - 2 * MARGIN_X
  const reserved = reservedForTakeaway(takeaway)
  const availableHeight = SLIDE_HEIGHT - titleY - MARGIN_Y - reserved

  const fontSize = theme.contentSlide.bodySize
  const accentColor = theme.contentSlide.headingColor

  const borderBoxes: BorderBox[] = [{
    x: MARGIN_X,
    y: titleY,
    w: contentWidth,
    h: availableHeight,
  }]

  // 左端アクセントバー（ボーダーの内側に配置）
  const BORDER_INSET = 0.03
  const shapeBoxes: ShapeBox[] = [{
    x: MARGIN_X + BORDER_INSET,
    y: titleY + BORDER_INSET,
    w: ACCENT_BAR_WIDTH,
    h: availableHeight - 2 * BORDER_INSET,
    shapeType: "rect",
    fillColor: accentColor,
  }]

  const textBoxes: TextBox[] = [{
    x: MARGIN_X + ACCENT_BAR_WIDTH + PADDING,
    y: titleY + PADDING,
    w: contentWidth - ACCENT_BAR_WIDTH - 2 * PADDING,
    h: availableHeight - 2 * PADDING,
    ...(hasListMarker(body)
      ? { paragraphs: parseBlockToParagraphs(body) }
      : { text: body }),
    fontSize,
    color: theme.contentSlide.textColor,
    valign: "top",
  }]

  return withTakeaway({ textBoxes, borderBoxes, shapeBoxes }, takeaway, theme)
}

// Layout handler for plugin registration
export const handleTextOnlyLayout = (
  layout: SlideLayout,
  titleY: number,
  theme: Theme
): O.Option<LayoutResult> => {
  if (layout._tag !== "TextOnly") return O.none()
  const l = layout as TextOnlyLayout
  return O.some(layoutTextOnly(l.body, l.takeaway, titleY, theme))
}
