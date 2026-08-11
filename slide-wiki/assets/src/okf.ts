import { slugify } from "./slug.js"

/**
 * OKF (Open Knowledge Format) v0.2 のうち、この道具が守る部分。
 * 正本は https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md
 *
 * **ここに置くのは「綴り」だけで、規則の説明は ontology.yaml が持つ。**
 * 予約ファイル名とリンクの形は、パーサ・CLI・lint・生成器の4箇所が同じものを
 * 見る必要があるので、リテラルを配ると必ずどれか1つが取り残される。
 */

/**
 * OKF が予約しているファイル名（SPEC.md §2・§8・§9）。
 * バンドルの目録と更新履歴であって、概念（＝この道具にとってのデッキ）ではない。
 * デッキとして読み込んではならず、リンク先としても内部リンクにはならない。
 */
export const RESERVED_OKF_FILES = ["index.md", "log.md"] as const

export const isReservedOkfFile = (fileName: string): boolean =>
  (RESERVED_OKF_FILES as readonly string[]).includes(fileName)

/**
 * 内部リンクの形。**バンドル相対の絶対パスだけ**を受ける（SPEC.md §6.1 の推奨形）。
 *
 * OKF は相対パス（`./x.md`）も合法としているが、この道具は解決しない。
 * 形を1つに絞ると「どのデッキから見た参照か」が要らなくなり、
 * 解決が「表を1回引く」だけになる（曖昧という失敗モードが消える）。
 * 絞ったのはこちらの都合なので、OKF の規定ではないことを ontology.yaml に書いてある。
 *
 * `#スライドID` は OKF の規定外で、この道具の拡張（1ファイルに何十枚も入るため）。
 */
const OKF_INTERNAL_LINK = /^\/([^#?\s]*\.md)(?:#(\S*))?$/

export interface OkfLinkTarget {
  /** サイト全体で一意な参照。`resolveRef` が引く鍵 */
  readonly ref: string
  /** デッキ内のスライド ID。単体 HTML と PPTX はこちらを引く。省略時はデッキ先頭 */
  readonly slide?: string
}

/**
 * markdown リンクの href を内部リンクとして読む。内部リンクでなければ null。
 *
 * デッキ slug は `slugify(拡張子を除いたパス)` で、`pipeline.ts` がファイル名から
 * デッキ slug を作るのと同じ規則。したがって `/patterns-wiki.md#種ノート` は
 * `patterns-wiki/種ノート` を指す。
 *
 * サブディレクトリ（`/sub/deck.md`）はパスまるごとを slug 化するので
 * `sub-deck` になり、平坦なディレクトリしか読まない現状では未解決として報告される。
 * ここで basename だけを採ると、同名の最上位デッキに**黙って当たって**しまう。
 */
export function parseOkfLink(href: string): OkfLinkTarget | null {
  const match = OKF_INTERNAL_LINK.exec(href)
  if (!match) return null

  const path = match[1]
  // 予約ファイルはデッキではない。内部リンクにするとサイトの目録への
  // リンクが軒並み「未解決」の一覧に出てしまう
  if (isReservedOkfFile(path)) return null

  const deck = slugify(path.replace(/\.md$/, ""))
  if (!deck) return null

  const slide = match[2]
  return slide ? { ref: `${deck}/${slide}`, slide } : { ref: deck }
}
