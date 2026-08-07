import { Effect, pipe } from "effect"
import { ValidationError } from "../errors.js"
import { MAX_CHARS_PER_SLIDE } from "../constants.js"
import { Presentation, Slide, TextBlock, DefaultLayout, LeftRightLayout, TopBottomLayout, GridLayout } from "./presentation.js"
import { getValidationConfig } from "../plugins/registry.js"

// MD記法を除外してプレーンテキスト長を計算
function countPlainTextChars(text: string): number {
  return text
    .replace(/^#+\s+/gm, "") // # ## ###
    .replace(/^\s*[-*+]\s+/gm, "")    // - item / * item / + item
    .replace(/^\s*\d+\.\s+/gm, "")    // 1. item
    .replace(/<!--.*?-->/gs, "") // HTML comments
    .replace(/`(.+?)`/g, '$1')        // `code` → code
    .replace(/\*\*(.+?)\*\*/g, '$1')  // **bold** → bold
    .replace(/\*(.+?)\*/g, '$1')      // *italic* → italic
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

  // CodeDisplay layout is excluded from character count (only title counted)
  if (layout._tag === "CodeDisplay") {
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

// Presentation全体をバリデート（240文字チェック、LeanCanvasは800文字まで）
export function validatePresentation(pres: Presentation): Effect.Effect<Presentation, ValidationError> {
  return pipe(
    Effect.sync(() => {
      for (let i = 0; i < pres.slides.length; i++) {
        const slide = pres.slides[i]
        const charCount = countSlideChars(slide)

        // Determine character limit based on layout type
        let limit = MAX_CHARS_PER_SLIDE
        if (slide._tag === "ContentSlide") {
          const pluginConfig = getValidationConfig(slide.layout._tag)
          if (pluginConfig) {
            limit = pluginConfig.maxChars
          }
        }

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
