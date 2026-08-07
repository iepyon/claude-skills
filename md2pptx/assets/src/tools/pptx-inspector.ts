import { Effect } from "effect"
import JSZip from "jszip"
import { RenderError } from "../errors.js"
import {
  ParagraphInventory,
  PresentationInventory,
  ShapeInventory,
  SlideInventory,
} from "./inventory.js"

// EMU (English Metric Units) to inches conversion
// 1 inch = 914400 EMU
const EMU_TO_INCHES = 914400

// Font size conversion: sz value / 100 = points
const SZ_TO_POINTS = 100

/**
 * Extract text content from OOXML <a:t> elements
 */
function extractText(xml: string): string {
  const textMatches = xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)
  return Array.from(textMatches, (m) => m[1]).join("")
}

/**
 * Extract font size from <a:rPr> element (sz attribute)
 */
function extractFontSize(rPrXml: string): number | undefined {
  const match = rPrXml.match(/sz="(\d+)"/)
  if (!match) return undefined
  return parseInt(match[1], 10) / SZ_TO_POINTS
}

/**
 * Extract bold flag from <a:rPr> element (b attribute)
 */
function extractBold(rPrXml: string): boolean {
  return rPrXml.includes('b="1"')
}

/**
 * Extract color from <a:rPr> element (srgbClr val or solidFill)
 */
function extractColor(rPrXml: string): string | undefined {
  const match = rPrXml.match(/val="([0-9A-Fa-f]{6})"/)
  return match ? match[1].toUpperCase() : undefined
}

/**
 * Extract font name from <a:rPr> element (latin typeface)
 */
function extractFontName(rPrXml: string): string | undefined {
  const match = rPrXml.match(/typeface="([^"]+)"/)
  return match ? match[1] : undefined
}

/**
 * Extract alignment from <a:pPr> element (algn attribute)
 */
function extractAlignment(pPrXml: string): "CENTER" | undefined {
  const match = pPrXml.match(/algn="([^"]+)"/)
  if (match && match[1].toLowerCase() === "ctr") {
    return "CENTER"
  }
  return undefined
}

/**
 * Parse paragraph XML to ParagraphInventory
 */
function parseParagraph(
  paragraphXml: string,
  defaultFontName: string
): ParagraphInventory {
  const text = extractText(paragraphXml)

  // Extract <a:pPr> for alignment
  const pPrMatch = paragraphXml.match(/<a:pPr[^>]*>.*?<\/a:pPr>/s)
  const alignment = pPrMatch ? extractAlignment(pPrMatch[0]) : undefined

  // Extract <a:rPr> for font properties
  const rPrMatch = paragraphXml.match(/<a:rPr[^>]*>.*?<\/a:rPr>/s)
  const fontSize = rPrMatch ? extractFontSize(rPrMatch[0]) : undefined
  const bold = rPrMatch ? extractBold(rPrMatch[0]) : undefined
  const color = rPrMatch ? extractColor(rPrMatch[0]) : undefined
  const fontName = rPrMatch ? extractFontName(rPrMatch[0]) : undefined

  const paragraph: ParagraphInventory = {
    text,
    font_name: fontName ?? defaultFontName,
    font_size: fontSize ?? 16,
    color: color ?? "000000",
  }

  if (alignment) {
    paragraph.alignment = alignment
  }

  if (bold) {
    paragraph.bold = true
  }

  return paragraph
}

/**
 * Parse shape XML to ShapeInventory
 */
