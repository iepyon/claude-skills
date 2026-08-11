import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "fs"
import { tmpdir } from "os"
import { join, basename } from "path"
import { parse } from "yaml"
import { orderDeckFiles, DECK_ORDER_FILE, type DeckGroup } from "../src/deck-order.js"
import { listDeckFiles } from "../src/okf.js"

const WIKI_DIR = join(__dirname, "..", "doc", "wiki")

/** ファイル名順（＝宣言が無いときの既定）で md のパスを作る。予約ファイルは外れる */
const decksIn = (dir: string): string[] => listDeckFiles(dir)

const names = (files: readonly string[]): string[] => files.map((f) => basename(f, ".md"))

describe("deck order", () => {
  let dir: string

  const deck = (name: string): void => writeFileSync(join(dir, `${name}.md`), `# ${name}\n`, "utf-8")
  const declare = (yaml: string): void =>
    writeFileSync(join(dir, DECK_ORDER_FILE), yaml, "utf-8")

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "deck-order-"))
    deck("alpha")
    deck("bravo")
    deck("charlie")
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it("keeps the file-name order when no declaration is present", () => {
    const { files, errors } = orderDeckFiles(decksIn(dir), dir)

    expect(names(files)).toEqual(["alpha", "bravo", "charlie"])
    expect(errors).toEqual([])
  })

  it("orders decks as declared", () => {
    declare("groups:\n  - title: 全部\n    decks: [charlie, alpha, bravo]\n")

    const { files, errors } = orderDeckFiles(decksIn(dir), dir)

    expect(names(files)).toEqual(["charlie", "alpha", "bravo"])
    expect(errors).toEqual([])
  })

  it("appends undeclared decks in file-name order instead of dropping them", () => {
    // 宣言への追記を忘れたデッキがサイトから黙って消えないこと
    declare("groups:\n  - title: 一部\n    decks: [charlie]\n")

    const { files, errors } = orderDeckFiles(decksIn(dir), dir)

    expect(names(files)).toEqual(["charlie", "alpha", "bravo"])
    expect(errors).toEqual([])
  })

  it("reports a declared deck that does not exist", () => {
    declare("groups:\n  - title: 全部\n    decks: [charlie, delta]\n")

    const { files, errors } = orderDeckFiles(decksIn(dir), dir)

    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain("delta")
    // 誤りがあっても、並び自体は宣言できたところまで返す
    expect(names(files)).toEqual(["charlie", "alpha", "bravo"])
  })

  it("reports a deck declared twice", () => {
    declare("groups:\n  - title: 全部\n    decks: [alpha, alpha]\n")

    const { errors } = orderDeckFiles(decksIn(dir), dir)

    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain("alpha")
  })

  it("reports a declaration that is not a list of deck names", () => {
    declare("groups: charlie\n")

    const { files, errors } = orderDeckFiles(decksIn(dir), dir)

    expect(errors).toHaveLength(1)
    // 読めない宣言でファイルを失わない
    expect(names(files)).toEqual(["alpha", "bravo", "charlie"])
  })

  it("reports a declaration that is not valid YAML", () => {
    declare("groups:\n  - title: a\n   - title: b\n")

    const { errors } = orderDeckFiles(decksIn(dir), dir)

    expect(errors).toHaveLength(1)
  })

  it("rejects an OKF reserved name declared as a deck", () => {
    // 予約名はデッキとして読み込まれないので、書いても必ず「見つからない」になる。
    // 理由を取り違えないよう、名指しで止める
    declare("groups:\n  - title: 全部\n    decks: [alpha, index]\n")

    const { errors } = orderDeckFiles(decksIn(dir), dir)

    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain("予約ファイル名")
  })

  // ── デッキ名の語彙は1つ（B-40）────────────────────────────────────
  //
  // 宣言に書く名前・リンクに書くファイル名・サイトの slug は同じものを指す。
  // 照合が生のファイル名だったころ、`My_Deck.md` は order.yaml には `My_Deck` と
  // 書きながら `/My_Deck.md` はサイトの `my-deck` に着く、という2つの綴りを持っていた。

  it("matches order.yaml against the deck slug, not the raw file name", () => {
    deck("My_Deck")
    declare("groups:\n  - title: 全部\n    decks: [my-deck]\n")

    const { files, errors } = orderDeckFiles(decksIn(dir), dir)

    expect(errors).toEqual([])
    expect(names(files)[0]).toBe("My_Deck")
  })

  it("reports two md files whose slugs collide, naming both files", () => {
    // 衝突は `order.yaml` の誤りではなくディレクトリの誤りなので、宣言が無くても報せる。
    // 黙って連番にすると、どのファイル名にも宣言にも現れない名前でしか指せなくなる
    deck("My_Deck")
    deck("my-deck")

    const { files, errors } = orderDeckFiles(decksIn(dir), dir)

    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain("My_Deck.md")
    expect(errors[0]).toContain("my-deck.md")
    // 誤りがあってもファイルは失わない（呼び手が止めるまで並びは返す）
    expect(files).toHaveLength(5)
  })

  it("the distributed doc/wiki declaration covers every deck in the directory", () => {
    // 宣言に無いデッキは末尾へ回るだけなので、鮮度はここで見る
    const groups: DeckGroup[] = parse(readFileSync(join(WIKI_DIR, DECK_ORDER_FILE), "utf-8")).groups
    const declared = groups.flatMap((g) => g.decks)
    const { files, errors } = orderDeckFiles(decksIn(WIKI_DIR), WIKI_DIR)

    expect(errors).toEqual([])
    expect(names(files)).toEqual(declared)
  })

  it("the groups become the headings of the generated OKF index", () => {
    // グループ名は目録の見出しになるので、空のグループや無題は置けない
    const groups: DeckGroup[] = parse(readFileSync(join(WIKI_DIR, DECK_ORDER_FILE), "utf-8")).groups
    expect(groups.length).toBeGreaterThan(1)
    for (const g of groups) {
      expect(g.title).not.toBe("")
      expect(g.decks.length).toBeGreaterThan(0)
    }
  })
})
