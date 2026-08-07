import {
  SLIDE_WIDTH,
  SLIDE_HEIGHT,
  MARGIN_X,
  MARGIN_Y,
  CELL_GAP,
  SECTION_GAP,
  HEADING_BODY_GAP,
  BODY_HEIGHT,
  TAKEAWAY_HEIGHT,
  TAKEAWAY_GAP,
  BULLET_INDENT,
} from "../../constants.js"
import { TextBlock, Theme } from "../../schema/index.js"
import { parseInlineFormatting, stripInlineFormatting } from "../../parser/inline-formatter.js"
import { hasListMarker, parseBlockToParagraphs, stripListMarkers } from "../../parser/block-formatter.js"
import {
  TextBox,
  LayoutResult,
  SectionContext,
  SectionBoxResult,
  GridDimensions,
  GridSpacing,
  ColumnDimensions,
  RowDimensions,
  LeanCanvasDimensions,
  LeanCanvasCellSpec,
} from "./types.js"

// --- Takeaway helpers (used by 9+ layout functions) ---

/**
 * Calculate the vertical space reserved at the bottom of a slide for the takeaway box.
 * Returns TAKEAWAY_HEIGHT + TAKEAWAY_GAP when a takeaway is present, 0 otherwise.
 */
export const reservedForTakeaway = (takeaway: string | undefined): number =>
  takeaway ? TAKEAWAY_HEIGHT + TAKEAWAY_GAP : 0

/**
 * Build a takeaway TextBox positioned at the bottom of the slide.
 */
export function buildTakeawayBox(takeaway: string, theme: Theme): TextBox {
  const takeawayY = SLIDE_HEIGHT - MARGIN_Y - TAKEAWAY_HEIGHT
  return {
    x: MARGIN_X,
    y: takeawayY,
    w: SLIDE_WIDTH - 2 * MARGIN_X,
    h: TAKEAWAY_HEIGHT,
    text: takeaway,
    isBold: true,
    fontSize: theme.contentSlide.takeawaySize,
    color: theme.contentSlide.takeawayColor,
    align: "center",
    valign: "middle",
  }
}

/**
 * Append a takeaway box to an existing LayoutResult if a takeaway string is provided.
 * Consolidates the repeated pattern: if (takeaway) { textBoxes.push(buildTakeawayBox(...)) }
 */
export function withTakeaway(
  result: LayoutResult,
  takeaway: string | undefined,
  theme: Theme
): LayoutResult {
  if (!takeaway) return result
  return {
    ...result,
    textBoxes: [...result.textBoxes, buildTakeawayBox(takeaway, theme)],
  }
}

// --- Dimension calculators (pure functions) ---

// Calculate grid cell dimensions
export function calculateGridDimensions(
  rows: number,
  cols: number,
  titleY: number,
  reservedBottom: number = 0
): GridDimensions {
  const availableHeight = SLIDE_HEIGHT - titleY - MARGIN_Y - reservedBottom
  const contentWidth = SLIDE_WIDTH - 2 * MARGIN_X
  return {
    cellWidth: (contentWidth - (cols - 1) * CELL_GAP) / cols,
    cellHeight: (availableHeight - (rows - 1) * CELL_GAP) / rows,
  }
}

// Calculate grid-specific spacing based on max(rows, cols)
export function calculateGridSpacing(
  rows: number,
  cols: number,
  theme: Theme
): GridSpacing {
  const maxDim = Math.max(rows, cols)
  const baseH = theme.contentSlide.headingSize
  const baseB = theme.contentSlide.bodySize

  if (maxDim <= 1) {
    return {
      headingSize: baseH,
      bodySize: baseB,
      headingHeight: 0.22,
      headingBodyGap: 0.08,
      bodyHeight: 0.3,
      padding: 0.1,
    }
  }
  if (maxDim <= 2) {
    return {
      headingSize: Math.max(baseH - 2, 6),
      bodySize: Math.max(baseB - 2, 6),
      headingHeight: 0.22,
      headingBodyGap: 0.07,
      bodyHeight: 0.3,
      padding: 0.08,
    }
  }
  if (maxDim <= 3) {
    return {
      headingSize: Math.max(baseH - 4, 6),
      bodySize: Math.max(baseB - 4, 6),
      headingHeight: 0.18,
      headingBodyGap: 0.06,
      bodyHeight: 0.25,
      padding: 0.05,
    }
  }
  // 4+: dense grid
  return {
    headingSize: Math.max(baseH - 6, 6),
    bodySize: Math.max(baseB - 6, 6),
    headingHeight: 0.15,
    headingBodyGap: 0.05,
    bodyHeight: 0.2,
    padding: 0.03,
  }
}

