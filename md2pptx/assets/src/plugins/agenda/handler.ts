import { Option as O } from "effect"
import { ParseError } from "../../errors.js"
import type { BuilderState } from "../../parser/builder-types.js"
import type { Token } from "../../parser/tokenizer.js"
import { saveSection } from "../../parser/builder-state.js"

// AgendaDirective: アジェンダモード開始
export const handleAgendaDirective = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (!(token.type === "PluginDirective" && token.pluginId === "agenda")) return O.none()

  if (O.isNone(state.currentSlide) || state.currentSlide.value.type !== "content") {
    throw new ParseError({ message: "AgendaDirective requires a content slide", line: token.line })
  }

  const afterSection = saveSection(state)
  if (O.isNone(afterSection.currentSlide)) return O.some(afterSection)

  const slide = afterSection.currentSlide.value
  return O.some({
    ...afterSection,
    currentSlide: O.some({
      ...slide,
      pluginData: { agendaItems: [], agendaSubtitle: "" },
      sections: undefined,
    }),
    mode: "agenda",
  })
}

// BodyText in Agenda mode: H3前はサブタイトルに蓄積
export const handleBodyTextInAgenda = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (token.type !== "BodyText" || state.mode !== "agenda") return O.none()

  if (O.isNone(state.currentSlide)) return O.some(state)

  const slide = state.currentSlide.value
  const items = slide.pluginData?.["agendaItems"] as unknown[] | undefined
  if (!items) return O.some(state)

  // H3が既にある場合は標準ハンドラに委譲
  if (items.length > 0) return O.none()

  // H3前のBodyTextはサブタイトルに蓄積
  const existing = (slide.pluginData?.["agendaSubtitle"] as string) || ""
  const separator = existing.length > 0 ? "\n" : ""
  return O.some({
    ...state,
    currentSlide: O.some({
      ...slide,
      pluginData: { ...slide.pluginData, agendaSubtitle: existing + separator + token.text },
    }),
  })
}

// BlankLine in Agenda mode: 吸収
export const handleBlankLineInAgenda = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (token.type !== "BlankLine" || state.mode !== "agenda") return O.none()
  return O.some(state)
}

export const agendaModeHandlers = [
  handleBodyTextInAgenda,
  handleBlankLineInAgenda,
]
