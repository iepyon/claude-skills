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
 * 内部リンクの形。**デッキ名だけの相対パス**を受ける（SPEC.md §6.1 は相対も絶対も許す）。
 *
 * 書く形は `デッキ名.md#スライドID` の1つに絞る。理由は GitHub で当たること —
 * 生の md を github.com で開くと先頭の `/` はリポジトリのルートと読まれるので、
 * バンドルがリポジトリの深い場所にあるかぎり絶対形のリンクは必ず折れる。
 * 相対形は深さに依存しないので、サイトでも GitHub でも同じ1つの綴りで当たる。
 *
 * **読むほうは `./` と先頭 `/` も受ける。** 綴りを1つに保つのは lint の仕事で、
 * ここで蹴ると `[ラベル](/x.md)` が外部リンクとして `target="_blank"` で描かれ、
 * しかも未解決リンクの一覧にも出ない（`lint.ts` の `checkLinkForm` が
 * 「いちばん危ない」と呼んでいる壊れ方）。読みを広く、書きを狭く。
 *
 * **パス区切りを含む形は受けない**（`sub/x.md` `../x.md`）。バンドルは平坦なので
 * 行き先が無く、捕獲群が `/` を含まないことで型の側から保証しておく。
 * ここで basename だけを採ると、同名の最上位デッキに**黙って当たって**しまう。
 *
 * 裸の `#スライドID` も受けない。解決に「どのデッキに書かれたリンクか」が要るので、
 * この関数が href だけを受ける純関数でなくなる（同じデッキの中でもデッキ名を書く）。
 *
 * `#スライドID` は OKF の規定外で、この道具の拡張（1ファイルに何十枚も入るため）。
 */
const OKF_INTERNAL_LINK = /^(?:\/|\.\/)?([^#?\s/]+\.md)(?:#(\S*))?$/

export interface OkfLinkTarget {
  /** サイト全体で一意な参照。`resolveRef` が引く鍵 */
  readonly ref: string
  /** デッキ内のスライド ID。単体 HTML と PPTX はこちらを引く。省略時はデッキ先頭 */
  readonly slide?: string
}

/**
 * markdown リンクの href を内部リンクとして読む。内部リンクでなければ null。
 *
 * デッキ slug は `deckSlug(拡張子を除いたファイル名)` — サイトを組む側が使うのと**同じ関数**。
 * したがって `patterns-wiki.md#種ノート` は `patterns-wiki/種ノート` を指す。
 * 参照側とサイト側で別々に slug を綴ると、書いたリンクが当たらない形の食い違いになる。
 *
 * **相対の解決に元ドキュメントの位置が要らないのは、バンドルが平坦だからである。**
 * デッキは全部が兄弟なので、`x.md` の行き先はどのデッキから書かれても同じ1枚に決まる。
 * 階層を許すとこの性質が消え、この関数は href だけでは答えを出せなくなる。
 */
export function parseOkfLink(href: string): OkfLinkTarget | null {
  const match = OKF_INTERNAL_LINK.exec(href)
  if (!match) return null

  const path = match[1]
  // 予約ファイルはデッキではない。内部リンクにするとサイトの目録への
  // リンクが軒並み「未解決」の一覧に出てしまう
  if (isReservedOkfFile(path)) return null

  const deck = deckSlug(path.replace(/\.md$/, ""))

  const slide = match[2]
  return slide ? { ref: `${deck}/${slide}`, slide } : { ref: deck }
}
