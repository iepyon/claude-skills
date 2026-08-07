import { Option as O } from "effect"
import type { SlideLayout } from "../../schema/presentation.js"
import { registerPlugin } from "../registry.js"
import { handleLeanCanvasDirective } from "./handler.js"
import { convertLeanCanvas } from "./converter.js"
import { handleLeanCanvasLayout } from "./layout.js"
import { LeanCanvasLayout } from "./schema.js"
import { MAX_CHARS_LEAN_CANVAS } from "./constants.js"

function countPlainTextChars(text: string): number {
  return text
    .replace(/^#+\s+/gm, "")
    .replace(/<!--.*?-->/gs, "")
    .replace(/^\s*$/gm, "")
    .trim().length
}

function countLeanCanvasChars(layout: SlideLayout): number {
  const l = layout as LeanCanvasLayout
  let count = 0
  for (const block of l.blocks) {
    if (block.heading) count += countPlainTextChars(block.heading)
    if (block.body) count += countPlainTextChars(block.body)
  }
  return count
}

registerPlugin({
  id: "lean-canvas",
  layoutTag: "LeanCanvas",
  mode: "lean-canvas",
  docDirective: "<!--lean-canvas-->",
  tokenMatcher: (line, lineNum) =>
    line.trim() === "<!--lean-canvas-->"
      ? O.some({ type: "PluginDirective" as const, pluginId: "lean-canvas", line: lineNum })
      : O.none(),
  directiveHandler: handleLeanCanvasDirective,
  sectionRoute: { field: "leanCanvasBlocks" },
  converterPriority: 80,
  converter: convertLeanCanvas,
  maxChars: MAX_CHARS_LEAN_CANVAS,
  countChars: countLeanCanvasChars,
  layoutHandler: handleLeanCanvasLayout,
  titleFontSize: 16,
})
