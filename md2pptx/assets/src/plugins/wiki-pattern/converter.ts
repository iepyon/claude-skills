import { Option as O } from "effect"
import { ContentSlide, TextBlock } from "../../schema/presentation.js"
import type { RawSlide, RawSection } from "../../parser/builder-types.js"
import type { Slide } from "../../schema/presentation.js"
import { ParseError } from "../../errors.js"
import { getVocabulary, resolveTerm } from "../../ontology/index.js"
import { WikiPatternLayout } from "./schema.js"
import { DIAGRAM_FENCE, SECTIONS_FIELD } from "./handler.js"

const VOCABULARY = "wiki-pattern-sections"

/** 語彙の宣言順（状況 → 問題 → 解決）。書いた順ではなくこの順で左段に積む */
const declaredOrder = (): string[] => getVocabulary(VOCABULARY)?.terms.map((t) => t.key) ?? []

/**
 * 節を語彙の宣言順に並べ替える。
 *
 * 見出しの正規化（別名・大文字小文字・末尾コロン）は `resolveTerm` に任せる。
 * ここで自前に照合すると、宣言では受理されるのに描画では落ちる節が生まれる
 * — lean-canvas がそうなっていた、と CLAUDE.md が書いている失敗。
 */
const orderSections = (sections: readonly RawSection[]): TextBlock[] => {
  const vocab = getVocabulary(VOCABULARY)
  const order = declaredOrder()

  const keyed = sections.map((s) => ({
    section: s,
    key: vocab && s.heading ? resolveTerm(vocab, s.heading)?.key : undefined,
  }))

  // 語彙外の節は描かない（宣言の unknown-effect がそう言っている）
  const known = keyed.filter((k) => k.key !== undefined)
  known.sort((a, b) => order.indexOf(a.key!) - order.indexOf(b.key!))

  return known.map(
    ({ section }) => new TextBlock({ heading: section.heading, body: section.body })
  )
}

export const convertWikiPattern = (raw: RawSlide): O.Option<Slide[]> => {
  const sections = raw.pluginData?.[SECTIONS_FIELD] as RawSection[] | undefined
  if (!sections) return O.none()

  const diagram = ((raw.pluginData?.["wikiPatternDiagram"] as string | undefined) ?? "").trim()

  // 図解は必須。宣言（cardinality: "1"）を lint が警告として報告するのに加えて、
  // 変換でも止める — 警告を握り潰したままビルドすると、右半分が空のまま公開される。
  if (!diagram) {
    throw new ParseError({
      message:
        `パターン「${raw.title}」に \`\`\`${DIAGRAM_FENCE} フェンスが無い。` +
        `WikiPattern は右側の図解が必須（ontology.yaml の WikiPattern.slots.diagram）`,
    })
  }

  return O.some([
    new ContentSlide({
      title: raw.title,
      layout: new WikiPatternLayout({
        sections: orderSections(sections),
        diagram,
        takeaway: raw.takeaway,
      }),
    }),
  ])
}
