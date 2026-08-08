import "../plugins/index.js"
import { Effect } from "effect"
import { ParseError } from "../errors.js"
import { Presentation } from "../schema/index.js"
import { tokenize, type Token } from "./tokenizer.js"
import { buildAST } from "./ast-builder.js"

export function parseMarkdown(markdown: string): Effect.Effect<Presentation, ParseError> {
  return parseTokens(tokenize(markdown))
}

/**
 * トークン列から先の解析。lint と AST 構築が同じトークン列を共有するための入口
 * （さもないと1つのデッキを2度トークン化することになる）。
 */
export function parseTokens(tokens: readonly Token[]): Effect.Effect<Presentation, ParseError> {
  return Effect.gen(function* () {
    return yield* buildAST([...tokens])
  })
}
