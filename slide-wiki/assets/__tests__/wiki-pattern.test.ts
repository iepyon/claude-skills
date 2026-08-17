import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { readdirSync, readFileSync } from "fs"
import { join } from "path"
import { parseMarkdown } from "../src/parser/index.js"
import { validatePresentation } from "../src/schema/validation.js"
import { layoutSlide, boxPlainText } from "../src/renderer/layout/index.js"
import { detectOverflow } from "../src/renderer/layout/overflow.js"
import { validateLayout } from "../src/renderer/layout/validate-layout.js"
import type { LayoutResult, ShapeBox } from "../src/renderer/layout/types.js"
import { collectRefs, type CollectedRef } from "../src/renderer/wiki/link-graph.js"

/** collectRefs は解決の鍵と原文の綴りを返す。ここで見たいのは鍵のほうだけ */
const mapRefs = (refs: readonly CollectedRef[]): string[] => refs.map((r) => r.ref)
import { lintSource } from "../src/ontology/lint.js"
import { DEFAULT_THEME } from "../src/schema/theme.js"
import { SLIDE_WIDTH, SLIDE_HEIGHT, MARGIN_X, MARGIN_Y, CONTENT_START_Y } from "../src/constants.js"
import { isDecoKey } from "../src/shape-keys.js"
import { slidesToInventory } from "../src/tools/inventory.js"
import { roughenSvg } from "../src/tools/roughen-svg.js"
import { contentBox, trimSvg } from "../src/tools/trim-svg.js"
import { WP_PANEL_SHIFT_X } from "../src/plugins/wiki-pattern/constants.js"
import type { ContentSlide } from "../src/schema/presentation.js"
import type { WikiPatternLayout } from "../src/plugins/wiki-pattern/schema.js"

/** 図解のファイルはリポジトリに実在する。参照を解く起点はこのディレクトリ */
const FIXTURE_DIR = join(__dirname, "fixtures")
const SAMPLE = "diagrams/sample.svg"
const SVG = readFileSync(join(FIXTURE_DIR, SAMPLE), "utf-8").trimEnd()

/**
 * 節を任意の順で書けるように、本文はテンプレートから組む。
 * `diagram` は参照先の**パス**。`false` を渡すと参照ごと省く
 * （「参照が無い」と「参照先が読めない」は別の話なので、区別できる形にしてある）。
 */
const deck = (
  opts: {
    sections?: string
    diagram?: string | false
    takeaway?: string
    source?: string
  } = {}
): string => {
  const sections =
    opts.sections ??
    [
      "### いつ・なにが困るか",
      "きっかけ。",
      "",
      "**困りごと。**",
      "### そこで",
      "打ち手は [別のパターン](d.md#別のパターン)。",
    ].join("\n")
  const image = opts.diagram === false ? "" : `\n![種ノート](${opts.diagram ?? SAMPLE})\n`
  const takeaway = opts.takeaway ? `\n<!--takeaway-->\n${opts.takeaway}\n` : ""
  const source = opts.source ? `\n<!--source-->\n${opts.source}\n` : ""
  return `# テスト

---

## 種ノート
<!--id:種ノート-->
<!--pattern-->
${sections}
${image}${source}${takeaway}`
}

/** parse → validate。4箇所で書き下すと、テストが本題以外の差で見分けにくくなる */
const present = (markdown: string) =>
  Effect.runPromise(
    parseMarkdown(markdown, { baseDir: FIXTURE_DIR }).pipe(Effect.flatMap(validatePresentation))
  )

const layoutOf = async (markdown: string): Promise<WikiPatternLayout> => {
  const pres = await present(markdown)
  const slide = pres.slides[1] as ContentSlide
  expect(slide.layout._tag).toBe("WikiPattern")
  return slide.layout as unknown as WikiPatternLayout
}

