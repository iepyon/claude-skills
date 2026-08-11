import { existsSync, readFileSync } from "fs"
import { basename, extname, join } from "path"
import { parse } from "yaml"

/**
 * デッキの並び順の宣言。Wiki のディレクトリ直下に置く。
 *
 * ディレクトリを `--wiki` に渡したときの既定はファイル名順だが、ファイル名は
 * `/deck.md#slide` のリンク先そのものでもあるので、順序を変えるために
 * リネームするとサイト中のリンクが折れる。順序はここで宣言して変える。
 */
export const DECK_ORDER_FILE = "order.yaml"

export interface DeckOrderResult {
  /** 宣言順に並べ替えたファイル。宣言に無いものは元の順序のまま後ろへ続く */
  readonly files: string[]
  /** 宣言の誤り（壊れた YAML・存在しないデッキ名）。1件でもあれば呼び出し側が止める */
  readonly errors: string[]
}

/** 拡張子を除いたファイル名 — 宣言に書くデッキ名であり、slug のもとでもある */
const deckName = (file: string): string => basename(file, extname(file))

/** 宣言を読む。`decks:` が文字列の配列でなければ誤りとして返す */
function parseDeckOrder(source: string): { decks: string[]; errors: string[] } {
  let doc: unknown
  try {
    doc = parse(source)
  } catch (e) {
    return { decks: [], errors: [`YAML として読めない: ${(e as Error).message}`] }
  }

  const decks = (doc as { decks?: unknown } | null)?.decks
  if (!Array.isArray(decks) || decks.some((d) => typeof d !== "string")) {
    return { decks: [], errors: ["decks: にデッキ名（拡張子なし）の配列を書く"] }
  }
  return { decks: decks as string[], errors: [] }
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
  if (!existsSync(declPath)) return { files: [...files], errors: [] }

  const { decks, errors } = parseDeckOrder(readFileSync(declPath, "utf-8"))
  if (errors.length > 0) return { files: [...files], errors }

  const remaining = new Map(files.map((f) => [deckName(f), f]))
  const ordered: string[] = []
  const missing: string[] = []

  for (const name of decks) {
    const file = remaining.get(name)
    // 既に取り出した名前（宣言内の重複）も、存在しない名前と同じく誤りにする
    if (!file) {
      missing.push(name)
      continue
    }
    ordered.push(file)
    remaining.delete(name)
  }

  return {
    files: [...ordered, ...files.filter((f) => remaining.has(deckName(f)))],
    errors: missing.map((name) => `宣言にあるデッキが見つからない: ${name}`),
  }
}
