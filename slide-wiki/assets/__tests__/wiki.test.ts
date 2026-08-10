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
    // 本文は行ごとの <p> にまとめる（PPTX が改行ごとに段落を出すのに合わせる）。
    const html = await Effect.runPromise(
      md2html("## T\n### H\nこれは**強調**と[[a]]を含む文", {})
    )
    expect(html).toContain('<div class="para-stack">')
    expect(html).toMatch(/<div class="para-stack"><p class="para-plain"[^>]*>[^<]*<strong>/)
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

describe("viewer layout contract", () => {
  // ここで守っているのは「実際に見えるか」ではなく、見えるための前提条件。
  // 幾何そのものはブラウザでしか確かめられないので、崩れやすい箇所を固定する。

  it("should give the scaled stage its own wrapper element", async () => {
    // transform: scale() は描画しか縮めない。外箱が縮小後の実寸を持たないと
    // 960px の箱が狭いコンテナからはみ出し、スライドの左が見切れる。
    const html = await buildHtml()
    expect(html).toContain('class="stage-wrap" id="stage-wrap"')
    expect(html).toContain('id="stage-frame"')
    expect(html).toContain('wrap.style.width')
    expect(html).toContain('wrap.style.height')
  })

  it("should fit the stage by height as well as width", async () => {
    // 横幅だけで倍率を決めると、背の低い画面でスライドの下が切れる。
    const html = await buildHtml()
    expect(html).toMatch(/availH\s*\/\s*\d/)
    expect(html).toContain("CHROME_RESERVE")
  })

  it("should let the stage grow past 1:1 on wide screens", async () => {
    // 1倍で頭打ちにすると、1920幅でも 960px のまま = 本文領域の 59% しか使えない。
    // 守りたいのは「1より大きい」ことではなく「上限が contain より先に効かない」こと。
    // 3200x1800 の論理解像度では contain 側が 2.99 になるので、そこを越えて取る。
    const html = await buildHtml()
    const m = html.match(/MAX_STAGE_SCALE\s*=\s*([\d.]+)/)
    expect(m).not.toBeNull()
    expect(Number(m![1])).toBeGreaterThanOrEqual(3)
  })

  it("should reserve only a little room for the chrome below the stage", async () => {
    // 下の情報のために縦を空けすぎると、そのぶんスライドが縮む。
    // 0 にはしない（高さフィットそのものは捨てない）。
    const html = await buildHtml()
    const m = html.match(/CHROME_RESERVE\s*=\s*(\d+)/)
    expect(m).not.toBeNull()
    expect(Number(m![1])).toBeGreaterThan(0)
    expect(Number(m![1])).toBeLessThanOrEqual(80)
  })

  it("should let the backlink strip follow the scaled stage width", async () => {
    // scaleStage() が bl.style.width を入れても max-width が勝つので、
    // 拡大するとステージだけ広がって帯が 960px に取り残される。
    const html = await buildHtml()
    const block = html.slice(html.indexOf(".backlinks {"), html.indexOf(".backlinks h2"))
    expect(block).not.toMatch(/max-width:\s*960px/)
  })

  it("should size the hover preview at runtime instead of baking in one ratio", async () => {
    // 0.5 固定では 480x270 で中身が読めない。画面サイズと入れ子の深さで決める。
    const html = await buildHtml()
    expect(html).toMatch(/transform:\s*scale\(var\(--preview-scale\)\)/)
    expect(html).toMatch(/\.preview-viewport\s*\{[^}]*var\(--preview-scale\)/)
    const m = html.match(/PREVIEW_MAX_SCALE\s*=\s*([\d.]+)/)
    expect(m).not.toBeNull()
    expect(Number(m![1])).toBeGreaterThan(0.5)
  })

  it("should resolve short refs inside a preview card", async () => {
    // カードは .slide だけを clone するので、data-deck を持つ .wiki-slide が祖先に居ない。
    // カードが deck を名乗り直さないと RESOLVE を引けず、入れ子プレビューも
    // カード内リンクのクリックも短い参照では動かない。
    const html = await buildHtml()
    expect(html).toContain("card.dataset.deck")
    expect(html).toMatch(/closest\("\.wiki-slide"\)\s*\|\|[\s\S]{0,80}closest\("\.preview-card"\)/)
  })

  it("should navigate on preview click without double-firing the link handler", async () => {
    // カード全体が入口。ただしカード内のリンクは既存ハンドラの担当で、
    // 両方が走ると go() が2回呼ばれてリンク先が上書きされる。
    const html = await buildHtml()
    const i = html.indexOf("function onPreviewClick")
    expect(i).toBeGreaterThan(-1)
    const fn = html.slice(i, i + 600)
    expect(fn).toContain("a.wikilink")
    expect(fn).toContain("closeAllPreviews")
    expect(fn).toContain("dataset.target")
  })

  it("should not hide the table of contents on touch devices", async () => {
    // 入力デバイスの能力（ホバー可否）でレイアウトを切ると、
    // タッチ対応のノートPCでも目次ごと消えて到達不能になる。
    const html = await buildHtml()
    const hoverBlock = html.slice(
      html.indexOf("@media (hover: none)"),
      html.indexOf("@media (hover: none)") + 400
    )
    expect(hoverBlock).toContain(".preview-card")
    expect(hoverBlock).not.toContain(".sidebar")
  })

  it("should send the arrow keys across deck boundaries without a modifier", async () => {
    // デッキ内で止まると、境界のたびに目次へ戻ることになる。
    // Shift の有無で行き先が変わる仕掛けはもう無い。
    const html = await buildHtml()
    expect(html).not.toContain("shiftKey")
    expect(html).toMatch(/ArrowRight[\s\S]{0,80}step\(1\)/)
    expect(html).toMatch(/ArrowLeft[\s\S]{0,80}step\(-1\)/)
  })

  it("should page by clicking the left or right edge of the stage", async () => {
    // 当たり判定はステージ自身に載せる。#preview-layer は .main の兄弟なので、
    // カードの上のクリックはここへ入ってこない（onPreviewClick と二重に走らない）。
    const html = await buildHtml()
    expect(html).toContain("EDGE_RATIO")
    expect(html).toMatch(/stageWrap\.addEventListener\("click"/)
    const i = html.indexOf('stageWrap.addEventListener("click"')
    const fn = html.slice(i, i + 400)
    expect(fn).toContain("a.wikilink") // 端に置かれたリンクはリンクとして働く
    expect(fn).toContain("getSelection") // 文字を選んだだけでは送らない
  })

  it("should keep the edge markers out of the way of clicks", async () => {
    // 帯そのものにクリックを受けさせると、端に届いているリンクが押せなくなる。
    const html = await buildHtml()
    const block = html.slice(html.indexOf(".edge-zone {"), html.indexOf(".edge-zone.left"))
    expect(block).toMatch(/pointer-events:\s*none/)
  })

  it("should replace the prev/next buttons with a browser back button", async () => {
    const html = await buildHtml()
    expect(html).not.toContain('id="prev-btn"')
    expect(html).not.toContain('id="next-btn"')
    expect(html).toContain('id="back-btn"')
    expect(html).toContain("history.back()")
  })

  it("should put the key hint above the stage", async () => {
    const html = await buildHtml()
    const hint = html.indexOf('class="hint"')
    expect(hint).toBeGreaterThan(-1)
    expect(hint).toBeLessThan(html.indexOf('id="stage-wrap"'))
  })

  it("should collapse the sidebar into a reachable drawer on narrow screens", async () => {
    const html = await buildHtml()
    expect(html).toContain("@media (max-width: 860px)")
    expect(html).toContain('id="menu-btn"')
    expect(html).toContain('id="scrim"')
    expect(html).toContain(".sidebar.open")
    // 幅で畳むときも display:none にはしない（引き出しとして残す）
    const narrow = html.slice(html.indexOf("@media (max-width: 860px)"))
    expect(narrow).not.toMatch(/\.sidebar\s*\{[^}]*display:\s*none/)
  })
})

describe("text must never be clipped", () => {
  it("should not clip text boxes with overflow:hidden", async () => {
    // 箱の高さはフォント metrics を知らない見積りで決まる一方、ブラウザの
    // line-height: normal は実フォント依存（実測 1.33〜1.38倍）。
    // 閲覧環境によって比率が変わるので、どんな値に詰めても必ずどこかで溢れる。
    // 数 px はみ出すのは無害だが、字が切れるのは不具合。
    const html = await Effect.runPromise(md2html("## T\n### 見出し\n本文", {}))
    const box = html.slice(html.indexOf('<div class="text-box"'), html.indexOf("</div>"))
    expect(box).toContain("overflow: visible")
    expect(box).not.toContain("overflow: hidden")
  })

  it("should render agenda items as links, not raw markup", async () => {
    // アジェンダは目次そのもの。ここで [[…]] が生のまま出ると
    // 索引ページからどこへも飛べない。
    const html = await Effect.runPromise(
      md2wiki(
        [{ name: "d", markdown: "## 読み方\n<!--agenda-->\nサブ\n### 置く: [[種ノート]]\n\n---\n\n## 種ノート\n### H\nbody" }],
        {}
      )
    )
    expect(html).toContain('data-wikilink="種ノート"')
    expect(html).not.toContain("[[種ノート]]")
  })
})
