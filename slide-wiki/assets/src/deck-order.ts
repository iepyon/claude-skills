import { existsSync, readFileSync } from "fs"
import { basename, extname, join } from "path"
import { parse } from "yaml"
import { isReservedOkfFile } from "./okf.js"

/**
 * デッキの並び順の宣言。Wiki のディレクトリ直下に置く。
 *
 * ディレクトリを `--wiki` に渡したときの既定はファイル名順だが、ファイル名は
 * `/deck.md#slide` のリンク先そのものでもあるので、順序を変えるために
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
  /** 宣言の誤り（壊れた YAML・存在しないデッキ名・予約名）。1件でもあれば呼び出し側が止める */
  readonly errors: string[]
}

/** 拡張子を除いたファイル名 — 宣言に書くデッキ名であり、slug のもとでもある */
const deckName = (file: string): string => basename(file, extname(file))

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
 */
export function orderDeckFiles(files: readonly string[], dir: string): DeckOrderResult {
  const declPath = join(dir, DECK_ORDER_FILE)
  if (!existsSync(declPath)) return { files: [...files], groups: [], errors: [] }

  const { groups, errors } = parseDeckOrder(readFileSync(declPath, "utf-8"))
  if (errors.length > 0) return { files: [...files], groups: [], errors }

  const remaining = new Map(files.map((f) => [deckName(f), f]))
  const ordered: string[] = []
  const problems: string[] = []

  for (const group of groups) {
    for (const name of group.decks) {
      // 予約名はデッキとして読み込まれないので、宣言に書いても必ず「見つからない」に
      // なる。理由を取り違えないよう、先に名指しで止める
      if (isReservedOkfFile(`${name}.md`)) {
        problems.push(`${name} は OKF の予約ファイル名なのでデッキにできない`)
        continue
      }
      const file = remaining.get(name)
      // 既に取り出した名前（宣言内の重複）も、存在しない名前と同じく誤りにする
      if (!file) {
        problems.push(`宣言にあるデッキが見つからない: ${name}`)
        continue
      }
      ordered.push(file)
      remaining.delete(name)
    }
  }

  return {
    files: [...ordered, ...files.filter((f) => remaining.has(deckName(f)))],
    groups,
    errors: problems,
  }
}
