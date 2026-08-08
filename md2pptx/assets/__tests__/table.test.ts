import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { tokenize } from "../src/parser/tokenizer.js"
import { buildAST } from "../src/parser/ast-builder.js"
import { md2pptx, md2html } from "../src/index.js"
import { layoutTable } from "../src/plugins/table/layout.js"
import { DEFAULT_THEME } from "../src/schema/theme.js"
import { CONTENT_START_Y } from "../src/constants.js"
import { boxPlainText } from "../src/renderer/layout/index.js"

const TABLE_MD = `# Table Test

---

## Feature Comparison
<!--table-->
| Feature | Basic | Pro | Enterprise |
| --- | --- | --- | --- |
| Users | 5 | 50 | Unlimited |
| Storage | 10 GB | 100 GB | 1 TB |
| Support | Email | Priority | 24/7 |
`

describe("Table Plugin", () => {
  describe("Tokenization", () => {
    it("should tokenize table directive", () => {
      const markdown = "<!--table-->"
      const tokens = tokenize(markdown)
      expect(tokens).toHaveLength(1)
      expect(tokens[0].type).toBe("PluginDirective")
      expect(tokens[0]).toHaveProperty("pluginId", "table")
    })

    it("should tokenize pipe rows as BodyText", () => {
      const markdown = "| A | B | C |"
      const tokens = tokenize(markdown)
      expect(tokens).toHaveLength(1)
      expect(tokens[0].type).toBe("BodyText")
      expect(tokens[0]).toHaveProperty("text", "| A | B | C |")
    })
  })

  describe("AST Building", () => {
    it("should parse table with headers and rows", async () => {
      const tokens = tokenize(TABLE_MD)
      const presentation = await Effect.runPromise(buildAST(tokens))

      expect(presentation.slides).toHaveLength(2) // Title + Content

      const contentSlide = presentation.slides[1]
      expect(contentSlide._tag).toBe("ContentSlide")
      expect(contentSlide.title).toBe("Feature Comparison")

      if (contentSlide._tag === "ContentSlide") {
        expect(contentSlide.layout._tag).toBe("Table")

        if (contentSlide.layout._tag === "Table") {
          expect(contentSlide.layout.headers).toEqual([
            "Feature",
            "Basic",
            "Pro",
            "Enterprise",
          ])
          expect(contentSlide.layout.rows).toHaveLength(3)
          expect(contentSlide.layout.rows[0]).toEqual([
            "Users",
            "5",
            "50",
            "Unlimited",
          ])
          expect(contentSlide.layout.rows[1]).toEqual([
            "Storage",
            "10 GB",
            "100 GB",
            "1 TB",
          ])
          expect(contentSlide.layout.rows[2]).toEqual([
            "Support",
            "Email",
            "Priority",
            "24/7",
          ])
        }
      }
    })

    it("should handle table without title slide", async () => {
      const markdown = `## Data
<!--table-->
| Name | Value |
| --- | --- |
| Alpha | 100 |
`
      const tokens = tokenize(markdown)
      const presentation = await Effect.runPromise(buildAST(tokens))

      expect(presentation.slides).toHaveLength(1)
      const slide = presentation.slides[0]
      if (slide._tag === "ContentSlide" && slide.layout._tag === "Table") {
        expect(slide.layout.headers).toEqual(["Name", "Value"])
        expect(slide.layout.rows).toEqual([["Alpha", "100"]])
      }
    })

    it("should skip separator row", async () => {
      const markdown = `## Test
<!--table-->
| A | B |
| :--- | ---: |
| 1 | 2 |
`
      const tokens = tokenize(markdown)
      const presentation = await Effect.runPromise(buildAST(tokens))

      const slide = presentation.slides[0]
      if (slide._tag === "ContentSlide" && slide.layout._tag === "Table") {
        expect(slide.layout.headers).toEqual(["A", "B"])
        expect(slide.layout.rows).toEqual([["1", "2"]])
      }
    })
  })

  describe("Layout", () => {
    it("should produce correct ShapeBox and TextBox counts", () => {
      const headers = ["Feature", "Basic", "Pro", "Enterprise"]
      const rows = [
        ["Users", "5", "50", "Unlimited"],
        ["Storage", "10 GB", "100 GB", "1 TB"],
      ]

      const result = layoutTable(headers, rows, CONTENT_START_Y, DEFAULT_THEME)

      // TextBoxes: 4 headers + 4*2 data cells = 12
      expect(result.textBoxes).toHaveLength(12)

      // ShapeBoxes: 1 header bg + 1 altRow bg (row index 1) + 2 separator lines + 1 bottom line = 5
      expect(result.shapeBoxes).toHaveLength(5)
    })

    it("should set header text as bold and white", () => {
      const headers = ["Col1", "Col2"]
      const rows = [["A", "B"]]
      const result = layoutTable(headers, rows, CONTENT_START_Y, DEFAULT_THEME)

      const headerTexts = result.textBoxes.filter((tb) => tb.color === DEFAULT_THEME.table.headerTextColor)
      expect(headerTexts).toHaveLength(2)
      headerTexts.forEach((tb) => {
        expect(tb.isBold).toBe(true)
        expect(tb.align).toBe("center")
      })
    })

    it("should make first column bold and left-aligned", () => {
      const headers = ["Name", "Value"]
      const rows = [["Alpha", "100"]]
      const result = layoutTable(headers, rows, CONTENT_START_Y, DEFAULT_THEME)

      // Data row text boxes (after 2 headers)
      const dataTexts = result.textBoxes.slice(2)
      expect(dataTexts[0].isBold).toBe(true)
      expect(dataTexts[0].align).toBe("left")
      expect(dataTexts[1].isBold).toBe(false)
      expect(dataTexts[1].align).toBe("center")
    })
  })

  describe("Takeaway", () => {
    it("should parse takeaway after table rows", async () => {
      const markdown = `## Pricing
<!--table-->
| Plan | Price |
| --- | --- |
| Basic | $10 |
| Pro | $50 |
<!--takeaway-->
Choose the plan that fits your needs.
`
      const tokens = tokenize(markdown)
      const presentation = await Effect.runPromise(buildAST(tokens))

      const slide = presentation.slides[0]
      expect(slide._tag).toBe("ContentSlide")
      if (slide._tag === "ContentSlide") {
        expect(slide.layout._tag).toBe("Table")
        if (slide.layout._tag === "Table") {
          expect(slide.layout.headers).toEqual(["Plan", "Price"])
          expect(slide.layout.rows).toHaveLength(2)
          expect(slide.layout.takeaway).toBe("Choose the plan that fits your needs.")
        }
      }
    })

    it("should reserve space for takeaway in layout", () => {
      const headers = ["A", "B"]
      const rows = [["1", "2"]]

      const withoutTakeaway = layoutTable(headers, rows, CONTENT_START_Y, DEFAULT_THEME)
      const withTakeaway = layoutTable(headers, rows, CONTENT_START_Y, DEFAULT_THEME, "Key insight")

      // With takeaway should have one extra textBox for takeaway text
      expect(withTakeaway.textBoxes.length).toBe(withoutTakeaway.textBoxes.length + 1)

      // The takeaway textBox should contain the takeaway text
      const takeawayBox = withTakeaway.textBoxes[withTakeaway.textBoxes.length - 1]
      expect(boxPlainText(takeawayBox)).toBe("Key insight")
    })
  })

  describe("E2E", () => {
    it("should generate PPTX buffer", async () => {
      const result = await Effect.runPromise(md2pptx(TABLE_MD))
      expect(result).toBeInstanceOf(Buffer)
      expect(result.length).toBeGreaterThan(0)
    })

    it("should generate HTML", async () => {
      const html = await Effect.runPromise(md2html(TABLE_MD))
      expect(html).toContain("Feature Comparison")
      // Table data cells should appear in the HTML
      expect(html).toContain("Unlimited")
      expect(html).toContain("1 TB")
    })
  })
})
