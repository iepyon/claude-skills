import { Option as O } from "effect"
import {
  SLIDE_WIDTH,
  SLIDE_HEIGHT,
  MARGIN_X,
  MARGIN_Y,
} from "../../constants.js"
import type { SlideLayout, Theme } from "../../schema/index.js"
import type { TextBox, ShapeBox, LayoutResult } from "../../renderer/layout/types.js"
import { estimateTextHeight } from "../../renderer/layout/helpers.js"
import { QuoteLayout } from "./schema.js"
import {
  QUOTE_MARK_HEIGHT,
  QUOTE_MARK_SIZE,
  QUOTE_BODY_SIZE,
  QUOTE_INDENT,
  QUOTE_LINE_WIDTH_IN,
  QUOTE_LINE_THICKNESS,
  QUOTE_LINE_GAP,
  QUOTE_AUTHOR_GAP,
  QUOTE_AUTHOR_SIZE,
} from "./constants.js"

export function layoutQuote(
  body: string,
  author: string | undefined,
  titleY: number,
  theme: Theme
): LayoutResult {
  const contentWidth = SLIDE_WIDTH - 2 * MARGIN_X

  const textBoxes: TextBox[] = []
  const shapeBoxes: ShapeBox[] = []

  const indentX = MARGIN_X + QUOTE_INDENT
  const textWidth = contentWidth - QUOTE_INDENT

  // Quote mark "\u201C"
  const quoteMarkY = titleY
  textBoxes.push({
    x: indentX,
    y: quoteMarkY,
    w: textWidth,
    h: QUOTE_MARK_HEIGHT,
    text: "\u201C",
    fontSize: QUOTE_MARK_SIZE,
    color: theme.border.color,
    valign: "top",
  })

  // Quote body (italic)
  const bodyY = quoteMarkY + QUOTE_MARK_HEIGHT
  const maxBodyHeight = SLIDE_HEIGHT - bodyY - MARGIN_Y
    - (author ? QUOTE_LINE_GAP + 0.02 + QUOTE_AUTHOR_GAP + 0.3 : 0)
  const estimatedHeight = estimateTextHeight(body, QUOTE_BODY_SIZE, textWidth)
  const bodyHeight = Math.min(estimatedHeight, maxBodyHeight)

  textBoxes.push({
    x: indentX,
    y: bodyY,
    w: textWidth,
    h: bodyHeight,
    text: body,
    isItalic: true,
    fontSize: QUOTE_BODY_SIZE,
    color: "6B7280",
    valign: "top",
  })

  // Accent line + author (if present)
  if (author) {
    const lineY = bodyY + bodyHeight + QUOTE_LINE_GAP
    const lineCenterX = indentX + textWidth / 2 - QUOTE_LINE_WIDTH_IN / 2

    shapeBoxes.push({
      x: lineCenterX,
      y: lineY,
      w: QUOTE_LINE_WIDTH_IN,
      h: 0,
      shapeType: "line",
      fillColor: theme.contentSlide.headingColor,
      lineWidth: QUOTE_LINE_THICKNESS,
      lineColor: theme.contentSlide.headingColor,
    })

    const authorY = lineY + 0.02 + QUOTE_AUTHOR_GAP
    textBoxes.push({
      x: indentX,
      y: authorY,
      w: textWidth,
      h: 0.3,
      text: `\u2014 ${author}`,
      fontSize: QUOTE_AUTHOR_SIZE,
      color: theme.contentSlide.textColor,
      align: "center",
      valign: "top",
    })
  }

  return { textBoxes, shapeBoxes }
}

// Layout handler for plugin registration
export const handleQuoteLayout = (
  layout: SlideLayout,
  titleY: number,
  theme: Theme
): O.Option<LayoutResult> => {
  if (layout._tag !== "Quote") return O.none()
  const l = layout as QuoteLayout
  return O.some(layoutQuote(l.body, l.author, titleY, theme))
}