describe("WikiPattern — 2見出しの左段", () => {
  it("いつ・なにが困るか と そこで の2件をそろえる", async () => {
    const layout = await layoutOf(
      deck({ sections: ["### いつ・なにが困るか", "きっかけ。", "### そこで", "打ち手。"].join("\n") })
    )
    expect(layout.sections.map((s) => s.heading)).toEqual(["いつ・なにが困るか", "そこで"])
    expect(layout.sections[0].body).toBe("きっかけ。")
  })

  it("書いた順ではなく語彙の宣言順に積む", async () => {
    // 宣言は いつ・なにが困るか → そこで。読む順が書く順に引きずられてはいけない
    const layout = await layoutOf(
      deck({
        sections: ["### そこで", "あとで書いた。", "### いつ・なにが困るか", "さきに書いた。"].join("\n"),
      })
    )
    expect(layout.sections.map((s) => s.heading)).toEqual(["いつ・なにが困るか", "そこで"])
    expect(layout.sections[0].body).toBe("さきに書いた。")
  })

  it("別名の見出しも受理する（宣言の aliases）", async () => {
    // 3節だった頃の 状況 / 解決 は別名として残してある（外のデッキを折らないため）
    const layout = await layoutOf(
      deck({ sections: ["### 状況", "A。", "### どうする", "B。"].join("\n") })
    )
    expect(layout.sections).toHaveLength(2)
    expect(layout.sections.map((s) => s.body)).toEqual(["A。", "B。"])
  })

  it("節の中の空行で段落が割れ、2段落目からは見出しを持たない", async () => {
    // 場面と困りごとを1つの見出しに束ねたまま、読み手には別の塊として見せる仕掛け。
    // 隙間は節と節の隙間（WP_SECTION_GAP）がそのまま担う
    const layout = await layoutOf(deck())
    expect(layout.sections.map((s) => s.heading)).toEqual(["いつ・なにが困るか", undefined, "そこで"])
    expect(layout.sections.map((s) => s.body)).toEqual([
      "きっかけ。",
      "**困りごと。**",
      "打ち手は [別のパターン](d.md#別のパターン)。",
    ])
  })

  it("段落の中の改行は段落を割らない", async () => {
    const layout = await layoutOf(
      deck({ sections: ["### 状況", "1行目。\n2行目。", "### そこで", "打ち手。"].join("\n") })
    )
    expect(layout.sections).toHaveLength(2)
    expect(layout.sections[0].body).toBe("1行目。\n2行目。")
  })

  it("節の末尾に残った空行は捨てる", async () => {
    // 図解や <!--source--> の前の空行がそのまま残ると、空の段落が1つ増えて
    // そのぶん本文の高さが削られる。ハンドラは節の終わりを知らないので converter が落とす
    const layout = await layoutOf(
      deck({ sections: ["### 状況", "きっかけ。", "### そこで", "打ち手。", ""].join("\n") })
    )
    expect(layout.sections).toHaveLength(2)
    expect(layout.sections[1].body).toBe("打ち手。")
  })

  it("語彙外の見出しは lint がエラーで止める", () => {
    // 3節だった頃の `### 問題` を書き残すと、描かれないまま公開されてしまう。
    // 節が2つしかないレイアウトでは、1つ落ちれば残りは片肺だと分かりきっている
    const diagnostics = lintSource(
      deck({ sections: ["### 状況", "A。", "### 問題", "B。", "### そこで", "C。"].join("\n") })
    )
    const unknown = diagnostics.filter((d) => d.message.includes("問題"))
    expect(unknown.map((d) => d.level)).toContain("error")
  })
})

describe("WikiPattern — 図解", () => {
  it("参照先のファイルの中身を持つ", async () => {
    const layout = await layoutOf(deck())
    expect(layout.diagram).toContain(`<rect x="10" y="10"`)
    expect(layout.diagram).toContain(`viewBox="0 0 340 320"`)
  })

  it("埋め込むときは幅と高さを枠いっぱいに読み替える", async () => {
    // ファイル側は md で <img> として読まれるときのために実寸を名乗る。
    // スライドでは右カラムの枠に合わせて伸びてほしいので、ここで 100% に置き換わる
    expect(SVG).toMatch(/<svg[^>]*\swidth="340"/)
    const layout = await layoutOf(deck())
    expect(layout.diagram).toMatch(/^<svg width="100%" height="100%"/)
    expect(layout.diagram).not.toMatch(/width="340"/)
  })

  it("参照が無ければ変換で止まる", async () => {
    // 「必ず」を運用の心がけにしない。宣言（cardinality: 1）を lint が報告し、
    // 通り抜けようとしてもここで落ちる
    const result = await Effect.runPromiseExit(
      parseMarkdown(deck({ diagram: false }), { baseDir: FIXTURE_DIR })
    )
    expect(result._tag).toBe("Failure")
    expect(JSON.stringify(result)).toContain(".svg")
  })

  it("読めないパスは行番号つきでその場で落ちる", async () => {
    // 後段まで持ち越すと、報告できる場所から行番号が消える
    const result = await Effect.runPromiseExit(
      parseMarkdown(deck({ diagram: "diagrams/ない.svg" }), { baseDir: FIXTURE_DIR })
    )
    expect(result._tag).toBe("Failure")
    expect(JSON.stringify(result)).toContain("diagrams/ない.svg")
  })

  it("宣言された拡張子でない参照は受け付けない", async () => {
    // 埋め込めるのは SVG だけ。読めるつもりで .png を書いたら、その場で言う
    const result = await Effect.runPromiseExit(
      parseMarkdown(deck({ diagram: "diagrams/sample.png" }), { baseDir: FIXTURE_DIR })
    )
    expect(result._tag).toBe("Failure")
    expect(JSON.stringify(result)).toContain(".svg")
  })

  it("lint が参照の欠落を slot-cardinality として報告する", () => {
    const diagnostics = lintSource(deck({ diagram: false }))
    expect(diagnostics.map((d) => d.check)).toContain("slot-cardinality")
    expect(diagnostics.find((d) => d.check === "slot-cardinality")?.message).toContain(".svg")
  })

  it("図解のあるスライドには診断が出ない", () => {
    expect(lintSource(deck())).toEqual([])
  })

  it("画像を読まないレイアウトに置かれた参照は lint が報告する", () => {
    // `####` と同じ「黙って落ちる」種類の間違い。描かれないことを書き手に返す
    const diagnostics = lintSource("## ふつうのスライド\n### 見出し\n本文\n\n![図](a.svg)")
    expect(diagnostics.map((d) => d.message)).toContainEqual(
      expect.stringContaining("画像を読まない")
    )
  })
})

