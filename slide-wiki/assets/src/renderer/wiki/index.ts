import { Effect } from "effect"
import { Theme, DEFAULT_THEME } from "../../schema/index.js"
import { RenderError } from "../../errors.js"
import { renderSlide } from "../html/index.js"
import { WikiDeck, WikiSite, WikiOptions, WikiRelation } from "./types.js"
import { buildSiteIndex } from "./site-index.js"
import { buildLinkGraph, buildResolutionTable } from "./link-graph.js"
import { loadRelations } from "../../ontology/relations.js"
import { generateWikiHtml } from "./template.js"

export type { WikiDeck, WikiSite, WikiEntry, BrokenLink, WikiOptions, WikiRelation } from "./types.js"
export { buildSiteIndex } from "./site-index.js"
export { buildLinkGraph, collectRefs } from "./link-graph.js"

/**
 * 型のついた辺を、スライド1枚から引ける形に畳む。
 *
 * **無型のリンクグラフ（`buildLinkGraph`）とは別に持つ。** あちらはリンク切れを見つける
 * 仕事があり、そのために「書かれた href」まで運んでいる。こちらが運ぶのは宣言された
 * 関係だけで、両端が実在するかは lint がバンドルの側で見ている。
 * 1つの構造に混ぜると、型を持たない辺と持つ辺が同じ配列に並んで区別が要る。
 *
 * サイトに無いスライドを指す辺は落とす（`--wiki` に一部のデッキだけ渡したときに起きる）。
 */
export function relationsByEntry(
  bundleDir: string,
  site: WikiSite
): Record<string, WikiRelation[]> {
  const out: Record<string, WikiRelation[]> = {}
  for (const edge of loadRelations(bundleDir)) {
    if (!site.byId.has(edge.from) || !site.byId.has(edge.to)) continue
    ;(out[edge.from] ??= []).push({ rel: edge.rel, to: edge.to })
  }
  return out
}

/** 複数デッキから1つの WikiSite（索引＋リンクグラフ）を組む。 */
export function buildWikiSite(decks: readonly WikiDeck[], theme: Theme = DEFAULT_THEME): WikiSite {
  const { entries, deckViews, byId } = buildSiteIndex(decks)
  const { forward, backlinks, broken } = buildLinkGraph(entries, theme)

  return { decks: deckViews, entries, byId, forward, backlinks, broken }
}

/**
 * 複数デッキを1枚の自己完結 HTML に描く。
 *
 * スライドの DOM は renderSlide（`--html` と同じもの）をそのまま使い、
 * 外側のシェルだけを差し替える。これにより Wiki のスライドは
 * `--html` が同じデッキに対して吐くものとバイト単位で同じになる。
 */
export function renderToWiki(
  decks: readonly WikiDeck[],
  theme: Theme = DEFAULT_THEME,
  options: WikiOptions = {}
): Effect.Effect<string, RenderError> {
  return Effect.gen(function* () {
    const site = buildWikiSite(decks, theme)
    const resolveTable = buildResolutionTable(site.entries, theme)

    const slidesHtml = site.entries.map((entry) =>
      renderSlide(entry.slide, theme, entry.globalIndex)
    )

    return generateWikiHtml(site, slidesHtml, theme, {
      ...options,
      resolveTable,
      relations: options.bundleDir ? relationsByEntry(options.bundleDir, site) : undefined,
    })
  })
}
