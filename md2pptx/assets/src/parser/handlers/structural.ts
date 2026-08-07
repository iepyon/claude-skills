import { Option as O } from "effect"
import { BuilderState, LayoutMode } from "../builder-types.js"
import { Token } from "../tokenizer.js"
import { saveSection, saveSlide } from "../builder-state.js"
import type { TokenHandler } from "./index.js"

// BlankLine: 何もしない
export const handleBlankLine: TokenHandler = (state, token) =>
  token.type === "BlankLine" ? O.some(state) : O.none()

// HorizontalRule: スライドを保存
export const handleHorizontalRule: TokenHandler = (state, token) =>
  token.type === "HorizontalRule" ? O.some(saveSlide(state)) : O.none()

// H1: タイトルスライドのタイトル
export const handleH1: TokenHandler = (state, token) => {
  if (token.type !== "H1") return O.none()

  if (O.isNone(state.currentSlide)) {
    return O.some({
      ...state,
      currentSlide: O.some({ type: "title" as const, title: token.text }),
    })
  }

  const slide = state.currentSlide.value
  if (slide.type === "title" && !slide.title) {
    return O.some({
      ...state,
      currentSlide: O.some({ ...slide, title: token.text }),
    })
  }

  return O.some(state)
}

// H2: コンテンツスライドのタイトル
export const handleH2: TokenHandler = (state, token) => {
  if (token.type !== "H2") return O.none()

  if (O.isNone(state.currentSlide)) {
    return O.some({
      ...state,
      currentSlide: O.some({ type: "content" as const, title: token.text, sections: [] }),
    })
  }

  const slide = state.currentSlide.value
  if (slide.type === "content" && !slide.title) {
    return O.some({
      ...state,
      currentSlide: O.some({ ...slide, title: token.text }),
    })
  }

  return O.some(state)
}

// H3: 新しいセクション
export const handleH3: TokenHandler = (state, token) =>
  token.type === "H3"
    ? O.some({
        ...saveSection(state),
        currentSection: O.some({ heading: token.text }),
      })
    : O.none()
