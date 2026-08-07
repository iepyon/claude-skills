import { Option as O } from "effect"
import type { SlideLayout } from "../../schema/presentation.js"
import { registerPlugin } from "../registry.js"
import { handleTextOnlyDirective, textOnlyModeHandlers } from "./handler.js"
import { convertTextOnly } from "./converter.js"
import { handleTextOnlyLayout } from "./layout.js"
import { TextOnlyLayout } from "./schema.js"
import { MAX_CHARS_TEXT_ONLY } from "./constants.js"

function countTextOnlyChars(layout: SlideLayout): number {
  const l = layout as TextOnlyLayout
  return l.body.length
}

registerPlugin({
  id: "text-only",
  layoutTag: "TextOnly",
  mode: "text-only",
  docDirective: "<!--text-only-->",
  tokenMatcher: (line, lineNum) =>
    line.trim() === "<!--text-only-->"
      ? O.some({ type: "PluginDirective" as const, pluginId: "text-only", line: lineNum })
      : O.none(),
  directiveHandler: handleTextOnlyDirective,
  modeHandlers: textOnlyModeHandlers,
  converterPriority: 45,
  converter: convertTextOnly,
  maxChars: MAX_CHARS_TEXT_ONLY,
  countChars: countTextOnlyChars,
  layoutHandler: handleTextOnlyLayout,
})
