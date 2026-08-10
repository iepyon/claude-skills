import { Option as O } from "effect"
import type { SlideLayout } from "../../schema/presentation.js"
import { TextBlock } from "../../schema/presentation.js"
import { registerPlugin } from "../registry.js"
import { handleNumberedListDirective } from "./handler.js"
import { convertNumberedList } from "./converter.js"
import { handleNumberedListLayout } from "./layout.js"
import { NumberedListLayout } from "./schema.js"

function countPlainTextChars(text: string): number {
  return text
    .replace(/^#+\s+/gm, "")
    .replace(/<!--.*?-->/gs, "")
    .replace(/^\s*$/gm, "")
    .trim().length
}

function countNumberedListChars(layout: SlideLayout): number {
  const l = layout as NumberedListLayout
  let count = 0
  for (const item of l.items) {
    if (item.heading) count += countPlainTextChars(item.heading)
    if (item.body) count += countPlainTextChars(item.body)
  }
  return count
}

registerPlugin({
  id: "numbered-list",
  layoutTag: "NumberedList",
  mode: "numbered-list",
  tokenMatcher: (line, lineNum) => {
    const m = line.match(/^<!--numbered-list:(circle|bar)-->$/)
    return m
      ? O.some({ type: "PluginDirective" as const, pluginId: `numbered-list:${m[1]}`, line: lineNum })
      : O.none()
  },
  directiveHandler: handleNumberedListDirective,
  sectionRoute: { field: "numberedListItems" },
  converterPriority: 40,
  converter: convertNumberedList,
  countChars: countNumberedListChars,
  layoutHandler: handleNumberedListLayout,
})
