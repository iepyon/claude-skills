import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mkdtempSync, rmSync, writeFileSync, readdirSync, readFileSync } from "fs"
import { tmpdir } from "os"
import { join, basename } from "path"
import { parse } from "yaml"
import { orderDeckFiles, DECK_ORDER_FILE } from "../src/deck-order.js"

const WIKI_DIR = join(__dirname, "..", "doc", "wiki")

/** ファイル名順（＝宣言が無いときの既定）で md のパスを作る */
const decksIn = (dir: string): string[] =>
  readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => join(dir, f))

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
    declare("decks:\n  - charlie\n  - alpha\n  - bravo\n")

    const { files, errors } = orderDeckFiles(decksIn(dir), dir)

    expect(names(files)).toEqual(["charlie", "alpha", "bravo"])
    expect(errors).toEqual([])
  })

  it("appends undeclared decks in file-name order instead of dropping them", () => {
    // 宣言への追記を忘れたデッキがサイトから黙って消えないこと
    declare("decks:\n  - charlie\n")

    const { files, errors } = orderDeckFiles(decksIn(dir), dir)

    expect(names(files)).toEqual(["charlie", "alpha", "bravo"])
    expect(errors).toEqual([])
  })

  it("reports a declared deck that does not exist", () => {
    declare("decks:\n  - charlie\n  - delta\n")

    const { files, errors } = orderDeckFiles(decksIn(dir), dir)

    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain("delta")
    // 誤りがあっても、並び自体は宣言できたところまで返す
    expect(names(files)).toEqual(["charlie", "alpha", "bravo"])
  })

  it("reports a deck declared twice", () => {
    declare("decks:\n  - alpha\n  - alpha\n")

    const { errors } = orderDeckFiles(decksIn(dir), dir)

    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain("alpha")
  })

  it("reports a declaration that is not a list of deck names", () => {
    declare("decks: charlie\n")

    const { files, errors } = orderDeckFiles(decksIn(dir), dir)

    expect(errors).toHaveLength(1)
    // 読めない宣言でファイルを失わない
    expect(names(files)).toEqual(["alpha", "bravo", "charlie"])
  })

  it("reports a declaration that is not valid YAML", () => {
    declare("decks:\n  - alpha\n   - bravo\n")

    const { errors } = orderDeckFiles(decksIn(dir), dir)

    expect(errors).toHaveLength(1)
  })

  it("the distributed doc/wiki declaration covers every deck in the directory", () => {
    // 宣言に無いデッキは末尾へ回るだけなので、鮮度はここで見る
    const declared: string[] = parse(readFileSync(join(WIKI_DIR, DECK_ORDER_FILE), "utf-8")).decks
    const { files, errors } = orderDeckFiles(decksIn(WIKI_DIR), WIKI_DIR)

    expect(errors).toEqual([])
    expect(names(files)).toEqual(declared)
  })
})