// Calculate left-right column dimensions
export function calculateColumnDimensions(
  leftRatio: number,
  rightRatio: number,
  titleY: number,
  reservedBottom: number = 0
): ColumnDimensions {
  const contentWidth = SLIDE_WIDTH - 2 * MARGIN_X
  const totalRatio = leftRatio + rightRatio
  const leftWidth = (contentWidth - CELL_GAP) * (leftRatio / totalRatio)
  const rightWidth = (contentWidth - CELL_GAP) * (rightRatio / totalRatio)

  return {
    leftWidth,
    rightWidth,
    rightX: MARGIN_X + leftWidth + CELL_GAP,
    availableHeight: SLIDE_HEIGHT - titleY - MARGIN_Y - reservedBottom,
  }
}

// Calculate top-bottom row dimensions
export function calculateRowDimensions(
  topRatio: number,
  bottomRatio: number,
  titleY: number,
  reservedBottom: number = 0
): RowDimensions {
  const availableHeight = SLIDE_HEIGHT - titleY - MARGIN_Y - reservedBottom
  const totalRatio = topRatio + bottomRatio
  const topHeight = (availableHeight - CELL_GAP) * (topRatio / totalRatio)
  const bottomHeight = (availableHeight - CELL_GAP) * (bottomRatio / totalRatio)
  const bottomY = titleY + topHeight + CELL_GAP
  const availableWidth = SLIDE_WIDTH - 2 * MARGIN_X

  return {
    topHeight,
    bottomHeight,
    bottomY,
    availableWidth,
  }
}

// 全角として数える文字の範囲（CJK 統合漢字・かな・全角記号・全角英数）
const FULL_WIDTH = /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦]/

/**
 * 1行の視覚的な幅を「全角文字何個ぶんか」で返す。
 * 半角は 0.5、全角は 1。
 */
function visualWidthInEm(line: string): number {
  let width = 0
  for (const char of line) {
    width += FULL_WIDTH.test(char) ? 1 : 0.5
  }
  return width
}

/**
 * Estimate text height based on content length and container width.
 *
 * Algorithm:
 * 1. Measure each line in "em" units: full-width chars count 1, half-width 0.5.
 *    Counting ASCII as full-width over-estimates Latin text by about 2x, which
 *    would make the overflow check reject correct slides.
 * 2. Em width = fontSize/72 inches. Line height = em width * 1.5 (150% spacing).
 * 3. For each explicit newline, calculate how many visual lines it wraps to
 *    given the container width.
 * 4. Sum all visual lines, convert to inches, add 0.05" padding.
 * 5. Clamp minimum to 0.25" to prevent zero-height boxes.
 */
export function estimateTextHeight(
  text: string,
  fontSize: number,
  containerWidth: number
): number {
  const lineHeight = (fontSize / 72) * 1.5
  return Math.max(0.25, countVisualLines(text, fontSize, containerWidth) * lineHeight + 0.05)
}

/**
 * 明示的な改行と折返しを合わせた視覚的な行数を返す。
 *
 * `estimateTextHeight`（レイアウトの領域確保用、行間 150% で余裕を持たせる）と
 * `detectOverflow`（はみ出し判定用、1行ぶんを過大に数えない）が同じ折返し規則を
 * 共有するために切り出してある。
 */
export function countVisualLines(
  text: string,
  fontSize: number,
  containerWidth: number
): number {
  const emWidth = fontSize / 72
  let totalLines = 0
  for (const line of text.split('\n')) {
    const lineWidth = visualWidthInEm(line) * emWidth
    totalLines += Math.max(1, Math.ceil(lineWidth / containerWidth))
  }
  return totalLines
}

/**
 * Build text boxes for a list of sections within a bounded area.
 *
 * Algorithm (dynamic body height distribution):
 * When `availableHeight` is set in the context, body heights are calculated dynamically:
 * 1. Compute fixed overhead: padding (top+bottom), section gaps, heading-body gaps, heading heights.
 * 2. Subtract fixed overhead from availableHeight to get space for body content.
 * 3. Estimate each section's "natural" body height using estimateTextHeight().
 * 4. If total natural height fits, use natural heights (tight fit).
 * 5. If total exceeds available space, scale down proportionally (min 0.25" per body).
 *
 * When `availableHeight` is NOT set, each body uses a fixed BODY_HEIGHT.
 */
