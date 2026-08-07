import { Option as O } from "effect"
import { ParseError } from "../../errors.js"
import type { BuilderState } from "../../parser/builder-types.js"
import type { Token } from "../../parser/tokenizer.js"
import { saveSection } from "../../parser/builder-state.js"

// IconColDirective: アイコンカラムレイアウト
export const handleIconColDirective = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (!(token.type === "PluginDirective" && token.pluginId === "icon-cols")) return O.none()

  if (O.isNone(state.currentSlide) || state.currentSlide.value.type !== "content") {
    throw new ParseError({ message: "IconColDirective requires a content slide", line: token.line })
  }

  const afterSection = saveSection(state)
  if (O.isNone(afterSection.currentSlide)) return O.some(afterSection)

  const slide = afterSection.currentSlide.value
  return O.some({
    ...afterSection,
    currentSlide: O.some({
      ...slide,
      pluginData: { iconColumns: [] },
      sections: undefined,
    }),
    mode: "icon-cols",
  })
}

// IconCardDirective: アイコンカードレイアウト
export const handleIconCardDirective = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (!(token.type === "PluginDirective" && token.pluginId === "icon-cards")) return O.none()

  if (O.isNone(state.currentSlide) || state.currentSlide.value.type !== "content") {
    throw new ParseError({ message: "IconCardDirective requires a content slide", line: token.line })
  }

  const afterSection = saveSection(state)
  if (O.isNone(afterSection.currentSlide)) return O.some(afterSection)

  const slide = afterSection.currentSlide.value
  return O.some({
    ...afterSection,
    currentSlide: O.some({
      ...slide,
      pluginData: { iconColumns: [], iconCardMode: true },
      sections: undefined,
    }),
    mode: "icon-cards",
  })
}

// IconDirective in icon-cols/icon-cards mode: attach icon to current section
export const handleIconInIconLayout = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (token.type !== "IconDirective") return O.none()
  if (state.mode !== "icon-cols" && state.mode !== "icon-cards") return O.none()

  if (O.isNone(state.currentSection)) {
    return O.some(state)
  }

  const section = state.currentSection.value
  return O.some({
    ...state,
    currentSection: O.some({ ...section, icon: token.icon }),
  })
}

export const iconLayoutModeHandlers = [handleIconInIconLayout]
