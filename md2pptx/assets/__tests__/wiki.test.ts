import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { md2wiki, md2html } from "../src/index.js"
import { buildWikiSite } from "../src/renderer/wiki/index.js"
import { parseMarkdown } from "../src/parser/index.js"
import { DEFAULT_THEME } from "../src/schema/index.js"
import "../src/plugins/index.js"

const ALPHA = `# アルファ集

---

## 種ノート
<!--id:seed-->
### まず置く
育て方は [[育つ見出し]]、繋ぎ方は [[bravo/つなぎ直し]] を見よ。

---

## 育つ見出し
### 見出しが先に伸びる
[[seed]] から始まる。
`

const BRAVO = `# ブラボー集

---

## つなぎ直し
### 既存に繋ぐ
繋ぎ先は [[seed]]。存在しない [[どこにもない]] も混ぜる。
`

const buildSite = async () => {
  const decks = await Promise.all(
    [
      { slug: "alpha", markdown: ALPHA, title: "アルファ集" },
      { slug: "bravo", markdown: BRAVO, title: "ブラボー集" },
    ].map(async (d) => ({
      slug: d.slug,
      title: d.title,
      presentation: await Effect.runPromise(parseMarkdown(d.markdown)),
    }))
  )
  return buildWikiSite(decks, DEFAULT_THEME)
}

const buildHtml = () =>
  Effect.runPromise(
    md2wiki(
      [
        { name: "alpha", markdown: ALPHA },
        { name: "bravo", markdown: BRAVO },
      ],
      { siteTitle: "テストWiki" }
    )
  )

