import "../plugins/index.js"
import { Effect } from "effect"
import { ParseError } from "../errors.js"
import { Presentation } from "../schema/index.js"
import { tokenize, type Token } from "./tokenizer.js"
import { buildAST } from "./ast-builder.js"
import type { ParseOptions } from "./builder-types.js"

export type { ParseOptions }

export function parseMarkdown(
  markdown: string,
  options: ParseOptions = {}
): Effect.Effect<Presentation, ParseError> {
  return parseTokens(tokenize(markdown), options)
}

/**
 * トークン列から先の解析。lint と AST 構築が同じトークン列を共有するための入口
 * （さもないと1つのデッキを2度トークン化することになる）。
 */
export function parseTokens(
  tokens: readonly Token[],
  options: ParseOptions = {}
): Effect.Effect<Presentation, ParseError> {
  return Effect.gen(function* () {
    return yield* buildAST([...tokens], options)
  })
}
