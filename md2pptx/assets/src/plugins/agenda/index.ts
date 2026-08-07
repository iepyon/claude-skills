import type { SlideLayout } from "../../schema/presentation.js"
import { registerPlugin } from "../registry.js"
import { handleAgendaDirective, agendaModeHandlers } from "./handler.js"
import { convertAgenda } from "./converter.js"
import { handleAgendaLayout } from "./layout.js"
import { AgendaLayout } from "./schema.js"
import { MAX_CHARS_AGENDA } from "./constants.js"

function countPlainTextChars(text: string): number {
  return text
    .replace(/^#+\s+/gm, "")
    .replace(/<!--.*?-->/gs, "")
    .replace(/^\s*$/gm, "")
    .trim().length
}

function countAgendaChars(layout: SlideLayout): number {
  const l = layout as AgendaLayout
  let count = 0
  if (l.title) count += l.title.length
  if (l.subtitle) count += l.subtitle.length
  for (const item of l.items) {
    if (item.heading) count += countPlainTextChars(item.heading)
    if (item.body) count += countPlainTextChars(item.body)
  }
  return count
}

registerPlugin({
  id: "agenda",
  layoutTag: "Agenda",
  mode: "agenda",
  docDirective: "<!--agenda-->",
  directiveHandler: handleAgendaDirective,
  sectionRoute: { field: "agendaItems" },
  modeHandlers: agendaModeHandlers,
  converterPriority: 35,
  converter: convertAgenda,
  maxChars: MAX_CHARS_AGENDA,
  countChars: countAgendaChars,
  layoutHandler: handleAgendaLayout,
  titleFontSize: 1,
})
