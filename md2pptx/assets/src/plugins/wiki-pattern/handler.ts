import { Option as O } from "effect"
import { ParseError } from "../../errors.js"
import type { BuilderState } from "../../parser/builder-types.js"
import type { Token } from "../../parser/tokenizer.js"
import { saveSection } from "../../parser/builder-state.js"
import { fenceLanguageForLayout } from "../../ontology/index.js"

/**
 * 図解を運ぶフェンスの言語名。**綴りは宣言から導く。**
 *
 * 手で書き写すと、ontology.yaml の marker を変えたときに lint は新しい綴りを数え、
 * 実装は古い綴りを集める — lint は緑のまま図解だけが入らなくなる。
 * 読み込みは初回まで遅らせる（registry がディレクティブの導出を
 * `getTokenMatchers()` まで遅らせているのと同じ理由で、import しただけで
 * ontology.yaml を読みに行かせない）。
 */
let diagramFence: string | undefined
export const diagramFenceLanguage = (): string =>
  (diagramFence ??= fenceLanguageForLayout("WikiPattern", "diagram"))

/** `###` を集める先。registerPlugin の sectionRoute と同じ名前 */
export const SECTIONS_FIELD = "wikiPatternSections"

/** フェンスの中身を積む先 */
export const DIAGRAM_FIELD = "wikiPatternDiagram"

/**
 * いま図解のフェンスを読んでいるか。スライドを跨がない一時状態。
 *
 * 「フェンスの中か」と「その言語は何か」を別々に持つ必要はない。積む先が1つしか
 * 無いので、開いた時点で「積むかどうか」を決めてしまえばよい
 * （pattern-language が両方持つのは、フェンスの中身を4つの宛先に振り分けるため）。
 */
const FENCE_KEY = "wikiPatternCollectingDiagram"

const isCollecting = (state: BuilderState): boolean => state.pluginState[FENCE_KEY] === true

const setCollecting = (state: BuilderState, on: boolean): Record<string, unknown> => ({
  ...state.pluginState,
  [FENCE_KEY]: on,
})

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
 * CodeFenceOpen: フェンスに入る。開いた時点で「積むかどうか」を決める。
 *
 * ここで捕まえないとコアの `handleCodeFenceOpen` が走り、`mode` を "code" に、
 * `codeLanguage` をスライドに書き込む。そうなるとセクションのルート先が消え、
 * スライドは CodeDisplay として変換される（`slide-converter.ts` の優先順）。
 */
export const handleCodeFenceOpenInWikiPattern = (
  state: BuilderState,
  token: Token
): O.Option<BuilderState> => {
  if (token.type !== "CodeFenceOpen" || state.mode !== "wiki-pattern") return O.none()

  // 直前の `###` を確定させてからフェンスに入る（フェンスは節に属さない）
  const afterSection = saveSection(state)
  return O.some({
    ...afterSection,
    pluginState: setCollecting(afterSection, token.language === diagramFenceLanguage()),
  })
}

// CodeFenceLine: 図解のフェンスなら1行ずつ原文のまま積む（別言語のフェンスは読み捨てる）
export const handleCodeFenceLineInWikiPattern = (
  state: BuilderState,
  token: Token
): O.Option<BuilderState> => {
  if (token.type !== "CodeFenceLine" || state.mode !== "wiki-pattern") return O.none()

  if (!isCollecting(state) || O.isNone(state.currentSlide)) return O.some(state)

  const slide = state.currentSlide.value
  const existing = (slide.pluginData?.[DIAGRAM_FIELD] as string | undefined) ?? ""
  const separator = existing ? "\n" : ""
  return O.some({
    ...state,
    currentSlide: O.some({
      ...slide,
      pluginData: { ...slide.pluginData, [DIAGRAM_FIELD]: existing + separator + token.text },
    }),
  })
}

/**
 * CodeFenceClose: フェンスを出る。
 *
 * このハンドラの仕事は**トークンを飲むこと**で、コアの `handleCodeFenceClose` に
 * 届かせないこと。コアは `mode` を "default" に戻すので、そのあとの
 * `<!--takeaway-->` や `###` が別のレイアウトの規則で読まれてしまう。
 */
export const handleCodeFenceCloseInWikiPattern = (
  state: BuilderState,
  token: Token
): O.Option<BuilderState> => {
  if (token.type !== "CodeFenceClose" || state.mode !== "wiki-pattern") return O.none()

  return O.some({ ...state, pluginState: setCollecting(state, false) })
}

export const wikiPatternModeHandlers = [
  handleCodeFenceOpenInWikiPattern,
  handleCodeFenceLineInWikiPattern,
  handleCodeFenceCloseInWikiPattern,
]
