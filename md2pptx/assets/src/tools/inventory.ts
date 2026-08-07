import { Effect } from "effect"
import { layoutSlide, LayoutResult, TextBox, IconBox, CodeBox } from "../renderer/layout/index.js"
import { Slide } from "../schema/index.js"
import { Theme } from "../schema/theme.js"

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

// Convert TextBox to ParagraphInventory
function textBoxToParagraph(
  box: TextBox,
  fontName: string,
  isTitleSlide: boolean
): ParagraphInventory {
  const paragraph: ParagraphInventory = {
    text: box.text,
    ...(isTitleSlide ? { alignment: "CENTER" as const } : {}),
    font_name: fontName,
    font_size: box.fontSize ?? 16,
    ...(box.isBold ? { bold: true } : {}),
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
    paragraphs: [textBoxToParagraph(box, fontName, isTitleSlide)],
  }
}

// Convert IconBox to ShapeInventory
function iconBoxToShape(box: IconBox, fontName: string): ShapeInventory {
  return {
    left: box.x,
    top: box.y,
    width: box.w,
    height: box.h,
    paragraphs: [
      {
        text: box.icon,
        font_name: fontName,
        font_size: 48,
        color: box.color ?? "000000",
      },
    ],
  }
}

// Convert CodeBox to ShapeInventory
function codeBoxToShape(box: CodeBox): ShapeInventory {
  return {
    left: box.x,
    top: box.y,
    width: box.w,
    height: box.h,
    paragraphs: [
      {
        text: box.code,
        font_name: box.fontFace,
        font_size: box.fontSize,
        color: box.backgroundColor,
      },
    ],
  }
}

// Convert LayoutResult to SlideInventory
function layoutResultToSlideInventory(
  result: LayoutResult,
  fontName: string,
  isTitleSlide: boolean
): SlideInventory {
  const inventory: SlideInventory = {}

  result.textBoxes.forEach((box, index) => {
    const shapeKey = `shape-${index}`
    inventory[shapeKey] = textBoxToShape(box, fontName, isTitleSlide)
  })

  // Add iconBoxes to inventory
  if (result.iconBoxes) {
    result.iconBoxes.forEach((box, index) => {
      const shapeKey = `icon-${index}`
      inventory[shapeKey] = iconBoxToShape(box, fontName)
    })
  }

  // Add codeBoxes to inventory
  if (result.codeBoxes) {
    result.codeBoxes.forEach((box, index) => {
      const shapeKey = `code-${index}`
      inventory[shapeKey] = codeBoxToShape(box)
    })
  }

  return inventory
}

// Convert a single slide to SlideInventory
export function slideToInventory(
  slide: Slide,
  theme: Theme
): Effect.Effect<SlideInventory, never> {
  return Effect.gen(function* () {
    const layoutResult = layoutSlide(slide, theme)
    const isTitleSlide = slide._tag === "TitleSlide"
    return layoutResultToSlideInventory(layoutResult, theme.fonts.body, isTitleSlide)
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
