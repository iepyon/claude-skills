import type { SlideLayout } from "../../schema/presentation.js"
import { registerPlugin } from "../registry.js"
import { handleQuoteDirective, quoteModeHandlers } from "./handler.js"
import { convertQuote } from "./converter.js"
import { handleQuoteLayout } from "./layout.js"
import { QuoteLayout } from "./schema.js"
import { MAX_CHARS_QUOTE } from "./constants.js"

function countQuoteChars(layout: SlideLayout): number {
  const l = layout as QuoteLayout
  return l.body.length + (l.author?.length ?? 0)
}

registerPlugin({
  id: "quote",
  layoutTag: "Quote",
  mode: "quote",
  docDirective: "<!--quote-->",
  directiveHandler: handleQuoteDirective,
  modeHandlers: quoteModeHandlers,
  converterPriority: 44,
  converter: convertQuote,
  maxChars: MAX_CHARS_QUOTE,
  countChars: countQuoteChars,
  layoutHandler: handleQuoteLayout,
})