describe("WikiPattern — 座標", () => {
  const layoutFor = async (markdown: string) =>
    layoutSlide((await present(markdown)).slides[1], DEFAULT_THEME)

  const svgBox = (result: LayoutResult): ShapeBox =>
    result.shapeBoxes!.find((s) => s.shapeType === "svg")!

  it("図解は右半分にあり、右マージンから WP_PANEL_SHIFT_X ぶん左へ寄る", async () => {
    // 右端を右マージンに接させると、本文の行は左段を使い切らないので図だけが
    // 右端に貼り付いて見える。寄せたぶんは右の余白になる
    const result = await layoutFor(deck())
    const svg = svgBox(result)
    expect(svg.x).toBeGreaterThan(SLIDE_WIDTH / 2)
    const panel = result.shapeBoxes!.find((s) => s.shapeType === "rect")!
    expect(panel.x + panel.w).toBeCloseTo(SLIDE_WIDTH - MARGIN_X - WP_PANEL_SHIFT_X, 5)
  })

  it("左段は全角26字が折り返さない幅を保つ", async () => {
    // 26字は ontology.yaml の guidance にある書き方の規約で、左段はそれを容れる器。
    // 図を広げるために左を削るときの下限がこれ（下回れば行が折れ、1em で数える
    // 高さの見積りと1行ずれる）。全角1字の送りはフォントで揺れるので、
    // この環境の実測 1.02em に余裕を足した 1.05em で見る
    const result = await layoutFor(deck())
    const body = result.textBoxes.find((b) => b.fontSize === DEFAULT_THEME.wikiPattern.bodySize)!
    const advance = (DEFAULT_THEME.wikiPattern.bodySize / 72) * 1.05
    expect(body.w).toBeGreaterThanOrEqual(26 * advance)
  })

  it("寄せても、全角26字を使い切った行が図解に触らない", async () => {
    // 寄せられる量の上限を決めているのはこれ（constants.ts の WP_PANEL_SHIFT_X）。
    // 左段のテキストの箱の右端と下敷きの左端が、この順で並んでいること
    const result = await layoutFor(deck())
    const panel = result.shapeBoxes!.find((s) => s.shapeType === "rect")!
    // 全幅の箱（タイトル）は左段の話ではないので外す
    const body = result.textBoxes.filter((b) => b.w < SLIDE_WIDTH - 2 * MARGIN_X - 0.01)
    expect(body.length).toBeGreaterThan(0)
    for (const box of body) {
      expect(box.x + box.w, "本文の箱が図解に食い込んでいる").toBeLessThanOrEqual(panel.x)
    }
  })

  it("下敷きは図解の縦横比で組まれ、上は左段の最初の見出しにそろう", async () => {
    // 列いっぱいに伸ばすと、HTML は preserveAspectRatio で図を縮めて上下に帯を作り、
    // PPTX は addImage が枠に引き伸ばして図を歪ませる。原因は同じ「枠と図の比の食い違い」
    const result = await layoutFor(deck())
    const panel = result.shapeBoxes!.find((s) => s.shapeType === "rect")!
    const svg = svgBox(result)
    const aspect = 340 / 320 // fixtures/diagrams/sample.svg の viewBox
    expect(svg.w / svg.h).toBeCloseTo(aspect, 5)

    // 縦中央に置いていた頃は、図の高さがページごとに違うと上の線もページごとに動いた。
    // そろえる先は最初の見出しの箱（buildSectionBoxes が積み始める線）
    const heading = result.textBoxes.find(
      (b) => b.fontSize === DEFAULT_THEME.wikiPattern.headingSize
    )!
    expect(panel.y).toBeCloseTo(heading.y, 5)
    expect(panel.y + panel.h).toBeLessThanOrEqual(SLIDE_HEIGHT - MARGIN_Y + 1e-6)
  })

  it("縦長の図解では下敷きが列より細くなり、左右中央に置かれる", async () => {
    // 高さだけを比に合わせると、列いっぱいの幅のまま縦だけ縮む＝下敷きのほうが横長になる。
    // 幅でも収めているので、余るのは左右になり、その余りは等しく割れる
    const result = await layoutFor(deck({ diagram: "diagrams/tall.svg" }))
    const panel = result.shapeBoxes!.find((s) => s.shapeType === "rect")!
    const svg = svgBox(result)
    expect(svg.w / svg.h).toBeCloseTo(240 / 400, 5) // fixtures/diagrams/tall.svg の viewBox

    // 列の下端まで使い切り（高さが先に尽きる）、列の中で左右中央に来る
    expect(panel.y).toBeCloseTo(CONTENT_START_Y, 5)
    expect(panel.y + panel.h).toBeCloseTo(SLIDE_HEIGHT - MARGIN_Y, 5)
    // 列は WP_PANEL_SHIFT_X ぶん左へ寄っているので、その位置で左右の余りを比べる
    const columnRight = SLIDE_WIDTH - MARGIN_X - WP_PANEL_SHIFT_X
    expect(columnRight - (panel.x + panel.w)).toBeGreaterThan(0.1)
    const wide = await layoutFor(deck())
    const columnLeft = wide.shapeBoxes!.find((s) => s.shapeType === "rect")!.x
    expect(panel.x - columnLeft).toBeCloseTo(columnRight - (panel.x + panel.w), 5)
  })

  it("viewBox の無い図解では下敷きが列いっぱいのままになる", async () => {
    // 形が分からない図を勝手な比の枠に入れると、かえって余白が増える
    const result = await layoutFor(deck({ diagram: "diagrams/no-viewbox.svg" }))
    const panel = result.shapeBoxes!.find((s) => s.shapeType === "rect")!
    expect(panel.y).toBeCloseTo(CONTENT_START_Y, 5)
    expect(panel.y + panel.h).toBeCloseTo(SLIDE_HEIGHT - MARGIN_Y, 5)
  })

  it("どのテキストも図解の矩形に食い込まない", async () => {
    // タイトルは全幅なので「左半分に収まる」では言えない。
    // 言いたいのは重ならないこと — 縦か横のどちらかで必ず離れている
    const result = await layoutFor(deck({ source: "典拠をここに置く。" }))
    const svg = svgBox(result)
    expect(result.textBoxes.length).toBeGreaterThanOrEqual(7) // タイトル + 見出し2 + 段落3 + 出典
    for (const box of result.textBoxes) {
      const apart =
        box.x + box.w <= svg.x + 1e-6 ||
        box.x >= svg.x + svg.w - 1e-6 ||
        box.y + box.h <= svg.y + 1e-6 ||
        box.y >= svg.y + svg.h - 1e-6
      expect(apart, `テキスト "${box.text ?? ""}" が図解に重なっている`).toBe(true)
    }
  })

  it("SVG の図形はテキストを運ばない", async () => {
    // 運んだ瞬間に3者比較の対象になるが、PPTX は addImage で描くのでテキストを持てず、
    // --verify が必ず食い違う。shape-keys.ts の deco: 除外はこれが前提
    const result = await layoutFor(deck())
    const svg = svgBox(result)
    expect(svg.text).toBeUndefined()
  })

  it("図解の図形は3者比較の対象に入らない", async () => {
    const pres = await present(deck())
    const inventory = await Effect.runPromise(slidesToInventory(pres.slides, DEFAULT_THEME))
    const keys = Object.values(inventory).flatMap((slide) => Object.keys(slide))
    expect(keys.length).toBeGreaterThan(0)
    expect(keys.filter(isDecoKey)).toEqual([])
    expect(keys.some((k) => k.startsWith("shape-box-"))).toBe(false)
  })
})

