import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { parseMarkdown } from "../src/parser/index.js"
import { slugify } from "../src/parser/slide-ids.js"
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

  it("should fall back to a positional id when the title yields no slug", async () => {
    expect(await ids("## !!!\n### H\nbody")).toEqual(["slide-1"])
  })

  it("should suffix extra slides produced by a multi-slide plugin", async () => {
    // pattern-language は1ブロックから概要+詳細の2スライドを生む。
    // converter は title:"" を吐くので、raw.title から採番できることが要点。
    const markdown = `## パターンA
<!--pattern-language-a-->
number: 1
name: "テストパターン"
category: "テスト"
stage: "はじめの一歩"
### 状況
状況の説明
### 問題
問題の説明
### 解決
解決の説明`
    const result = await ids(markdown)
    expect(result.length).toBe(2)
    expect(result).toEqual(["パターンa", "パターンa--2"])
  })

  it("should give every slide a non-empty id", async () => {
    const markdown = "# T\nsub\n\n---\n\n## A\n### H\na\n\n---\n\n## B\n<!--quote-->\n引用\n### 著者"
    for (const id of await ids(markdown)) {
      expect(id).not.toBe("")
    }
  })
})
