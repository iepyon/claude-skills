import { pipe, Option as O } from "effect"
import { TitleSlide, ContentSlide, DefaultLayout, LeftRightLayout, TopBottomLayout, GridLayout, TextBlock, CodeDisplayLayout } from "../schema/index.js"
import { RawSlide, RawSection } from "./builder-types.js"
import { getConverters } from "../plugins/registry.js"

// Convert raw sections to typed TextBlocks
const toTextBlocks = (sections: RawSection[]): TextBlock[] =>
  sections.map((s) => new TextBlock({ heading: s.heading, body: s.body }))

/**
 * Convert a RawSlide to one or more validated Slide objects.
 *
 * Layout detection priority (first match wins):
 *  1. TitleSlide       — raw.type === "title"
 *  2. (plugin converters checked here, including IconCard, IconColumn, Steps, NumberedList)
 *  3. CodeDisplay      — raw.codeLanguage && raw.codeLines
 *  4. LeftRight        — raw.leftSections && raw.rightSections
 *  5. TopBottom        — raw.topSections && raw.bottomSections
 *  6. Grid             — raw.gridCells is set
 *  7. Default          — fallback (plain sections)
 */
export const rawSlideToSlide = (raw: RawSlide): Array<TitleSlide | ContentSlide> => {
  if (raw.type === "title") {
    return [new TitleSlide({ title: raw.title, subtitle: raw.subtitle })]
  }

  // Try plugin converters first (sorted by priority)
  for (const converter of getConverters()) {
    const result = converter(raw)
    if (O.isSome(result)) {
      return result.value as Array<TitleSlide | ContentSlide>
    }
  }

  if (raw.codeLanguage && raw.codeLines) {
    return [new ContentSlide({
      title: raw.title,
      layout: new CodeDisplayLayout({
        language: raw.codeLanguage,
        code: raw.codeLines.join('\n'),
        caption: raw.codeCaption,
      }),
    })]
  }

  if (raw.leftSections && raw.rightSections) {
    return [new ContentSlide({
      title: raw.title,
      layout: new LeftRightLayout({
        leftRatio: raw.leftRatio || 1,
        rightRatio: raw.rightRatio || 1,
        leftSections: toTextBlocks(raw.leftSections),
        rightSections: toTextBlocks(raw.rightSections),
        takeaway: raw.takeaway,
      }),
    })]
  }

  if (raw.topSections && raw.bottomSections) {
    return [new ContentSlide({
      title: raw.title,
      layout: new TopBottomLayout({
        topRatio: raw.topRatio || 1,
        bottomRatio: raw.bottomRatio || 1,
        topSections: toTextBlocks(raw.topSections),
        bottomSections: toTextBlocks(raw.bottomSections),
        takeaway: raw.takeaway,
      }),
    })]
  }

  if (raw.gridCells) {
    return [new ContentSlide({
      title: raw.title,
      layout: new GridLayout({
        rows: raw.gridRows || 1,
        cols: raw.gridCols || 1,
        cells: toTextBlocks(raw.gridCells),
        takeaway: raw.takeaway,
      }),
    })]
  }

  return [new ContentSlide({
    title: raw.title,
    layout: new DefaultLayout({
      sections: toTextBlocks(raw.sections || []),
      takeaway: raw.takeaway,
    }),
  })]
}
