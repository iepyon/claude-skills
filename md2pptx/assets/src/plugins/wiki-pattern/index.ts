import type { SlideLayout } from "../../schema/presentation.js"
import { registerPlugin } from "../registry.js"
import { handleWikiPatternDirective, wikiPatternModeHandlers, SECTIONS_FIELD } from "./handler.js"
import { convertWikiPattern } from "./converter.js"
import { handleWikiPatternLayout } from "./layout.js"
import { WikiPatternLayout } from "./schema.js"

/**
 * 数えるのは人が読む文字だけ。**SVG は数えない。**
 *
 * 図解のマークアップは 1〜2 KB あり、既定の上限（1000字）をそれだけで超える。
 * 図を描き込むほどスライドが「文字数超過」で落ちるのでは上限が意味を失うので、
 * 上限が守らせたい「1枚に詰め込みすぎない」の対象から外す。
 */
function countWikiPatternChars(layout: SlideLayout): number {
  const l = layout as WikiPatternLayout
  let count = 0
  for (const section of l.sections) {
    if (section.heading) count += section.heading.length
    if (section.body) count += section.body.length
  }
  if (l.takeaway) count += l.takeaway.length
  return count
}

registerPlugin({
  id: "wiki-pattern",
  layoutTag: "WikiPattern",
  mode: "wiki-pattern",
  directiveHandler: handleWikiPatternDirective,
  sectionRoute: { field: SECTIONS_FIELD },
  modeHandlers: wikiPatternModeHandlers,
  converterPriority: 32,
  converter: convertWikiPattern,
  countChars: countWikiPatternChars,
  layoutHandler: handleWikiPatternLayout,
})
