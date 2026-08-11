import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "fs"
import { join } from "path"
import { tokenize } from "../src/parser/tokenizer.js"
import {
  readDeckMeta,
  readFrontmatter,
  splitFrontmatter,
} from "../src/ontology/frontmatter.js"
import { lintSource } from "../src/ontology/lint.js"

/**
 * frontmatter の認識規則を守るテスト。
 *
 * ここで守っているのは2つ。**既存の md を1つも巻き込まないこと**と、
 * **剥がしても行番号がずれないこと**。前者を落とすと、1行目が `---` の
 * フィクスチャ8本が黙って1枚目を失う。後者を落とすと、lint の指摘が
 * 数行手前を指すようになる（どちらもテストが無ければ気づきにくい）。
 */

const ASSETS_DIR = join(import.meta.dirname, "..")

const VALID = `---
type: deck
title: テスト
tags: [a, b]
---

# テスト

本文
`

describe("splitFrontmatter は冒頭の frontmatter だけを剥がす", () => {
  it("frontmatter が無い md はそのまま返す", () => {
    const md = "# タイトル\n\n本文\n"
    const result = splitFrontmatter(md)
    expect(result.block).toBeUndefined()
    expect(result.body).toBe(md)
    expect(result.nearMiss).toBe(false)
  })

  it("正しい frontmatter を中身だけ取り出す", () => {
    const { block } = splitFrontmatter(VALID)
    expect(block).toBe("type: deck\ntitle: テスト\ntags: [a, b]")
  })

  it("1行目が --- でも2行目が見出しなら frontmatter ではない", () => {
    // __tests__/markdown-spec/ の8本がこの形。剥がしたら1枚目が消える
    const md = "---\n# Title\n\n本文\n"
    const result = splitFrontmatter(md)
    expect(result.block).toBeUndefined()
    expect(result.body).toBe(md)
    // 「区切りから書き始めた普通のデッキ」であって、frontmatter の書き損じではない。
    // ここを立てると markdown-spec の8本が一斉に warning になる
    expect(result.nearMiss).toBe(false)
  })

  it("先頭が空行なら（2行目が ---でも）frontmatter ではない", () => {
    // doc/Spec.md がこの形
    const md = "\n---\n\n# Title\n"
    const result = splitFrontmatter(md)
    expect(result.block).toBeUndefined()
    expect(result.body).toBe(md)
    // 1行目が --- ですらないので、書き損じの疑いすら立てない
    expect(result.nearMiss).toBe(false)
  })

  it("閉じの --- が無ければ frontmatter ではない", () => {
    const md = "---\ntype: deck\n\n# Title\n"
    const result = splitFrontmatter(md)
    expect(result.block).toBeUndefined()
    expect(result.body).toBe(md)
    expect(result.nearMiss).toBe(true)
  })

  it("日本語の見出しをキー行と読み違えない", () => {
    const md = "---\n概要: これは見出しであってキーではない\n---\n\n# Title\n"
    expect(splitFrontmatter(md).block).toBeUndefined()
  })

  it("壊れた YAML でも throw せず、剥がすところまでは進む", () => {
    const md = "---\ntype: [壊れている\n---\n\n# Title\n"
    const { block } = splitFrontmatter(md)
    expect(block).toBe("type: [壊れている")
    expect(readFrontmatter(block!).errors.length).toBeGreaterThan(0)
    expect(readFrontmatter(block!).data).toBeUndefined()
  })

  it("マップでない frontmatter は読めなかったことにする", () => {
    const read = readFrontmatter("a: 1\n")
    expect(read.data).toEqual({ a: 1 })
    expect(readFrontmatter("- a\n- b").data).toBeUndefined()
  })
})

