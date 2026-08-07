import { Option as O } from "effect"
import { ContentSlide } from "../../schema/presentation.js"
import type { RawSlide } from "../../parser/builder-types.js"
import type { Slide } from "../../schema/presentation.js"
import { IconColumn, IconCardLayout, IconColumnLayout } from "./schema.js"

export const convertIconCard = (raw: RawSlide): O.Option<Slide[]> => {
  const iconColumns = raw.pluginData?.["iconColumns"] as Array<{ heading?: string; icon?: string; body?: string }> | undefined
  const iconCardMode = raw.pluginData?.["iconCardMode"] as boolean | undefined
  if (!(iconCardMode && iconColumns && iconColumns.length >= 3)) return O.none()

  const columns = iconColumns.slice(0, 3).map((col) =>
    new IconColumn({
      heading: col.heading || "",
      icon: col.icon || "",
      body: col.body,
    })
  )
  return O.some([new ContentSlide({
    title: raw.title,
    layout: new IconCardLayout({
      columns: [columns[0], columns[1], columns[2]],
      takeaway: raw.takeaway,
    }),
  })])
}

export const convertIconColumn = (raw: RawSlide): O.Option<Slide[]> => {
  const iconColumns = raw.pluginData?.["iconColumns"] as Array<{ heading?: string; icon?: string; body?: string }> | undefined
  if (!(iconColumns && iconColumns.length >= 3)) return O.none()

  const columns = iconColumns.slice(0, 3).map((col) =>
    new IconColumn({
      heading: col.heading || "",
      icon: col.icon || "",
      body: col.body,
    })
  )
  return O.some([new ContentSlide({
    title: raw.title,
    layout: new IconColumnLayout({
      columns: [columns[0], columns[1], columns[2]],
      takeaway: raw.takeaway,
    }),
  })])
}
