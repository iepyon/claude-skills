import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mkdtempSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { deriveEdges, lintRelations, type RelationDiagnostic } from "../src/ontology/relations.js"
import { getRelations } from "../src/ontology/index.js"

const WIKI_DIR = join(__dirname, "..", "doc", "wiki")

const checks = (diagnostics: readonly RelationDiagnostic[], check: string): RelationDiagnostic[] =>
  diagnostics.filter((d) => d.check === check)

describe("配布しているバンドル", () => {
  const diagnostics = lintRelations(WIKI_DIR)

  it("誤りを1件も出さない", () => {
    expect(diagnostics.filter((d) => d.level === "error")).toEqual([])
  })

  /**
   * 双方向の検査が両方向とも通っていること。片方でも落ちていれば、宣言と本文が
   * ずれたまま配られている（そしてこの表の値打ちは、ずれていないことにしかない）。
   */
  it("宣言した辺と本文の散文リンクが1対1で対応している", () => {
    expect(checks(diagnostics, "relation-prose")).toEqual([])
  })

  /**
   * 上下の軸に掛かっていないパターンは、いま3枚ある。**これは誤りではなく所見である** —
   * 門（3ストライクで書く）と仕上げ（声に出して読む・黙って聴く著者）は、大きさの軸ではなく
   * 手順の軸（先行・検算・対）で言語に噛んでいる。数を留めておくのは、辺を足したときに
   * 減ったことに気づくため（増えたら 不揃いの石畳 が守られなくなっている）。
   */
  it("上下の軸を持たないパターンは3枚（門と仕上げ）", () => {
    const isolated = checks(diagnostics, "relation-coverage").map((d) =>
      d.message.split(" は ")[0]
    )
    expect(isolated).toEqual(["3ストライクで書く", "声に出して読む", "黙って聴く著者"])
  })
})

describe("逆向きの導出", () => {
  it("対称な型はそのまま裏返る", () => {
    expect(deriveEdges([{ from: "a", rel: "対", to: "b" }])).toEqual([
      { from: "a", rel: "対", to: "b", derived: false },
      { from: "b", rel: "対", to: "a", derived: true },
    ])
  })

  it("逆対のある型は相手の名前に変わる", () => {
    expect(deriveEdges([{ from: "a", rel: "下位", to: "b" }])).toEqual([
      { from: "a", rel: "下位", to: "b", derived: false },
      { from: "b", rel: "上位", to: "a", derived: true },
    ])
  })

  /** `検算` は逆向きの綴りを持たない。導出すると同じ辺が2通りに書けてしまう */
  it("一方向の型は裏返らない", () => {
    expect(deriveEdges([{ from: "a", rel: "検算", to: "b" }])).toEqual([
      { from: "a", rel: "検算", to: "b", derived: false },
    ])
  })
})

