import { describe, it, expect } from "vitest"
import { mergeTheme, DEFAULT_THEME, Theme } from "../src/schema/theme.js"
import { md2pptx } from "../src/pipeline.js"
import { Effect } from "effect"

describe("Theme", () => {
  describe("mergeTheme", () => {
    it("returns DEFAULT_THEME when given empty object", () => {
      const result = mergeTheme({})
      expect(result).toEqual(DEFAULT_THEME)
    })

    it("merges partial font settings", () => {
      const result = mergeTheme({
        fonts: { body: "Helvetica" },
      })
      expect(result.fonts.body).toBe("Helvetica")
      expect(result.titleSlide).toEqual(DEFAULT_THEME.titleSlide)
    })

    it("merges partial titleSlide settings", () => {
      const result = mergeTheme({
        titleSlide: {
          background: "FF0000",
          titleSize: 40,
        },
      })
      expect(result.titleSlide.background).toBe("FF0000")
      expect(result.titleSlide.titleSize).toBe(40)
      expect(result.titleSlide.titleColor).toBe(DEFAULT_THEME.titleSlide.titleColor)
    })

    it("merges partial contentSlide settings", () => {
      const result = mergeTheme({
        contentSlide: {
          headingSize: 24,
          bodySize: 18,
        },
      })
      expect(result.contentSlide.headingSize).toBe(24)
      expect(result.contentSlide.bodySize).toBe(18)
      expect(result.contentSlide.titleSize).toBe(DEFAULT_THEME.contentSlide.titleSize)
    })

    it("strips # prefix from color values", () => {
      const result = mergeTheme({
        titleSlide: {
          background: "#FF0000",
          titleColor: "#00FF00",
        },
      })
      expect(result.titleSlide.background).toBe("FF0000")
      expect(result.titleSlide.titleColor).toBe("00FF00")
    })

    it("merges all fields correctly", () => {
      const custom: Theme = {
        fonts: { body: "Times New Roman", code: "Courier New" },
        titleSlide: {
          background: "000000",
          titleColor: "FFFFFF",
          titleSize: 36,
          subtitleColor: "CCCCCC",
          subtitleSize: 20,
        },
        contentSlide: {
          background: "F5F5F5",
          titleColor: "333333",
          titleSize: 30,
          headingColor: "444444",
          headingSize: 22,
          textColor: "444444",
          bodySize: 18,
          gridHeadingSize: 20,
          gridBodySize: 16,
          iconSize: 36,
          iconColor: "3B82F6",
          takeawaySize: 14,
          takeawayColor: "6B7280",
          iconCardAccentColors: ["E67E22", "0891B2", "7C3AED"],
          iconCardBackground: "F8FAFC",
          iconCardHeadingSize: 16,
          iconCardBodySize: 14,
          stepsColors: ["9CA3AF", "14B8A6", "F97316", "3B82F6", "8B5CF6", "EC4899", "F59E0B"],
        },
        codeDisplay: {
          backgroundColor: "282C34",
          textColor: "ABB2BF",
          fontSize: 12,
          lineHeight: 1.6,
          labelColor: "6C7A89",
          labelSize: 11,
          captionSize: 15,
          captionColor: "2C3E50",
          borderRadius: 0.1,
          padding: 0.25,
        },
        border: {
          color: "999999",
          width: 2,
        },
        indent: {
          body: 0.1,
        },
        numberedList: {
          badgeColors: ["1E40AF", "3B82F6", "0891B2", "059669", "D97706"],
          badgeTextColor: "FFFFFF",
          separatorColor: "E5E7EB",
          altRowColor: "F3F4F6",
          headingSize: 14,
          bodySize: 12,
        },
        table: {
          headerBackground: "1B2A4A",
          headerTextColor: "FFFFFF",
          headerFontSize: 12,
          bodyFontSize: 11,
          borderColor: "E5E7EB",
          altRowColor: "F7F8FA",
        },
        agenda: {
          badgeColor: "14B8A6",
          badgeTextColor: "FFFFFF",
          titleSize: 36,
          subtitleSize: 14,
          itemSize: 16,
        },
        wikiPattern: {
          headingSize: 15,
          bodySize: 13,
        },
      }
      const result = mergeTheme(custom)
      expect(result).toEqual(custom)
    })
  })

  describe("PPTX generation with theme", () => {
    it("generates PPTX with custom theme", async () => {
      const markdown = `# Title
Subtitle

---

## Content Slide
### Section
Body text
`

      const customTheme: Theme = {
        fonts: { body: "Courier New" },
        titleSlide: {
          background: "1E40AF",
          titleColor: "FFFFFF",
          titleSize: 36,
          subtitleColor: "BFDBFE",
          subtitleSize: 20,
        },
        contentSlide: {
          background: "",
          titleColor: "1E40AF",
          titleSize: 30,
          headingColor: "3B82F6",
          headingSize: 22,
          textColor: "1F2937",
          bodySize: 18,
          gridHeadingSize: 20,
          gridBodySize: 16,
        },
        border: {
          color: "93C5FD",
          width: 2,
        },
        indent: {
          body: 0,
        },
      }

      const buffer = await Effect.runPromise(md2pptx(markdown, { theme: customTheme }))
      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(0)
    })

    it("generates PPTX without theme (uses default)", async () => {
      const markdown = `# Default Theme
Test

---

## Content
### Test
Body
`

      const buffer = await Effect.runPromise(md2pptx(markdown))
      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(0)
    })
  })
})
