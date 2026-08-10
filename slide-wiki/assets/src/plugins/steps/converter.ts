import { Option as O } from "effect"
import { ContentSlide } from "../../schema/presentation.js"
import type { RawSlide } from "../../parser/builder-types.js"
import type { Slide } from "../../schema/presentation.js"
import { StepItem, StepsLayout } from "./schema.js"

export const convertSteps = (raw: RawSlide): O.Option<Slide[]> => {
  const stepsData = raw.pluginData?.["stepsData"] as Array<{ heading?: string; icon?: string; body?: string }> | undefined
  if (!stepsData || stepsData.length < 3) return O.none()

  const steps = stepsData.map((col) => {
    const bodyLines = col.body?.split('\n') || []
    const name = bodyLines[0] || ""
    const body = bodyLines.slice(1).join('\n') || undefined
    return new StepItem({
      heading: col.heading || "",
      icon: col.icon,
      name,
      body,
    })
  })
  return O.some([new ContentSlide({
    title: raw.title,
    layout: new StepsLayout({
      steps,
      takeaway: raw.takeaway,
    }),
  })])
}
