import type { SlideLayout } from "../../schema/presentation.js"
import { registerPlugin } from "../registry.js"
import { handleIconColDirective, handleIconCardDirective, iconLayoutModeHandlers } from "./handler.js"
import { convertIconColumn, convertIconCard } from "./converter.js"
import { handleIconColumnLayout, handleIconCardLayout } from "./layout.js"
import { IconColumnLayout, IconCardLayout } from "./schema.js"
import { MAX_CHARS_ICON_LAYOUT } from "./constants.js"

function countPlainTextChars(text: string): number {
  return text
    .replace(/^#+\s+/gm, "")
    .replace(/<!--.*?-->/gs, "")
    .replace(/^\s*$/gm, "")
    .trim().length
}

function countIconLayoutChars(layout: SlideLayout): number {
  const l = layout as IconColumnLayout | IconCardLayout
  let count = 0
  for (const col of l.columns) {
    count += countPlainTextChars(col.heading)
    if (col.body) count += countPlainTextChars(col.body)
  }
  if (l.takeaway) count += countPlainTextChars(l.takeaway)
  return count
}

// Registration 1: IconColumn
registerPlugin({
  id: "icon-cols",
  layoutTag: "IconColumn",
  mode: "icon-cols",
  docDirective: "<!--icon-cols-->",
  directiveHandler: handleIconColDirective,
  sectionRoute: { field: "iconColumns" },
  modeHandlers: iconLayoutModeHandlers,
  converterPriority: 60,
  converter: convertIconColumn,
  maxChars: MAX_CHARS_ICON_LAYOUT,
  countChars: countIconLayoutChars,
  layoutHandler: handleIconColumnLayout,
})

// Registration 2: IconCard
registerPlugin({
  id: "icon-cards",
  layoutTag: "IconCard",
  mode: "icon-cards",
  docDirective: "<!--icon-cards-->",
  directiveHandler: handleIconCardDirective,
  sectionRoute: { field: "iconColumns" },
  modeHandlers: iconLayoutModeHandlers,
  converterPriority: 50,
  converter: convertIconCard,
  maxChars: MAX_CHARS_ICON_LAYOUT,
  countChars: countIconLayoutChars,
  layoutHandler: handleIconCardLayout,
})
