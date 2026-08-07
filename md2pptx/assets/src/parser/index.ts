import "../plugins/index.js"
import { Effect } from "effect"
import { ParseError } from "../errors.js"
import { Presentation } from "../schema/index.js"
import { tokenize } from "./tokenizer.js"
import { buildAST } from "./ast-builder.js"

export function parseMarkdown(markdown: string): Effect.Effect<Presentation, ParseError> {
  return Effect.gen(function* () {
    const tokens = tokenize(markdown)
    const pres = yield* buildAST(tokens)
    return pres
  })
}
