import type { SlideLayout } from "../../schema/presentation.js"
import { registerPlugin } from "../registry.js"
import { handleTableDirective, tableModeHandlers } from "./handler.js"
import { convertTable } from "./converter.js"
import { handleTableLayout } from "./layout.js"
import { TableLayout } from "./schema.js"
import { MAX_CHARS_TABLE } from "./constants.js"

function countTableChars(layout: SlideLayout): number {
  const t = layout as TableLayout
  let count = 0
  for (const header of t.headers) {
    count += header.length
  }
  for (const row of t.rows) {
    for (const cell of row) {
      count += cell.length
    }
  }
  return count
}

registerPlugin({
  id: "table",
  layoutTag: "Table",
  mode: "table",
  docDirective: "<!--table-->",
  directiveHandler: handleTableDirective,
  modeHandlers: tableModeHandlers,
  converterPriority: 25,
  converter: convertTable,
  maxChars: MAX_CHARS_TABLE,
  countChars: countTableChars,
  layoutHandler: handleTableLayout,
})
