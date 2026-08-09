import { Option as O } from "effect"
import { ContentSlide, TextBlock } from "../../schema/presentation.js"
import type { RawSlide, RawSection } from "../../parser/builder-types.js"
import type { Slide } from "../../schema/presentation.js"
import { ParseError } from "../../errors.js"
import { getVocabulary, resolveTerm } from "../../ontology/index.js"
import { WikiPatternLayout } from "./schema.js"
import { diagramFenceLanguage, DIAGRAM_FIELD, SECTIONS_FIELD } from "./handler.js"

const VOCABULARY = "wiki-pattern-sections"

/**
 * 節を語彙の宣言順（状況 → 問題 → 解決）に並べ替える。書いた順では積まない。
 *
 * 見出しの正規化（別名・大文字小文字・末尾コロン）は `resolveTerm` に任せる。
 * ここで自前に照合すると、宣言では受理されるのに描画では落ちる節が生まれる
 * — lean-canvas がそうなっていた、と CLAUDE.md が書いている失敗。
 */
const orderSections = (sections: readonly RawSection[]): TextBlock[] => {
  const vocab = getVocabulary(VOCABULARY)
  if (!vocab) return []
  const order = vocab.terms.map((t) => t.key)

  // 語彙外の節は描かない（宣言の unknown-effect がそう言っている）
  return sections
    .flatMap((section) => {
      const key = section.heading ? resolveTerm(vocab, section.heading)?.key : undefined
      return key === undefined ? [] : [{ section, rank: order.indexOf(key) }]
    })
    .sort((a, b) => a.rank - b.rank)
    .map(({ section }) => new TextBlock({ heading: section.heading, body: section.body }))
}

export const convertWikiPattern = (raw: RawSlide): O.Option<Slide[]> => {
  const sections = raw.pluginData?.[SECTIONS_FIELD] as RawSection[] | undefined
  if (!sections) return O.none()

  const diagram = ((raw.pluginData?.[DIAGRAM_FIELD] as string | undefined) ?? "").trim()

  // 図解は必須。宣言（cardinality: "1"）を lint が警告として報告するのに加えて、
  // 変換でも止める — 警告を握り潰したままビルドすると、右半分が空のまま公開される。
  if (!diagram) {
    throw new ParseError({
      message:
        `パターン「${raw.title}」に \`\`\`${diagramFenceLanguage()} フェンスが無い。` +
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
