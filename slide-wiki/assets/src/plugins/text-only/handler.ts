import { Option as O } from "effect"
import { ParseError } from "../../errors.js"
import type { BuilderState } from "../../parser/builder-types.js"
import type { Token } from "../../parser/tokenizer.js"
import { saveSection } from "../../parser/builder-state.js"

function getTextOnlyBody(state: BuilderState): string | undefined {
  return state.currentSlide.pipe(
    O.map((s) => s.pluginData?.["textOnlyBody"] as string | undefined),
    O.getOrUndefined,
  )
}

function setTextOnlyBody(slide: { pluginData?: Record<string, unknown> }, body: string): Record<string, unknown> {
  return { ...slide.pluginData, textOnlyBody: body }
}

// TextOnlyDirective: テキストオンリーモード開始
export const handleTextOnlyDirective = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (!(token.type === "PluginDirective" && token.pluginId === "text-only")) return O.none()

  if (O.isNone(state.currentSlide) || state.currentSlide.value.type !== "content") {
    throw new ParseError({ message: "TextOnlyDirective requires a content slide", line: token.line })
  }

  const afterSection = saveSection(state)
  if (O.isNone(afterSection.currentSlide)) return O.some(afterSection)

  const slide = afterSection.currentSlide.value
  return O.some({
    ...afterSection,
    currentSlide: O.some({
      ...slide,
      pluginData: { textOnlyBody: "" },
      sections: undefined,
    }),
    mode: "text-only",
  })
}

// BodyText in TextOnly mode: テキストを追加
export const handleBodyTextInTextOnly = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (token.type !== "BodyText" || state.mode !== "text-only") return O.none()

  if (O.isNone(state.currentSlide)) return O.some(state)

  const slide = state.currentSlide.value
  const body = getTextOnlyBody(state)
  if (body === undefined) return O.some(state)

  const separator = body.length > 0 ? "\n" : ""
  return O.some({
    ...state,
    currentSlide: O.some({
      ...slide,
      pluginData: setTextOnlyBody(slide, body + separator + token.text),
    }),
  })
}

// BlankLine in TextOnly mode: パラグラフ区切り（\n\n）
export const handleBlankLineInTextOnly = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (token.type !== "BlankLine" || state.mode !== "text-only") return O.none()

  if (O.isNone(state.currentSlide)) return O.some(state)

  const slide = state.currentSlide.value
  const body = getTextOnlyBody(state)
  if (body === undefined) return O.some(state)

  // bodyが空の場合は無視（ディレクティブ直後の空行をスキップ）
  if (body.length === 0) return O.some(state)

  // 空行を追加して段落区切りにする
  return O.some({
    ...state,
    currentSlide: O.some({
      ...slide,
      pluginData: setTextOnlyBody(slide, body + "\n"),
    }),
  })
}

// H3 in TextOnly mode: 見出しテキストをbodyに追加（セクション作成を防止）
export const handleH3InTextOnly = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (token.type !== "H3" || state.mode !== "text-only") return O.none()

  if (O.isNone(state.currentSlide)) return O.some(state)

  const slide = state.currentSlide.value
  const body = getTextOnlyBody(state)
  if (body === undefined) return O.some(state)

  const separator = body.length > 0 ? "\n" : ""
  return O.some({
    ...state,
    currentSlide: O.some({
      ...slide,
      pluginData: setTextOnlyBody(slide, body + separator + token.text),
    }),
  })
}

export const textOnlyModeHandlers = [
  handleBodyTextInTextOnly,
  handleBlankLineInTextOnly,
  handleH3InTextOnly,
]