describe("WikiPattern — Wiki との接続", () => {
  it("本文のリンクが参照として拾われる", async () => {
    // 拾えるのは buildSectionBoxes が richText を作るから。自前で TextBox を組むと
    // 見た目は同じままリンクだけが消える
    const pres = await present(deck())
    const refs = mapRefs(collectRefs(
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
    ))
    expect(refs).toContain("d/別のパターン")
  })

  it("SVG の長さは文字数上限に数えない", async () => {
    // 図を描き込むほど「文字数超過」で落ちるのでは、上限が守らせたいものとずれる
    const huge = readFileSync(join(FIXTURE_DIR, "diagrams", "huge.svg"), "utf-8")
    expect(huge.length).toBeGreaterThan(1000)
    await expect(present(deck({ diagram: "diagrams/huge.svg" }))).resolves.toBeDefined()
  })
})

/**
 * SVG に書いてはいけないものと、その理由。
 *
 * どれも静かに壊れる種類の間違いで、生成物を見ても気づけない:
 * `id=` はホバープレビューが cloneNode したときに重複する（CLAUDE.md がスライドの div に
 * id を置かないのと同じ理由）。`<div>` は html-inspector が div を数えて要素の範囲を
 * 決めているので、入れ子になるとその先の抽出が丸ごとずれる。`<style>` は文書スコープなので
 * サイト全体に漏れる。
 */
const FORBIDDEN: ReadonlyArray<readonly [RegExp, string]> = [
  [/\sid=/, "id= は使わない"],
  [/<defs/, "<defs> は使わない"],
  [/<style/, "<style> は使わない"],
  [/<div/, "<div> は使わない"],
  [/<foreignObject/, "<foreignObject> は使わない"],
]

