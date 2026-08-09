import { Effect as E, pipe } from "effect"
import * as A from "effect/Array"
import * as O from "effect/Option"
import { ParseError } from "../errors.js"
import { decodeEntities } from "./entities.js"
import { splitTextIntoLines } from "../text-lines.js"

/**
 * Paragraph data extracted from HTML
 */
export interface ParagraphData {
  readonly text: string
  readonly alignment?: "LEFT" | "CENTER" | "RIGHT"
  readonly font_name: string
  readonly font_size: number
  readonly bold?: boolean
  readonly color: string
}

/**
 * Shape data extracted from HTML
 */
export interface ShapeData {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
  readonly paragraphs: ReadonlyArray<ParagraphData>
}

/**
 * Slide inventory extracted from HTML
 */
export interface SlideInventory {
  readonly [slideKey: string]: {
    readonly [shapeKey: string]: ShapeData
  }
}

/**
 * Extracts attribute value from HTML element string
 */
const extractAttribute = (element: string, attrName: string): O.Option<string> =>
  pipe(
    O.fromNullable(new RegExp(`${attrName}="([^"]*)"`, "i").exec(element)),
    O.flatMap((match) => O.fromNullable(match[1]))
  )

/**
 * Parses data-inches-* attributes from an HTML element
 */
const parseInchesAttributes = (element: string): O.Option<{
  left: number
  top: number
  width: number
  height: number
}> => {
  const left = pipe(
    extractAttribute(element, "data-inches-x"),
    O.flatMap((v) => O.fromNullable(parseFloat(v))),
    O.filter((n) => !isNaN(n))
  )
  const top = pipe(
    extractAttribute(element, "data-inches-y"),
    O.flatMap((v) => O.fromNullable(parseFloat(v))),
    O.filter((n) => !isNaN(n))
  )
  const width = pipe(
    extractAttribute(element, "data-inches-w"),
    O.flatMap((v) => O.fromNullable(parseFloat(v))),
    O.filter((n) => !isNaN(n))
  )
  const height = pipe(
    extractAttribute(element, "data-inches-h"),
    O.flatMap((v) => O.fromNullable(parseFloat(v))),
    O.filter((n) => !isNaN(n))
  )

  return O.all([left, top, width, height]).pipe(
    O.map(([l, t, w, h]) => ({ left: l, top: t, width: w, height: h }))
  )
}


/**
 * Extracts text content from an HTML element.
 *
 * Strips the outer tag, then all inner markup, so that inline formatting
 * (<strong>, <em>, <code>) contributes its text instead of truncating the
 * result at the first child element.
 */
const extractTextContent = (element: string): string => {
  const inner = element.replace(/^<[^>]*>/, "").replace(/<\/[^>]*>\s*$/, "")
  return decodeEntities(inner.replace(/<[^>]*>/g, "")).trim()
}

/**
 * Parses paragraph styling attributes
 */
type ParagraphStyle = {
  fontSize?: number
  fontName?: string
  color?: string
  bold?: boolean
  alignment?: "LEFT" | "CENTER" | "RIGHT"
}

const parseParagraphStyle = (element: string): ParagraphStyle => {
  const fontSize = pipe(
    extractAttribute(element, "data-font-size"),
    O.flatMap((v) => O.fromNullable(parseFloat(v))),
    O.filter((n) => !isNaN(n)),
    O.getOrUndefined
  )

  const color = pipe(
    extractAttribute(element, "data-color"),
    O.getOrUndefined
  )

  const bold = pipe(
    extractAttribute(element, "data-bold"),
    O.map((v) => v.toLowerCase() === "true"),
    O.getOrUndefined
  )

  const alignment = pipe(
    extractAttribute(element, "data-alignment"),
    O.filter((v): v is "LEFT" | "CENTER" | "RIGHT" =>
      v === "LEFT" || v === "CENTER" || v === "RIGHT"
    ),
    O.getOrUndefined
  )

  const fontName = pipe(
    extractAttribute(element, "data-font-name"),
    O.getOrUndefined
  )

  return { fontSize, fontName, color, bold, alignment }
}

/**
 * Parses a paragraph from HTML element
 */
const parseParagraph = (element: string, defaultFontName: string): O.Option<ParagraphData> => {
  const text = extractTextContent(element)
  if (!text) return O.none()

  const style = parseParagraphStyle(element)

  return O.some({
    text,
    font_name: style.fontName ?? defaultFontName,
    font_size: style.fontSize ?? 16,
    color: style.color ?? "000000",
    ...(style.bold !== undefined && { bold: style.bold }),
    ...(style.alignment !== undefined && { alignment: style.alignment })
  })
}

/**
 * Parses a shape from HTML element
 */
