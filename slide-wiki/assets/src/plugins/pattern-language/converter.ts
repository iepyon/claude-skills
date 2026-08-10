import { Option as O } from "effect"
import { ContentSlide } from "../../schema/presentation.js"
import type { RawSlide } from "../../parser/builder-types.js"
import type { Slide } from "../../schema/presentation.js"
import { fitSvgToBox } from "../../assets.js"
import {
  PatternMeta,
  PatternSuccessExample,
  PatternFailureExample,
  ConcreteExample,
  ConcreteExampleItem,
  PatternLanguageOverviewLayout,
  PatternLanguageDetailLayout,
} from "./schema.js"
import type { RawPatternLanguage } from "./handler.js"

function parseMeta(raw: Record<string, string>): PatternMeta {
  const relatedStr = raw["related_patterns"] || ""
  const relatedPatterns = relatedStr
    .split(",")
    .map((s) => s.trim().replace(/"/g, ""))
    .filter(Boolean)

  return new PatternMeta({
    number: raw["number"] || "",
    name: raw["name"] || "",
    category: raw["category"] || "",
    stage: raw["stage"] || "",
    oneliner: raw["oneliner"] || "",
    difficulty: parseInt(raw["difficulty"] || "0", 10),
    frequency: parseInt(raw["frequency"] || "0", 10),
    relatedPatterns,
    takeaway: raw["takeaway"] || "",
    reference: raw["reference"] || "",
  })
}

export const convertPatternLanguage = (raw: RawSlide): O.Option<Slide[]> => {
  const plData = raw.pluginData?.["patternLanguage"] as RawPatternLanguage | undefined
  if (!plData) return O.none()

  const meta = parseMeta(plData.meta)
  const concreteExamples = (plData.concreteExamples ?? []).map((rawEx) => new ConcreteExample({
    ...rawEx,
    items: (rawEx.items ?? []).map((item) => new ConcreteExampleItem(item)),
  }))

  // Page 1: Overview Card
  const overview = new ContentSlide({
    title: "",
    layout: new PatternLanguageOverviewLayout({
      meta,
      situation: plData.sections["situation"] || "",
      problem: plData.sections["problem"] || "",
      solution: plData.sections["solution"] || "",
      principles: plData.principles,
      result: plData.sections["result"] || "",
      caution: plData.sections["caution"] || "",
      // WikiPattern の図解と同じ ShapeBox に載るので、大きさの読み替えも同じ規則に通す。
      // ここを通さないと、書き手が `width="100%"` を手で書いたときだけ枠に収まる
      // ＝レイアウトごとに違う約束が2つできる（外部ファイルから貼ると実寸で描かれる）
      diagram: plData.diagram ? fitSvgToBox(plData.diagram) : "",
    }),
  })

  // Page 2: Detail Card (concrete examples embedded in success/failure positions)
  const detail = new ContentSlide({
    title: "",
    layout: new PatternLanguageDetailLayout({
      meta,
      success: new PatternSuccessExample(plData.success),
      failure: new PatternFailureExample(plData.failure),
      concreteExamples,
      template: plData.template,
      checklist: plData.checklist,
      teamScenarios: plData.teamScenarios,
    }),
  })

  return O.some([overview, detail])
}