describe("図解を崩す道具", () => {
  const wrap = (inner: string) =>
    `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`

  it("コメントの中に書かれた図形の名前には触らない", () => {
    // 図の意図を注記に書くと、そこに出てくる `<rect>` が変換されて文が壊れた。
    // 読み手に向けた文を図形として扱ってはいけない（`ラフで出す.svg` で起きた）
    const note = "<!-- ここは <rect> や <line> で書かず path で引く -->"
    expect(roughenSvg(wrap(note), "t.svg")).toContain(note)
  })

  it("同じ形を2度引くとき、角は共有して反りだけを変える", () => {
    // 2度とも角を引き直すと、線が2本ではなく箱が2つに見える
    const out = roughenSvg(wrap(`<rect x="2" y="2" width="16" height="16" fill="none" stroke="#000"/>`), "t.svg")
    const starts = [...out.matchAll(/d="(M[\d.]+ [\d.]+)/g)].map((m) => m[1])
    expect(starts).toHaveLength(2)
    expect(starts[0]).toBe(starts[1])
  })

  it("走らせ直しても同じ絵が出る（種はファイル名から）", () => {
    const src = wrap(`<line x1="1" y1="1" x2="19" y2="19" stroke="#000"/>`)
    expect(roughenSvg(src, "t.svg")).toBe(roughenSvg(src, "t.svg"))
    expect(roughenSvg(src, "u.svg")).not.toBe(roughenSvg(src, "t.svg"))
  })

  it("崩した結果をもう一度通しても変わらない（冪等）", () => {
    const once = roughenSvg(wrap(`<circle cx="10" cy="10" r="6" fill="none" stroke="#000"/>`), "t.svg")
    expect(roughenSvg(once, "t.svg")).toBe(once)
  })
})

describe("図解の枠を詰める道具", () => {
  /** 200x200 の枠の真ん中あたりに 40x40 だけ描いた図。周りは全部あき */
  const spacious = (inner = `<path d="M80 80 L120 80 L120 120 L80 120 Z" fill="none" stroke="#000" stroke-width="2"/>`) =>
    `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`

  const viewBoxOf = (svg: string) =>
    svg
      .match(/viewBox="([^"]+)"/)![1]
      .trim()
      .split(/[\s,]+/)
      .map(Number)

  it("枠を中身まで詰め、絵が何倍になるかを返す", () => {
    const { svg, scale } = trimSvg(spacious())
    const [, , w, h] = viewBoxOf(svg)
    expect(w).toBeLessThan(60) // 40 + 余白ぶん
    expect(scale).toBeCloseTo(200 / w!, 5)
    expect(h).toBeGreaterThan(0)
  })

  it("縦横比は変えない（下敷きの形がページごとに変わらないように）", () => {
    const { svg } = trimSvg(spacious())
    const [, , w, h] = viewBoxOf(svg)
    expect(w! / h!).toBeCloseTo(1, 2)
  })

  it("実寸（width / height）も一緒に書き換える", () => {
    const { svg } = trimSvg(spacious())
    const [, , w, h] = viewBoxOf(svg)
    expect(svg).toContain(`width="${w}"`)
    expect(svg).toContain(`height="${h}"`)
  })

  it("詰めた結果をもう一度通しても変わらない（冪等）", () => {
    const once = trimSvg(spacious()).svg
    expect(trimSvg(once).svg).toBe(once)
  })

  it("枠からはみ出した中身は、枠を広げて収める", () => {
    // 切れている図は、生成物を開いても端の線が消えているだけで気づきにくい
    const clipped = spacious(
      `<path d="M-40 100 L240 100" fill="none" stroke="#000" stroke-width="2"/>`
    )
    const [x, , w] = viewBoxOf(trimSvg(clipped).svg)
    expect(x).toBeLessThanOrEqual(-40)
    expect(x! + w!).toBeGreaterThanOrEqual(240)
  })

  it("字は書いてある幅より広く見て、切らない側に外す", () => {
    // 読む人のフォントは測った環境より広いことがある。狭く見積もると字が切れる
    const text = `<text x="100" y="100" text-anchor="middle" font-family="sans-serif" font-size="10">あいうえお</text>`
    const [x, , w] = viewBoxOf(trimSvg(spacious(text)).svg)
    expect(x).toBeLessThan(100 - 25) // 全角5字 = 50 の半分より外
    expect(x! + w!).toBeGreaterThan(100 + 25)
  })

  it("viewBox を名乗らない図には触らない", () => {
    const noViewBox = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><path d="M80 80 L120 120" stroke="#000"/></svg>`
    expect(trimSvg(noViewBox).svg).toBe(noViewBox)
  })

  it("中身の無い図には触らない", () => {
    const empty = `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"></svg>`
    expect(trimSvg(empty).svg).toBe(empty)
  })
})

describe("配布しているデッキの図解", () => {
  const WIKI_DIR = join(__dirname, "..", "doc", "wiki")
  const DIAGRAMS_DIR = join(WIKI_DIR, "diagrams")

  const deckNames = readdirSync(WIKI_DIR)
    .filter((f) => f.startsWith("patterns-") && f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""))

  /** 実際に配っている図解のファイル。デッキごとに1ディレクトリ */
  const diagrams = deckNames.flatMap((deck) =>
    readdirSync(join(DIAGRAMS_DIR, deck))
      .filter((f) => f.endsWith(".svg"))
      .map((f) => ({
        name: `${deck}/${f}`,
        svg: readFileSync(join(DIAGRAMS_DIR, deck, f), "utf-8"),
      }))
  )

  it("パターンのデッキと図解のファイルが見つかる", () => {
    expect(deckNames.length).toBeGreaterThan(0)
    expect(diagrams.length).toBeGreaterThan(0)
  })

  it("どのデッキも図解を md に書き込んでいない", () => {
    // md に SVG を書くと、GitHub で開いた読み手にはソースが見えるだけになる。
    // 外部ファイルにした意味がそこにあるので、戻っていないことを見張る
    for (const deck of deckNames) {
      const body = readFileSync(join(WIKI_DIR, `${deck}.md`), "utf-8")
      expect(body, `${deck}.md: SVG は別ファイルに置く`).not.toContain("<svg")
      expect(body, `${deck}.md: 図解は ![…](….svg) で参照する`).toMatch(/!\[[^\]]*\]\([^)]+\.svg\)/)
    }
  })

  it.each(diagrams)("$name は DOM を壊す書き方をしていない", ({ name, svg }) => {
    for (const [pattern, why] of FORBIDDEN) {
      expect(svg, `${name}: ${why}`).not.toMatch(pattern)
    }
    // PPTX は SVG を単体の文書として base64 化するので xmlns が要る
    expect(svg, `${name}: xmlns が要る`).toMatch(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)
  })

  /**
   * `ラフで出す` は「粗さが『ここは決めていない』の合図になる」と言っている。
   * 定規で引いた線でできた図は、本文が道すじと書いても「これが唯一の実装」に読まれる。
   *
   * だからこの決まりは文章ではなく検査で持つ（`実行可能な規約` がこのサイトのパターンで、
   * 読ませるだけの決まりは破られて、気づくのは後だと言っている）。
   * 揺らし直すのは `npx tsx src/tools/roughen-svg.ts`。
   *
   * **コメントは外してから見る。** 図の意図を注記に書くと `<rect>` に言及したくなる
   * （`ラフで出す.svg` が「rect で書くと崩される」と書いている）。読み手に向けた文を
   * markup として数えると、説明を書いたぶんだけ検査が落ちる。道具のほうも同じ理由で
   * コメントを避けている。
   */
  it.each(diagrams)("$name に定規で引いた線が残っていない", ({ name, svg }) => {
    const markup = svg.replace(/<!--[\s\S]*?-->/g, "")
    for (const tag of ["rect", "line", "circle", "ellipse", "polygon", "polyline"]) {
      expect(
        markup,
        `${name}: <${tag}> は真っ直ぐすぎる。npx tsx src/tools/roughen-svg.ts を通す`
      ).not.toMatch(new RegExp(`<${tag}\\b`))
    }
  })

  it.each(diagrams)("$name は実寸を名乗る", ({ name, svg }) => {
    // md から `<img>` として読まれるときの表示サイズになる。実寸が無い SVG は
    // 既定の大きさに押し込められて字が潰れる（埋め込み側では 100% に読み替わる）
    const open = svg.match(/<svg\b[^>]*>/)![0]
    const [, , vw, vh] = open.match(/viewBox="([^"]+)"/)![1].trim().split(/[\s,]+/).map(Number)

    expect(Number(open.match(/\swidth="(\d+)"/)?.[1]), `${name}: width が viewBox と食い違う`).toBe(vw)
    expect(Number(open.match(/\sheight="(\d+)"/)?.[1]), `${name}: height が viewBox と食い違う`).toBe(vh)
  })

  /**
   * 図は下敷きいっぱいに描かれるので、**枠に残した余白はそのまま絵の小ささになる。**
   * 340x320 の canvas に 283x248 しか描いていない図は、同じ場所に 12% 小さく出る。
   *
   * 詰め直すのは `npx tsx src/tools/trim-svg.ts`（中身から枠を決めるので冪等）。
   * 枠を広げる側にも効くので、**中身が枠からはみ出して切れている図もここで落ちる**。
   */
  it.each(diagrams)("$name は枠が中身に寄っている", ({ name, svg }) => {
    expect(
      trimSvg(svg).svg,
      `${name}: 枠と中身がずれている。npx tsx src/tools/trim-svg.ts を通す`
    ).toBe(svg)
  })

  it.each(diagrams)("$name は中身が枠に収まっている", ({ name, svg }) => {
    // 切れているかどうかは生成物を開いても分かりにくい（端の線や字が静かに消える）
    const box = contentBox(svg)!
    const [vx, vy, vw, vh] = svg
      .match(/viewBox="([^"]+)"/)![1]
      .trim()
      .split(/[\s,]+/)
      .map(Number)
    expect(box.minX, `${name}: 中身が枠の左に出ている`).toBeGreaterThanOrEqual(vx!)
    expect(box.minY, `${name}: 中身が枠の上に出ている`).toBeGreaterThanOrEqual(vy!)
    expect(box.maxX, `${name}: 中身が枠の右に出ている`).toBeLessThanOrEqual(vx! + vw!)
    expect(box.maxY, `${name}: 中身が枠の下に出ている`).toBeLessThanOrEqual(vy! + vh!)
  })

  /**
   * Wiki のパターンは隣り合わせで読まれるので、**ページごとに文字の大きさが違ってはいけない。**
   *
   * 破れ方はいつも同じ形をしている: `dispatchLayout` は収まらないスライドのテーマ文字サイズを
   * 段階的に縮めるので、左段の取り分が細ると本文の長いページだけが小さく描かれる。
   * 実際そうなっていた（同じデッキの中に 16/14pt と 11/10pt が混在していた）。
   * だから見るのは配布中の実デッキで、固定の入力ではない — 本文を書き足したときに気づけるように。
   */
  describe("パターンの文字の大きさ", () => {
    const patternDecks = deckNames.map((deck) => ({
      deck,
      md: readFileSync(join(WIKI_DIR, `${deck}.md`), "utf-8"),
    }))

    const layoutsOfDeck = async (md: string) => {
      const pres = await Effect.runPromise(
        parseMarkdown(md, { baseDir: WIKI_DIR }).pipe(Effect.flatMap(validatePresentation))
      )
      return pres.slides
        .filter((s) => s._tag === "ContentSlide" && (s as ContentSlide).layout._tag === "WikiPattern")
        .map((s) => ({ title: (s as ContentSlide).title, result: layoutSlide(s, DEFAULT_THEME) }))
    }

    it("どのデッキのどのパターンも theme.wikiPattern の大きさで描かれる", async () => {
      // 「どのページも同じ」だけでは足りない — 全ページが一様に縮んでも通ってしまう。
      // 宣言した絶対値で見ることで、揃っていることと縮んでいないことを同時に押さえる
      let pages = 0
      for (const { deck, md } of patternDecks) {
        for (const { title, result } of await layoutsOfDeck(md)) {
          pages++
          const where = `${deck}/${title}`
          const sizes = result.textBoxes.map((b) => b.fontSize)
          expect(sizes, `${where}: 見出しが ${DEFAULT_THEME.wikiPattern.headingSize}pt でない`).toContain(
            DEFAULT_THEME.wikiPattern.headingSize
          )
          expect(sizes, `${where}: 本文が ${DEFAULT_THEME.wikiPattern.bodySize}pt でない`).toContain(
            DEFAULT_THEME.wikiPattern.bodySize
          )
          // 2つの見出しと、場面・困りごと・打ち手の3段落が、どれも縮んでいないこと
          // （タイトルは全幅なので、幅で左段だけを取り出せる）
          //
          // 出典も左段の幅なのでここに入る。**3つとも theme.wikiPattern から採る**ので、
          // 揃っていることを絶対値で見るこの検査の趣旨は変わらない
          // （contentSlide 由来のサイズが混ざったら、それは縮小に入った証拠）
          const fullWidth = SLIDE_WIDTH - 2 * MARGIN_X
          const left = result.textBoxes.filter((b) => b.w < fullWidth - 0.01)
          // 出典は書いてあるデッキだけに出るので、完全一致では表せない。
          // 「この3つ以外が混ざっていない」を見る（見出しと本文が在ることは上で押さえた）
          const allowed = [
            DEFAULT_THEME.wikiPattern.headingSize,
            DEFAULT_THEME.wikiPattern.bodySize,
            DEFAULT_THEME.wikiPattern.sourceSize,
          ]
          for (const box of left) {
            expect(
              allowed,
              `${where}: 左段に想定外の文字サイズ ${box.fontSize}pt がある`
            ).toContain(box.fontSize)
          }
          const headings = left.filter((b) => b.fontSize === DEFAULT_THEME.wikiPattern.headingSize)
          const paragraphs = left.filter((b) => b.fontSize === DEFAULT_THEME.wikiPattern.bodySize)
          expect(headings.length, `${where}: 左段の見出しが2つ無い`).toBe(2)
          expect(
            paragraphs.length,
            `${where}: 段落が3つ無い（場面・困りごと・打ち手）`
          ).toBeGreaterThanOrEqual(3)
          expect(detectOverflow(result), `${where} がはみ出している`).toEqual([])
        }
      }
      expect(pages).toBeGreaterThan(1)
    })
  })
})

