import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { readdirSync, readFileSync } from "fs"
import { join } from "path"
import { parseMarkdown } from "../src/parser/index.js"
import { validatePresentation } from "../src/schema/validation.js"
import { layoutSlide } from "../src/renderer/layout/index.js"
import { collectRefs } from "../src/renderer/wiki/link-graph.js"
import { lintSource } from "../src/ontology/lint.js"
import { DEFAULT_THEME } from "../src/schema/theme.js"
import { SLIDE_WIDTH, MARGIN_X } from "../src/constants.js"
import { isDecoKey } from "../src/shape-keys.js"
import { slidesToInventory } from "../src/tools/inventory.js"
import type { ContentSlide } from "../src/schema/presentation.js"
import type { WikiPatternLayout } from "../src/plugins/wiki-pattern/schema.js"

const SVG = `<svg width="100%" height="100%" viewBox="0 0 340 320" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="100" height="40" fill="none" stroke="#4B5563"/>
</svg>`

/** 節を任意の順で書けるように、本文はテンプレートから組む */
const deck = (opts: { sections?: string; diagram?: string; takeaway?: string } = {}): string => {
  const sections =
    opts.sections ??
    ["### 状況", "きっかけ。", "### 問題", "困りごと。", "### 解決", "打ち手は [[別のパターン]]。"].join(
      "\n"
    )
  const diagram = opts.diagram === undefined ? "\n```pattern-diagram\n" + SVG + "\n```\n" : opts.diagram
  const takeaway = opts.takeaway ? `\n<!--takeaway-->\n${opts.takeaway}\n` : ""
  return `# テスト

---

## 種ノート
<!--id:種ノート-->
<!--pattern-->
${sections}
${diagram}${takeaway}`
}

const layoutOf = async (markdown: string): Promise<WikiPatternLayout> => {
  const ast = await Effect.runPromise(parseMarkdown(markdown))
  const pres = await Effect.runPromise(validatePresentation(ast))
  const slide = pres.slides[1] as ContentSlide
  expect(slide.layout._tag).toBe("WikiPattern")
  return slide.layout as unknown as WikiPatternLayout
}

describe("WikiPattern — 3節の左段", () => {
  it("状況・問題・解決を3件そろえる", async () => {
    const layout = await layoutOf(deck())
    expect(layout.sections.map((s) => s.heading)).toEqual(["状況", "問題", "解決"])
    expect(layout.sections[0].body).toBe("きっかけ。")
  })

  it("書いた順ではなく語彙の宣言順に積む", async () => {
    // 宣言は 状況 → 問題 → 解決。読む順が書く順に引きずられてはいけない
    const layout = await layoutOf(
      deck({
        sections: ["### 解決", "あとで書いた。", "### 状況", "さきに書いた。", "### 問題", "まんなか。"].join(
          "\n"
        ),
      })
    )
    expect(layout.sections.map((s) => s.heading)).toEqual(["状況", "問題", "解決"])
    expect(layout.sections[0].body).toBe("さきに書いた。")
  })

  it("別名の見出しも受理する（宣言の aliases）", async () => {
    const layout = await layoutOf(
      deck({ sections: ["### いつ", "A。", "### なぜ", "B。", "### どうする", "C。"].join("\n") })
    )
    expect(layout.sections).toHaveLength(3)
    expect(layout.sections.map((s) => s.body)).toEqual(["A。", "B。", "C。"])
  })
})

describe("WikiPattern — 図解", () => {
  it("フェンスの中身を原文のまま持つ", async () => {
    const layout = await layoutOf(deck())
    expect(layout.diagram).toBe(SVG)
  })

  it("フェンスが無ければ変換で止まる", async () => {
    // 「必ず」を運用の心がけにしない。宣言（cardinality: 1）を lint が報告し、
    // 通り抜けようとしてもここで落ちる
    const result = await Effect.runPromiseExit(parseMarkdown(deck({ diagram: "" })))
    expect(result._tag).toBe("Failure")
    expect(JSON.stringify(result)).toContain("pattern-diagram")
  })

  it("空のフェンスも「図解あり」とは見なさない", async () => {
    const result = await Effect.runPromiseExit(
      parseMarkdown(deck({ diagram: "\n```pattern-diagram\n\n```\n" }))
    )
    expect(result._tag).toBe("Failure")
  })

  it("lint がフェンスの欠落を slot-cardinality として報告する", () => {
    const diagnostics = lintSource(deck({ diagram: "" }))
    expect(diagnostics.map((d) => d.check)).toContain("slot-cardinality")
    expect(diagnostics.find((d) => d.check === "slot-cardinality")?.message).toContain(
      "pattern-diagram"
    )
  })

  it("図解のあるスライドには診断が出ない", () => {
    expect(lintSource(deck())).toEqual([])
  })
})