describe("剥がしても行番号がずれない", () => {
  it("本文の行数が元の md と同じ", () => {
    const { body } = splitFrontmatter(VALID)
    expect(body.split("\n").length).toBe(VALID.split("\n").length)
  })

  it("frontmatter の跡は空行になる", () => {
    const { body } = splitFrontmatter(VALID)
    expect(body.split("\n").slice(0, 5)).toEqual(["", "", "", "", ""])
  })

  it("剥がした後のトークンの行番号が実ファイルの行番号と一致する", () => {
    const { body } = splitFrontmatter(VALID)
    const heading = tokenize(body).find((t) => t.type === "H1")
    // VALID の "# テスト" は7行目
    expect(VALID.split("\n")[6]).toBe("# テスト")
    expect(heading?.line).toBe(7)
  })

  it("剥がしても区切り（---）の数が変わらない", () => {
    const md = `---
type: deck
---

# 表紙

---

## 2枚目
`
    const before = tokenize(md).filter((t) => t.type === "HorizontalRule").length
    const after = tokenize(splitFrontmatter(md).body).filter(
      (t) => t.type === "HorizontalRule"
    ).length
    // 剥がす前は frontmatter の2本も区切りに見えている
    expect(before).toBe(3)
    expect(after).toBe(1)
  })

  it("キーの行番号は実ファイルの行を指す", () => {
    const { block } = splitFrontmatter(VALID)
    const { keyLines } = readFrontmatter(block!)
    expect(keyLines.get("type")).toBe(2)
    expect(keyLines.get("title")).toBe(3)
    expect(keyLines.get("tags")).toBe(4)
  })
})

describe("readDeckMeta は使える値だけを拾う", () => {
  it("宣言どおりの値を読む", () => {
    expect(readDeckMeta(VALID)).toEqual({
      type: "deck",
      title: "テスト",
      description: undefined,
      tags: ["a", "b"],
      status: undefined,
    })
  })

  it("frontmatter が無ければ undefined", () => {
    expect(readDeckMeta("# タイトル\n")).toBeUndefined()
  })

  it("型に合わない値は黙って落とす（報せるのは lint の仕事）", () => {
    const md = "---\ntitle: 123\ntags: おかしい\ndescription: ok\n---\n\n# T\n"
    expect(readDeckMeta(md)).toEqual({
      type: undefined,
      title: undefined,
      description: "ok",
      tags: undefined,
      status: undefined,
    })
  })

  it("配列の中の非文字列だけを落とす", () => {
    const md = "---\ntags: [a, 1, b]\n---\n\n# T\n"
    expect(readDeckMeta(md)?.tags).toEqual(["a", "b"])
  })
})

describe("名乗っていないフィクスチャを1つも巻き込まない", () => {
  // markdown-spec はレイアウトの検証用で frontmatter を持たない。うち8本は1行目が
  // `---` なので、認識規則が緩むと最初に壊れるのがここ
  const fixtures = readdirSync(join(ASSETS_DIR, "__tests__", "markdown-spec"))
    .filter((f) => f.endsWith(".md"))
    .map((f) => join(ASSETS_DIR, "__tests__", "markdown-spec", f))

  it("検査対象が集まっている", () => {
    expect(fixtures.length).toBeGreaterThan(10)
  })

  it("うち複数が1行目 `---` で始まる（規則が緩んだら壊れる側）", () => {
    const leading = fixtures.filter((f) => readFileSync(f, "utf-8").startsWith("---\n"))
    expect(leading.length).toBeGreaterThan(5)
  })

  it.each(fixtures)("%s は frontmatter を持たないままである", (file) => {
    const md = readFileSync(file, "utf-8")
    const result = splitFrontmatter(md)
    expect(result.block).toBeUndefined()
    expect(result.body).toBe(md)
  })
})

