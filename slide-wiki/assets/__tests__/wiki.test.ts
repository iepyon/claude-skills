import { describe, it, expect } from "vitest"
import { Effect, Exit } from "effect"
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
育て方は [育つ見出し](alpha.md#育つ見出し)、繋ぎ方は [つなぎ直し](bravo.md#つなぎ直し) を見よ。

---

## 育つ見出し
### 見出しが先に伸びる
[種ノート](alpha.md#seed) から始まる。
`

const BRAVO = `# ブラボー集

---

## つなぎ直し
### 既存に繋ぐ
繋ぎ先は [種ノート](alpha.md#seed)。存在しない [どこにもない](alpha.md#どこにもない) も混ぜる。
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

describe("デッキの frontmatter がサイドバーの絞り込みに流れる", () => {
  const WITH_META = `---
type: deck
title: 比喩の集まり
description: 名前だけでは何の話か分からないスライド
tags: [ナレッジマネジメント, 運用]
---

# 比喩の集まり

---

## 夜勤
### 節
本文
`

  const searchAttrs = (html: string): string[] =>
    [...html.matchAll(/data-search="([^"]*)"/g)].map((m) => m[1])

  it("description と tags が各スライドの検索対象に入る", async () => {
    const html = await Effect.runPromise(
      md2wiki([{ name: "meta-deck", markdown: WITH_META }], { siteTitle: "T" })
    )
    const found = searchAttrs(html).find((s) => s.includes("夜勤"))
    // 題（夜勤）だけでなく、デッキが名乗った語でも引ける
    expect(found).toContain("ナレッジマネジメント")
    expect(found).toContain("名前だけでは何の話か分からないスライド")
  })

  it("frontmatter が無いデッキの検索対象は今までどおり題と ID だけ", async () => {
    const html = await buildHtml()
    const found = searchAttrs(html).find((s) => s.includes("種ノート"))
    expect(found).toBe("種ノート alpha/seed")
  })

  it("frontmatter は本文として描かれない", async () => {
    const html = await Effect.runPromise(
      md2wiki([{ name: "meta-deck", markdown: WITH_META }], { siteTitle: "T" })
    )
    // 剥がし損ねると「type: deck」がスライドの文字として出る
    expect(html).not.toContain("type: deck")
    expect(html).toContain("夜勤")
  })
})

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

  // ── デッキ slug の衝突（B-40）────────────────────────────────────
  //
  // スライド ID は連番で逃がすが、デッキ slug は逃がさない。デッキはファイルなので
  // 書き手が改名できる。連番を振ると、どのファイル名にも order.yaml にも現れない
  // 名前（`my-deck-2`）でしか2本目を指せなくなり、しかも exit 0 で通っていた。

  it("should reject decks whose slugs collide instead of numbering them", async () => {
    const exit = await Effect.runPromiseExit(
      md2wiki([
        { name: "My_Deck", markdown: ALPHA },
        { name: "my-deck", markdown: BRAVO },
      ])
    )

    expect(Exit.isFailure(exit)).toBe(true)
    const message = JSON.stringify(exit)
    expect(message).toContain("My_Deck.md")
    expect(message).toContain("my-deck.md")
    // 誰も書いていない名前を作らないこと
    expect(message).not.toContain("my-deck-2")
  })

  it("should still let two decks keep their own slugs when they differ", async () => {
    const html = await Effect.runPromise(
      md2wiki([
        { name: "alpha", markdown: ALPHA },
        { name: "bravo", markdown: BRAVO },
      ])
    )
    expect(html).toContain("alpha/seed")
  })

  it("should number slides globally but track deck position separately", async () => {
    const site = await buildSite()
    const bravoFirst = site.entries.find((e) => e.globalId === "bravo/ブラボー集")!
    expect(bravoFirst.globalIndex).toBe(3)
    expect(bravoFirst.deckIndex).toBe(0)
  })
})

describe("wiki link resolution", () => {
  it("should resolve a link inside the same deck", async () => {
    const site = await buildSite()
    expect(site.forward.get("alpha/seed")).toContain("alpha/育つ見出し")
  })

  it("should resolve a link into another deck", async () => {
    const site = await buildSite()
    expect(site.forward.get("alpha/seed")).toContain("bravo/つなぎ直し")
  })

  it("should report an unresolvable reference instead of guessing", async () => {
    const site = await buildSite()
    expect(site.broken).toEqual([
      { fromId: "bravo/つなぎ直し", href: "alpha.md#どこにもない" },
    ])
  })

  it("should show the writer the href they typed, not the internal key", async () => {
    // 未解決の一覧に出すのは原文の綴り。解決の鍵（`deck/slide`）は内部表現で、
    // md のどこを直せばよいかを教えてくれない
    const site = await buildSite()
    expect(site.broken[0].href).toBe("alpha.md#どこにもない")
  })

  it("should not be able to be ambiguous at all", async () => {
    // **かつては「候補が2つあって決められない」という失敗モードがあった。**
    // 短い参照を許していたので、同じ ID が2つのデッキにあると行き先が決まらない。
    // リンクがファイルを名指しする形になったので、同じ綴りが2つのデッキにあっても
    // それぞれ別の行き先として解決する — 曖昧という状態が作れない
    const dup = await Effect.runPromise(parseMarkdown("## X\n<!--id:dup-->\n### H\nbody"))
    const src = await Effect.runPromise(
      parseMarkdown("## A\n### H\n[一](one.md#dup) と [二](two.md#dup)")
    )

    const site = buildWikiSite(
      [
        { slug: "src", title: "S", presentation: src },
        { slug: "one", title: "One", presentation: dup },
        { slug: "two", title: "Two", presentation: dup },
      ],
      DEFAULT_THEME
    )
    expect(site.broken).toEqual([])
    expect(site.forward.get("src/a")).toEqual(["one/dup", "two/dup"])
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
      md2html("## T\n### H\nこれは**強調**と[a](d.md#a)を含む文", {})
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

describe("デッキの短い呼び名が、どの束を見ているかを名乗る", () => {
  // 同じレイアウトのパターン集が2本並ぶと、1枚を見ただけではどちらか分からない。
  // 呼び名は右上のバッジと、そのデッキへ渡るリンクの補足の**両方**に出る1語。

  const NAMED = `---
type: deck
title: アルファ集
short: alfa
---

# アルファ集

---

## 種ノート
<!--id:seed-->
### まず置く
繋ぎ方は [つなぎ直し](bravo.md#つなぎ直し)、育て方は [育つ見出し](alpha.md#育つ見出し)。

---

## 育つ見出し
### 見出しが先に伸びる
本文
`

  // ビューアのスクリプト本文と、その中の1関数ぶんの切り出し。
  // 終端を「次の宣言」で取るのは、閉じ括弧の数え上げに依らせないため
  const scriptOf = (html: string): string => html.slice(html.lastIndexOf("<script>"))
  const between = (s: string, from: string, to: string): string =>
    s.slice(s.indexOf(from), s.indexOf(to, s.indexOf(from)))

  const namedHtml = () =>
    Effect.runPromise(
      md2wiki(
        [
          { name: "alpha", markdown: NAMED },
          { name: "bravo", markdown: BRAVO },
        ],
        { siteTitle: "テストWiki" }
      )
    )

  it("スライドごとにバッジを出し、スライドの**外**に置く", async () => {
    // .slide の閉じの直後に来ていること。中に入れると renderSlide の出力が変わり、
    // 「Wiki のスライドは --html と同じ DOM」という前提が割れる
    const wiki = await namedHtml()
    expect(wiki).toMatch(/<span class="deck-badge">alfa<\/span><\/div>/)
    const single = await Effect.runPromise(md2html(NAMED, {}))
    expect(single).not.toContain("deck-badge")
  })

  it("名乗らないデッキのバッジはデッキ名になる（欠けても穴が空かない）", async () => {
    const html = await buildHtml()
    expect(html).toContain('<span class="deck-badge">alpha</span>')
    expect(html).toContain('<span class="deck-badge">bravo</span>')
  })

  it("呼び名はデッキ単位の表でビューアに渡る（スライドごとに繰り返さない）", async () => {
    const html = await namedHtml()
    expect(html).toContain('"deckShort":{"alpha":"alfa","bravo":"bravo"}')
  })

  it("呼び名でもサイドバーから引ける（バッジが教えた語が空振りしない）", async () => {
    const html = await namedHtml()
    const found = [...html.matchAll(/data-search="([^"]*)"/g)]
      .map((m) => m[1])
      .find((s) => s.includes("種ノート"))
    expect(found).toContain("alfa")
  })

  it("折れたリンクには補足を足さない（赤い破線に行き先の名を名乗らせない）", async () => {
    const script = scriptOf(await namedHtml())
    expect(script).toMatch(/if \(!target\) \{[\s\S]*?classList\.add\("broken"\)[\s\S]*?return;/)
  })

  it("またぐ判定は本文のリンクとバックリンクで同じ1つの規則を読む", async () => {
    // 片方に inline で書くと、規則を変えたときもう一方が黙って古いままになる
    const script = scriptOf(await namedHtml())
    expect(script).toMatch(/function crossDeckShort\(/)
    expect(between(script, "function annotateLinks()", "document.addEventListener"))
      .toContain("crossDeckShort(")
    expect(between(script, "function renderBacklinks(id)", "navigation"))
      .toContain("crossDeckShort(")
  })

  it("補足は属性で足す（節点を挿すとプレビューの複製で二重になる）", async () => {
    const html = await namedHtml()
    const annotate = between(scriptOf(html), "function annotateLinks()", "document.addEventListener")
    expect(annotate).not.toContain("createElement")
    expect(html).toContain("a.wikilink[data-cross-deck]::after")
  })

  it("リンクの足場はスライドの ID から引く（data-deck の読み手を増やさない — B-47）", async () => {
    const script = scriptOf(await namedHtml())
    const scopeFn = between(script, "function scopeDeckOf(a)", "function crossDeckShort")
    expect(scopeFn).not.toContain("dataset.deck")
    expect(scopeFn).toContain("dataset.wikiId")
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
    // アジェンダは目次そのもの。ここでリンクの綴りが生のまま出ると
    // 索引ページからどこへも飛べない。
    const html = await Effect.runPromise(
      md2wiki(
        [{ name: "d", markdown: "## 読み方\n<!--agenda-->\nサブ\n### 置く: [種ノート](d.md#種ノート)\n\n---\n\n## 種ノート\n### H\nbody" }],
        {}
      )
    )
    expect(html).toContain('data-wikilink="d/種ノート"')
    expect(html).not.toContain("](d.md#種ノート)")
  })
})
