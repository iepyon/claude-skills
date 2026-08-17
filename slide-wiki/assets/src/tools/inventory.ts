import { Effect } from "effect"
import { layoutSlide, LayoutResult, TextBox, IconBox, CodeBox, ShapeBox } from "../renderer/layout/index.js"
import { resolveIconOrFallback } from "../renderer/icon-resolver.js"
import { Slide } from "../schema/index.js"
import { Theme } from "../schema/theme.js"
import { textKey, iconKey, codeKey, shapeBoxKey } from "../shape-keys.js"
import { splitRunsIntoLines, splitTextIntoLines, runsToText } from "../text-lines.js"
import { isCentered, runFontFace } from "../text-style.js"
import type { InlineTextRun } from "../renderer/layout/types.js"

// Inventory types matching test-inventory.json structure
export interface ParagraphInventory {
  text: string
  alignment?: "CENTER"
  font_name: string
  font_size: number
  bold?: boolean
  color: string
}

export interface ShapeInventory {
  left: number
  top: number
  width: number
  height: number
  paragraphs: ParagraphInventory[]
}

export interface SlideInventory {
  [shapeKey: string]: ShapeInventory
}

export interface PresentationInventory {
  [slideKey: string]: SlideInventory
}

// このボックスが描く「行」を、レンダラと同じ数え方で取り出す。
// 1行 = PPTX の <a:p> 1つ = HTML の <p> 1つ。runs は区切り無しで連結する
// （pptx-inspector の extractText() と同じ）。
type InventoryLine = { text: string; firstRun?: InlineTextRun }

function boxToLines(box: TextBox): InventoryLine[] {
  if (box.paragraphs) {
    // Paragraph 自体が1行。その中にさらに改行があればさらに割れる
    return box.paragraphs.flatMap((para) =>
      splitRunsIntoLines(para.runs).map((line) => ({ text: runsToText(line), firstRun: line[0] }))
    )
  }
  if (box.richText) {
    return splitRunsIntoLines(box.richText).map((line) => ({
      text: runsToText(line),
      firstRun: line[0],
    }))
  }
  return splitTextIntoLines(box.text ?? "").map((text) => ({ text }))
}

// Convert one paragraph of a TextBox to ParagraphInventory
function textBoxToParagraph(
  box: TextBox,
  line: InventoryLine,
  fontName: string,
  isTitleSlide: boolean
): ParagraphInventory {
  const { text, firstRun } = line
  // 太字だけはここで決める（先頭 run と箱のどちらかが太字なら太字）。
  // 中央寄せとフォントは text-style.ts の共有規則を使う。
  const bold = firstRun?.bold || box.isBold

  const paragraph: ParagraphInventory = {
    text,
    ...(isCentered(box, isTitleSlide) ? { alignment: "CENTER" as const } : {}),
    font_name: runFontFace(box, firstRun, fontName),
    // フォントサイズも先頭 run 規則（InlineTextRun.fontSize の説明を見よ）
    font_size: firstRun?.fontSize ?? box.fontSize ?? 16,
    ...(bold ? { bold: true } : {}),
    color: box.color ?? "000000",
  }

  return paragraph
}

// Convert TextBox to ShapeInventory
function textBoxToShape(
  box: TextBox,
  fontName: string,
  isTitleSlide: boolean
): ShapeInventory {
  return {
    left: box.x,
    top: box.y,
    width: box.w,
    height: box.h,
    paragraphs: boxToLines(box).map((line) =>
      textBoxToParagraph(box, line, fontName, isTitleSlide)
    ),
  }
}

// Convert IconBox to ShapeInventory.
// 渡すのは解決後の emoji — アイコン名ではない。レンダラが描くのは名前ではなく字。
function iconBoxToShape(box: IconBox, emoji: string, fontName: string): ShapeInventory {
  return {
    left: box.x,
    top: box.y,
    width: box.w,
    height: box.h,
    paragraphs: [
      {
        text: emoji,
        alignment: "CENTER" as const,
        font_name: fontName,
        font_size: box.fontSize ?? 48,
        color: box.color ?? "000000",
      },
    ],
  }
}

