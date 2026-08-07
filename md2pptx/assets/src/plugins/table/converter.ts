import { Option as O } from "effect"
import { ContentSlide, Slide } from "../../schema/presentation.js"
import type { RawSlide } from "../../parser/builder-types.js"
import { TableLayout } from "./schema.js"
import type { RawTable } from "./handler.js"

export const convertTable = (raw: RawSlide): O.Option<Slide[]> => {
  const table = raw.pluginData?.["table"] as RawTable | undefined
  if (!table) return O.none()

  const layout = new TableLayout({
    headers: table.headers,
    rows: table.rows,
    takeaway: raw.takeaway,
  })

  return O.some([
    new ContentSlide({
      title: raw.title,
      layout,
    }),
  ])
}
