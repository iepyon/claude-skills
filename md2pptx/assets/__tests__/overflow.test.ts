import { describe, it, expect } from "vitest"
import { Effect, Exit } from "effect"
import { md2pptx, md2html } from "../src/pipeline.js"
import { detectOverflow } from "../src/renderer/layout/overflow.js"
import { layoutSlide } from "../src/renderer/layout/index.js"
import { ContentSlide, DefaultLayout, TextBlock } from "../src/schema/index.js"
import { DEFAULT_THEME } from "../src/schema/theme.js"

describe("detectOverflow", () => {
  it("reports nothing for a box that comfortably fits", () => {
    const result = {
      textBoxes: [{ x: 0.4, y: 1.0, w: 9.2, h: 1.0, text: "short", fontSize: 16 }],
    }
    expect(detectOverflow(result)).toEqual([])
  })

  it("reports a box that extends past the bottom margin", () => {
    const result = {
      textBoxes: [{ x: 0.4, y: 5.0, w: 9.2, h: 1.0, text: "x", fontSize: 16 }],
    }
    const overflows = detectOverflow(result)
    expect(overflows).toHaveLength(1)
    expect(overflows[0].kind).toBe("outOfBounds")
  })

  it("reports a box whose text needs more height than the box has", () => {
    const result = {
      textBoxes: [{ x: 0.4, y: 1.0, w: 2.0, h: 0.3, text: "あ".repeat(300), fontSize: 16 }],
    }
    const overflows = detectOverflow(result)
    expect(overflows).toHaveLength(1)
    expect(overflows[0].kind).toBe("textTooTall")
    expect(overflows[0].needed).toBeGreaterThan(0.3)
  })

  it("tolerates a small estimation margin rather than flagging borderline boxes", () => {
    // 16pt 全角1行 = 16/72*1.5 + 0.05 ≈ 0.383in。箱がわずかに小さい程度では報告しない
    const result = {
      textBoxes: [{ x: 0.4, y: 1.0, w: 9.2, h: 0.36, text: "あ", fontSize: 16 }],
    }
    expect(detectOverflow(result)).toEqual([])
  })

  it("measures paragraphs, not just plain text", () => {
    const result = {
      textBoxes: [{
        x: 0.4, y: 1.0, w: 2.0, h: 0.3, fontSize: 16,
        paragraphs: Array.from({ length: 20 }, () => ({
          runs: [{ text: "あ".repeat(20) }],
          bullet: { type: "bullet" as const },
        })),
      }],
    }
    expect(detectOverflow(result)[0]?.kind).toBe("textTooTall")
  })
})

describe("dispatchLayout font shrinking", () => {
  it("shrinks body font when content does not fit at full size", () => {
    const long = "あ".repeat(700)
    const slide = new ContentSlide({
      title: "Overflowing",
      layout: new DefaultLayout({ sections: [new TextBlock({ heading: "H", body: long })] }),
    })
    const result = layoutSlide(slide, DEFAULT_THEME)

    // 見出しも richText を持つので isBold で除外する。除外しないと見出しボックスが
    // 先に見つかり、縮小後の見出しサイズ（18 * 0.9 = 16）が bodySize と同じ値になって
    // 縮小の有無を判定できない。
    const bodyBox = result.textBoxes.find(b => (b.richText || b.paragraphs) && !b.isBold)
    expect(bodyBox).toBeDefined()
    expect(bodyBox!.fontSize).toBeLessThan(DEFAULT_THEME.contentSlide.bodySize)
  })

  it("leaves font sizes untouched when content already fits", () => {
    const slide = new ContentSlide({
      title: "Fits",
      layout: new DefaultLayout({ sections: [new TextBlock({ heading: "H", body: "short" })] }),
    })
    const result = layoutSlide(slide, DEFAULT_THEME)

    const bodyBox = result.textBoxes.find(b => b.richText && !b.isBold)
    expect(bodyBox!.fontSize).toBe(DEFAULT_THEME.contentSlide.bodySize)
  })
})

describe("validateLayout via the pipeline", () => {
  it("fails with a ValidationError when a slide overflows even at the minimum font size", async () => {
    // 1000文字制限には収まるが 4x4 グリッドの1セルには到達不能な量
    const md = `# T
---
## Dense
<!--grid:4x4-->
${Array.from({ length: 16 }, (_, i) => `### Cell ${i + 1}\n${"あ".repeat(55)}`).join("\n")}`

    const exit = await Effect.runPromiseExit(md2pptx(md))
    expect(Exit.isFailure(exit)).toBe(true)
    const message = JSON.stringify(exit)
    expect(message).toContain("overflow")
    expect(message).toContain("Slide 2")
  })

  it("passes slides that fit after shrinking", async () => {
    const md = `# T
---
## Fits after shrink
### H
${"あ".repeat(600)}`

    await expect(Effect.runPromise(md2pptx(md))).resolves.toBeInstanceOf(Buffer)
  })

  it("applies the same check to the HTML path", async () => {
    const md = `# T
---
## Dense
<!--grid:4x4-->
${Array.from({ length: 16 }, (_, i) => `### Cell ${i + 1}\n${"あ".repeat(55)}`).join("\n")}`

    const exit = await Effect.runPromiseExit(md2html(md))
    expect(Exit.isFailure(exit)).toBe(true)
  })
})