describe("WikiPattern — 座標", () => {
  const layoutFor = async (markdown: string) => {
    const ast = await Effect.runPromise(parseMarkdown(markdown))
    const pres = await Effect.runPromise(validatePresentation(ast))
    return layoutSlide(pres.slides[1], DEFAULT_THEME)
  }

  it("図解は右半分にあり、右端は本文と同じマージンで揃う", async () => {
    const result = await layoutFor(deck())
    const svg = result.shapeBoxes?.find((s) => s.shapeType === "svg")
    expect(svg).toBeDefined()
    expect(svg!.x).toBeGreaterThan(SLIDE_WIDTH / 2)
    const panel = result.shapeBoxes!.find((s) => s.shapeType === "rect")!
    expect(panel.x + panel.w).toBeCloseTo(SLIDE_WIDTH - MARGIN_X, 5)
  })

  it("どのテキストも図解の矩形に食い込まない", async () => {
    // タイトルと takeaway は全幅なので「左半分に収まる」では言えない。
    // 言いたいのは重ならないこと — 縦か横のどちらかで必ず離れている
    const result = await layoutFor(deck({ takeaway: "関連: [[別のパターン2]]" }))
    const svg = result.shapeBoxes!.find((s) => s.shapeType === "svg")!
    expect(result.textBoxes.length).toBeGreaterThanOrEqual(8) // タイトル + 3節×2 + takeaway
    for (const box of result.textBoxes) {
      const apart =
        box.x + box.w <= svg.x + 1e-6 ||
        box.x >= svg.x + svg.w - 1e-6 ||
        box.y + box.h <= svg.y + 1e-6 ||
        box.y >= svg.y + svg.h - 1e-6
      expect(apart, `テキスト "${box.text ?? ""}" が図解に重なっている`).toBe(true)
    }
  })

  it("takeaway があると図解はその上で止まる", async () => {
    const result = await layoutFor(deck({ takeaway: "関連: [[別のパターン]]" }))
    const svg = result.shapeBoxes!.find((s) => s.shapeType === "svg")!
    const takeaway = result.textBoxes[result.textBoxes.length - 1]
    expect(svg.y + svg.h).toBeLessThanOrEqual(takeaway.y)
  })

  it("SVG の図形はテキストを運ばない", async () => {
    // 運んだ瞬間に3者比較の対象になるが、PPTX は addImage で描くのでテキストを持てず、
    // --verify が必ず食い違う。shape-keys.ts の deco: 除外はこれが前提
    const result = await layoutFor(deck())
    const svg = result.shapeBoxes!.find((s) => s.shapeType === "svg")!
    expect(svg.text).toBeUndefined()
  })

  it("図解の図形は3者比較の対象に入らない", async () => {
    const ast = await Effect.runPromise(parseMarkdown(deck()))
    const pres = await Effect.runPromise(validatePresentation(ast))
    const inventory = await Effect.runPromise(slidesToInventory(pres.slides, DEFAULT_THEME))
    const keys = Object.values(inventory).flatMap((slide) => Object.keys(slide))
    expect(keys.length).toBeGreaterThan(0)
    expect(keys.filter(isDecoKey)).toEqual([])
    expect(keys.some((k) => k.startsWith("shape-box-"))).toBe(false)
  })
})

describe("WikiPattern — Wiki との接続", () => {
  it("本文と takeaway の [[…]] が参照として拾われる", async () => {
    // 拾えるのは buildSectionBoxes が richText を作るから。自前で TextBox を組むと
    // 見た目は同じままリンクだけが消える
    const ast = await Effect.runPromise(parseMarkdown(deck({ takeaway: "関連: [[別のパターン2]]" })))
    const pres = await Effect.runPromise(validatePresentation(ast))
    const refs = collectRefs(
      {
        globalId: "d/種ノート",
        deckSlug: "d",
        localId: "種ノート",
        title: "種ノート",
        slide: pres.slides[1],
        globalIndex: 1,
        deckIndex: 1,
      },
      DEFAULT_THEME
    )
    expect(refs).toContain("別のパターン")
    expect(refs).toContain("別のパターン2")
  })

  it("SVG の長さは文字数上限に数えない", async () => {
    // 図を描き込むほど「文字数超過」で落ちるのでは、上限が守らせたいものとずれる
    const huge = "<svg xmlns='http://www.w3.org/2000/svg'>" + "<rect x='1'/>".repeat(400) + "</svg>"
    const result = await Effect.runPromiseExit(
      parseMarkdown(deck({ diagram: "\n```pattern-diagram\n" + huge + "\n```\n" })).pipe(
        Effect.flatMap(validatePresentation)
      )
    )
    expect(result._tag).toBe("Success")
  })
})

describe("配布しているデッキの図解", () => {
  const WIKI_DIR = join(__dirname, "..", "doc", "wiki")
  const decks = readdirSync(WIKI_DIR)
    .filter((f) => f.startsWith("patterns-") && f.endsWith(".md"))
    .map((f) => ({ name: f, body: readFileSync(join(WIKI_DIR, f), "utf-8") }))

  it("パターンのデッキが見つかる", () => {
    expect(decks.length).toBeGreaterThan(0)
  })

  it.each(decks.map((d) => d.name))("%s の SVG は DOM を壊す書き方をしていない", (name) => {
    const body = decks.find((d) => d.name === name)!.body
    const fences = [...body.matchAll(/```pattern-diagram\n([\s\S]*?)\n```/g)].map((m) => m[1])
    expect(fences.length).toBeGreaterThan(0)

    for (const svg of fences) {
      // id= はホバープレビューが cloneNode したときに重複する（CLAUDE.md がスライド div に
      // id を置かないのと同じ理由）。<div> は html-inspector が div を数えて要素の範囲を
      // 決めているので、入れ子になるとその先の抽出が丸ごとずれる。
      // <style> は文書スコープなのでサイト全体に漏れる。
      expect(svg, `${name}: id= は使わない`).not.toMatch(/\sid=/)
      expect(svg, `${name}: <defs> は使わない`).not.toMatch(/<defs/)
      expect(svg, `${name}: <style> は使わない`).not.toMatch(/<style/)
      expect(svg, `${name}: <div> は使わない`).not.toMatch(/<div/)
      expect(svg, `${name}: <foreignObject> は使わない`).not.toMatch(/<foreignObject/)
      // PPTX は SVG を単体の文書として base64 化するので xmlns が要る
      expect(svg, `${name}: xmlns が要る`).toMatch(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)
    }
  })
})
