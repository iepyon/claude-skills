import { Option as O } from "effect"
import { ParseError } from "../../errors.js"
import type { BuilderState } from "../../parser/builder-types.js"
import type { Token } from "../../parser/tokenizer.js"
import { saveSection } from "../../parser/builder-state.js"
import { imageExtensionForLayout, markerForSlot } from "../../ontology/index.js"
import { readSvgAsset } from "../../assets.js"

/**
 * 図解の枠の綴り。**どちらも宣言から導く。**
 *
 * 手で書き写すと、ontology.yaml の marker を変えたときに lint は新しい綴りを数え、
 * 実装は古い綴りを受理する — lint は緑のまま図解だけが入らなくなる。
 * 読み込みは初回まで遅らせる（registry がディレクティブの導出を
 * `getTokenMatchers()` まで遅らせているのと同じ理由で、import しただけで
 * ontology.yaml を読みに行かせない）。
 */
let diagramExtension: string | undefined
export const diagramFileExtension = (): string =>
  (diagramExtension ??= imageExtensionForLayout("WikiPattern", "diagram"))

/** 書き手に見せる記法。宣言の marker をそのまま出す（組み立て直すと宣言と食い違う） */
export const diagramMarker = (): string =>
  markerForSlot("WikiPattern", "diagram") ?? "![…](….svg)"

/** `###` を集める先。registerPlugin の sectionRoute と同じ名前 */
export const SECTIONS_FIELD = "wikiPatternSections"

/** 参照先から読み込んだ SVG を積む先 */
export const DIAGRAM_FIELD = "wikiPatternDiagram"

// PluginDirective: <!--pattern--> — パターンモード開始
export const handleWikiPatternDirective = (
  state: BuilderState,
  token: Token
): O.Option<BuilderState> => {
  if (!(token.type === "PluginDirective" && token.pluginId === "wiki-pattern")) return O.none()

  if (O.isNone(state.currentSlide) || state.currentSlide.value.type !== "content") {
    throw new ParseError({
      message: "<!--pattern--> はコンテンツスライド（`##`）の中にしか置けない",
      line: token.line,
    })
  }

  const afterSection = saveSection(state)
  if (O.isNone(afterSection.currentSlide)) return O.some(afterSection)

  const slide = afterSection.currentSlide.value
  return O.some({
    ...afterSection,
    currentSlide: O.some({
      ...slide,
      pluginData: { ...slide.pluginData, [SECTIONS_FIELD]: [], [DIAGRAM_FIELD]: "" },
      sections: undefined,
    }),
    mode: "wiki-pattern",
  })
}

/**
 * Image: `![…](….svg)` — 参照先を**その場で読んで**中身を積む。
 *
 * 遅らせて後段で解く手もあるが、そうすると「読めなかった」が報告される場所から
 * 行番号が消える。ここで落とせば `deck.md:57` の形で書き手に返せる。
 * 読むのは assets.ts の1関数だけで、プラグインはパスの解き方を知らない。
 */
export const handleImageInWikiPattern = (
  state: BuilderState,
  token: Token
): O.Option<BuilderState> => {
  if (token.type !== "Image" || state.mode !== "wiki-pattern") return O.none()

  // 直前の `###` を確定させてから読む（図解は節に属さない）。
  // saveSection は currentSlide の有無を変えないので、確かめるのは1度でよい
  const afterSection = saveSection(state)
  if (O.isNone(afterSection.currentSlide)) return O.some(afterSection)
  const slide = afterSection.currentSlide.value

  const svg = readSvgAsset({
    src: token.src,
    baseDir: state.options.baseDir,
    extension: diagramFileExtension(),
    line: token.line,
    what: `パターン「${slide.title}」の図解`,
  })

  return O.some({
    ...afterSection,
    currentSlide: O.some({
      ...slide,
      pluginData: { ...slide.pluginData, [DIAGRAM_FIELD]: svg },
    }),
  })
}

/**
 * コードフェンスを飲む。**中身は読まない。**
 *
 * WikiPattern はコードフェンスを1つも読まないが、素通しにするとコアの
 * `handleCodeFenceOpen` が走り、`mode` を "code" に、`codeLanguage` をスライドに
 * 書き込む。そうなるとセクションのルート先が消え、スライドは CodeDisplay として
 * 変換される（`slide-converter.ts` の優先順）。閉じる側も同様に飲む必要があり、
 * コアに届くと `mode` が "default" に戻って、以降の `<!--takeaway-->` や `###` が
 * 別のレイアウトの規則で読まれてしまう。
 */
const FENCE_TOKENS: ReadonlyArray<Token["type"]> = [
  "CodeFenceOpen",
  "CodeFenceLine",
  "CodeFenceClose",
]

export const handleCodeFenceInWikiPattern = (
  state: BuilderState,
  token: Token
): O.Option<BuilderState> =>
  state.mode === "wiki-pattern" && FENCE_TOKENS.includes(token.type) ? O.some(state) : O.none()

export const wikiPatternModeHandlers = [handleImageInWikiPattern, handleCodeFenceInWikiPattern]
