import { Option as O } from "effect"
import { ParseError } from "../../errors.js"
import { LayoutMode } from "../builder-types.js"
import { saveSection } from "../builder-state.js"
import type { TokenHandler } from "./index.js"

// LeftDirective: 左右分割モード（左）
export const handleLeftDirective: TokenHandler = (state, token) => {
  if (token.type !== "LeftDirective") return O.none()

  if (O.isNone(state.currentSlide) || state.currentSlide.value.type !== "content") {
    throw new ParseError({ message: "LeftDirective requires a content slide", line: token.line })
  }

  const afterSection = saveSection(state)
  if (O.isNone(afterSection.currentSlide)) return O.some(afterSection)

  const slide = afterSection.currentSlide.value
  return O.some({
    ...afterSection,
    currentSlide: O.some({
      ...slide,
      leftRatio: token.ratio,
      leftSections: [],
      sections: undefined,
    }),
    mode: "left" as LayoutMode,
  })
}

// RightDirective: 左右分割モード（右）
export const handleRightDirective: TokenHandler = (state, token) => {
  if (token.type !== "RightDirective") return O.none()

  if (
    O.isNone(state.currentSlide) ||
    state.currentSlide.value.type !== "content" ||
    !state.currentSlide.value.leftSections
  ) {
    throw new ParseError({ message: "RightDirective must follow LeftDirective", line: token.line })
  }

  const afterSection = saveSection(state)
  if (O.isNone(afterSection.currentSlide)) return O.some(afterSection)

  const slide = afterSection.currentSlide.value
  return O.some({
    ...afterSection,
    currentSlide: O.some({
      ...slide,
      rightRatio: token.ratio,
      rightSections: [],
    }),
    mode: "right" as LayoutMode,
  })
}

// TopDirective: 上下分割モード（上）
export const handleTopDirective: TokenHandler = (state, token) => {
  if (token.type !== "TopDirective") return O.none()

  if (O.isNone(state.currentSlide) || state.currentSlide.value.type !== "content") {
    throw new ParseError({ message: "TopDirective requires a content slide", line: token.line })
  }

  const afterSection = saveSection(state)
  if (O.isNone(afterSection.currentSlide)) return O.some(afterSection)

  const slide = afterSection.currentSlide.value
  return O.some({
    ...afterSection,
    currentSlide: O.some({
      ...slide,
      topRatio: token.ratio,
      topSections: [],
      sections: undefined,
    }),
    mode: "top" as LayoutMode,
  })
}

// BottomDirective: 上下分割モード（下）
export const handleBottomDirective: TokenHandler = (state, token) => {
  if (token.type !== "BottomDirective") return O.none()

  if (
    O.isNone(state.currentSlide) ||
    state.currentSlide.value.type !== "content" ||
    !state.currentSlide.value.topSections
  ) {
    throw new ParseError({ message: "BottomDirective must follow TopDirective", line: token.line })
  }

  const afterSection = saveSection(state)
  if (O.isNone(afterSection.currentSlide)) return O.some(afterSection)

  const slide = afterSection.currentSlide.value
  return O.some({
    ...afterSection,
    currentSlide: O.some({
      ...slide,
      bottomRatio: token.ratio,
      bottomSections: [],
    }),
    mode: "bottom" as LayoutMode,
  })
}

// GridDirective: グリッドレイアウト
export const handleGridDirective: TokenHandler = (state, token) => {
  if (token.type !== "GridDirective") return O.none()

  if (O.isNone(state.currentSlide) || state.currentSlide.value.type !== "content") {
    throw new ParseError({ message: "GridDirective requires a content slide", line: token.line })
  }

  const afterSection = saveSection(state)
  if (O.isNone(afterSection.currentSlide)) return O.some(afterSection)

  const slide = afterSection.currentSlide.value
  return O.some({
    ...afterSection,
    currentSlide: O.some({
      ...slide,
      gridRows: token.rows,
      gridCols: token.cols,
      gridCells: [],
      sections: undefined,
    }),
    mode: "grid" as LayoutMode,
  })
}