export function buildSectionBoxes(
  sections: ReadonlyArray<TextBlock>,
  context: SectionContext
): SectionBoxResult {
  const boxes: TextBox[] = []
  let currentY = context.baseY + context.padding

  // Calculate per-section body heights if availableHeight is set
  let dynamicBodyHeights: number[] = []
  const FIXED_HEADING_HEIGHT = 0.3

  if (context.availableHeight !== undefined) {
    const headingCount = sections.filter(s => s.heading).length
    const defaultHeadingBodyGap = context.headingBodyGap ?? HEADING_BODY_GAP

    // Calculate fixed overhead (padding + gaps)
    const paddingOverhead = 2 * context.padding
    const sectionGapOverhead = Math.max(0, sections.length - 1) * SECTION_GAP

    // Count heading-body gaps (only where both heading and body exist)
    let gapCount = 0
    sections.forEach(s => {
      if (s.heading && s.body) {
        gapCount++
      }
    })
    const gapOverhead = gapCount * defaultHeadingBodyGap
    const headingOverhead = headingCount * FIXED_HEADING_HEIGHT

    const fixedOverhead = paddingOverhead + sectionGapOverhead + gapOverhead + headingOverhead
    const availableForBodyContent = context.availableHeight - fixedOverhead

    // Calculate natural body heights for each section
    const bodyFontSize = context.theme.contentSlide.bodySize
    const textWidth = context.contentWidth - 2 * context.padding - context.theme.indent.body

    const naturalBodyHeights: number[] = sections.map(section => {
      if (!section.body) return 0
      // 実際に描画されるのは parseInlineFormatting 後のテキストなので、
      // 見積もりでも `**` や `` ` `` を除いた長さで数える
      if (hasListMarker(section.body)) {
        // 箇条書きはぶら下げインデントのぶん実効幅が狭く、折返しが増える
        return estimateTextHeight(
          stripInlineFormatting(stripListMarkers(section.body)),
          bodyFontSize,
          textWidth - BULLET_INDENT
        )
      }
      return estimateTextHeight(
        stripInlineFormatting(section.body),
        bodyFontSize,
        textWidth
      )
    })

    const totalNaturalHeight = naturalBodyHeights.reduce((sum, h) => sum + h, 0)

    if (totalNaturalHeight <= availableForBodyContent) {
      // Use natural heights (tight fit)
      dynamicBodyHeights = naturalBodyHeights
    } else {
      // Scale down proportionally
      const scale = availableForBodyContent / totalNaturalHeight
      dynamicBodyHeights = naturalBodyHeights.map(h => Math.max(0.25, h * scale))
    }
  }

  sections.forEach((section, i) => {
    // Section gap (except first)
    if (i > 0) {
      currentY += SECTION_GAP
    }

    // Heading
    if (section.heading) {
      const headingHeight = context.headingHeight ?? FIXED_HEADING_HEIGHT
      boxes.push({
        x: context.baseX + context.padding,
        y: currentY,
        w: context.contentWidth - 2 * context.padding,
        h: headingHeight,
        richText: parseInlineFormatting(section.heading),
        isBold: true,
        fontSize: context.theme.contentSlide.headingSize,
        color: context.theme.contentSlide.headingColor,
        valign: "top",
      })
      currentY += headingHeight + (context.headingBodyGap ?? HEADING_BODY_GAP)
    }

    // Body
    if (section.body) {
      const bodyH = dynamicBodyHeights.length > 0
        ? dynamicBodyHeights[i]
        : context.bodyHeight ?? BODY_HEIGHT
      boxes.push({
        x: context.baseX + context.padding + context.theme.indent.body,
        y: currentY,
        w: context.contentWidth - 2 * context.padding - context.theme.indent.body,
        h: bodyH,
        ...(hasListMarker(section.body)
          ? { paragraphs: parseBlockToParagraphs(section.body) }
          : { richText: parseInlineFormatting(section.body) }),
        fontSize: context.theme.contentSlide.bodySize,
        color: context.theme.contentSlide.textColor,
        valign: "top",
      })
      currentY += bodyH
    }
  })

  return { textBoxes: boxes, finalY: currentY }
}
