import {
  SLIDE_WIDTH,
  SLIDE_HEIGHT,
  MARGIN_X,
  MARGIN_Y,
  CODE_CAPTION_HEIGHT,
  CODE_CAPTION_GAP,
} from "../../constants.js"
import { Theme } from "../../schema/index.js"
import { highlightForPptx } from "../syntax-highlighter.js"
import {
  TextBox,
  CodeBox,
  LayoutResult,
} from "./types.js"

// HOOK: CodeDisplayLayoutのレイアウト
export function layoutCodeDisplay(
  language: string,
  code: string,
  caption: string | undefined,
  titleY: number,
  theme: Theme
): LayoutResult {
  const textBoxes: TextBox[] = []
  const codeBoxes: CodeBox[] = []
  let currentY = titleY

  // コードボックス（ダーク背景 + シンタックスハイライト）
  const availableHeight = SLIDE_HEIGHT - currentY - MARGIN_Y
  const codeHeight = caption
    ? availableHeight - CODE_CAPTION_HEIGHT - CODE_CAPTION_GAP
    : availableHeight

  const textRuns = highlightForPptx(code, language, theme.codeDisplay.textColor)

  codeBoxes.push({
    x: MARGIN_X,
    y: currentY,
    w: SLIDE_WIDTH - 2 * MARGIN_X,
    h: codeHeight,
    language,
    code,
    textRuns,
    backgroundColor: theme.codeDisplay.backgroundColor,
    fontFace: theme.fonts.code,
    fontSize: theme.codeDisplay.fontSize,
    lineHeight: theme.codeDisplay.lineHeight,
  })
  currentY += codeHeight

  // キャプション（任意）
  if (caption) {
    currentY += CODE_CAPTION_GAP
    textBoxes.push({
      x: MARGIN_X,
      y: currentY,
      w: SLIDE_WIDTH - 2 * MARGIN_X,
      h: CODE_CAPTION_HEIGHT,
      text: caption,
      fontSize: theme.codeDisplay.captionSize,
      color: theme.codeDisplay.captionColor,
      align: "left",
    })
  }

  return { textBoxes, codeBoxes }
}