describe("名乗っているデッキは剥がされる", () => {
  const decks = [
    join(ASSETS_DIR, "doc", "Spec.md"),
    ...readdirSync(join(ASSETS_DIR, "doc", "wiki"))
      .filter((f) => f.endsWith(".md"))
      .map((f) => join(ASSETS_DIR, "doc", "wiki", f)),
  ]

  it.each(decks)("%s は frontmatter を持ち、行数が変わらない", (file) => {
    const md = readFileSync(file, "utf-8")
    const result = splitFrontmatter(md)
    expect(result.block).toBeDefined()
    // 剥がしても行番号がずれない＝診断が実ファイルの行を指せる
    expect(result.body.split("\n").length).toBe(md.split("\n").length)
    // 本文に YAML が残っていない（残ると1枚目のスライドとして描かれる）
    expect(result.body).not.toContain("type:")
  })

  it.each(decks)("%s のメタが読める", (file) => {
    expect(readDeckMeta(readFileSync(file, "utf-8"))?.type).toBeDefined()
  })
})

/**
 * OKF v0.2 に合わせたキーと値の形。
 *
 * ここで守っているのは「宣言が OKF を名乗っている以上、OKF の綴りだけが通る」こと。
 * 独自の綴り（旧 `ai:<model>` など）が通り続けると、バンドルを他の道具に渡した
 * ときに黙って読み飛ばされる — **書いた本人には最後まで分からない壊れ方**になる。
 */
describe("frontmatter は OKF v0.2 の綴りに従う", () => {
  const lint = (md: string): string[] =>
    lintSource(md, tokenize(splitFrontmatter(md).body)).map((d) => d.message)

  const deck = (frontmatter: string): string =>
    `---\n${frontmatter}\n---\n\n# あ\n\n---\n\n## か\n### さ\n本文\n`

  it("名乗ったのに type が無ければ報せる", () => {
    // OKF が必須にしているのはこの1つだけ（SPEC.md §11）
    expect(lint(deck("title: あ")).join("\n")).toContain("必須の 'type' が無い")
  })

  it("名乗っていない md は巻き込まない", () => {
    // frontmatter そのものは optional。フィクスチャを必須違反にしてはいけない
    expect(lint("# あ\n\n---\n\n## か\n### さ\n本文\n").join("\n")).not.toContain("必須の 'type'")
  })

  it("actor は OKF の接頭辞つきの綴りだけを受ける", () => {
    // 信頼の段（未検証 / 機械が確認 / 人が確認）は `human:` の有無で決まるので、
    // 接頭辞そのものに意味がある。旧綴りの裸の `human` は通してはいけない
    for (const by of ["human:ienaga", "process:nightly", "claude/opus-5"]) {
      expect(lint(deck(`type: deck\nverified:\n  - {by: "${by}", at: "2026-01-01T09:00:00Z"}`)))
        .not.toContainEqual(expect.stringContaining("actor として読めない"))
    }
    for (const by of ["human", "ai:opus", "tool:script"]) {
      expect(lint(deck(`type: deck\nverified:\n  - {by: "${by}", at: "2026-01-01T09:00:00Z"}`)).join("\n"))
        .toContain("actor として読めない")
    }
  })

  it("verified.at と generated.at は RFC3339 を受ける", () => {
    // OKF の例は `2026-06-20T22:53:05Z`。日付だけの略記も受ける（書き手が手で書く欄なので）
    for (const at of ["2026-06-20T22:53:05Z", "2026-06-20T22:53:05+09:00", "2026-06-20"]) {
      expect(lint(deck(`type: deck\ngenerated: {by: "claude/opus-5", at: "${at}"}`)).join("\n"))
        .not.toContain("timestamp として読めない")
    }
    expect(lint(deck(`type: deck\ngenerated: {by: "claude/opus-5", at: "2026/06/20"}`)).join("\n"))
      .toContain("timestamp として読めない")
  })

  it("OKF に無い独自キーは拒まない", () => {
    // OKF は「知らないキーは保存して拒まない」と定めている（SPEC.md §11）。
    // こちらの拡張（category など）が通ることが、その適合の裏返しになっている
    expect(lint(deck("type: deck\ncategory: パターンカタログ\nauthor: 家永")).join("\n"))
      .not.toContain("宣言に無い")
  })
})
