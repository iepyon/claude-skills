import { Option as O } from "effect"
import { BuilderState, LayoutMode } from "../builder-types.js"
import { Token } from "../tokenizer.js"
import { saveSection } from "../builder-state.js"
import type { TokenHandler } from "./index.js"

// IconDirective: absorb (plugin modeHandlers intercept first via pluginModeDispatcher)
export const handleIconDirective: TokenHandler = (state, token) => {
  if (token.type !== "IconDirective") return O.none()
  return O.some(state)
}

// IdDirective: <!--id:intro--> — 現在のスライドに ID を刻む。
// スライドがまだ始まっていない場合（ファイル先頭など）は黙って捨てる。
// 例外にしないのは、ID は表示に影響しない付加情報であり、
// 位置ミスでデッキ全体のビルドを止める価値がないため。
export const handleIdDirective: TokenHandler = (state, token) => {
  if (token.type !== "IdDirective") return O.none()

  if (O.isNone(state.currentSlide)) return O.some(state)

  return O.some({
    ...state,
    currentSlide: O.some({ ...state.currentSlide.value, id: token.id }),
  })
}

// TakeawayMarker: <!--takeaway--> (enters takeaway capture mode)
export const handleTakeawayMarker: TokenHandler = (state, token) => {
  if (token.type !== "TakeawayMarker") return O.none()

  if (O.isNone(state.currentSlide) || state.currentSlide.value.type !== "content") {
    return O.some(state)
  }

  const afterSection = saveSection(state)
  return O.some({
    ...afterSection,
    mode: "takeaway" as LayoutMode,
    currentSection: O.none(),
  })
}

// CodeFenceOpen: コードブロック開始
export const handleCodeFenceOpen: TokenHandler = (state, token) => {
  if (token.type !== "CodeFenceOpen") return O.none()

  if (O.isNone(state.currentSlide) || state.currentSlide.value.type !== "content") {
    return O.some(state)
  }

  const afterSection = saveSection(state)
  if (O.isNone(afterSection.currentSlide)) return O.some(afterSection)

  const slide = afterSection.currentSlide.value
  return O.some({
    ...afterSection,
    currentSlide: O.some({
      ...slide,
      codeLanguage: token.language,
      codeLines: [],
      sections: undefined,
    }),
    mode: "code" as LayoutMode,
  })
}

// CodeFenceLine: コード行を蓄積
export const handleCodeFenceLine: TokenHandler = (state, token) => {
  if (token.type !== "CodeFenceLine") return O.none()

  if (state.mode !== "code" || O.isNone(state.currentSlide)) {
    return O.some(state)
  }

  const slide = state.currentSlide.value
  const lines = slide.codeLines || []
  return O.some({
    ...state,
    currentSlide: O.some({
      ...slide,
      codeLines: [...lines, token.text],
    }),
  })
}

// CodeFenceClose: コードブロック終了
export const handleCodeFenceClose: TokenHandler = (state, token) => {
  if (token.type !== "CodeFenceClose") return O.none()

  return O.some({
    ...state,
    mode: "default" as LayoutMode,
  })
}
