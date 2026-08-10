import { Option as O } from "effect"
import { ContentSlide } from "../../schema/presentation.js"
import type { RawSlide } from "../../parser/builder-types.js"
import type { Slide } from "../../schema/presentation.js"
import { TextOnlyLayout } from "./schema.js"

export const convertTextOnly = (raw: RawSlide): O.Option<Slide[]> => {
  const textOnlyBody = raw.pluginData?.["textOnlyBody"] as string | undefined
  if (textOnlyBody === undefined) return O.none()

  return O.some([new ContentSlide({
    title: raw.title,
    layout: new TextOnlyLayout({
      body: textOnlyBody,
      takeaway: raw.takeaway,
    }),
  })])
}