describe("宣言の検査", () => {
  let dir: string

  /** パターン1枚。`links` に書いた相手への散文リンクを `そこで` に置く */
  const pattern = (id: string, links: readonly string[] = []): string =>
    [
      `## ${id}`,
      `<!--id:${id}-->`,
      "<!--pattern-->",
      "### いつ・なにが困るか",
      "場面がある。",
      "",
      "**困る。**",
      "だから困る。",
      "",
      "### そこで",
      "**こうする。**",
      ...links.map((l) => `[${l}](deck.md#${l}) を使う。`),
      "",
      `![${id}](diagrams/${id}.svg)`,
      "",
    ].join("\n")

  const deck = (...slides: string[]): void =>
    writeFileSync(
      join(dir, "deck.md"),
      ["---", "type: deck", "title: deck", "---", "", "# deck", "", ...slides.flatMap((s) => ["---", "", s])].join("\n"),
      "utf-8"
    )

  const declare = (yaml: string): void =>
    writeFileSync(join(dir, getRelations().file), yaml, "utf-8")

  const edges = (...lines: string[]): string =>
    ["version: 1", "decks: [deck.md]", "edges:", ...lines].join("\n")

  const edge = (from: string, rel: string, to: string): string =>
    `  - {from: deck.md#${from}, rel: ${rel}, to: deck.md#${to}}`

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "relations-"))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it("宣言ファイルが無ければ何も言わない", () => {
    deck(pattern("a"), pattern("b"))
    expect(lintRelations(dir)).toEqual([])
  })

  it("宣言に無い型を落とす", () => {
    deck(pattern("a", ["b"]), pattern("b"))
    declare(edges(edge("a", "代替", "b")))

    const found = checks(lintRelations(dir), "relation-vocabulary")
    expect(found).toHaveLength(1)
    expect(found[0].level).toBe("error")
    expect(found[0].message).toContain("代替")
  })

  it("パターンでないものを指す辺を落とす", () => {
    deck(pattern("a", ["b"]), pattern("b"))
    declare(edges(edge("a", "同位", "どこにも無い")))

    const found = checks(lintRelations(dir), "relation-target")
    expect(found).toHaveLength(1)
    expect(found[0].level).toBe("error")
  })

  it("同じ辺を両側から書くと落ちる", () => {
    deck(pattern("a", ["b"]), pattern("b", ["a"]))
    declare(edges(edge("a", "下位", "b"), edge("b", "上位", "a")))

    const found = checks(lintRelations(dir), "relation-vocabulary")
    expect(found).toHaveLength(1)
    expect(found[0].message).toContain("片側だけ書く")
  })

  it("排他の型が同じ2枚に立つと落ちる", () => {
    deck(pattern("a", ["b"]), pattern("b", ["a"]))
    declare(edges(edge("a", "下位", "b"), edge("a", "対", "b")))

    const found = checks(lintRelations(dir), "relation-vocabulary")
    expect(found).toHaveLength(1)
    expect(found[0].message).toContain("排他")
  })

  /** 宣言 → 本文。辺だけ足しても、読み手には何も届いていない */
  it("本文にリンクの無い辺を報せる", () => {
    deck(pattern("a"), pattern("b"))
    declare(edges(edge("a", "同位", "b")))

    const found = checks(lintRelations(dir), "relation-prose")
    expect(found).toHaveLength(1)
    expect(found[0].message).toContain("本文のリンクが無い")
  })

  /** 本文 → 宣言。こちらが無いと、宣言を消しても誰も気づかない */
  it("分類されていない本文のリンクを報せる", () => {
    deck(pattern("a", ["b"]), pattern("b"))
    declare(edges())

    const found = checks(lintRelations(dir), "relation-prose")
    expect(found).toHaveLength(1)
    expect(found[0].message).toContain("分類されていない")
    expect(found[0].file).toBe("deck.md") // 直す場所は本文のほう
  })

  it("導出した逆向きの辺も分類済みとして数える", () => {
    // `b` の本文だけが `a` を指し、宣言は `a` 側から書いてある
    deck(pattern("a"), pattern("b", ["a"]))
    declare(edges(edge("a", "下位", "b")))

    expect(checks(lintRelations(dir), "relation-prose")).toEqual([])
  })

  it("上下の軸を持たないパターンを報せる", () => {
    deck(pattern("a", ["b"]), pattern("b"))
    declare(edges(edge("a", "検算", "b")))

    const found = checks(lintRelations(dir), "relation-coverage")
    expect(found.map((d) => d.level)).toEqual(["warning", "warning"])
  })

  /** `decks:` が名乗っていないデッキは、まだ分類していないだけ */
  it("対象に挙げていないデッキのリンクは分類を求めない", () => {
    deck(pattern("a", ["b"]), pattern("b"))
    writeFileSync(join(dir, getRelations().file), ["version: 1", "decks: []", "edges: []"].join("\n"), "utf-8")

    expect(lintRelations(dir)).toEqual([])
  })
})
