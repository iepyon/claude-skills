import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { parseMarkdown } from "../src/parser/index.js"
import { slugify } from "../src/slug.js"
import { md2html } from "../src/index.js"
import "../src/plugins/index.js"

const ids = async (markdown: string): Promise<string[]> => {
  const pres = await Effect.runPromise(parseMarkdown(markdown))
  return pres.slides.map((s) => s.id)
}

describe("slugify", () => {
  it("should lowercase and hyphenate latin headings", () => {
    expect(slugify("Getting Started")).toBe("getting-started")
  })

  it("should keep Japanese as-is", () => {
    expect(slugify("種ノート")).toBe("種ノート")
  })

  it("should drop punctuation", () => {
    expect(slugify("What's next?! (really)")).toBe("whats-next-really")
  })

  it("should collapse and trim hyphens", () => {
    expect(slugify("  a / b  ")).toBe("a-b")
  })

  it("should return empty string when nothing survives", () => {
    expect(slugify("!!!")).toBe("")
  })
})

describe("slide id assignment", () => {
  it("should derive an id from the slide title", async () => {
    expect(await ids("# Deck Title\n\n---\n\n## First Slide\n### H\nbody")).toEqual([
      "deck-title",
      "first-slide",
    ])
  })

  it("should honour an explicit <!--id:--> directive", async () => {
    expect(await ids("## Some Long Japanese Title\n<!--id:intro-->\n### H\nbody")).toEqual(["intro"])
  })

  it("should not leak the id directive into the slide body", async () => {
    const html = await Effect.runPromise(
      md2html("## T\n<!--id:intro-->\n### H\nbody text", {})
    )
    expect(html).not.toContain("<!--id:intro-->")
    expect(html).not.toContain("id:intro")
    expect(html).toContain('data-slide-key="intro"')
  })

  it("should disambiguate duplicate titles deterministically", async () => {
    expect(await ids("## まとめ\n### H\na\n\n---\n\n## まとめ\n### H\nb")).toEqual([
      "まとめ",
      "まとめ-2",
    ])
  })

  it("should disambiguate duplicate explicit ids", async () => {
    expect(await ids("## A\n<!--id:dup-->\n### H\na\n\n---\n\n## B\n<!--id:dup-->\n### H\nb")).toEqual([
      "dup",
      "dup-2",
    ])
  })

  it("should let an explicit id win over another slide's automatic slug", async () => {
    // 表紙の見出しが先に `設計` を取ると、書き手が名指した本文スライドが `設計-2` に落ち、
    // #設計 は表紙に着く。明示 ID は予約なので、並び順で勝敗が変わってはいけない
    const markdown = "# 設計\n\n---\n\n## 設計の考え方\n<!--id:設計-->\n### H\nbody"
    expect(await ids(markdown)).toEqual(["設計-2", "設計"])
  })

  it("should keep automatic slugs out of the way wherever the explicit id appears", async () => {
    // 予約は md の並び順に依らない。明示が後ろにあっても前にあっても同じ結果になる
    const before = "## 設計\n<!--id:設計-->\n### H\na\n\n---\n\n## 設計\n### H\nb"
    const after = "## 設計\n### H\nb\n\n---\n\n## 設計\n<!--id:設計-->\n### H\na"
    expect(await ids(before)).toEqual(["設計", "設計-2"])
    expect(await ids(after)).toEqual(["設計-2", "設計"])
  })

  it("should never emit the same id twice, even when a title already looks numbered", async () => {
    // 連番は「その base が何度目か」ではなく「その綴りが空いているか」で決める。
    // 前者だと `## X-2` が先にある状態で `## X` が2枚続くと、2枚目が `x-2` を再発行して
    // 1枚目と衝突していた（サイトのリンクが解決できなくなる）
    const result = await ids("## X-2\n### H\na\n\n---\n\n## X\n### H\nb\n\n---\n\n## X\n### H\nc")
    expect(result).toEqual(["x-2", "x", "x-3"])
    expect(new Set(result).size).toBe(result.length)
  })

  it("should fall back to a positional id when the title yields no slug", async () => {
    expect(await ids("## !!!\n### H\nbody")).toEqual(["slide-1"])
  })

  it("should suffix extra slides produced by a multi-slide plugin", async () => {
    // customer-journey は5フェーズ以上を4件ずつのスライドに割る。
    // converter は分割後の title を吐くので、raw.title から採番できることが要点。
    const markdown = `## 旅路
<!--カスタマージャーニー:-->
### 認知
#### タッチ:
- Web検索
### 比較
#### タッチ:
- 資料請求
### 検討
#### タッチ:
- 商談
### 購入
#### タッチ:
- 申込
### 利用
#### タッチ:
- サポート`
    const result = await ids(markdown)
    expect(result.length).toBe(2)
    expect(result).toEqual(["旅路", "旅路--2"])
  })

  it("should give every slide a non-empty id", async () => {
    const markdown = "# T\nsub\n\n---\n\n## A\n### H\na\n\n---\n\n## B\n<!--quote-->\n引用\n### 著者"
    for (const id of await ids(markdown)) {
      expect(id).not.toBe("")
    }
  })
})
