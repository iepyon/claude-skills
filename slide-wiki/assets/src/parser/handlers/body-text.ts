import { Option as O } from "effect"
import { BuilderState } from "../builder-types.js"
import { Token } from "../tokenizer.js"
import type { TokenHandler } from "./index.js"

// BodyText: 本文テキスト
export const handleBodyText: TokenHandler = (state, token) => {
  if (token.type !== "BodyText") return O.none()

  // タイトルスライドでセクションがない場合はサブタイトル
  if (
    O.isSome(state.currentSlide) &&
    state.currentSlide.value.type === "title" &&
    O.isNone(state.currentSection)
  ) {
    return O.some({
      ...state,
      currentSlide: O.some({ ...state.currentSlide.value, subtitle: token.text }),
    })
  }

  // コードモード: codeCaption に追加（コードブロック後のテキスト）
  if (state.mode === "default" && O.isSome(state.currentSlide)) {
    const slide = state.currentSlide.value
    if (slide.codeLines !== undefined && O.isNone(state.currentSection)) {
      return O.some({
        ...state,
        currentSlide: O.some({
          ...slide,
          codeCaption: slide.codeCaption ? slide.codeCaption + "\n" + token.text : token.text,
        }),
      })
    }
  }

  // テイクアウェイモード: スライドのtakeawayに追加
  if (state.mode === "takeaway" && O.isSome(state.currentSlide)) {
    const text = token.text.trim()
    if (!text) return O.some(state)

    const slide = state.currentSlide.value
    const existingTakeaway = slide.takeaway || ""
    const newTakeaway = existingTakeaway ? `${existingTakeaway} ${text}` : text

    return O.some({
      ...state,
      currentSlide: O.some({
        ...slide,
        takeaway: newTakeaway,
      }),
    })
  }

  // 出典モード: スライドの source に追加
  if (state.mode === "source" && O.isSome(state.currentSlide)) {
    const text = token.text.trim()
    if (!text) return O.some(state)

    const slide = state.currentSlide.value
    const existing = slide.source || ""

    return O.some({
      ...state,
      currentSlide: O.some({
        ...slide,
        source: existing ? `${existing} ${text}` : text,
      }),
    })
  }

  // それ以外はセクションの本文
  if (O.isNone(state.currentSection)) {
    return O.some({
      ...state,
      currentSection: O.some({ body: token.text }),
    })
  }

  const section = state.currentSection.value
  return O.some({
    ...state,
    currentSection: O.some({
      ...section,
      body: section.body ? section.body + "\n" + token.text : token.text,
    }),
  })
}
