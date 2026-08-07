import { Option as O } from "effect"
import { ContentSlide, TextBlock } from "../../schema/presentation.js"
import type { RawSlide } from "../../parser/builder-types.js"
import type { Slide } from "../../schema/presentation.js"
import { NumberedListLayout } from "./schema.js"

const toTextBlocks = (sections: Array<{ heading?: string; body?: string }>): TextBlock[] =>
  sections.map((s) => new TextBlock({ heading: s.heading, body: s.body }))

export const convertNumberedList = (raw: RawSlide): O.Option<Slide[]> => {
  const numberedListVariant = raw.pluginData?.["numberedListVariant"] as "circle" | "bar" | undefined
  const numberedListItems = raw.pluginData?.["numberedListItems"] as Array<{ heading?: string; body?: string }> | undefined
  if (!numberedListVariant || !numberedListItems) return O.none()

  return O.some([new ContentSlide({
    title: raw.title,
    layout: new NumberedListLayout({
      variant: numberedListVariant,
      items: toTextBlocks(numberedListItems),
      takeaway: raw.takeaway,
    }),
  })])
}
