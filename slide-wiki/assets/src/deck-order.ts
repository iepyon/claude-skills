import { existsSync, readFileSync } from "fs"
import { basename, extname, join } from "path"
import { parse } from "yaml"
import { deckSlug, findDeckSlugCollisions, isReservedOkfFile } from "./okf.js"

/**
 * デッキの並び順の宣言。Wiki のディレクトリ直下に置く。
 *
 * ディレクトリを `--wiki` に渡したときの既定はファイル名順だが、ファイル名は
 * `deck.md#slide` のリンク先そのものでもあるので、順序を変えるために
 * リネームするとサイト中のリンクが折れる。順序はここで宣言して変える。
 *
 * **並びはグループに分けて書く。** サイドバーと ←→ の送りはグループを平坦に
 * 均した順で、そこは1本の列だったころと変わらない。増えたのはグループ名という
 * 情報1つで、それが OKF の目録（`index.md`）の見出しになる。
 * 「第1部と第2部は対なので隣り合わせ」といった意図は、以前はコメントにしか
 * 書けなかった — **読めるのは人だけで、目録には出せなかった。**
 */
export const DECK_ORDER_FILE = "order.yaml"

/** 宣言された1グループ。`index.md` の見出し1つに対応する */
export interface DeckGroup {
  readonly title: string
  readonly decks: readonly string[]
}

export interface DeckOrderResult {
  /** 宣言順に並べ替えたファイル。宣言に無いものは元の順序のまま後ろへ続く */
  readonly files: string[]
  /** 宣言されたグループ。宣言が無ければ空 */
  readonly groups: readonly DeckGroup[]
  /**
   * 誤り。1件でもあれば呼び出し側が止める。
   *
   * 2種類ある — 宣言の誤り（壊れた YAML・存在しないデッキ名・予約名。宣言の場所を
   * 前置してある）と、ディレクトリの誤り（デッキ slug の衝突。宣言が無くても起きる）。
   */
  readonly errors: string[]
}

/**
 * md のパス → 照合の鍵。
 *
 * **拡張子を落とすだけでは足りない。** リンクの行き先になる slug は `deckSlug` を
 * 通るので、生のファイル名で照合すると、`My_Deck.md` を `order.yaml` には `My_Deck` と
 * 書き `My_Deck.md` と指すのにサイトの slug は `my-deck` になる、という
 * **同じものを指す2つの綴り**ができる（BACKLOG B-40）。宣言（`ontology.yaml` の
 * `okf.deck-slug`）は3つが同じ規則を通ると言っているので、ここも同じ関数を通す。
 *
 * **受けるのはパスだけ。** 宣言に書かれた名前は拡張子を持たないので、こちらに通すと
 * `extname` が最後のドット以降を拡張子と見なして削る（`v1.2-intro` → `v1`）。
 * 名前の側は `deckSlug` を直に呼ぶ。
 */
const deckKeyOfFile = (file: string): string => deckSlug(basename(file, extname(file)))

/** 宣言を読む。`groups:` が `{title, decks}` の配列でなければ誤りとして返す */
function parseDeckOrder(source: string): { groups: DeckGroup[]; errors: string[] } {
  let doc: unknown
  try {
    doc = parse(source)
  } catch (e) {
    return { groups: [], errors: [`YAML として読めない: ${(e as Error).message}`] }
  }

  const root = doc as { groups?: unknown; decks?: unknown } | null
  const groups = root?.groups
  if (!Array.isArray(groups)) {
    // 旧形式をそのまま受けはしない（2つの綴りが並ぶのは避ける）が、
    // **何が変わったかは言う。** ツールは旧綴りの存在を知っているのだから、
    // 「groups: を書け」とだけ言って黙るのは不親切
    if (Array.isArray(root?.decks)) {
      return {
        groups: [],
        errors: [
          "`decks:` は `groups:` になった。" +
            "`groups: [{title: <グループ名>, decks: [<デッキ名>, …]}]` と書く" +
            "（グループ名は生成される index.md の見出しになる）",
        ],
      }
    }
    return { groups: [], errors: ["groups: に `{title, decks}` の配列を書く"] }
  }

  const out: DeckGroup[] = []
  for (const [i, g] of groups.entries()) {
    const title = (g as { title?: unknown } | null)?.title
    const decks = (g as { decks?: unknown } | null)?.decks
    if (typeof title !== "string" || !Array.isArray(decks) || decks.some((d) => typeof d !== "string")) {
      return { groups: [], errors: [`groups[${i}]: title に文字列、decks にデッキ名（拡張子なし）の配列を書く`] }
    }
    out.push({ title, decks: decks as string[] })
  }
  return { groups: out, errors: [] }
}

