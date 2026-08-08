import { Effect, pipe } from "effect"
import { ValidationError } from "../errors.js"
import { getLimits, isCharCountExcluded, maxCharsForTag } from "../ontology/index.js"
import { Presentation, Slide, TextBlock, DefaultLayout, LeftRightLayout, TopBottomLayout, GridLayout } from "./presentation.js"
import { getValidationConfig } from "../plugins/registry.js"
import { stripInlineFormatting } from "../parser/inline-formatter.js"

// MD記法を除外してプレーンテキスト長を計算。
// インライン装飾の除去は stripInlineFormatting が正本 — ここで正規表現を
// 複製すると記法を足すたびに二重管理になり、URL が文字数に混入する。
function countPlainTextChars(text: string): number {
  const withoutBlockSyntax = text
    .replace(/^#+\s+/gm, "") // # ## ###
    .replace(/^\s*[-*+]\s+/gm, "")    // - item / * item / + item
    .replace(/^\s*\d+\.\s+/gm, "")    // 1. item
    .replace(/<!--.*?-->/gs, "") // HTML comments

  return stripInlineFormatting(withoutBlockSyntax)
    .replace(/^\s*$/gm, "") // 空行
    .trim().length
}

// TextBlock内の文字数を計算
function countTextBlock(block: TextBlock): number {
  let count = 0
  if (block.heading) count += countPlainTextChars(block.heading)
  if (block.body) count += countPlainTextChars(block.body)
  return count
}

// Slide内の文字数を計算
function countSlideChars(slide: Slide): number {
  if (slide._tag === "TitleSlide") {
    let count = countPlainTextChars(slide.title)
    if (slide.subtitle) count += countPlainTextChars(slide.subtitle)
    return count
  }

  // ContentSlide
  let count = countPlainTextChars(slide.title)
  const layout = slide.layout

  // 数えないレイアウト（コード表示）は ontology.yaml の limits.excluded-layouts が正本
  if (isCharCountExcluded(layout._tag)) {
    return count
  }

  if (layout._tag === "Default") {
    const l = layout as DefaultLayout
    count += l.sections.reduce((sum: number, sec: TextBlock) => sum + countTextBlock(sec), 0)
    if (l.takeaway) count += countPlainTextChars(l.takeaway)
  } else if (layout._tag === "LeftRight") {
    const l = layout as LeftRightLayout
    count += l.leftSections.reduce((sum: number, sec: TextBlock) => sum + countTextBlock(sec), 0)
    count += l.rightSections.reduce((sum: number, sec: TextBlock) => sum + countTextBlock(sec), 0)
    if (l.takeaway) count += countPlainTextChars(l.takeaway)
  } else if (layout._tag === "TopBottom") {
    const l = layout as TopBottomLayout
    count += l.topSections.reduce((sum: number, sec: TextBlock) => sum + countTextBlock(sec), 0)
    count += l.bottomSections.reduce((sum: number, sec: TextBlock) => sum + countTextBlock(sec), 0)
    if (l.takeaway) count += countPlainTextChars(l.takeaway)
  } else if (layout._tag === "Grid") {
    const l = layout as GridLayout
    count += l.cells.reduce((sum: number, cell: TextBlock) => sum + countTextBlock(cell), 0)
    if (l.takeaway) count += countPlainTextChars(l.takeaway)
  } else {
    // Check plugin countChars
    const pluginConfig = getValidationConfig(layout._tag)
    if (pluginConfig?.countChars) {
      count += pluginConfig.countChars(layout)
    }
  }

  return count
}

/**
 * スライドごとの文字数を検証する。
 *
 * 上限の正本は ontology.yaml（`limits.max-chars-per-slide` と各レイアウトの `max-chars`）。
 * ここに数値を書かないので、宣言とドキュメントと検証が同時に動く。
 */
export function validatePresentation(pres: Presentation): Effect.Effect<Presentation, ValidationError> {
  return pipe(
    Effect.sync(() => {
      for (let i = 0; i < pres.slides.length; i++) {
        const slide = pres.slides[i]
        const charCount = countSlideChars(slide)

        // タイトルスライドはレイアウトを持たないので、デッキ全体の上限（宣言の既定値）に従う
        const limit =
          slide._tag === "ContentSlide"
            ? maxCharsForTag(slide.layout._tag)
            : getLimits()["max-chars-per-slide"]

        if (charCount > limit) {
          return Effect.fail(
            new ValidationError({
              message: `Slide ${i + 1} exceeds ${limit} characters (found ${charCount})`,
              slideIndex: i,
              charCount,
            })
          )
        }
      }
      return Effect.succeed(pres)
    }),
    Effect.flatten
  )
}