// Convert ShapeBox to ShapeInventory (テキストを持つものだけが対象)
function shapeBoxToShape(box: ShapeBox, text: string, fontName: string): ShapeInventory {
  return {
    left: box.x,
    top: box.y,
    width: box.w,
    height: box.h,
    paragraphs: [
      {
        text,
        alignment: "CENTER" as const,
        font_name: fontName,
        font_size: box.fontSize ?? 12,
        ...(box.isBold ? { bold: true } : {}),
        color: box.textColor ?? "000000",
      },
    ],
  }
}

// Convert CodeBox to ShapeInventory.
// コードは1行 = 1段落。色はその行の先頭 run のハイライト色 — レンダラに渡すのと
// 同じ textRuns から読むので、ハイライトの規則をここに写さない。
function codeBoxToShape(box: CodeBox): ShapeInventory {
  const lines = splitRunsIntoLines(box.textRuns)

  return {
    left: box.x,
    top: box.y,
    width: box.w,
    height: box.h,
    paragraphs: lines.map((line) => ({
      text: runsToText(line),
      font_name: box.fontFace,
      font_size: box.fontSize,
      color: line[0].color,
    })),
  }
}

// Convert LayoutResult to SlideInventory
// 比較の対象は「テキストを運ぶ図形」。境界ボックス・塗り・コード背景・SVG は
// どちらのレンダラでもテキストを持たず、インベントリに入らない（src/shape-keys.ts）。
function layoutResultToSlideInventory(
  result: LayoutResult,
  theme: Theme,
  isTitleSlide: boolean
): SlideInventory {
  const fontName = theme.fonts.body
  const inventory: SlideInventory = {}

  // 文字が1つも無い図形は、どちらのレンダラも残さない
  // （pptxgenjs は run の無い txBody、HTML は空要素で、両インスペクタが落とす）。
  // ボックスの種類ごとに書くと必ずどれかを書き忘れるので、置く直前に1箇所で弾く。
  // 実例: アイコン注釈の無い Steps は空の IconBox を作り、AST にだけ現れていた。
  const put = (key: string, shape: ShapeInventory): void => {
    if (shape.paragraphs.every((para) => para.text === "")) return
    inventory[key] = shape
  }

  result.textBoxes.forEach((box, index) => {
    put(textKey(index), textBoxToShape(box, fontName, isTitleSlide))
  })

  // アイコンは emoji に解決できたものだけ。Material Icon は両レンダラとも
  // 画像 / inline SVG で描くのでテキストが無い
  result.iconBoxes?.forEach((box, index) => {
    const resolved = resolveIconOrFallback(box.icon, box.color ?? "000000")
    if (resolved._tag !== "emoji") return
    put(iconKey(index), iconBoxToShape(box, resolved.text, fontName))
  })

  result.codeBoxes?.forEach((box, index) => {
    put(codeKey(index), codeBoxToShape(box))
  })

  // テキストを持つシェイプだけ。PPTX では塗りとテキストが別図形になるが、
  // キーを取るのはテキスト側（HTML は1つの div で両方を描く）
  result.shapeBoxes?.forEach((box, index) => {
    // テキストの無いシェイプは塗りだけ = 装飾。put() の空判定に任せると
    // 「なぜ出ないか」がレンダラ側の deco: と別の理由になってしまう
    if (!box.text) return
    put(shapeBoxKey(index), shapeBoxToShape(box, box.text, fontName))
  })

  return inventory
}

// Convert a single slide to SlideInventory
function slideToInventory(
  slide: Slide,
  theme: Theme
): Effect.Effect<SlideInventory, never> {
  return Effect.gen(function* () {
    const layoutResult = layoutSlide(slide, theme)
    const isTitleSlide = slide._tag === "TitleSlide"
    return layoutResultToSlideInventory(layoutResult, theme, isTitleSlide)
  })
}

// Convert array of slides to PresentationInventory
export function slidesToInventory(
  slides: readonly Slide[],
  theme: Theme
): Effect.Effect<PresentationInventory, never> {
  return Effect.gen(function* () {
    const inventory: PresentationInventory = {}

    for (let i = 0; i < slides.length; i++) {
      const slideKey = `slide-${i}`
      const slideInventory = yield* slideToInventory(slides[i], theme)
      inventory[slideKey] = slideInventory
    }

    return inventory
  })
}