describe("WikiPattern — 出典", () => {
  const layoutFor = async (markdown: string) =>
    layoutSlide((await present(markdown)).slides[1], DEFAULT_THEME)

  /** 配布中のパターンと同じ分量（2行 + 3行 + 3行）。出典の確保がここに効く */
  const EIGHT_LINES = [
    "### いつ・なにが困るか",
    "名前を、意味が合うかで選ぶ。",
    "説明せずに通じる名前が親切に思える。",
    "",
    "**一度で伝わる名前は、説明である。**",
    "説明は読んだ時点で満杯で、増えない。",
    "増えない名前は会話に載らず忘れられる。",
    "### そこで",
    "**一発で伝わらなくてよい。**",
    "理屈で選ぶと薄れる。声に出すと効く。",
    "説明は本文と比喩が引き受ける。",
  ].join("\n")

  const SOURCE = 'Meszaros & Doble "Evocative Pattern Name" (PLoPD3, 1997)'

  it("本文よりずっと小さい文字で、スライドの下端に置く", async () => {
    const result = await layoutFor(deck({ source: SOURCE }))
    const box = result.textBoxes.find((b) => b.text === SOURCE)
    expect(box, "出典の箱が無い").toBeDefined()
    expect(box!.fontSize).toBeLessThan(DEFAULT_THEME.wikiPattern.bodySize / 2)
    expect(box!.y + box!.h).toBeCloseTo(SLIDE_HEIGHT - MARGIN_Y, 5)
  })

  it("出典が無ければ箱は増えない", async () => {
    const withSource = await layoutFor(deck({ source: SOURCE }))
    const without = await layoutFor(deck())
    expect(withSource.textBoxes.length).toBe(without.textBoxes.length + 1)
  })

  it("左段の幅に収まる（出典は本文に属するので、図解の下までは伸ばさない）", async () => {
    const result = await layoutFor(deck({ source: SOURCE }))
    const box = result.textBoxes.find((b) => b.text === SOURCE)!
    const panel = result.shapeBoxes!.find((s) => s.shapeType === "rect")!
    expect(box.x).toBeCloseTo(MARGIN_X, 5)
    expect(box.x + box.w).toBeLessThanOrEqual(panel.x + 1e-6)
  })

  it("出典があると図解はその上で止まる（確保した高さと実物が食い違わない）", async () => {
    // **列いっぱいに敷かれる図で試す。** 縦横比を名乗る図は列の中で縦中央に縮むので、
    // 確保を忘れていても下端まで届かず、この食い違いを隠してしまう
    const result = await layoutFor(
      deck({ source: SOURCE, diagram: "diagrams/no-viewbox.svg" })
    )
    const source = result.textBoxes.find((b) => b.text === SOURCE)!
    const panel = result.shapeBoxes!.find((s) => s.shapeType === "rect")!
    expect(panel.y + panel.h).toBeCloseTo(source.y, 5)
  })

  it("8行のパターンに出典を足しても、本文がはみ出さない", async () => {
    const pres = await present(deck({ sections: EIGHT_LINES, source: SOURCE }))
    await expect(
      Effect.runPromise(validateLayout(pres, DEFAULT_THEME))
    ).resolves.toBeDefined()
  })

  it("出典の長さは文字数上限に数えない", async () => {
    // 図解の SVG を数えないのと同じ理由。典拠を厚く書くほど「文字数超過」で
    // 落ちるのでは、上限が守らせたいもの（1枚で受け取れる本文の量）とずれる。
    // 長すぎる出典は上限ではなく、箱のはみ出しが止める（次のテスト）
    const long = "出典".repeat(600) // 1200字 > limits.max-chars-per-slide (1000)
    expect(long.length).toBeGreaterThan(1000)
    await expect(present(deck({ source: long }))).resolves.toBeDefined()
  })

  it("長すぎる出典はビルドを止める（黙って切り落とさない）", async () => {
    // 4pt は小さいので、溢れても生成物を見て気づけない。切り落とされた出典は
    // 「文献名の途中で終わっている引用」になり、辿れないまま残る
    const pres = await present(deck({ source: "長い出典をここに置く。".repeat(30) }))
    await expect(Effect.runPromise(validateLayout(pres, DEFAULT_THEME))).rejects.toThrow()
  })

  // 出典付きで配布しているデッキと、その枚数。パターンを1枚足すたびにここを上げる
  // （patterns-wiki は出典を持たない側の前例なので、ここには並べない）
  it.each([
    ["patterns-meta.md", 13],
    ["patterns-slidewiki.md", 2],
  ] as const)("配布中の %s は全%i枚に出典があり、どれも収まる", async (deckFile, count) => {
    const dir = join(__dirname, "..", "doc", "wiki")
    const md = readFileSync(join(dir, deckFile), "utf-8")
    const pres = await Effect.runPromise(
      parseMarkdown(md, { baseDir: dir }).pipe(Effect.flatMap(validatePresentation))
    )
    const patterns = pres.slides.filter(
      (s) => (s as ContentSlide).layout?._tag === "WikiPattern"
    )
    expect(patterns.length).toBe(count)
    for (const slide of patterns) {
      const layout = (slide as ContentSlide).layout as unknown as WikiPatternLayout
      expect(layout.source, `${(slide as ContentSlide).title} に出典が無い`).toBeTruthy()
    }
    await expect(Effect.runPromise(validateLayout(pres, DEFAULT_THEME))).resolves.toBeDefined()
  })

  it("出典は Wiki のリンクを作らない（参照ではなく典拠なので、グラフに載せない）", async () => {
    // takeaway と違って richText にしない。出典にリンクを書いても
    // バックリンクが増えないほうが、「関連」と「典拠」が混ざらない
    const pres = await present(deck({ source: `${SOURCE} [別のパターン3](d.md#別のパターン3)` }))
    const refs = mapRefs(collectRefs(
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
    ))
    expect(refs).toContain("d/別のパターン") // 本文のリンクは拾われる
    expect(refs).not.toContain("d/別のパターン3") // 出典のリンクは拾わない
  })
})

