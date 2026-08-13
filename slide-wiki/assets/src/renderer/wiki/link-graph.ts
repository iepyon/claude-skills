import { Theme } from "../../schema/index.js"
import { layoutSlide, TextBox } from "../layout/index.js"
import { WikiEntry, BrokenLink } from "./types.js"

/**
 * スライドが張っている内部リンクの参照先（`deck/slide` の文字列）を集める。
 *
 * layoutSlide を呼ぶのは、リンクが InlineTextRun に載るのがレイアウト段だから。
 * 結果として1スライドにつき layoutSlide が3回走る（グラフ用・解決表用・描画用）。
 * 数百枚ならミリ秒の世界なので今は許容する。効いてきたら描画側で計算した
 * LayoutResult をここへ渡す形にすればよい（局所的な変更で済む）。
 */
export interface CollectedRef {
  /** 解決の鍵 */
  readonly ref: string
  /** 原文の綴り。折れていたときに書き手へ見せるのはこちら */
  readonly href: string
}

/**
 * スライドが読み手に見せているテキストを1つの文字列に畳む。
 *
 * 「そのスライドに書いてあるか」を判定する走査は**ここ1本にまとめる**
 * （`collectRefs` と同じく layoutSlide の textBoxes を読む — 描画されない語を
 * 「書いてある」と数えないため）。想定問答の到達可能性検査
 * （`answerability.test.ts` の keywords）が今の使い手で、サイドバーの絞り込みに
 * 本文を流すとき（BACKLOG B-37）は `data-search` の種もこの走査から採る。
 * 別々に走査を書くと、検査は届くのに絞り込みには出ない語ができる。
 */
export function collectText(entry: WikiEntry, theme: Theme): string {
  const parts: string[] = []

  for (const box of layoutSlide(entry.slide, theme).textBoxes) {
    if (box.text) parts.push(box.text)
    const runs = box.paragraphs ? box.paragraphs.flatMap((para) => para.runs) : box.richText ?? []
    for (const run of runs) parts.push(run.text)
  }

  return parts.join("\n")
}

export function collectRefs(entry: WikiEntry, theme: Theme): CollectedRef[] {
  const refs: CollectedRef[] = []

  const scanBox = (box: TextBox): void => {
    const runs = box.paragraphs
      ? box.paragraphs.flatMap((para) => para.runs)
      : box.richText ?? []
    for (const run of runs) {
      if (run.link?.kind === "internal") refs.push({ ref: run.link.ref, href: run.link.href })
    }
  }

  layoutSlide(entry.slide, theme).textBoxes.forEach(scanBox)
  return refs
}

/**
 * 参照 → globalId の対応表。**引けなければ未解決、それだけ。**
 *
 * 収めるのは2種類の鍵で、**綴りが重ならないので1つの表に同居できる**:
 * `deck/slide`（`site-index.ts` が `/` で組む）と、デッキ slug だけの `deck`
 * （`slug.ts` が `/` をハイフンに潰すので `/` を含まない）。
 * フラグメント無しの `/deck.md` が後者に当たり、そのデッキの1枚目へ着く。
 *
 * **かつては4段階の解決順があった**（自デッキ内・サイト全体で一意、を順に探した）。
 * 短い参照 `[[種ノート]]` を許していたので、どのデッキから見た参照かで行き先が変わり、
 * 「候補が2つあって決められない」という失敗モードがあった。リンクが常にファイルを
 * 名指しする形になったので、段も曖昧も消えた — **書き方を1つに絞ると、
 * 解決規則のほうが要らなくなる。**
 */
export type RefIndex = ReadonlyMap<string, string>

export function buildRefIndex(entries: readonly WikiEntry[]): RefIndex {
  const index = new Map<string, string>()
  for (const entry of entries) {
    index.set(entry.globalId, entry.globalId)
    if (!index.has(entry.deckSlug)) index.set(entry.deckSlug, entry.globalId)
  }
  return index
}

export interface LinkGraph {
  forward: Map<string, string[]>
  backlinks: Map<string, string[]>
  broken: BrokenLink[]
}

export function buildLinkGraph(entries: readonly WikiEntry[], theme: Theme): LinkGraph {
  const index = buildRefIndex(entries)

  const forward = new Map<string, string[]>()
  const backlinks = new Map<string, string[]>()
  const broken: BrokenLink[] = []

  for (const entry of entries) {
    const targets: string[] = []

    for (const { ref, href } of collectRefs(entry, theme)) {
      const target = index.get(ref)

      if (target === undefined) {
        broken.push({ fromId: entry.globalId, href })
        continue
      }
      // 自分自身へのリンクはグラフに入れない（バックリンク欄が自分で埋まるのを防ぐ）
      if (target === entry.globalId) continue
      if (targets.includes(target)) continue

      targets.push(target)

      const inbound = backlinks.get(target)
      if (inbound) {
        if (!inbound.includes(entry.globalId)) inbound.push(entry.globalId)
      } else {
        backlinks.set(target, [entry.globalId])
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
  theme: Theme
): Record<string, Record<string, string>> {
  const index = buildRefIndex(entries)

  const table: Record<string, Record<string, string>> = {}
  for (const entry of entries) {
    for (const { ref } of collectRefs(entry, theme)) {
      const target = index.get(ref)
      if (target === undefined) continue
      const perDeck = (table[entry.deckSlug] ??= {})
      perDeck[ref] = target
    }
  }
  return table
}
