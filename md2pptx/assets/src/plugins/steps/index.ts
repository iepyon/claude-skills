import { Option as O } from "effect"
import type { SlideLayout } from "../../schema/presentation.js"
import { registerPlugin } from "../registry.js"
import { handleStepsDirective, stepsModeHandlers } from "./handler.js"
import { convertSteps } from "./converter.js"
import { handleStepsLayout } from "./layout.js"
import { StepsLayout } from "./schema.js"
import { MAX_CHARS_STEPS } from "./constants.js"

function countPlainTextChars(text: string): number {
  return text
    .replace(/^#+\s+/gm, "")
    .replace(/<!--.*?-->/gs, "")
    .replace(/^\s*$/gm, "")
    .trim().length
}

function countStepsChars(layout: SlideLayout): number {
  const l = layout as StepsLayout
  let count = 0
  for (const step of l.steps) {
    count += countPlainTextChars(step.heading)
    count += countPlainTextChars(step.name)
    if (step.body) count += countPlainTextChars(step.body)
  }
  return count
}

registerPlugin({
  id: "steps",
  layoutTag: "Steps",
  mode: "steps",
  tokenMatcher: (line, lineNum) =>
    line.trim() === "<!--steps-->"
      ? O.some({ type: "PluginDirective" as const, pluginId: "steps", line: lineNum })
      : O.none(),
  directiveHandler: handleStepsDirective,
  sectionRoute: { field: "stepsData" },
  modeHandlers: stepsModeHandlers,
  converterPriority: 30,
  converter: convertSteps,
  maxChars: MAX_CHARS_STEPS,
  countChars: countStepsChars,
  layoutHandler: handleStepsLayout,
})
