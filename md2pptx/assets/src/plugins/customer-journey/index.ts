import { Option as O } from "effect"
import type { SlideLayout } from "../../schema/presentation.js"
import { registerPlugin } from "../registry.js"
import { handleCustomerJourneyDirective, journeyModeHandlers } from "./handler.js"
import { convertCustomerJourney } from "./converter.js"
import { handleCustomerJourneyLayout } from "./layout.js"
import { CustomerJourneyLayout } from "./schema.js"

function countCustomerJourneyChars(layout: SlideLayout): number {
  const cj = layout as CustomerJourneyLayout
  let count = 0
  for (const row of cj.rows) {
    for (const cell of row.cells) {
      for (const item of cell.items) {
        count += item.length
      }
    }
  }
  return count
}

registerPlugin({
  id: "customer-journey",
  layoutTag: "CustomerJourney",
  mode: "customer-journey",
  docDirective: "<!--カスタマージャーニー:-->",
  tokenMatcher: (line, lineNum) =>
    line.trim() === "<!--カスタマージャーニー:-->"
      ? O.some({ type: "PluginDirective" as const, pluginId: "customer-journey", line: lineNum })
      : O.none(),
  directiveHandler: handleCustomerJourneyDirective,
  modeHandlers: journeyModeHandlers,
  converterPriority: 20,
  converter: convertCustomerJourney,
  maxChars: 1000,
  countChars: countCustomerJourneyChars,
  layoutHandler: handleCustomerJourneyLayout,
})
