import { pipe, Effect, Array as A } from "effect"
import { Presentation } from "../schema/index.js"
import { ParseError } from "../errors.js"
import { Token } from "./tokenizer.js"
import { initialState } from "./builder-types.js"
import { saveSlide } from "./builder-state.js"
import { rawSlideToSlide } from "./slide-converter.js"
import { processToken } from "./handlers/index.js"

export function buildAST(tokens: Token[]): Effect.Effect<Presentation, ParseError> {
  return Effect.sync(() => {
    const finalState = pipe(
      tokens,
      A.reduce(initialState, processToken),
      saveSlide
    )

    const slides = finalState.slides.flatMap(rawSlideToSlide)
    return new Presentation({ slides })
  })
}
