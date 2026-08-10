import { Option as O } from "effect"
import { ContentSlide, TextBlock, Slide } from "../../schema/presentation.js"
import type { RawSlide, RawSection } from "../../parser/builder-types.js"
import { LeanCanvasLayout } from "./schema.js"

const toTextBlocks = (sections: RawSection[]): TextBlock[] =>
  sections.map((s) => new TextBlock({ heading: s.heading, body: s.body }))

export const convertLeanCanvas = (raw: RawSlide): O.Option<Slide[]> => {
  const leanCanvasBlocks = raw.pluginData?.["leanCanvasBlocks"] as RawSection[] | undefined
  if (!leanCanvasBlocks) return O.none()

  return O.some([new ContentSlide({
    title: raw.title,
    layout: new LeanCanvasLayout({
      blocks: toTextBlocks(leanCanvasBlocks),
    }),
  })])
}
