import type { SlideLayout } from "../../schema/presentation.js"
import { registerPlugin } from "../registry.js"
import { handleTextOnlyDirective, textOnlyModeHandlers } from "./handler.js"
import { convertTextOnly } from "./converter.js"
import { handleTextOnlyLayout } from "./layout.js"
import { TextOnlyLayout } from "./schema.js"

function countTextOnlyChars(layout: SlideLayout): number {
  const l = layout as TextOnlyLayout
  return l.body.length
}

registerPlugin({
  id: "text-only",
  layoutTag: "TextOnly",
  mode: "text-only",
  directiveHandler: handleTextOnlyDirective,
  modeHandlers: textOnlyModeHandlers,
  converterPriority: 45,
  converter: convertTextOnly,
  countChars: countTextOnlyChars,
  layoutHandler: handleTextOnlyLayout,
})
