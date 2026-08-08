import { Presentation, Slide } from "../../schema/index.js"

/** 1デッキ＝1 Markdown ファイル。 */
export interface WikiDeck {
  readonly slug: string
  readonly title: string
  readonly presentation: Presentation
}

/** サイト内の1スライド。Slide 自体は複製せず、対応づけだけをここに持つ。 */
export interface WikiEntry {
  readonly globalId: string   // "deck-slug/slide-id" — サイト全体で一意
  readonly deckSlug: string
  readonly localId: string
  readonly title: string
  readonly slide: Slide
  readonly globalIndex: number // 全デッキ通しの番号
  readonly deckIndex: number   // デッキ内の位置（←/→ の順送りに使う）
}

export interface WikiDeckView {
  readonly slug: string
  readonly title: string
  readonly entryIds: readonly string[]
}

/** 未解決リンク。ビルド時の警告とビューアの表示の両方に使う。 */
export interface BrokenLink {
  readonly fromId: string
  readonly ref: string
  readonly reason: "not-found" | "ambiguous"
}

export interface WikiSite {
  readonly decks: readonly WikiDeckView[]
  readonly entries: readonly WikiEntry[]
  readonly byId: ReadonlyMap<string, WikiEntry>
  /** globalId → 参照先 globalId[] */
  readonly forward: ReadonlyMap<string, readonly string[]>
  /** globalId → 被参照元 globalId[]（バックリンク） */
  readonly backlinks: ReadonlyMap<string, readonly string[]>
  readonly broken: readonly BrokenLink[]
}

export interface WikiOptions {
  readonly siteTitle?: string
  /**
   * デッキ slug → ([[ref]] → globalId)。ビルド時に解いたリンク解決の結果。
   * 解決規則をブラウザ側にも書くと2箇所で食い違うので、結果だけを渡す。
   */
  readonly resolveTable?: Record<string, Record<string, string>>
}
