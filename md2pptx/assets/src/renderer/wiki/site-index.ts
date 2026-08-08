import { WikiDeck, WikiEntry, WikiDeckView } from "./types.js"

/**
 * デッキ集合を、サイト全体で一意な ID を持つスライド索引に組み替える。
 *
 * パーサが振る ID はデッキ内でしか一意でない（単体ファイルを --html に
 * かけたときに短く安定した ID であってほしいため）。サイトにまとめる段で
 * `deck-slug/slide-id` に名前空間化する。
 */
export function buildSiteIndex(decks: readonly WikiDeck[]): {
  entries: WikiEntry[]
  deckViews: WikiDeckView[]
  byId: Map<string, WikiEntry>
} {
  const usedDeckSlugs = new Map<string, number>()
  const usedGlobalIds = new Map<string, number>()

  const unique = (used: Map<string, number>, base: string): string => {
    const seen = used.get(base) ?? 0
    used.set(base, seen + 1)
    return seen === 0 ? base : `${base}-${seen + 1}`
  }

  const entries: WikiEntry[] = []
  const deckViews: WikiDeckView[] = []
  const byId = new Map<string, WikiEntry>()
  let globalIndex = 0

  for (const deck of decks) {
    const deckSlug = unique(usedDeckSlugs, deck.slug)
    const entryIds: string[] = []

    deck.presentation.slides.forEach((slide, deckIndex) => {
      // slide.id が空になるのは、パイプラインを通さず組み立てた Presentation だけ。
      // その場合でも位置から ID を作って、リンク先として指せる状態を保つ。
      const localId = slide.id || `slide-${deckIndex + 1}`
      const globalId = unique(usedGlobalIds, `${deckSlug}/${localId}`)

      const entry: WikiEntry = {
        globalId,
        deckSlug,
        localId,
        // pattern-language は title:"" のスライドを吐くので、
        // ここで補わないとサイドバーに空行が並ぶ
        title: slide.title || deck.title,
        slide,
        globalIndex,
        deckIndex,
      }

      entries.push(entry)
      byId.set(globalId, entry)
      entryIds.push(globalId)
      globalIndex++
    })

    deckViews.push({ slug: deckSlug, title: deck.title, entryIds })
  }

  return { entries, deckViews, byId }
}
