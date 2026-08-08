import "./plugins/index.js"
import { Effect } from "effect"
import { Md2PptxError } from "./errors.js"
import { parseMarkdown } from "./parser/index.js"
import { validatePresentation, Theme, DEFAULT_THEME } from "./schema/index.js"
import { renderPresentation, renderToHtml, RenderOptions } from "./renderer/index.js"
import { renderToWiki, WikiDeck } from "./renderer/wiki/index.js"
import { validateLayout } from "./renderer/layout/validate-layout.js"
import { slugify } from "./parser/slide-ids.js"

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

export interface WikiSource {
  /** デッキの識別子のもと。通常は拡張子を除いたファイル名 */
  readonly name: string
  readonly markdown: string
}

export interface Md2WikiOptions {
  theme?: Theme
  siteTitle?: string
}

/**
 * 複数の Markdown デッキから、リンクで辿れる1枚の Wiki サイトを作る。
 *
 * 各デッキは `--html` と同じ parse → validate → layout 検証を通る。
 * 1デッキでも成立する（リンクは自デッキ内で解決する）が、
 * 真価はデッキをまたいでリンクできることにある。
 */
export function md2wiki(
  sources: readonly WikiSource[],
  options: Md2WikiOptions = {}
): Effect.Effect<string, Md2PptxError> {
  return Effect.gen(function* () {
    const theme = options.theme ?? DEFAULT_THEME

    const decks: WikiDeck[] = []
    for (const source of sources) {
      const raw = yield* parseMarkdown(source.markdown)
      const pres = yield* validatePresentation(raw)
      yield* validateLayout(pres, theme)

      // デッキ名は先頭のタイトルスライド優先。無ければ最初のスライドの見出し、
      // それも無ければファイル名。サイドバーの見出しになるので空にしない。
      const first = pres.slides[0]
      const title =
        (first?._tag === "TitleSlide" ? first.title : undefined) ||
        first?.title ||
        source.name

      decks.push({
        slug: slugify(source.name) || "deck",
        title,
        presentation: pres,
      })
    }

    return yield* renderToWiki(decks, theme, { siteTitle: options.siteTitle })
  })
}
