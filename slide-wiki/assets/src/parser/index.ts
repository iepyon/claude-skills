import "../plugins/index.js"
import { Effect } from "effect"
import { ParseError } from "../errors.js"
import { Presentation } from "../schema/index.js"
import { tokenize, type Token } from "./tokenizer.js"
import { buildAST } from "./ast-builder.js"
import { splitFrontmatter } from "../ontology/frontmatter.js"
import type { ParseOptions } from "./builder-types.js"

export type { ParseOptions }

/**
 * 生の md を受け取る入口。**冒頭の frontmatter はここで剥がす。**
 *
 * `prepare()`（pipeline.ts）と同じ処理をしているのは、この関数が `--verify` の
 * AST 経路と多くのテストの入口でもあるため。片方だけ剥がすと、同じデッキから
 * 違うトークン列が出て3者比較が原因の分かりにくい形で落ちる。
 */
export function parseMarkdown(
  markdown: string,
  options: ParseOptions = {}
): Effect.Effect<Presentation, ParseError> {
  return parseTokens(tokenize(splitFrontmatter(markdown).body), options)
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
