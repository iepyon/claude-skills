import { describe, it, expect, beforeAll } from "vitest"
import { Effect } from "effect"
import { readdirSync, readFileSync } from "fs"
import { join } from "path"
import { md2pptx, md2html } from "../src/index.js"
import { parseMarkdown } from "../src/parser/index.js"
import { validatePresentation } from "../src/schema/validation.js"
import { slidesToInventory } from "../src/tools/inventory.js"
import { inspectPptx } from "../src/tools/pptx-inspector.js"
import { extractInventoryFromHtml } from "../src/tools/html-inspector.js"
import { Mismatch } from "../src/tools/inventory-diff.js"
import { verifyInventories, VerifyReport, mismatchBreakdown } from "../src/tools/verify.js"
import { DEFAULT_THEME } from "../src/schema/theme.js"

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
  .map((name) => ({ name, path: join(SPEC_DIR, name), baseDir: SPEC_DIR }))

const docDecks = [
  { name: "doc/Spec.md", path: join(DOC_DIR, "Spec.md"), baseDir: DOC_DIR },
  ...readdirSync(join(DOC_DIR, "wiki"))
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((name) => ({
      name: `doc/wiki/${name}`,
      path: join(DOC_DIR, "wiki", name),
      // 図解の `![…](….svg)` はそのデッキからの相対
      baseDir: join(DOC_DIR, "wiki"),
    })),
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

// 3脚のインベントリを作る。比較そのものは verify.ts の判定を通す
// （テストだけが別の突き合わせ方を持つと、CI と手元で結論が変わりうる）。
const threeWay = async (markdown: string, theme = DEFAULT_THEME, baseDir?: string) => {
  const ast = await Effect.runPromise(parseMarkdown(markdown, { baseDir }))
  const presentation = await Effect.runPromise(validatePresentation(ast))
  const expected = await Effect.runPromise(slidesToInventory(presentation.slides, theme))
  const pptx = await Effect.runPromise(
    inspectPptx(await Effect.runPromise(md2pptx(markdown, { theme, baseDir })))
  )
  const html = await Effect.runPromise(
    extractInventoryFromHtml(await Effect.runPromise(md2html(markdown, { theme, baseDir })))
  )
  return { expected, pptx, html }
}

const expectAgreement = (label: string, report: VerifyReport): void => {
  for (const leg of report.legs) {
    expect(leg.mismatches.length, `${label} — ${leg.label}\n${describeMismatches(leg.mismatches)}`).toBe(0)
  }
}

const verifyDeck = async (
  markdown: string,
  theme = DEFAULT_THEME,
  baseDir?: string
): Promise<VerifyReport> => {
  const { expected, pptx, html } = await threeWay(markdown, theme, baseDir)
  return verifyInventories(expected, pptx, html)
}

describe("3-way verification over every deck we ship", () => {
  for (const deck of decks) {
    it(`${deck.name} — AST / HTML / PPTX agree`, async () => {
      const report = await verifyDeck(readFileSync(deck.path, "utf-8"), DEFAULT_THEME, deck.baseDir)
      expectAgreement(deck.name, report)

      // 「0 件」だけでは、全部落として一致したのか本当に合っているのか分からない
      expect(report.legs[0].matches).toBeGreaterThan(0)
    })
  }

  // 本文フォントを既定から変える。以前 html-inspector が "Arial" を
  // リテラルで持っていて、この脚だけ食い違っていた経路。
  it("holds under a theme with a different body font", async () => {
    const theme = { ...DEFAULT_THEME, fonts: { ...DEFAULT_THEME.fonts, body: "Verdana" } }
    const report = await verifyDeck(readFileSync(join(SPEC_DIR, "02-complex-layouts.md"), "utf-8"), theme)
    expectAgreement("themed", report)
  })
})

// 配っているデッキが通っていない書き方は、走査では拾えない。
// ここで拾ったものは実際に3脚がずれていた入力なので、fixture として残す。
const EDGE_CASES: Record<string, string> = {
  // アイコン注釈の無い Steps。以前はプラグインが空の IconBox を作り、
  // PPTX には addText("") の見えない図形が入っていた
  // （既存の steps デッキは4件とも全セクションにアイコンが付いている）
  "steps without icon annotations": `# T
---
## 手順
<!--steps-->
### 準備
入力を読む

### 変換
AST に落とす

### 出力
書き出す`,

  // アイコン注釈の無い icon-cols。steps と同じく空の IconBox の発生源
  "icon columns without icon annotations": `# T
---
## 三本柱
<!--icon-cols-->
### 速い
説明A

### 賢い
説明B

### 安全
説明C`,

  // 空行を含むコードブロック。行数の数え方が3脚でずれやすい
  "code with blank lines": `# T
---
## コード
\`\`\`python
def a():
    pass

def b():
    pass
\`\`\``,

  // 実体参照になる文字。PPTX 側はデコードしないと =&gt; のまま読み出す
  "code with xml entities": `# T
---
## コード
\`\`\`typescript
const f = (a: number) => a < 1 && a > 0
\`\`\``,

  // 本文の途中に改行があり、そのあとにリンクが来る。
  // pptxgenjs が共有 options に breakLine を立てる癖を踏む
  "body with a link after a newline": `# T
---
## 本文
### セクション
1行目の説明。
実例は [Anthropic](https://anthropic.com) から辿れる。
3行目。`,
}

describe("edge cases the shipped decks do not cover", () => {
  for (const [name, markdown] of Object.entries(EDGE_CASES)) {
    it(`${name} — AST / HTML / PPTX agree`, async () => {
      expectAgreement(name, await verifyDeck(markdown))
    })
  }
})

describe("the verdict itself", () => {
  // 3脚が一致するのを確かめるだけでは足りない。「食い違ったときに
  // 失敗と呼ぶか」を表明しないと、B-24（mismatch を印字して exit 0）に戻る。
  let inventories: Awaited<ReturnType<typeof threeWay>>

  beforeAll(async () => {
    inventories = await threeWay(readFileSync(join(SPEC_DIR, "01-basic-title.md"), "utf-8"))
  })

  it("reports zero mismatches when the three agree", () => {
    const { expected, pptx, html } = inventories
    const report = verifyInventories(expected, pptx, html)

    expect(report.totalMismatches).toBe(0)
    expect(report.legs).toHaveLength(3)
    expect(report.legs.every((leg) => leg.matches > 0)).toBe(true)
  })

  it("reports a nonzero total when one leg drifts", () => {
    const { expected, pptx, html } = inventories

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
