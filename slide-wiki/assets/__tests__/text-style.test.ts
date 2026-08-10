import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { isCentered, runFontFace } from "../src/text-style.js"
import { md2pptx, md2html } from "../src/index.js"
import { parseMarkdown } from "../src/parser/index.js"
import { validatePresentation } from "../src/schema/validation.js"
import { slidesToInventory } from "../src/tools/inventory.js"
import { inspectPptx } from "../src/tools/pptx-inspector.js"
import { extractInventoryFromHtml } from "../src/tools/html-inspector.js"
import { DEFAULT_THEME } from "../src/schema/theme.js"

/**
 * 3脚が共有する書式規則（src/text-style.ts）。
 *
 * **この規則を共有にしたことで、3者比較では守れなくなった。** 以前は
 * インベントリ・HTML・PPTX が同じ式を別々に書いていたので、片方を間違えれば
 * --verify が食い違いとして拾えた。1箇所にまとめた今は、その1箇所を間違えると
 * 3脚が揃って間違うので比較は緑のまま通る（実際、規則を壊しても
 * three-way-verify は 30 件すべて通った）。
 *
 * 冗長性を消したら、消した冗長性が果たしていた検査を明示的に置き直す必要がある。
 * ここがその置き直し。
 */

describe("shared text-style rules", () => {
  describe("isCentered", () => {
    it("centers when the box asks for it", () => {
      expect(isCentered({ align: "center" }, false)).toBe(true)
    })

    it("centers everything on a title slide", () => {
      expect(isCentered({ align: undefined }, true)).toBe(true)
    })

    it("does not center ordinary body text", () => {
      expect(isCentered({ align: undefined }, false)).toBe(false)
    })
  })

  describe("runFontFace", () => {
    it("uses the monospace face for inline code", () => {
      expect(runFontFace({ fontFace: "Georgia" }, { code: true }, "Arial")).toBe("Courier New")
    })

    it("prefers the box's own face over the theme", () => {
      expect(runFontFace({ fontFace: "Georgia" }, { code: false }, "Arial")).toBe("Georgia")
    })

    it("falls back to the theme's body font", () => {
      expect(runFontFace({ fontFace: undefined }, undefined, "Arial")).toBe("Arial")
    })
  })

  // 規則が「3脚とも同じ答えを出す」だけでなく「正しい答えを出す」ことを見る。
  // icon-cols は見出しと本文を中央寄せするので、align: "center" の経路を通る。
  it("all three legs report CENTER for a centered box", async () => {
    const markdown = `# T
---
## 三本柱
<!--icon-cols-->
### 速い
<!--icon:🚀-->
説明A

### 賢い
<!--icon:💡-->
説明B

### 安全
<!--icon:🛡️-->
説明C`

    const ast = await Effect.runPromise(parseMarkdown(markdown))
    const presentation = await Effect.runPromise(validatePresentation(ast))
    const expected = await Effect.runPromise(slidesToInventory(presentation.slides, DEFAULT_THEME))
    const pptx = await Effect.runPromise(inspectPptx(await Effect.runPromise(md2pptx(markdown))))
    const html = await Effect.runPromise(
      extractInventoryFromHtml(await Effect.runPromise(md2html(markdown)))
    )

    // shape-1 = 1本目の見出し（layout が align: "center" を付ける）
    for (const [name, inventory] of [["AST", expected], ["PPTX", pptx], ["HTML", html]] as const) {
      expect(inventory["slide-1"]["shape-1"].paragraphs[0].alignment, `${name} leg`).toBe("CENTER")
    }

    // タイトルは中央寄せではない（Default 以外のレイアウトでも左寄せのまま）
    for (const [name, inventory] of [["AST", expected], ["PPTX", pptx], ["HTML", html]] as const) {
      expect(inventory["slide-1"]["shape-0"].paragraphs[0].alignment, `${name} leg`).toBeUndefined()
    }
  })
})
