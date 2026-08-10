import { pipe, Effect, Array as A } from "effect"
import { Presentation } from "../schema/index.js"
import { ParseError } from "../errors.js"
import { Token } from "./tokenizer.js"
import { initialState, type ParseOptions } from "./builder-types.js"
import { saveSlide } from "./builder-state.js"
import { assignSlideIds } from "./slide-ids.js"
import { processToken } from "./handlers/index.js"

export function buildAST(
  tokens: Token[],
  options: ParseOptions = {}
): Effect.Effect<Presentation, ParseError> {
  return Effect.sync(() => {
    const finalState = pipe(
      tokens,
      A.reduce(initialState(options), processToken),
      saveSlide
    )

    // 変換と ID 採番はまとめて assignSlideIds が行う。
    // ID 採番には raw.title が要る（converter の出力からは読めない場合がある）ので、
    // 変換と分離できない。
    const slides = assignSlideIds(finalState.slides)
    return new Presentation({ slides })
  })
}
