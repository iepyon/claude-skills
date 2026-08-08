import { Theme } from "../../schema/index.js"
import { layoutSlide, TextBox } from "../layout/index.js"
import { WikiEntry, BrokenLink } from "./types.js"

/**
 * スライドが張っている内部リンクの参照先（生の [[ref]] 文字列）を集める。
 *
 * layoutSlide を呼ぶのは、リンクが InlineTextRun に載るのがレイアウト段だから。
 * 結果として1スライドにつき layoutSlide が2回走る（グラフ用と描画用）。
 * 数百枚ならミリ秒の世界なので今は許容する。効いてきたら描画側で計算した
 * LayoutResult をここへ渡す形にすればよい（局所的な変更で済む）。
 */
export function collectRefs(entry: WikiEntry, theme: Theme): string[] {
  const refs: string[] = []

  const scanBox = (box: TextBox): void => {
    const runs = box.paragraphs
      ? box.paragraphs.flatMap((para) => para.runs)
      : box.richText ?? []
    for (const run of runs) {
      if (run.link?.kind === "internal") refs.push(run.link.target)
    }
  }

  layoutSlide(entry.slide, theme).textBoxes.forEach(scanBox)
  return refs
}

/**
 * [[ref]] を globalId に解決する。書き手が短く書けることを優先した4段階:
 *
 * 1. `deck/slide` 形式でそのまま当たる（デッキをまたぐ明示的な参照）
 * 2. 自デッキ内の `slide`（最も普通のケース。書き手は短い ID だけ書けばよい）
 * 3. デッキを問わず localId が一致するものがサイト全体でちょうど1つ
 * 4. それ以外は未解決（見つからない、または曖昧）
 *
 * 3 で複数一致したときに黙って先頭を選ばないのは、デッキが増えた瞬間に
 * リンク先が変わる壊れ方をするため。曖昧は曖昧として報告する。
 */
export function resolveRef(
  ref: string,
  fromDeckSlug: string,
  byId: ReadonlyMap<string, WikiEntry>,
  byLocalId: ReadonlyMap<string, readonly WikiEntry[]>
): { globalId: string } | { reason: "not-found" | "ambiguous" } {
  if (byId.has(ref)) return { globalId: ref }

  const sameDeck = `${fromDeckSlug}/${ref}`
  if (byId.has(sameDeck)) return { globalId: sameDeck }

  const candidates = byLocalId.get(ref) ?? []
  if (candidates.length === 1) return { globalId: candidates[0].globalId }
  if (candidates.length > 1) return { reason: "ambiguous" }
  return { reason: "not-found" }
}

export interface LinkGraph {
  forward: Map<string, string[]>
  backlinks: Map<string, string[]>
  broken: BrokenLink[]
}

export function buildLinkGraph(entries: readonly WikiEntry[], byId: ReadonlyMap<string, WikiEntry>, theme: Theme): LinkGraph {
  const byLocalId = new Map<string, WikiEntry[]>()
  for (const entry of entries) {
    const bucket = byLocalId.get(entry.localId)
    if (bucket) bucket.push(entry)
    else byLocalId.set(entry.localId, [entry])
  }

  const forward = new Map<string, string[]>()
  const backlinks = new Map<string, string[]>()
  const broken: BrokenLink[] = []

  for (const entry of entries) {
    const targets: string[] = []

    for (const ref of collectRefs(entry, theme)) {
      const resolved = resolveRef(ref, entry.deckSlug, byId, byLocalId)

      if ("reason" in resolved) {
        broken.push({ fromId: entry.globalId, ref, reason: resolved.reason })
        continue
      }
      // 自分自身へのリンクはグラフに入れない（バックリンク欄が自分で埋まるのを防ぐ）
      if (resolved.globalId === entry.globalId) continue
      if (targets.includes(resolved.globalId)) continue

      targets.push(resolved.globalId)

      const inbound = backlinks.get(resolved.globalId)
      if (inbound) {
        if (!inbound.includes(entry.globalId)) inbound.push(entry.globalId)
      } else {
        backlinks.set(resolved.globalId, [entry.globalId])
      }
    }

    forward.set(entry.globalId, targets)
  }

  return { forward, backlinks, broken }
}

/**
 * ビューアが実行時にリンクを解決するための対応表。
 * 解決規則をブラウザ側にも持たせるのではなく、ビルド時に解いた結果だけを渡す
 * （規則が2箇所に分かれて食い違うのを避ける）。
 */
export function buildResolutionTable(
  entries: readonly WikiEntry[],
  byId: ReadonlyMap<string, WikiEntry>,
  theme: Theme
): Record<string, Record<string, string>> {
  const byLocalId = new Map<string, WikiEntry[]>()
  for (const entry of entries) {
    const bucket = byLocalId.get(entry.localId)
    if (bucket) bucket.push(entry)
    else byLocalId.set(entry.localId, [entry])
  }

  const table: Record<string, Record<string, string>> = {}
  for (const entry of entries) {
    for (const ref of collectRefs(entry, theme)) {
      const resolved = resolveRef(ref, entry.deckSlug, byId, byLocalId)
      if ("reason" in resolved) continue
      const perDeck = (table[entry.deckSlug] ??= {})
      perDeck[ref] = resolved.globalId
    }
  }
  return table
}
