import { readdirSync } from "fs"
import { join } from "path"
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

/** バンドルが宣言する OKF の版（バンドル直下の index.md だけが名乗れる。SPEC.md §12） */
export const OKF_VERSION = "0.2"

/**
 * ディレクトリからデッキの md を集める。**予約ファイルは外す。**
 *
 * `index.md` と `log.md` はバンドルの目録と更新履歴なので、デッキとして読むと
 * 「型を名乗っていない md」としてサイトに混ざる。集める場所が複数あると
 * どれか1つが取り残されるので、CLI もテストもここを通る。
 */
export function listDeckFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md") && !isReservedOkfFile(f))
    .sort()
    .map((f) => join(dir, f))
}

/**
 * デッキ名（拡張子を除いたファイル名）→ デッキ slug。**この計算の唯一の入口。**
 *
 * 要るのは4箇所ある — サイトを組むパイプライン・`order.yaml` の照合・リンクの解決・
 * 目録の生成。`slugify` を各所で直に呼ぶと、そのぶん綴りが割れる（B-40 は、それが
 * 2つに割れて「どのファイル名にも `order.yaml` にも現れないデッキ名」を
 * 黙って作っていた話である）。
 *
 * 記号だけの名前は slug が空になるので `deck` に落とす。**この逃げ場自体が衝突源**
 * （空になる2本がどちらも `deck` になる）なので、`findDeckSlugCollisions` が
 * 必ずこの関数の結果を見るようにしてある。
 */
export const deckSlug = (deckName: string): string => slugify(deckName) || "deck"

/**
 * デッキ slug の衝突を見つける。1件につき1つの誤りの文面を返す（無ければ空）。
 *
 * バンドルの中で slug が重なると、リンクの `デッキ名.md` がどちらを指すか決まらない。
 * **一意化して先へ進んではいけない** — 連番を振ると、どのファイル名にも `order.yaml` にも
 * 現れない名前（`my-deck-2`）でしか指せないデッキができ、しかも exit 0 で通る。
 * デッキはファイルなので書き手が改名できる（一意化するしかないスライド ID とはそこが違う）。
 *
 * 宣言は ontology.yaml の `okf.deck-slug.collision`。呼ぶのは `--wiki` の入口と
 * 移行ツールで、**どちらもファイル名を持っている場所**である（サイト合成まで下ると
 * ファイル名が残っていないので、誰を直せばよいか言えなくなる）。
 */
export function findDeckSlugCollisions(
  decks: ReadonlyArray<{ readonly fileName: string; readonly slug: string }>
): string[] {
  const bySlug = new Map<string, string[]>()
  for (const d of decks) {
    const bucket = bySlug.get(d.slug)
    if (bucket) bucket.push(d.fileName)
    else bySlug.set(d.slug, [d.fileName])
  }

  return [...bySlug]
    .filter(([, names]) => names.length > 1)
    .map(
      ([slug, names]) =>
        `デッキ slug "${slug}" が ${names.join(" と ")} で衝突している。` +
        `リンクはファイル名で書かれるので、どちらを指しているか決められない。片方を改名せよ`
    )
}

/**
 * 内部リンクの形。読むのは `デッキ名.md#スライドID` と、先頭に `/`・`./` の付いた綴り。
 * パス区切りを含む形（`sub/x.md` `../x.md`）と裸の `#スライドID` は受けない
 * （捕獲群が `/` を含まないことで、前者を型の側から落としてある）。
 *
 * **宣言は ontology.yaml の `inline` 節の `internal-link`。** 書く形を1つに絞る理由と、
 * 読みを広く取る理由はそちらが持つ。ここに写すと規則が2箇所になる。
 * 絞りを留めるのは lint の `link-form` で、判定には下の `canonicalHref` を使う。
 *
 * `#スライドID` は OKF の規定外で、この道具の拡張（1ファイルに何十枚も入るため）。
 */
