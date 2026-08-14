import type { SlideLayout } from "../../schema/presentation.js"
import { registerPlugin } from "../registry.js"
import { handleWikiPatternDirective, wikiPatternModeHandlers, SECTIONS_FIELD } from "./handler.js"
import { convertWikiPattern } from "./converter.js"
import { handleWikiPatternLayout } from "./layout.js"
import { WikiPatternLayout } from "./schema.js"

// 記法そのものは数えない（agenda / steps / icon-layout / lean-canvas / numbered-list と同じ数え方。
// ここだけ生の length で数えると、同じ本文がレイアウトごとに違う長さで上限に当たる）
function countPlainTextChars(text: string): number {
  return text
    .replace(/^#+\s+/gm, "")
    .replace(/<!--.*?-->/gs, "")
    .replace(/^\s*$/gm, "")
    .trim().length
}

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
    if (section.heading) count += countPlainTextChars(section.heading)
    if (section.body) count += countPlainTextChars(section.body)
  }
  // **出典は数えない。** 図解の SVG を数えないのと同じ理由で、
  // 典拠を厚く書くほど「文字数超過」で落ちるのでは、上限が守らせたいもの
  // （読み手が1枚で受け取れる本文の量）とずれる。出典の長さは上限ではなく
  // 箱のはみ出しが見る（0.2in を超えれば validateLayout がビルドを止める）。
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
