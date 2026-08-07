import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { md2pptx, md2html } from "../src/pipeline.js"
import { parseMarkdown } from "../src/parser/index.js"
import { validatePresentation } from "../src/schema/validation.js"
import { slidesToInventory } from "../src/tools/inventory.js"
import { inspectPptx } from "../src/tools/pptx-inspector.js"
import { extractInventoryFromHtml } from "../src/tools/html-inspector.js"
import { diffInventory } from "../src/tools/inventory-diff.js"
import { DEFAULT_THEME } from "../src/schema/theme.js"

// Test markdown samples
const testCases = {
  "title-only": `# Title Slide
Subtitle text`,

  "default-layout": `# Title Slide
Subtitle
---
## Content Slide
### Section A
Body text for section A

### Section B
Body text for section B`,

  "left-right": `# Title Slide
Subtitle
---
## Split Layout
<!--left:2-->
### Left Section
Left content here

<!--right:1-->
### Right Section
Right content here`,

  "grid-2x2": `# Title Slide
Subtitle
---
## Grid Layout
<!--grid:2x2-->
### Cell 1
Content 1

### Cell 2
Content 2

### Cell 3
Content 3

### Cell 4
Content 4`,
}

describe("Snapshot comparison tests", () => {
  describe("title-only", () => {
    const markdown = testCases["title-only"]

    it("should match: reference vs PPTX", async () => {
      // Generate reference inventory from AST
      const ast = await Effect.runPromise(parseMarkdown(markdown))
      const presentation = await Effect.runPromise(validatePresentation(ast))
      const referenceInventory = await Effect.runPromise(
        slidesToInventory(presentation.slides, DEFAULT_THEME)
      )

      // Generate PPTX and extract inventory
      const pptxBuffer = await Effect.runPromise(md2pptx(markdown))
      const pptxInventory = await Effect.runPromise(inspectPptx(pptxBuffer))

      // Compare
      const diff = diffInventory(referenceInventory, pptxInventory)
      expect(diff.mismatches).toEqual([])
    })

    it("should match: reference vs HTML", async () => {
      // Generate reference inventory from AST
      const ast = await Effect.runPromise(parseMarkdown(markdown))
      const presentation = await Effect.runPromise(validatePresentation(ast))
      const referenceInventory = await Effect.runPromise(
        slidesToInventory(presentation.slides, DEFAULT_THEME)
      )

      // Generate HTML and extract inventory
      const html = await Effect.runPromise(md2html(markdown))
      const htmlInventory = await Effect.runPromise(
        extractInventoryFromHtml(html)
      )

      // Compare
      const diff = diffInventory(referenceInventory, htmlInventory)
      expect(diff.mismatches).toEqual([])
    })

    it("should match: PPTX vs HTML", async () => {
      // Generate PPTX and extract inventory
      const pptxBuffer = await Effect.runPromise(md2pptx(markdown))
      const pptxInventory = await Effect.runPromise(inspectPptx(pptxBuffer))

      // Generate HTML and extract inventory
      const html = await Effect.runPromise(md2html(markdown))
      const htmlInventory = await Effect.runPromise(
        extractInventoryFromHtml(html)
      )

      // Compare
      const diff = diffInventory(pptxInventory, htmlInventory)
      expect(diff.mismatches).toEqual([])
    })
  })

  describe("default-layout", () => {
    const markdown = testCases["default-layout"]

    it("should match: reference vs PPTX", async () => {
      // Generate reference inventory from AST
      const ast = await Effect.runPromise(parseMarkdown(markdown))
      const presentation = await Effect.runPromise(validatePresentation(ast))
      const referenceInventory = await Effect.runPromise(
        slidesToInventory(presentation.slides, DEFAULT_THEME)
      )

      // Generate PPTX and extract inventory
      const pptxBuffer = await Effect.runPromise(md2pptx(markdown))
      const pptxInventory = await Effect.runPromise(inspectPptx(pptxBuffer))

      // Compare
      const diff = diffInventory(referenceInventory, pptxInventory)
      expect(diff.mismatches).toEqual([])
    })

    it("should match: reference vs HTML", async () => {
      // Generate reference inventory from AST
      const ast = await Effect.runPromise(parseMarkdown(markdown))
      const presentation = await Effect.runPromise(validatePresentation(ast))
      const referenceInventory = await Effect.runPromise(
        slidesToInventory(presentation.slides, DEFAULT_THEME)
      )

      // Generate HTML and extract inventory
      const html = await Effect.runPromise(md2html(markdown))
      const htmlInventory = await Effect.runPromise(
        extractInventoryFromHtml(html)
      )

      // Compare
      const diff = diffInventory(referenceInventory, htmlInventory)
      expect(diff.mismatches).toEqual([])
    })

    it("should match: PPTX vs HTML", async () => {
      // Generate PPTX and extract inventory
      const pptxBuffer = await Effect.runPromise(md2pptx(markdown))
      const pptxInventory = await Effect.runPromise(inspectPptx(pptxBuffer))

      // Generate HTML and extract inventory
      const html = await Effect.runPromise(md2html(markdown))
      const htmlInventory = await Effect.runPromise(
        extractInventoryFromHtml(html)
      )

      // Compare
      const diff = diffInventory(pptxInventory, htmlInventory)
      expect(diff.mismatches).toEqual([])
    })
  })

  describe("left-right", () => {
    const markdown = testCases["left-right"]

    it("should match: reference vs PPTX", async () => {
      // Generate reference inventory from AST
      const ast = await Effect.runPromise(parseMarkdown(markdown))
      const presentation = await Effect.runPromise(validatePresentation(ast))
      const referenceInventory = await Effect.runPromise(
        slidesToInventory(presentation.slides, DEFAULT_THEME)
      )

      // Generate PPTX and extract inventory
      const pptxBuffer = await Effect.runPromise(md2pptx(markdown))
      const pptxInventory = await Effect.runPromise(inspectPptx(pptxBuffer))

      // Compare
      const diff = diffInventory(referenceInventory, pptxInventory)
      expect(diff.mismatches).toEqual([])
    })

    it("should match: reference vs HTML", async () => {
      // Generate reference inventory from AST
      const ast = await Effect.runPromise(parseMarkdown(markdown))
      const presentation = await Effect.runPromise(validatePresentation(ast))
      const referenceInventory = await Effect.runPromise(
        slidesToInventory(presentation.slides, DEFAULT_THEME)
      )

      // Generate HTML and extract inventory
      const html = await Effect.runPromise(md2html(markdown))
      const htmlInventory = await Effect.runPromise(
        extractInventoryFromHtml(html)
      )

      // Compare
      const diff = diffInventory(referenceInventory, htmlInventory)
      expect(diff.mismatches).toEqual([])
    })

    it("should match: PPTX vs HTML", async () => {
      // Generate PPTX and extract inventory
      const pptxBuffer = await Effect.runPromise(md2pptx(markdown))
      const pptxInventory = await Effect.runPromise(inspectPptx(pptxBuffer))

      // Generate HTML and extract inventory
      const html = await Effect.runPromise(md2html(markdown))
      const htmlInventory = await Effect.runPromise(
        extractInventoryFromHtml(html)
      )

      // Compare
      const diff = diffInventory(pptxInventory, htmlInventory)
      expect(diff.mismatches).toEqual([])
    })
  })

  describe("grid-2x2", () => {
    const markdown = testCases["grid-2x2"]

    it("should match: reference vs PPTX", async () => {
      // Generate reference inventory from AST
      const ast = await Effect.runPromise(parseMarkdown(markdown))
      const presentation = await Effect.runPromise(validatePresentation(ast))
      const referenceInventory = await Effect.runPromise(
        slidesToInventory(presentation.slides, DEFAULT_THEME)
      )

      // Generate PPTX and extract inventory
      const pptxBuffer = await Effect.runPromise(md2pptx(markdown))
      const pptxInventory = await Effect.runPromise(inspectPptx(pptxBuffer))

      // Compare
      const diff = diffInventory(referenceInventory, pptxInventory)
      expect(diff.mismatches).toEqual([])
    })

    it("should match: reference vs HTML", async () => {
      // Generate reference inventory from AST
      const ast = await Effect.runPromise(parseMarkdown(markdown))
      const presentation = await Effect.runPromise(validatePresentation(ast))
      const referenceInventory = await Effect.runPromise(
        slidesToInventory(presentation.slides, DEFAULT_THEME)
      )

      // Generate HTML and extract inventory
      const html = await Effect.runPromise(md2html(markdown))
      const htmlInventory = await Effect.runPromise(
        extractInventoryFromHtml(html)
      )

      // Compare
      const diff = diffInventory(referenceInventory, htmlInventory)
      expect(diff.mismatches).toEqual([])
    })

    it("should match: PPTX vs HTML", async () => {
      // Generate PPTX and extract inventory
      const pptxBuffer = await Effect.runPromise(md2pptx(markdown))
      const pptxInventory = await Effect.runPromise(inspectPptx(pptxBuffer))

      // Generate HTML and extract inventory
      const html = await Effect.runPromise(md2html(markdown))
      const htmlInventory = await Effect.runPromise(
        extractInventoryFromHtml(html)
      )

      // Compare
      const diff = diffInventory(pptxInventory, htmlInventory)
      expect(diff.mismatches).toEqual([])
    })
  })
})
