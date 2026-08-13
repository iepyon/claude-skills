import { Option as O } from "effect"
import { ParseError } from "../../errors.js"
import type { BuilderState } from "../../parser/builder-types.js"
import type { Token } from "../../parser/tokenizer.js"
import { saveSection } from "../../parser/builder-state.js"

// StepsDirective: 段階的成長図レイアウト
export const handleStepsDirective = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (!(token.type === "PluginDirective" && token.pluginId === "steps")) return O.none()

  if (O.isNone(state.currentSlide) || state.currentSlide.value.type !== "content") {
    throw new ParseError({ message: "StepsDirective requires a content slide", line: token.line })
  }

  const afterSection = saveSection(state)
  if (O.isNone(afterSection.currentSlide)) return O.some(afterSection)

  const slide = afterSection.currentSlide.value
  return O.some({
    ...afterSection,
    currentSlide: O.some({
      ...slide,
      pluginData: { stepsData: [] },
      sections: undefined,
    }),
    mode: "steps",
  })
}

// IconDirective in Steps mode: attach icon to current section
const handleIconInSteps = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (token.type !== "IconDirective" || state.mode !== "steps") return O.none()

  if (O.isNone(state.currentSection)) {
    return O.some(state)
  }

  const section = state.currentSection.value
  return O.some({
    ...state,
    currentSection: O.some({ ...section, icon: token.icon }),
  })
}

export const stepsModeHandlers = [handleIconInSteps]
