import { Presentation, Slide } from "../../schema/index.js"
import type { DeckMeta } from "../../ontology/frontmatter.js"

export type { DeckMeta }

/** 1デッキ＝1 Markdown ファイル。 */
export interface WikiDeck {
  readonly slug: string
  readonly title: string
  readonly presentation: Presentation
  /** md 冒頭の frontmatter が名乗ったメタ。名乗っていなければ undefined */
  readonly meta?: DeckMeta
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
  /**
   * デッキの短い呼び名（frontmatter の `short`）。名乗っていなければ slug。
   *
   * **省略可能にしない。** スライドの右上のバッジと、このデッキへ渡るリンクの補足が
   * 同じ1語を使うので、どちらの読み手にも「無いときの代わり」を書かせないため
   * （代替の規則が2箇所に散ると、バッジは出てリンクには出ない、が起きうる）。
   */
  readonly short: string
  readonly entryIds: readonly string[]
  /**
   * サイドバーの絞り込みに混ぜるデッキの語（何を混ぜるかは site-index.ts が決める）。
   *
   * 検索対象が題と ID だけだと、スライドの名前を知っている人しか引けない
   * （「夜勤」「司書」「剪定」のような比喩の題ではとくにそうなる）。
   * デッキが名乗った言葉を各スライドに配ると、束ごと引けるようになる。
   */
  readonly searchWords?: string
}

/**
 * 未解決リンク。ビルド時の警告とビューアの表示の両方に使う。
 *
 * 持つのは**書き手に見せるものだけ** — どのスライドから、どう書かれたリンクか。
 * 解決の鍵（`deck/slide`）は内部表現で、md のどこを直せばよいかを教えてくれない。
 * 理由も持たない: 失敗は「引けなかった」の1種類しかなくなった。
 */
export interface BrokenLink {
  readonly fromId: string
  readonly href: string
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
   * デッキ slug → (参照 → globalId)。ビルド時に解いたリンク解決の結果。
   * 解決規則をブラウザ側にも書くと2箇所で食い違うので、結果だけを渡す。
   */
  readonly resolveTable?: Record<string, Record<string, string>>
}
