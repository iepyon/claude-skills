import { Option as O } from "effect"
import { ContentSlide } from "../../schema/presentation.js"
import type { RawSlide } from "../../parser/builder-types.js"
import type { Slide } from "../../schema/presentation.js"
import { QuoteLayout } from "./schema.js"

export const convertQuote = (raw: RawSlide): O.Option<Slide[]> => {
  const quoteBody = raw.pluginData?.["quoteBody"] as string | undefined
  if (quoteBody === undefined) return O.none()

  const quoteAuthor = raw.pluginData?.["quoteAuthor"] as string | undefined

  return O.some([new ContentSlide({
    title: raw.title,
    layout: new QuoteLayout({
      body: quoteBody,
      author: quoteAuthor,
    }),
  })])
}
