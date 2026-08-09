import { Option as O } from "effect"
import { ParseError } from "../../errors.js"
import type { BuilderState } from "../../parser/builder-types.js"
import type { Token } from "../../parser/tokenizer.js"
import { saveSection } from "../../parser/builder-state.js"

/** 図解を運ぶフェンスの言語名。ontology.yaml の diagram スロットの marker と同じ綴り */
export const DIAGRAM_FENCE = "pattern-diagram"

/** `###` を集める先。registerPlugin の sectionRoute と同じ名前 */
export const SECTIONS_FIELD = "wikiPatternSections"

/** フェンスの中身を積む先 */
const DIAGRAM_FIELD = "wikiPatternDiagram"

/** フェンスの中に居るか、その言語は何か。スライドを跨がない一時状態 */
interface FenceState {
  readonly inFence: boolean
  readonly language: string
}

const getFenceState = (state: BuilderState): FenceState =>
  (state.pluginState["wikiPatternFence"] as FenceState | undefined) ?? {
    inFence: false,
    language: "",
  }

const setFenceState = (state: BuilderState, fence: FenceState): Record<string, unknown> => ({
  ...state.pluginState,
  wikiPatternFence: fence,
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
    pluginState: setFenceState(afterSection, { inFence: false, language: "" }),
  })
}

/**
 * CodeFenceOpen: フェンスに入る。
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
    pluginState: setFenceState(afterSection, { inFence: true, language: token.language }),
  })
}

// CodeFenceLine: 図解のフェンスなら1行ずつ原文のまま積む
export const handleCodeFenceLineInWikiPattern = (
  state: BuilderState,
  token: Token
): O.Option<BuilderState> => {
  if (token.type !== "CodeFenceLine" || state.mode !== "wiki-pattern") return O.none()

  const fence = getFenceState(state)
  if (O.isNone(state.currentSlide) || !fence.inFence) return O.some(state)
  if (fence.language !== DIAGRAM_FENCE) return O.some(state) // 別言語のフェンスは読み捨てる

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
 * CodeFenceClose: フェンスを出る。**モードは "wiki-pattern" のまま保つ。**
 * コアの `handleCodeFenceClose` は "default" に戻すので、そのあとの
 * `<!--takeaway-->` や `###` が別のレイアウトの規則で読まれてしまう。
 */
export const handleCodeFenceCloseInWikiPattern = (
  state: BuilderState,
  token: Token
): O.Option<BuilderState> => {
  if (token.type !== "CodeFenceClose" || state.mode !== "wiki-pattern") return O.none()

  return O.some({
    ...state,
    pluginState: setFenceState(state, { inFence: false, language: "" }),
  })
}

export const wikiPatternModeHandlers = [
  handleCodeFenceOpenInWikiPattern,
  handleCodeFenceLineInWikiPattern,
  handleCodeFenceCloseInWikiPattern,
]
