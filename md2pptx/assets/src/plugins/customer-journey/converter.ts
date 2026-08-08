import { Option as O } from "effect"
import { ContentSlide, Slide } from "../../schema/presentation.js"
import type { RawSlide } from "../../parser/builder-types.js"
import { CustomerJourneyLayout, CustomerJourneyRow, CustomerJourneyCell } from "./schema.js"
import type { RawCustomerJourney } from "./handler.js"
import { getVocabulary } from "../../ontology/index.js"

export const convertCustomerJourney = (raw: RawSlide): O.Option<Slide[]> => {
  const journey = raw.pluginData?.["customerJourney"] as RawCustomerJourney | undefined
  if (!journey) return O.none()

  // 行の並びと表示ラベルは ontology.yaml の `journey-rows` が正本（handler と同じ語彙）
  const rowTerms = getVocabulary("journey-rows")!.terms
  const allPhases = journey.phases
  const MAX_PHASES_PER_SLIDE = 4

  // Split phases into chunks of 4 for multi-slide support
  const phaseChunks: typeof allPhases[] = []
  for (let i = 0; i < allPhases.length; i += MAX_PHASES_PER_SLIDE) {
    phaseChunks.push(allPhases.slice(i, i + MAX_PHASES_PER_SLIDE))
  }

  // Generate one slide per chunk
  return O.some(phaseChunks.map((phaseChunk, chunkIndex) => {
    const phases = phaseChunk.map((p) => p.name)

    // 宣言された行（タッチ/行動/判断/感情）を宣言順に組む
    const rows = rowTerms.map((term) => {
      const cells = phaseChunk.map(
        (phase) => new CustomerJourneyCell({ items: phase.cells[term.key] || [] })
      )
      return new CustomerJourneyRow({ label: term.canonical, cells })
    })

    // Append page number when spanning multiple slides
    const title = phaseChunks.length > 1
      ? `${raw.title} (${chunkIndex + 1}/${phaseChunks.length})`
      : raw.title

    return new ContentSlide({
      title,
      layout: new CustomerJourneyLayout({
        phases,
        rows: [rows[0], rows[1], rows[2], rows[3]],
      }),
    })
  }))
}