/**
 * ディレクトリ直下の `order.yaml` に従って md を並べ替える。
 * 宣言が無ければ渡された順序（＝ファイル名順）をそのまま返す。
 *
 * 宣言に無いデッキは末尾へ回す。落とすと、宣言への追記を忘れたデッキが
 * サイトから黙って消えてしまう。
 *
 * **照合はデッキ slug で行う**（リンクの行き先と同じ語彙）。生のファイル名で引くと、
 * 同じデッキを指す綴りが宣言用とリンク用の2つできる（BACKLOG B-40）。
 * 宣言が無くてもデッキ slug の衝突だけは見る — 理由は本体のコメント。
 */
export function orderDeckFiles(files: readonly string[], dir: string): DeckOrderResult {
  // **並びより先にデッキ集合そのものを検める。宣言の有無に関わらず見る** —
  // slug の衝突は `order.yaml` の誤りではなくディレクトリの誤りなので、
  // 宣言が無いときだけ黙るのは筋が通らない。加えて、この先の照合は1つの鍵に
  // 2つのファイルを載せることになり、宣言が拾った1本を取り除いたあと残りの
  // フィルタもすり抜けて、**もう片方がサイトから丸ごと落ちる。**
  const collisions = findDeckSlugCollisions(
    files.map((f) => ({ fileName: basename(f), slug: deckKeyOfFile(f) }))
  )
  if (collisions.length > 0) return { files: [...files], groups: [], errors: collisions }

  const declPath = join(dir, DECK_ORDER_FILE)
  if (!existsSync(declPath)) return { files: [...files], groups: [], errors: [] }

  // 誤りの所在は**ここが持つ**。呼び手が一律に前置していたころは、`order.yaml` が
  // 無くても起きる誤り（上の衝突）にまで `order.yaml:` と付いて、実在しないファイルを
  // 指していた。宣言そのものの誤りだけに宣言の場所を付ける。
  // **付けるのは境界の1箇所だけ** — push のたびに包むと、次に足した診断が
  // 所在を落としても誰も気づけない
  const at = (message: string): string => `${declPath}: ${message}`

  const { groups, errors } = parseDeckOrder(readFileSync(declPath, "utf-8"))
  if (errors.length > 0) return { files: [...files], groups: [], errors: errors.map(at) }

  const problems: string[] = []
  const remaining = new Map<string, string>()
  for (const f of files) remaining.set(deckKeyOfFile(f), f)

  const ordered: string[] = []

  for (const group of groups) {
    for (const name of group.decks) {
      // 予約名はデッキとして読み込まれないので、宣言に書いても必ず「見つからない」に
      // なる。理由を取り違えないよう、先に名指しで止める
      if (isReservedOkfFile(`${name}.md`)) {
        problems.push(`${name} は OKF の予約ファイル名なのでデッキにできない`)
        continue
      }
      // 宣言に書かれた名前も同じ規則を通してから引く。誤りの文面には**書かれたまま**の
      // 名前を出す — slug 化した綴りを見せると、書き手が自分の書いた行を探せない
      const key = deckSlug(name)
      const file = remaining.get(key)
      // 既に取り出した名前（宣言内の重複）も、存在しない名前と同じく誤りにする
      if (!file) {
        problems.push(`宣言にあるデッキが見つからない: ${name}`)
        continue
      }
      ordered.push(file)
      remaining.delete(key)
    }
  }

  return {
    files: [...ordered, ...files.filter((f) => remaining.has(deckKeyOfFile(f)))],
    groups,
    errors: problems.map(at),
  }
}
