import { describe, it, expect } from "vitest"
import { Effect, Exit } from "effect"
import { validatePresentation } from "../src/schema/validation.js"
import { Presentation, TitleSlide, ContentSlide, DefaultLayout, TextBlock } from "../src/schema/index.js"
import { LeanCanvasLayout } from "../src/plugins/lean-canvas/schema.js"

describe("validatePresentation", () => {
  it("should accept a presentation under 240 chars per slide", async () => {
    const pres = new Presentation({
      slides: [
        new TitleSlide({ title: "Short Title", subtitle: "Short subtitle" }),
      ],
    })

    const result = await Effect.runPromiseExit(validatePresentation(pres))
    expect(Exit.isSuccess(result)).toBe(true)
  })

  it("should reject a slide exceeding 1000 chars", async () => {
    const longText = "a".repeat(1001)
    const pres = new Presentation({
      slides: [
        new TitleSlide({ title: longText }),
      ],
    })

    const result = await Effect.runPromiseExit(validatePresentation(pres))
    expect(Exit.isFailure(result)).toBe(true)
  })

  it("should ignore markdown syntax in char count", async () => {
    const pres = new Presentation({
      slides: [
        new ContentSlide({
          title: "Test",
          layout: new DefaultLayout({
            sections: [new TextBlock({ heading: "### Heading", body: "Body text" })],
          }),
        }),
      ],
    })

    const result = await Effect.runPromiseExit(validatePresentation(pres))
    expect(Exit.isSuccess(result)).toBe(true)
  })

  it("should count characters correctly in LeanCanvas layout", async () => {
    const pres = new Presentation({
      slides: [
        new ContentSlide({
          title: "Lean Canvas",
          layout: new LeanCanvasLayout({
            blocks: [
              new TextBlock({ heading: "Problem", body: "Customer pain points" }),
              new TextBlock({ heading: "Solution", body: "Our solution" }),
              new TextBlock({ heading: "UVP", body: "Unique value" }),
            ],
          }),
        }),
      ],
    })

    const result = await Effect.runPromiseExit(validatePresentation(pres))
    expect(Exit.isSuccess(result)).toBe(true)
  })

  it("should enforce 1000-char limit in LeanCanvas layout", async () => {
    // Create blocks that together exceed 1000 chars
    const longText = "a".repeat(120)
    const pres = new Presentation({
      slides: [
        new ContentSlide({
          title: "Test",
          layout: new LeanCanvasLayout({
            blocks: [
              new TextBlock({ heading: "Block 1", body: longText }),
              new TextBlock({ heading: "Block 2", body: longText }),
              new TextBlock({ heading: "Block 3", body: longText }),
              new TextBlock({ heading: "Block 4", body: longText }),
              new TextBlock({ heading: "Block 5", body: longText }),
              new TextBlock({ heading: "Block 6", body: longText }),
              new TextBlock({ heading: "Block 7", body: longText }),
              new TextBlock({ heading: "Block 8", body: longText }),
              new TextBlock({ heading: "Block 9", body: longText }),
            ],
          }),
        }),
      ],
    })

    const result = await Effect.runPromiseExit(validatePresentation(pres))
    expect(Exit.isFailure(result)).toBe(true)
  })
})
