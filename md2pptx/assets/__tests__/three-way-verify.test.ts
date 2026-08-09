import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { readdirSync, readFileSync } from "fs"
import { join } from "path"
import { md2pptx, md2html } from "../src/index.js"
import { parseMarkdown } from "../src/parser/index.js"
import { validatePresentation } from "../src/schema/validation.js"
import { slidesToInventory } from "../src/tools/inventory.js"
import { inspectPptx } from "../src/tools/pptx-inspector.js"
import { extractInventoryFromHtml } from "../src/tools/html-inspector.js"
import { diffInventory, Mismatch } from "../src/tools/inventory-diff.js"
import { verifyInventories, mismatchBreakdown } from "../src/tools/verify.js"
import { DEFAULT_THEME, loadThemeFile } from "../src/schema/theme.js"

/**
 * 3者比較（AST / HTML / PPTX）を **実在する全デッキ** に流す。
 *
 * snapshot-comparison.test.ts はインライン fixture 6件だけを見ており、
 * どれも textBox しか生まない。アイコン・コード・シェイプ・プラグインが
 * 1つも通っていなかったため、キー空間が3層で食い違っていても緑のままだった
 * （BACKLOG B-24）。ここは「実際に配っている md」を対象にして、
 * 同じ穴が二度開かないようにする。
 *
 * デッキ一覧はディレクトリ走査で作る。新しい仕様デッキを足したら
 * 自動的に検査対象になる（手で並べると、足した人が気付かないまま漏れる）。
 */

const SPEC_DIR = join(__dirname, "markdown-spec")
const DOC_DIR = join(__dirname, "..", "doc")

const specDecks = readdirSync(SPEC_DIR)
  .filter((f) => f.endsWith(".md") && f !== "README.md")
  .sort()
  .map((name) => ({ name, path: join(SPEC_DIR, name) }))

const docDecks = [
  { name: "doc/Spec.md", path: join(DOC_DIR, "Spec.md") },
  ...readdirSync(join(DOC_DIR, "wiki"))
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((name) => ({ name: `doc/wiki/${name}`, path: join(DOC_DIR, "wiki", name) })),
]

const decks = [...specDecks, ...docDecks]

// mismatch をそのまま toEqual([]) に渡すと、400件のデッキでは
// 失敗メッセージ自体が読めなくなる。先頭数件と件数だけ見せる。
const describeMismatches = (mismatches: readonly Mismatch[]): string =>
  [
    `${mismatches.length} mismatches`,
    ...mismatches.slice(0, 8).map((m) => `  ${m.property}: ${m.expected} vs ${m.actual}`),
    ...(mismatches.length > 8 ? [`  … 他 ${mismatches.length - 8} 件`] : []),
  ].join("\n")

const threeWay = async (markdown: string, theme = DEFAULT_THEME) => {
  const ast = await Effect.runPromise(parseMarkdown(markdown))
  const presentation = await Effect.runPromise(validatePresentation(ast))
  const expected = await Effect.runPromise(slidesToInventory(presentation.slides, theme))

  const pptx = await Effect.runPromise(inspectPptx(await Effect.runPromise(md2pptx(markdown, { theme }))))
  const html = await Effect.runPromise(
    extractInventoryFromHtml(await Effect.runPromise(md2html(markdown, { theme })), theme.fonts.body)
  )

  return {
    "AST vs PPTX": diffInventory(expected, pptx),
    "AST vs HTML": diffInventory(expected, html),
    "PPTX vs HTML": diffInventory(pptx, html),
  }
}

describe("3-way verification over every deck we ship", () => {
  for (const deck of decks) {
    it(`${deck.name} — AST / HTML / PPTX agree`, async () => {
      const legs = await threeWay(readFileSync(deck.path, "utf-8"))

      for (const [label, diff] of Object.entries(legs)) {
        expect(diff.mismatches.length, `${deck.name} — ${label}\n${describeMismatches(diff.mismatches)}`).toBe(0)
      }

      // 「0 件」だけでは、全部落として一致したのか本当に合っているのか分からない
      expect(legs["AST vs PPTX"].matches).toBeGreaterThan(0)
    })
  }

  // フォントを既定以外にすると、インスペクタ側の決め打ちが露見する
  // （html-inspector の font_name は以前 "Arial" のリテラルだった）。
  it("holds under a non-default theme", async () => {
    const theme = await Effect.runPromise(loadThemeFile(join(DOC_DIR, "theme.yaml")))
    const legs = await threeWay(readFileSync(join(SPEC_DIR, "02-complex-layouts.md"), "utf-8"), theme)

    for (const [label, diff] of Object.entries(legs)) {
      expect(diff.mismatches.length, `${label}\n${describeMismatches(diff.mismatches)}`).toBe(0)
    }
  })
})

describe("the verdict itself", () => {
  // 3脚が一致するのを確かめるだけでは足りない。「食い違ったときに
  // 失敗と呼ぶか」を表明しないと、B-24（mismatch を印字して exit 0）に戻る。
  const markdown = readFileSync(join(SPEC_DIR, "01-basic-title.md"), "utf-8")

  const inventories = async () => {
    const ast = await Effect.runPromise(parseMarkdown(markdown))
    const presentation = await Effect.runPromise(validatePresentation(ast))
    const expected = await Effect.runPromise(slidesToInventory(presentation.slides, DEFAULT_THEME))
    const pptxBuffer = await Effect.runPromise(md2pptx(markdown))
    const pptx = await Effect.runPromise(inspectPptx(pptxBuffer))
    const html = await Effect.runPromise(
      extractInventoryFromHtml(await Effect.runPromise(md2html(markdown)), DEFAULT_THEME.fonts.body)
    )
    return { expected, pptx, html }
  }

  it("reports zero mismatches when the three agree", async () => {
    const { expected, pptx, html } = await inventories()
    const report = verifyInventories(expected, pptx, html)

    expect(report.totalMismatches).toBe(0)
    expect(report.legs).toHaveLength(3)
    expect(report.legs.every((leg) => leg.matches > 0)).toBe(true)
  })

  it("reports a nonzero total when one leg drifts", async () => {
    const { expected, pptx, html } = await inventories()

    // AST 側のシェイプを1インチずらす（レンダラは触らない）
    const key = Object.keys(expected["slide-0"])[0]
    const drifted = {
      ...expected,
      "slide-0": {
        ...expected["slide-0"],
        [key]: { ...expected["slide-0"][key], left: expected["slide-0"][key].left + 1 },
      },
    }

    const report = verifyInventories(drifted, pptx, html)

    // AST を基準にする2脚が落ちる。PPTX vs HTML は無傷
    expect(report.totalMismatches).toBeGreaterThan(0)
    expect(report.legs.find((leg) => leg.label === "PPTX vs HTML")!.mismatches).toHaveLength(0)
    expect(mismatchBreakdown(report.legs[0].mismatches)).toContain("left")
  })
})
