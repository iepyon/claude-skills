import { Option as O } from "effect"
import { ContentSlide, TextBlock } from "../../schema/presentation.js"
import type { RawSlide, RawSection } from "../../parser/builder-types.js"
import type { Slide } from "../../schema/presentation.js"
import { ParseError } from "../../errors.js"
import { svgAspectRatio } from "../../assets.js"
import { getVocabulary, resolveTerm } from "../../ontology/index.js"
import { WikiPatternLayout } from "./schema.js"
import { diagramMarker, DIAGRAM_FIELD, SECTIONS_FIELD } from "./handler.js"

const VOCABULARY = "wiki-pattern-sections"

/** 空行（空白だけの行も含む）。ここが段落の切れ目になる */
const PARAGRAPH_BREAK = /\n[ \t]*\n+/

/**
 * 節を段落ごとの `TextBlock` に割る。**2段落目からは見出しを持たない。**
 *
 * 見出しの無い節は `buildSectionBoxes` がそのまま積み、節と節の隙間
 * （`WP_SECTION_GAP`）が段落の隙間になる。本文に `\n\n` を持たせて1つの箱に
 * 渡す手は使えない — HTML は `white-space: normal` で空行を潰し、PPTX は
 * 空行として出すので、**同じ本文が2つの生成物で違う形になる**。
 *
 * 末尾の `\n` を落とすのはここ。ハンドラは節の終わりを知らないまま空行を足すので、
 * 図解や `<!--takeaway-->` の前の空行が末尾に残っている（残したままだと
 * 空の段落が1つ増え、そのぶん本文の高さが削られる）。
 */
const splitParagraphs = (section: RawSection): TextBlock[] => {
  const body = section.body?.trimEnd()
  if (!body) return [new TextBlock({ heading: section.heading, body })]

  return body
    .split(PARAGRAPH_BREAK)
    .map((paragraph, i) =>
      new TextBlock({ heading: i === 0 ? section.heading : undefined, body: paragraph })
    )
}

/**
 * 節を語彙の宣言順（いつ・なにが困るか → そこで）に並べ替える。書いた順では積まない。
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
    .flatMap(({ section }) => splitParagraphs(section))
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
        `パターン「${raw.title}」に図解の参照 \`${diagramMarker()}\` が無い。` +
        `WikiPattern は右側の図解が必須（ontology.yaml の WikiPattern.slots.diagram）`,
    })
  }

  return O.some([
    new ContentSlide({
      title: raw.title,
      layout: new WikiPatternLayout({
        sections: orderSections(sections),
        diagram,
        diagramAspect: svgAspectRatio(diagram),
        takeaway: raw.takeaway,
      }),
    }),
  ])
}