describe("WikiPattern — takeaway は受けない", () => {
  const layoutFor = async (markdown: string) =>
    layoutSlide((await present(markdown)).slides[1], DEFAULT_THEME)

  const TAKEAWAY = "関連: [別のパターン2](d.md#別のパターン2)"

  it("書いても描かれない（関連は本文に溶かし、末尾に積むのは出典だけ）", async () => {
    const result = await layoutFor(deck({ takeaway: TAKEAWAY }))
    const texts = result.textBoxes.map(boxPlainText)
    expect(texts.some((t) => t.includes("関連"))).toBe(false)
    expect(texts.some((t) => t.includes("別のパターン2"))).toBe(false)
  })

  it("捨てたことを lint が報告する（黙って消えたままにしない）", () => {
    const diagnostics = lintSource(deck({ takeaway: TAKEAWAY }))
    expect(diagnostics.map((d) => d.check)).toEqual(["annotation-scope"])
    expect(diagnostics[0].message).toContain("takeaway")
  })
})

describe("WikiPattern — 収まらない本文", () => {
  it("縮めずにビルドを止める", async () => {
    // 「静かに小さくして出す」をやめたのがこの変更の本題。長すぎるパターンは
    // ページの見た目を崩す代わりに、スライド番号つきで書き手に返る
    const long = (label: string) =>
      `### ${label}\n` + `長い本文をここに置いて枠を溢れさせる。`.repeat(12)
    const sections = [long("いつ・なにが困るか"), long("そこで")].join("\n")
    await expect(
      Effect.runPromise(
        parseMarkdown(deck({ sections }), { baseDir: FIXTURE_DIR })
          .pipe(Effect.flatMap(validatePresentation))
          .pipe(Effect.flatMap((pres) => validateLayout(pres, DEFAULT_THEME)))
      )
    ).rejects.toThrow()
  })
})