const parseShape = (element: string, defaultFontName: string): O.Option<ShapeData> =>
  pipe(
    parseInchesAttributes(element),
    O.flatMap((dimensions) => {
      // Extract all paragraph elements within this shape (exclude the shape container itself)
      // Match p, h1-h6 tags, but not divs to avoid matching the container
      const paragraphRegex = /<(?:p|h[1-6])[^>]*>.*?<\/(?:p|h[1-6])>/gis
      const paragraphMatches = Array.from(element.matchAll(paragraphRegex))

      const paragraphs = pipe(
        paragraphMatches.map((match) => match[0]),
        A.filterMap((para) => parseParagraph(para, defaultFontName))
      )

      // If no paragraphs found, try extracting text directly from the shape element.
      // 改行は行ごとに分ける — PPTX は改行ごとに <a:p> を出すので、
      // 段落数を合わせないと3者比較が「1 vs N」で落ちる
      if (paragraphs.length === 0) {
        const directText = extractTextContent(element)
        if (directText) {
          const style = parseParagraphStyle(element)
          const lines = splitTextIntoLines(directText)
          return O.some({
            ...dimensions,
            paragraphs: lines.map((text) => ({
              text,
              font_name: style.fontName ?? defaultFontName,
              font_size: style.fontSize ?? 16,
              color: style.color ?? "000000",
              ...(style.bold !== undefined && { bold: style.bold }),
              ...(style.alignment !== undefined && { alignment: style.alignment })
            })),
          })
        }
        return O.none()
      }

      return O.some({ ...dimensions, paragraphs })
    })
  )

/**
 * Finds the closing tag for an element starting at a given position
 */
const findClosingTag = (html: string, startPos: number): number => {
  // Extract tag name from opening tag
  const tagMatch = html.slice(startPos).match(/<(\w+)/)
  if (!tagMatch) return -1

  const tagName = tagMatch[1]
  const openTag = `<${tagName}`
  const closeTag = `</${tagName}>`

  let depth = 1
  let pos = startPos + html.slice(startPos).indexOf(">") + 1

  while (depth > 0 && pos < html.length) {
    const nextOpen = html.indexOf(openTag, pos)
    const nextClose = html.indexOf(closeTag, pos)

    if (nextClose === -1) return -1

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++
      pos = nextOpen + openTag.length
    } else {
      depth--
      if (depth === 0) {
        return nextClose + closeTag.length
      }
      pos = nextClose + closeTag.length
    }
  }

  return -1
}

/**
 * Extracts elements with a specific data attribute
 */
const extractElements = (html: string, dataAttr: string): Array<{ id: string; content: string }> => {
  const regex = new RegExp(`<[^>]*${dataAttr}="([^"]+)"[^>]*>`, "gi")
  const results: Array<{ id: string; content: string }> = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(html)) !== null) {
    const id = match[1]
    const startPos = match.index
    const endPos = findClosingTag(html, startPos)

    if (endPos !== -1) {
      results.push({
        id,
        content: html.slice(startPos, endPos)
      })
    }
  }

  return results
}

/**
 * Extracts slide inventory from HTML string
 *
 * Parses data-inches-* attributes from HTML elements to build a SlideInventory.
 * Expected HTML structure:
 * - Elements with data-slide-id="slide-N" contain slide data
 * - Elements with data-shape-id="shape-N" and data-inches-* attributes contain shape data
 * - Text elements with data-font-size, data-color, data-bold contain paragraph styling
 *
 * @param html - HTML string with data-inches-* attributes
 * @returns Effect that yields SlideInventory or ParseError
 */
export const extractInventoryFromHtml = (
  html: string,
  // 既定は DEFAULT_THEME の本文フォント。data-font-name が無い要素の落とし先で、
  // ここを定数にしておくと --theme 付きのデッキで PPTX 側とだけ食い違う
  defaultFontName: string = "Arial"
): E.Effect<SlideInventory, ParseError> =>
  E.gen(function* () {
    const slides = extractElements(html, "data-slide-id")

    if (slides.length === 0) {
      return yield* E.fail(new ParseError({
        message: "No slides found in HTML. Expected elements with data-slide-id attribute."
      }))
    }

    const inventory: Record<string, Record<string, ShapeData>> = {}

    for (const slide of slides) {
      const shapes = extractElements(slide.content, "data-shape-id")
      const shapeData: Record<string, ShapeData> = {}

      for (const shape of shapes) {
        const parsed = parseShape(shape.content, defaultFontName)
        if (O.isSome(parsed)) {
          shapeData[shape.id] = parsed.value
        }
      }

      if (Object.keys(shapeData).length > 0) {
        inventory[slide.id] = shapeData
      }
    }

    if (Object.keys(inventory).length === 0) {
      return yield* E.fail(new ParseError({
        message: "No valid shapes found in HTML. Expected elements with data-shape-id and data-inches-* attributes."
      }))
    }

    return inventory
  })