describe("wiki site index", () => {
  it("should namespace slide ids by deck", async () => {
    const site = await buildSite()
    expect(site.entries.map((e) => e.globalId)).toEqual([
      "alpha/アルファ集",
      "alpha/seed",
      "alpha/育つ見出し",
      "bravo/ブラボー集",
      "bravo/つなぎ直し",
    ])
  })

  it("should keep global ids unique even when decks share a local id", async () => {
    const pres = await Effect.runPromise(parseMarkdown("## 同じ\n### H\nbody"))
    const site = buildWikiSite(
      [
        { slug: "a", title: "A", presentation: pres },
        { slug: "b", title: "B", presentation: pres },
      ],
      DEFAULT_THEME
    )
    const ids = site.entries.map((e) => e.globalId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("should number slides globally but track deck position separately", async () => {
    const site = await buildSite()
    const bravoFirst = site.entries.find((e) => e.globalId === "bravo/ブラボー集")!
    expect(bravoFirst.globalIndex).toBe(3)
    expect(bravoFirst.deckIndex).toBe(0)
  })
})

describe("wiki link resolution", () => {
  it("should resolve a same-deck short reference", async () => {
    const site = await buildSite()
    expect(site.forward.get("alpha/seed")).toContain("alpha/育つ見出し")
  })

  it("should resolve an explicit cross-deck reference", async () => {
    const site = await buildSite()
    expect(site.forward.get("alpha/seed")).toContain("bravo/つなぎ直し")
  })

  it("should resolve a short reference that is unique across the whole site", async () => {
    const site = await buildSite()
    expect(site.forward.get("bravo/つなぎ直し")).toContain("alpha/seed")
  })

  it("should report an unresolvable reference instead of guessing", async () => {
    const site = await buildSite()
    expect(site.broken).toEqual([
      { fromId: "bravo/つなぎ直し", ref: "どこにもない", reason: "not-found" },
    ])
  })

  it("should report an ambiguous reference rather than picking one", async () => {
    const mk = (title: string) => parseMarkdown(`## ${title}\n### H\n[[dup]] を見る`)
    const a = await Effect.runPromise(mk("A"))
    const dup = await Effect.runPromise(parseMarkdown("## X\n<!--id:dup-->\n### H\nbody"))

    const site = buildWikiSite(
      [
        { slug: "src", title: "S", presentation: a },
        { slug: "one", title: "One", presentation: dup },
        { slug: "two", title: "Two", presentation: dup },
      ],
      DEFAULT_THEME
    )
    expect(site.broken.map((b) => b.reason)).toContain("ambiguous")
  })

  it("should invert links into backlinks", async () => {
    const site = await buildSite()
    expect(site.backlinks.get("alpha/seed")).toEqual([
      "alpha/育つ見出し",
      "bravo/つなぎ直し",
    ])
  })
})

describe("wiki html output", () => {
  it("should contain one wrapper per slide with a unique wiki id", async () => {
    const html = await buildHtml()
    const ids = [...html.matchAll(/data-wiki-id="([^"]+)"/g)].map((m) => m[1])
    expect(ids.length).toBe(5)
    expect(new Set(ids).size).toBe(5)
  })

  it("should keep data-slide-id unique across the whole site", async () => {
    const html = await buildHtml()
    const ids = [...html.matchAll(/data-slide-id="([^"]+)"/g)].map((m) => m[1])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("should reuse the same slide markup that --html produces", async () => {
    // ドリフト検知。Wiki が独自にスライドを描き始めたらここで落ちる。
    const wiki = await buildHtml()
    const single = await Effect.runPromise(md2html(ALPHA, {}))

    const body = single.slice(
      single.indexOf('<div class="slide content-slide"'),
      single.indexOf('<div class="slide-counter">')
    )
    const firstBox = body.slice(body.indexOf('<div class="text-box"'), body.indexOf("</div>"))
    expect(firstBox.length).toBeGreaterThan(20)
    expect(wiki).toContain(firstBox)
  })

  it("should emit no id attribute inside slide markup so previews can clone safely", async () => {
    const html = await buildHtml()
    for (const [, markup] of html.matchAll(/<div class="slide [^"]*"([^>]*)>/g)) {
      expect(markup).not.toMatch(/\sid="/)
    }
  })

  it("should keep numbered list items self-describing so clones number correctly", async () => {
    const html = await Effect.runPromise(
      md2wiki([{ name: "n", markdown: "## L\n### H\n1. one\n2. two" }], {})
    )
    // 各項目が自前で counter-reset を持つので、cloneNode しても番号が保たれる
    const items = [...html.matchAll(/class="para-number" style="counter-reset: para-num (\d+)"/g)]
    expect(items.map((m) => m[1])).toEqual(["0", "1"])
  })

  it("should be self-contained (no external resource references)", async () => {
    const html = await buildHtml()
    expect(html).not.toMatch(/<script[^>]+src=/)
    expect(html).not.toMatch(/<link[^>]+rel="stylesheet"/)
    expect(html).not.toMatch(/@import/)
  })

  it("should ship the resolution table and backlinks to the viewer", async () => {
    const html = await buildHtml()
    expect(html).toContain("window.__WIKI__")
    expect(html).toContain('"backlinks"')
    expect(html).toContain('"resolve"')
  })

  it("should surface unresolved links in the sidebar report", async () => {
    const html = await buildHtml()
    expect(html).toContain("未解決リンク 1 件")
    expect(html).toContain("どこにもない")
  })

  it("should escape a closing script tag in slide content", async () => {
    const html = await Effect.runPromise(
      md2wiki([{ name: "x", markdown: "## </script> テスト\n### H\nbody" }], {})
    )
    const bootstrap = html.slice(html.indexOf("window.__WIKI__"), html.indexOf("</script>"))
    expect(bootstrap).not.toContain("</script>")
  })
})

describe("rich text layout", () => {
  it("should wrap rich text in a single child so flex does not split it", async () => {
    // display:flex の直下に <strong>/<a> を並べると1つずつが flex アイテムになり、
    // 語の途中で改行される。子を1つに保つことでインラインフローに戻す。
    const html = await Effect.runPromise(
      md2html("## T\n### H\nこれは**強調**と[[a]]を含む文", {})
    )
    expect(html).toContain('<span class="rich-text">')
    expect(html).toMatch(/<span class="rich-text">[^<]*<strong>/)
  })
})

describe("titles for plugins that blank the slide title", () => {
  it("should fall back to the slide id, not the deck name", async () => {
    // agenda / pattern-language の converter は title:"" を吐く。
    // デッキ名にフォールバックすると、サイドバーもプレビューも
    // 全部デッキ名になって区別がつかなくなる。
    const pres = await Effect.runPromise(
      parseMarkdown("## 読み方\n<!--agenda-->\nサブ\n### 項目1\n### 項目2")
    )
    const site = buildWikiSite(
      [{ slug: "d", title: "デッキ名", presentation: pres }],
      DEFAULT_THEME
    )
    expect(site.entries[0].title).toBe("読み方")
  })
})
