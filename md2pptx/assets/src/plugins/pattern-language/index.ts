import { Option as O } from "effect"
import type { SlideLayout } from "../../schema/presentation.js"
import { registerPlugin } from "../registry.js"
import { handlePatternLanguageDirective, patternLanguageModeHandlers } from "./handler.js"
import { convertPatternLanguage } from "./converter.js"
import { handlePatternLanguageLayout } from "./layout.js"
import { PatternLanguageOverviewLayout, PatternLanguageDetailLayout } from "./schema.js"

function countPatternLanguageChars(layout: SlideLayout): number {
  if (layout._tag === "PatternLanguageOverview") {
    const l = layout as PatternLanguageOverviewLayout
    let count = 0
    count += l.meta.name.length
    count += l.meta.oneliner.length
    count += l.situation.length
    count += l.problem.length
    count += l.solution.length
    for (const p of l.principles) count += p.length
    count += l.result.length
    count += l.caution.length
    return count
  }
  if (layout._tag === "PatternLanguageDetail") {
    const l = layout as PatternLanguageDetailLayout
    let count = 0
    count += l.success.title.length + l.success.before.length + l.success.analysis.length + l.success.after.length
    count += l.failure.title.length + l.failure.attempt.length + l.failure.problem.length + l.failure.improvement.length
    for (const ex of l.concreteExamples) {
      count += ex.title.length + ex.goodExample.length + ex.goodPoints.length + ex.badExample.length + ex.badReason.length
      for (const item of ex.items) count += item.label.length + item.text.length
    }
    count += l.template.length
    for (const c of l.checklist) count += c.length
    for (const s of l.teamScenarios) count += s.length
    return count
  }
  return 0
}

registerPlugin({
  id: "pattern-language",
  layoutTag: "PatternLanguageOverview",
  mode: "pattern-language",
  docDirective: "<!--pattern-language-a-->",
  tokenMatcher: (line, lineNum) =>
    line.trim() === "<!--pattern-language-a-->"
      ? O.some({ type: "PluginDirective" as const, pluginId: "pattern-language", line: lineNum })
      : O.none(),
  directiveHandler: handlePatternLanguageDirective,
  modeHandlers: patternLanguageModeHandlers,
  converterPriority: 15,
  converter: convertPatternLanguage,
  maxChars: 1024,
  countChars: countPatternLanguageChars,
  layoutHandler: handlePatternLanguageLayout,
  titleFontSize: 1,
})
