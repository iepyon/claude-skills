import { Option as O } from "effect"
import { ParseError } from "../../errors.js"
import type { BuilderState } from "../../parser/builder-types.js"
import type { Token } from "../../parser/tokenizer.js"
import { saveSection } from "../../parser/builder-state.js"

function getQuoteBody(state: BuilderState): string | undefined {
  return state.currentSlide.pipe(
    O.map((s) => s.pluginData?.["quoteBody"] as string | undefined),
    O.getOrUndefined,
  )
}

function setQuoteData(
  slide: { pluginData?: Record<string, unknown> },
  updates: Record<string, unknown>
): Record<string, unknown> {
  return { ...slide.pluginData, ...updates }
}

// QuoteDirective: quote モード開始
export const handleQuoteDirective = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (!(token.type === "PluginDirective" && token.pluginId === "quote")) return O.none()

  if (O.isNone(state.currentSlide) || state.currentSlide.value.type !== "content") {
    throw new ParseError({ message: "QuoteDirective requires a content slide", line: token.line })
  }

  const afterSection = saveSection(state)
  if (O.isNone(afterSection.currentSlide)) return O.some(afterSection)

  const slide = afterSection.currentSlide.value
  return O.some({
    ...afterSection,
    currentSlide: O.some({
      ...slide,
      pluginData: { quoteBody: "", quoteAuthor: undefined },
      sections: undefined,
    }),
    mode: "quote",
  })
}

// BodyText in Quote mode: テキストを追加
const handleBodyTextInQuote = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (token.type !== "BodyText" || state.mode !== "quote") return O.none()

  if (O.isNone(state.currentSlide)) return O.some(state)

  const slide = state.currentSlide.value
  const body = getQuoteBody(state)
  if (body === undefined) return O.some(state)

  const separator = body.length > 0 ? "\n" : ""
  return O.some({
    ...state,
    currentSlide: O.some({
      ...slide,
      pluginData: setQuoteData(slide, { quoteBody: body + separator + token.text }),
    }),
  })
}

// BlankLine in Quote mode: パラグラフ区切り
const handleBlankLineInQuote = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (token.type !== "BlankLine" || state.mode !== "quote") return O.none()

  if (O.isNone(state.currentSlide)) return O.some(state)

  const slide = state.currentSlide.value
  const body = getQuoteBody(state)
  if (body === undefined) return O.some(state)

  if (body.length === 0) return O.some(state)

  return O.some({
    ...state,
    currentSlide: O.some({
      ...slide,
      pluginData: setQuoteData(slide, { quoteBody: body + "\n" }),
    }),
  })
}

// H3 in Quote mode: author 設定
const handleH3InQuote = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (token.type !== "H3" || state.mode !== "quote") return O.none()

  if (O.isNone(state.currentSlide)) return O.some(state)

  const slide = state.currentSlide.value
  return O.some({
    ...state,
    currentSlide: O.some({
      ...slide,
      pluginData: setQuoteData(slide, { quoteAuthor: token.text }),
    }),
  })
}

export const quoteModeHandlers = [
  handleBodyTextInQuote,
  handleBlankLineInQuote,
  handleH3InQuote,
]
