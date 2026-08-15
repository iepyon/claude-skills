import "./plugins/index.js"
import { Effect } from "effect"
import { Md2PptxError, ValidationError } from "./errors.js"
import { lintTokens, shouldFail, type Diagnostic } from "./ontology/lint.js"
import { readDeckMeta, splitFrontmatter, type FrontmatterSplit } from "./ontology/frontmatter.js"
import { parseTokens, type ParseOptions } from "./parser/index.js"
import { tokenize, type Token } from "./parser/tokenizer.js"
import { validatePresentation, Presentation, Theme, DEFAULT_THEME } from "./schema/index.js"
import { renderPresentation, renderToHtml, RenderOptions } from "./renderer/index.js"
import { renderToWiki, WikiDeck } from "./renderer/wiki/index.js"
import { validateLayout } from "./renderer/layout/validate-layout.js"
import { deckSlug, findDeckSlugCollisions } from "./okf.js"

/** 宣言（ontology.yaml）に照らした検査の受け取り方 */
export interface LintOptions {
  /**
   * 見つかった問題の受け取り先。呼び出し側が表示を決める（パイプラインは出力しない）。
   * 報告先であって、検査するかどうかの switch ではない — `strict` だけを渡した利用者は
   * 黙って通す代わりに、報告なしで失敗する。
   */
  onDiagnostic?: (diagnostics: readonly Diagnostic[], deck?: string) => void
  /** true なら warning でも失敗させる（CI 用）。既定は警告のまま続行する */
  strict?: boolean
}

/**
 * 宣言に照らして検査し、strict なら失敗させる。
 *
 * 既定を警告に留めるのは、宣言が実装より厳しすぎたときに既存のデッキが一斉に
 * 作れなくなるのを避けるため。CI は --strict を掛けて新しいドリフトだけを止める。
 */
function lintStage(
  tokens: readonly Token[],
  options: LintOptions,
  deck?: string,
  frontmatter?: FrontmatterSplit
): Effect.Effect<void, ValidationError> {
  return Effect.gen(function* () {
    if (!options.onDiagnostic && !options.strict) return
    const diagnostics = lintTokens(tokens, { frontmatter })
    if (diagnostics.length === 0) return
    options.onDiagnostic?.(diagnostics, deck)
    if (shouldFail(diagnostics, options.strict ?? false)) {
      yield* Effect.fail(
        new ValidationError({
          message:
            `${diagnostics.length} 件の宣言違反` +
            (deck ? ` in ${deck}` : "") +
            "。ontology.yaml の宣言に合わせて直すか、宣言のほうを直す",
          slideIndex: 0,
          charCount: 0,
        })
      )
    }
  })
}

/**
 * レンダリング直前までの共通段。3つの入口が同じ順序を並べていたのを1つにまとめている
 * （段を1つ足すたびに3箇所を直す形になっていた）。
 *
 * トークン化は1回だけ行い、lint と AST 構築が同じ列を共有する。
 */
function prepare(
  markdown: string,
  theme: Theme,
  options: LintOptions & ParseOptions,
  deck?: string
): Effect.Effect<Presentation, Md2PptxError> {
  return Effect.gen(function* () {
    // Stage 0: 冒頭の frontmatter を剥がして MD → トークン列。
    // lint の on/off に関わらず**無条件に**割る（読む人が居なくても、
    // 剥がさなければ frontmatter が1枚目のスライドとして描かれてしまう）
    const frontmatter = splitFrontmatter(markdown)
    const tokens = tokenize(frontmatter.body)

    // Stage 1: 宣言（ontology.yaml）に照らした構造の検査
    yield* lintStage(tokens, options, deck, frontmatter)

    // Stage 2: トークン列 → 生AST（`![…](…)` の参照先はここで読み込まれる）
    const raw = yield* parseTokens(tokens, { baseDir: options.baseDir })

    // Stage 3: Schema decode + 文字数チェック
    const pres = yield* validatePresentation(raw)

    // Stage 4: レイアウトを計算してはみ出しを検査
    yield* validateLayout(pres, theme)

    return pres
  })
}

export interface Md2PptxOptions extends LintOptions, ParseOptions {
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
    const pres = yield* prepare(markdown, theme, options)

    // AST → pptxgenjs → Buffer
    const renderOpts: RenderOptions = {
      compression: options.compression ?? false,
      theme,
    }
    const bytes = yield* renderPresentation(pres, renderOpts)

    return bytes
  })
}

export interface Md2HtmlOptions extends LintOptions, ParseOptions {
  theme?: Theme
}

export function md2html(
  markdown: string,
  options: Md2HtmlOptions = {}
): Effect.Effect<string, Md2PptxError> {
  return Effect.gen(function* () {
    const theme = options.theme ?? DEFAULT_THEME
    const pres = yield* prepare(markdown, theme, options)

    const html = yield* renderToHtml(pres, theme)

    return html
  })
}

export interface WikiSource {
  /** デッキの識別子のもと。通常は拡張子を除いたファイル名 */
  readonly name: string
  readonly markdown: string
  /**
   * この md が置かれているディレクトリ。`![…](….svg)` の相対パスの起点になる。
   * デッキごとに持つのは、`--wiki` が別々のディレクトリの md を並べて取れるため。
   */
  readonly baseDir?: string
}

export interface Md2WikiOptions extends LintOptions {
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

    // **デッキを1本も読む前に slug の衝突を見る。** ここが `source.name`（＝拡張子を
    // 除いたファイル名）と slug の両方を持つ最後の場所で、この先へ進むと WikiDeck は
    // slug しか運ばないので「どのファイルを改名すればよいか」が言えなくなる。
    const collisions = findDeckSlugCollisions(
      sources.map((s) => ({ fileName: `${s.name}.md`, slug: deckSlug(s.name) }))
    )
    if (collisions.length > 0) {
      return yield* Effect.fail(new ValidationError({ message: collisions.join("\n") }))
    }

    const decks: WikiDeck[] = []
    for (const source of sources) {
      const pres = yield* prepare(
        source.markdown,
        theme,
        { ...options, baseDir: source.baseDir },
        source.name
      )

      // デッキ名は先頭のタイトルスライド優先。無ければ最初のスライドの見出し、
      // それも無ければファイル名。サイドバーの見出しになるので空にしない。
      const first = pres.slides[0]
      const title =
        (first?._tag === "TitleSlide" ? first.title : undefined) ||
        first?.title ||
        source.name

      // prepare() も内部で frontmatter を剥がすが、そちらは Presentation しか返さない。
      // メタを別に1回読むほうが、3つの入口が共有する prepare() の形を変えずに済む
      const meta = readDeckMeta(source.markdown)

      decks.push({
        slug: deckSlug(source.name),
        title,
        presentation: pres,
        ...(meta ? { meta } : {}),
      })
    }

    // **バンドルは平坦なので、置き場は1つしかない。** デッキが全部同じディレクトリから
    // 来ていればそれがバンドルで、`relations.yaml` はそこにある。ばらばらの場所から
    // 集めて渡された md はバンドルではないので、関係を探しにいかない
    // （`--wiki a/x.md b/y.md` のような呼び方。リンクは解決するが束ではない）
    const baseDirs = new Set(sources.map((s) => s.baseDir).filter((d): d is string => !!d))
    const bundleDir = baseDirs.size === 1 ? [...baseDirs][0] : undefined

    return yield* renderToWiki(decks, theme, { siteTitle: options.siteTitle, bundleDir })
  })
}
