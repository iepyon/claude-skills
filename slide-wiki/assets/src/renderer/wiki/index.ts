import { Effect } from "effect"
import { Theme, DEFAULT_THEME } from "../../schema/index.js"
import { RenderError } from "../../errors.js"
import { renderSlide } from "../html/index.js"
import { WikiDeck, WikiSite, WikiOptions } from "./types.js"
import { buildSiteIndex } from "./site-index.js"
import { buildLinkGraph, buildResolutionTable } from "./link-graph.js"
import { generateWikiHtml } from "./template.js"

export type { WikiDeck, WikiSite, WikiEntry, BrokenLink, WikiOptions } from "./types.js"
export { buildSiteIndex } from "./site-index.js"
export { buildLinkGraph, collectRefs } from "./link-graph.js"

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

    return generateWikiHtml(site, slidesHtml, theme, { ...options, resolveTable })
  })
}
