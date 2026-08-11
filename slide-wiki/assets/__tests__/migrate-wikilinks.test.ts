import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"

import { main } from "../src/tools/migrate-wikilinks.js"
import { stripInlineFormatting } from "../src/parser/inline-formatter.js"

/**
 * 旧 `[[…]]` 記法 → OKF のバンドル相対リンクへの一括変換。
 *
 * このツールの約束は2つ。**解決順は本体と同じものを使う**ことと、
 * **表示テキストを1文字も変えない**こと。後者は他の全テストを守る性質なので
 * （文字数・高さ見積り・レイアウトのスナップショット・3者比較がぶら下がる）、
 * 個別のケースとは別に不変条件として書いてある。
 */

let dir: string

const write = (name: string, body: string): void => writeFileSync(join(dir, name), body, "utf-8")
const read = (name: string): string => readFileSync(join(dir, name), "utf-8")

const deck = (title: string, slides: string): string =>
  `---\ntype: deck\ntitle: ${title}\n---\n\n# ${title}\n${slides}`

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "migrate-wikilinks-"))
  vi.spyOn(console, "log").mockImplementation(() => {})
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
  vi.restoreAllMocks()
})

describe("migrate-wikilinks", () => {
  it("should rewrite every reference shape to a bundle-relative link", () => {
    write("alpha.md", deck("アルファ", `
---

## 入口
<!--id:入口-->

### 行き先
同じデッキ [[出口]]、ラベル付き [[出口|そと]]、別デッキ [[bravo/剪定]]、サイトで一意 [[収穫]]

---

## 出口
<!--id:出口-->

### 戻る
[[入口]]
`))
    write("bravo.md", deck("ブラボー", `
---

## 剪定
<!--id:剪定-->

### 説明
本文

---

## 収穫
<!--id:収穫-->

### 説明
本文
`))

    expect(main([dir])).toBe(0)

    const alpha = read("alpha.md")
    expect(alpha).toContain("[出口](/alpha.md#出口)")
    expect(alpha).toContain("[そと](/alpha.md#出口)")
    expect(alpha).toContain("[bravo/剪定](/bravo.md#剪定)")   // ラベル省略時は表示のまま
    expect(alpha).toContain("[収穫](/bravo.md#収穫)")          // サイト全体で一意なので当たる
    expect(alpha).not.toContain("[[")
  })

  it("should never change the displayed text", () => {
    // **この不変条件が、レイアウト側の全スナップショットを守っている。**
    // ラベルを整形すると文字数と高さ見積りが動き、記法の移行と見た目の変更が
    // 1つのコミットに混ざる
    const body = "見よ [[出口]] と [[出口|そと]] と [[bravo/剪定]]"
    write("alpha.md", deck("アルファ", `\n---\n\n## 入口\n<!--id:入口-->\n\n### 行き先\n${body}\n\n---\n\n## 出口\n<!--id:出口-->\n\n### 戻る\n本文\n`))
    write("bravo.md", deck("ブラボー", `\n---\n\n## 剪定\n<!--id:剪定-->\n\n### 説明\n本文\n`))

    const before = read("alpha.md")
    expect(main([dir])).toBe(0)
    const after = read("alpha.md")

    expect(after).not.toBe(before)
    for (const [b, a] of zipLines(before, after)) {
      expect(stripInlineFormatting(a)).toBe(stripLegacy(b))
    }
  })

  it("should leave syntax samples inside code untouched", () => {
    write("alpha.md", deck("アルファ", `
---

## 書き方
<!--id:書き方-->

### 見本
\`[[入口]]\` と書く。フェンスの中も同じ:

\`\`\`markdown
[[入口]]
\`\`\`

本物は [[書き方]]
`))

    expect(main([dir])).toBe(0)
    const alpha = read("alpha.md")
    expect(alpha).toContain("`[[入口]]` と書く")           // インラインコードは据え置き
    expect(alpha).toContain("```markdown\n[[入口]]\n```")  // フェンスも据え置き
    expect(alpha).toContain("本物は [書き方](/alpha.md#書き方)")
  })

  it("should not touch frontmatter", () => {
    write("alpha.md", "---\ntype: deck\ndescription: \"[[入口]] のこと\"\n---\n\n# ア\n\n---\n\n## 入口\n<!--id:入口-->\n\n### 本文\n[[入口]]\n")
    expect(main([dir])).toBe(0)
    expect(read("alpha.md")).toContain('description: "[[入口]] のこと"')
  })

  it("should write nothing when a reference cannot be resolved", () => {
    // 半分だけ移した md はいちばん直しにくい状態になるので、全部か何もしないか
    write("alpha.md", deck("アルファ", `
---

## 入口
<!--id:入口-->

### 本文
生きている [[入口]] と、死んでいる [[存在しない]]
`))
    const before = read("alpha.md")

    expect(main([dir])).toBe(1)
    expect(read("alpha.md")).toBe(before)
  })

  it("should convert the rest when --leave-unresolved is given", () => {
    write("alpha.md", deck("アルファ", `
---

## 入口
<!--id:入口-->

### 本文
生きている [[入口]] と、死んでいる [[存在しない]]
`))

    expect(main([dir, "--leave-unresolved"])).toBe(1)
    const alpha = read("alpha.md")
    expect(alpha).toContain("[入口](/alpha.md#入口)")
    expect(alpha).toContain("[[存在しない]]")
  })

  it("should refuse a bundle whose deck slugs collide", () => {
    // リンクはファイル名で書かれるので、2つのファイルが同じ slug になると
    // どちらを指しているか決められない
    write("My_Deck.md", deck("あ", "\n---\n\n## a\n<!--id:a-->\n\n### 本文\n本文\n"))
    write("my-deck.md", deck("い", "\n---\n\n## b\n<!--id:b-->\n\n### 本文\n本文\n"))

    expect(main([dir])).toBe(2)
  })

  it("should be idempotent and satisfy --check afterwards", () => {
    write("alpha.md", deck("アルファ", "\n---\n\n## 入口\n<!--id:入口-->\n\n### 本文\n[[入口]]\n"))

    expect(main([dir, "--check"])).toBe(1)   // 変換前は残っている
    expect(main([dir])).toBe(0)
    const once = read("alpha.md")
    expect(main([dir])).toBe(0)
    expect(read("alpha.md")).toBe(once)      // 2回目は何も変えない
    expect(main([dir, "--check"])).toBe(0)   // もう残っていない
  })

  it("should not write anything on --dry-run", () => {
    write("alpha.md", deck("アルファ", "\n---\n\n## 入口\n<!--id:入口-->\n\n### 本文\n[[入口]]\n"))
    const before = read("alpha.md")

    expect(main([dir, "--dry-run"])).toBe(0)
    expect(read("alpha.md")).toBe(before)
  })

  it("should percent-encode only what would break the link grammar", () => {
    // パーサの mdHref は [^()\s]+ なので、丸括弧が入るとリンクとして読まれない
    write("alpha.md", deck("アルファ", "\n---\n\n## a (b)\n\n### 本文\n[[a-b]]\n"))
    expect(main([dir])).toBe(0)
    const alpha = read("alpha.md")
    expect(alpha).toContain("[a-b](/alpha.md#a-b)")
  })
})

/**
 * 旧記法から表示テキストを取り出す。
 *
 * 本体の `stripInlineFormatting` はもう `[[…]]` を知らない（廃止したので当然である）。
 * 変換**前**の md から表示テキストを得られるのはこの3行だけなので、
 * 不変条件を書くためにここに置く。綴りは `migrate-wikilinks.ts` の `WIKILINK` と同じ。
 */
const stripLegacy = (text: string): string =>
  stripInlineFormatting(
    text
      .replace(/\[\[[^\[\]|]+?\|([^\[\]]+?)\]\]/g, "$1")
      .replace(/\[\[([^\[\]|]+?)\]\]/g, "$1")
  )

/** 行ごとに突き合わせる（行数は変換で変わらない — 1行の中だけを書き換えるため） */
function zipLines(before: string, after: string): [string, string][] {
  const b = before.split("\n")
  const a = after.split("\n")
  expect(a.length).toBe(b.length)
  return b.map((line, i) => [line, a[i]])
}