const OKF_INTERNAL_LINK = /^(?:\/|\.\/)?([^#?\s/]+\.md)(?:#(\S*))?$/

export interface OkfLinkTarget {
  /** サイト全体で一意な参照。`resolveRef` が引く鍵 */
  readonly ref: string
  /** デッキ内のスライド ID。単体 HTML と PPTX はこちらを引く。省略時はデッキ先頭 */
  readonly slide?: string
  /**
   * 同じ行き先を指す**書いてよい綴り**。`href` がこれと違えば、読めてはいるが
   * 書く形から外れている（先頭に `/` か `./` が付いている）。
   *
   * **これを返すのは、lint に「どの接頭辞を許しているか」を持たせないため。**
   * lint が接頭辞の正規表現を自分で持つと、ここが受ける綴りを増やしたときに
   * 「パーサは読むのに lint は黙る」が起きる — サイトでは当たり、GitHub でだけ
   * 折れる綴りが、警告も未解決リンクの一覧も通らずにデッキへ入る。
   */
  readonly canonicalHref: string
}

/**
 * markdown リンクの href を内部リンクとして読む。内部リンクでなければ null。
 *
 * デッキ slug は `deckSlug(拡張子を除いたファイル名)` — サイトを組む側が使うのと**同じ関数**。
 * したがって `patterns-wiki.md#種ノート` は `patterns-wiki/種ノート` を指す。
 * 参照側とサイト側で別々に slug を綴ると、書いたリンクが当たらない形の食い違いになる。
 * 一致は `selfcheck` が `okf.deck-slug.examples` を両側に通して留める。
 *
 * **相対の解決に元ドキュメントの位置が要らないのは、バンドルが平坦だからである**
 * （→ ontology.yaml の `okf` 節）。デッキは全部が兄弟なので、`x.md` の行き先は
 * どのデッキから書かれても同じ1枚に決まる。
 */
export function parseOkfLink(href: string): OkfLinkTarget | null {
  const match = OKF_INTERNAL_LINK.exec(href)
  if (!match) return null

  const path = match[1]
  // 予約ファイルはデッキではない。内部リンクにするとサイトの目録への
  // リンクが軒並み「未解決」の一覧に出てしまう
  if (isReservedOkfFile(path)) return null

  const deck = deckSlug(path.replace(/\.md$/, ""))

  // `undefined` はフラグメント無し、`""` は `#` だけ。canonicalHref は接頭辞だけを
  // 落として綴りを写すので、この2つを畳むと `x.md#` が「書く形から外れている」に化ける
  const fragment = match[2]
  const canonicalHref = fragment === undefined ? path : `${path}#${fragment}`

  const slide = fragment || undefined
  return slide ? { ref: `${deck}/${slide}`, slide, canonicalHref } : { ref: deck, canonicalHref }
}

/**
 * md のリンクを本文から拾う走査。捕獲群は href だけ。
 *
 * **href の綴りを扱う道具はここを通す。** 以前は `lint.ts` と移行ツールが同じ形を
 * 別々に持っていた。行き先の判定（`parseOkfLink`）を1箇所に寄せても、**どれをリンクと
 * 見なすか**が割れていれば同じことが起きる — 一方だけが拾う書き方が、もう一方の
 * 検査や書き換えをすり抜ける。
 *
 * `[^()\s]+` は `inline-formatter.ts` の `mdHref` と同じ切り方。丸括弧と空白を
 * 含む href はパーサがリンクと読まないので、こちらも拾わない。
 *
 * `matchAll` は仕様上この正規表現を複製してから回すので、`g` 付きを
 * モジュール直下に置いても `lastIndex` は共有されない。
 */
export const MD_LINK = /\[[^\[\]]+?\]\(([^()\s]+)\)/g

/**
 * 本文中の href の位置。`MD_LINK` の一致から、href だけの範囲を返す。
 *
 * **末尾から数える。** ラベルは `[^\[\]]+?` なので丸括弧を含みうる
 * （`[a(b](x.md)`）、`indexOf("(")` で前から探すとラベルの中の括弧に当たる。
 * href は必ず閉じ括弧の直前にあるので、そこから長さを引くほうが常に正しい。
 */
export function hrefRangeOf(match: RegExpExecArray | RegExpMatchArray): { start: number; end: number } {
  const end = match.index! + match[0].length - 1 // 閉じ `)` の直前
  return { start: end - match[1].length, end }
}