function parseShape(
  shapeXml: string,
  defaultFontName: string
): ShapeInventory | null {
  // Extract <p:spPr> for position and size
  const spPrMatch = shapeXml.match(/<p:spPr>.*?<\/p:spPr>/s)
  if (!spPrMatch) return null

  const spPr = spPrMatch[0]

  // Extract <a:off> for position (x, y in EMU)
  const offMatch = spPr.match(/<a:off x="(\d+)" y="(\d+)"/)
  if (!offMatch) return null

  const left = parseInt(offMatch[1], 10) / EMU_TO_INCHES
  const top = parseInt(offMatch[2], 10) / EMU_TO_INCHES

  // Extract <a:ext> for size (cx, cy in EMU)
  const extMatch = spPr.match(/<a:ext cx="(\d+)" cy="(\d+)"/)
  if (!extMatch) return null

  const width = parseInt(extMatch[1], 10) / EMU_TO_INCHES
  const height = parseInt(extMatch[2], 10) / EMU_TO_INCHES

  // Extract <p:txBody> for paragraphs
  const txBodyMatch = shapeXml.match(/<p:txBody>.*?<\/p:txBody>/s)
  if (!txBodyMatch) return null

  const txBody = txBodyMatch[0]

  // Extract all <a:p> paragraphs
  const paragraphMatches = txBody.matchAll(/<a:p>.*?<\/a:p>/gs)
  const paragraphs = Array.from(paragraphMatches, (m) =>
    parseParagraph(m[0], defaultFontName)
  )

  if (paragraphs.length === 0) return null

  return {
    left,
    top,
    width,
    height,
    paragraphs,
  }
}

/**
 * Parse slide XML to SlideInventory
 */
function parseSlide(
  slideXml: string,
  defaultFontName: string
): SlideInventory {
  const inventory: SlideInventory = {}

  // Extract all <p:sp> shapes
  const shapeMatches = slideXml.matchAll(/<p:sp>.*?<\/p:sp>/gs)
  let shapeIndex = 0

  for (const match of shapeMatches) {
    const shape = parseShape(match[0], defaultFontName)
    if (shape) {
      const shapeKey = `shape-${shapeIndex}`
      inventory[shapeKey] = shape
      shapeIndex++
    }
  }

  return inventory
}

/**
 * Extract default font name from theme XML
 */
function extractDefaultFontName(themeXml: string): string {
  // Try to extract <a:latin typeface="..."> from majorFont or minorFont
  const match = themeXml.match(/<a:latin typeface="([^"]+)"/)
  return match ? match[1] : "Arial"
}

/**
 * Inspect PPTX binary and extract PresentationInventory
 */
export function inspectPptx(
  buffer: Buffer
): Effect.Effect<PresentationInventory, RenderError> {
  return Effect.gen(function* () {
    // Load PPTX as ZIP
    const zip = yield* Effect.tryPromise({
      try: () => JSZip.loadAsync(buffer),
      catch: (error) =>
        new RenderError({
          message: `Failed to unzip PPTX: ${error instanceof Error ? error.message : String(error)}`,
        }),
    })

    // Extract theme to get default font name
    const themeFile = zip.file("ppt/theme/theme1.xml")
    const themeXml = themeFile
      ? yield* Effect.tryPromise({
          try: () => themeFile.async("string"),
          catch: (error) =>
            new RenderError({
              message: `Failed to read theme: ${error instanceof Error ? error.message : String(error)}`,
            }),
        })
      : ""
    const defaultFontName = extractDefaultFontName(themeXml)

    // Extract all slide XML files
    const slideFiles = Object.keys(zip.files)
      .filter((path) => path.match(/^ppt\/slides\/slide\d+\.xml$/))
      .sort((a, b) => {
        const aNum = parseInt(a.match(/slide(\d+)\.xml$/)?.[1] ?? "0", 10)
        const bNum = parseInt(b.match(/slide(\d+)\.xml$/)?.[1] ?? "0", 10)
        return aNum - bNum
      })

    const inventory: PresentationInventory = {}

    for (let i = 0; i < slideFiles.length; i++) {
      const slidePath = slideFiles[i]
      const slideFile = zip.file(slidePath)
      if (!slideFile) continue

      const slideXml = yield* Effect.tryPromise({
        try: () => slideFile.async("string"),
        catch: (error) =>
          new RenderError({
            message: `Failed to read ${slidePath}: ${error instanceof Error ? error.message : String(error)}`,
          }),
      })

      const slideKey = `slide-${i}`
      inventory[slideKey] = parseSlide(slideXml, defaultFontName)
    }

    return inventory
  })
}
