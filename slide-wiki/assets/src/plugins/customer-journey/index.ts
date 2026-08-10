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
  directiveHandler: handleCustomerJourneyDirective,
  modeHandlers: journeyModeHandlers,
  converterPriority: 20,
  converter: convertCustomerJourney,
  countChars: countCustomerJourneyChars,
  layoutHandler: handleCustomerJourneyLayout,
})
