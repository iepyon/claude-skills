import { Option as O } from "effect"
import { ContentSlide, TextBlock } from "../../schema/presentation.js"
import type { RawSlide } from "../../parser/builder-types.js"
import type { Slide } from "../../schema/presentation.js"
import { AgendaLayout } from "./schema.js"

const toTextBlocks = (sections: Array<{ heading?: string; body?: string }>): TextBlock[] =>
  sections.map((s) => new TextBlock({ heading: s.heading, body: s.body }))

export const convertAgenda = (raw: RawSlide): O.Option<Slide[]> => {
  const agendaItems = raw.pluginData?.["agendaItems"] as Array<{ heading?: string; body?: string }> | undefined
  if (!agendaItems) return O.none()

  const agendaSubtitle = (raw.pluginData?.["agendaSubtitle"] as string) || undefined

  return O.some([new ContentSlide({
    title: "",
    layout: new AgendaLayout({
      title: raw.title,
      subtitle: agendaSubtitle,
      items: toTextBlocks(agendaItems),
    }),
  })])
}
