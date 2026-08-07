import "./plugins/index.js"
import { Effect } from "effect"
import { Md2PptxError } from "./errors.js"
import { parseMarkdown } from "./parser/index.js"
import { validatePresentation, Theme, DEFAULT_THEME } from "./schema/index.js"
import { renderPresentation, renderToHtml, RenderOptions } from "./renderer/index.js"
import { validateLayout } from "./renderer/layout/validate-layout.js"

export interface Md2PptxOptions {
  compression?: boolean
  theme?: Theme
}

export function md2pptx(
  markdown: string,
  options: Md2PptxOptions = {}
): Effect.Effect<Buffer, Md2PptxError> {
  return Effect.gen(function* () {
    // レイアウト検証がテーマを必要とするため、ここで確定させる
    const theme = options.theme ?? DEFAULT_THEME

    // Stage 1: MD → 生AST
    const raw = yield* parseMarkdown(markdown)

    // Stage 2: Schema decode + 文字数チェック
    const pres = yield* validatePresentation(raw)

    // Stage 2.5: レイアウトを計算してはみ出しを検査
    yield* validateLayout(pres, theme)

    // Stage 3: AST → pptxgenjs → Buffer
    const renderOpts: RenderOptions = {
      compression: options.compression ?? false,
      theme,
    }
    const bytes = yield* renderPresentation(pres, renderOpts)

    return bytes
  })
}

export interface Md2HtmlOptions {
  theme?: Theme
}

export function md2html(
  markdown: string,
  options: Md2HtmlOptions = {}
): Effect.Effect<string, Md2PptxError> {
  return Effect.gen(function* () {
    const theme = options.theme ?? DEFAULT_THEME

    // Stage 1: MD → 生AST
    const raw = yield* parseMarkdown(markdown)

    // Stage 2: Schema decode + 文字数チェック
    const pres = yield* validatePresentation(raw)

    // Stage 2.5: レイアウトを計算してはみ出しを検査
    yield* validateLayout(pres, theme)

    // Stage 3: AST → HTML
    const html = yield* renderToHtml(pres, theme)

    return html
  })
}
