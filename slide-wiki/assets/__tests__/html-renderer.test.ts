import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { renderToHtml } from "../src/renderer/html/index.js"
import { DEFAULT_THEME, Theme } from "../src/schema/theme.js"
import {
  Presentation,
  TitleSlide,
  ContentSlide,
  DefaultLayout,
  LeftRightLayout,
  TopBottomLayout,
  GridLayout,
  TextBlock,
} from "../src/schema/presentation.js"

/**
 * Helper to extract HTML from Effect
 */
async function renderHtml(presentation: Presentation, theme: Theme = DEFAULT_THEME): Promise<string> {
  return Effect.runPromise(renderToHtml(presentation, theme))
}

describe("html-renderer", () => {
  describe("TitleSlide HTML generation", () => {
    it("should render title slide with title and subtitle", async () => {
      const presentation = new Presentation({
        slides: [new TitleSlide({ title: "Main Title", subtitle: "Subtitle Text" })],
      })

      const html = await renderHtml(presentation)

      // Check basic HTML structure
      expect(html).toContain("<!DOCTYPE html>")
      expect(html).toContain("<html lang=\"en\">")
      expect(html).toContain("class=\"slide title-slide\"")

      // Check title and subtitle text
      expect(html).toContain("Main Title")
      expect(html).toContain("Subtitle Text")

      // Check theme background color
      expect(html).toContain(`background-color: #${DEFAULT_THEME.titleSlide.background}`)

      // Check text-box class
      expect(html).toContain("class=\"text-box\"")
    })

    it("should render title slide with title only (no subtitle)", async () => {
      const presentation = new Presentation({
        slides: [new TitleSlide({ title: "Title Only" })],
      })

      const html = await renderHtml(presentation)

      expect(html).toContain("Title Only")
      expect(html).toContain("class=\"slide title-slide\"")
      expect(html).toContain(`background-color: #${DEFAULT_THEME.titleSlide.background}`)
    })

    it("should apply custom theme colors to title slide", async () => {
      const customTheme: Theme = {
        ...DEFAULT_THEME,
        titleSlide: {
          ...DEFAULT_THEME.titleSlide,
          background: "FF0000", // Red background
          titleColor: "00FF00", // Green title
        },
      }

      const presentation = new Presentation({
        slides: [new TitleSlide({ title: "Custom Theme" })],
      })

      const html = await renderHtml(presentation, customTheme)

      expect(html).toContain("background-color: #FF0000")
      expect(html).toContain("color: #00FF00")
    })
  })

  describe("ContentSlide - DefaultLayout", () => {
    it("should render default layout with 2 sections", async () => {
      const presentation = new Presentation({
        slides: [
          new ContentSlide({
            title: "Content Title",
            layout: new DefaultLayout({
              sections: [
                new TextBlock({ heading: "Section 1", body: "Body 1" }),
                new TextBlock({ heading: "Section 2", body: "Body 2" }),
              ],
            }),
          }),
        ],
      })

      const html = await renderHtml(presentation)

      expect(html).toContain("class=\"slide content-slide\"")
      expect(html).toContain("Content Title")
      expect(html).toContain("Section 1")
      expect(html).toContain("Body 1")
      expect(html).toContain("Section 2")
      expect(html).toContain("Body 2")
    })

    it("should render default layout with heading-only sections", async () => {
      const presentation = new Presentation({
        slides: [
          new ContentSlide({
            title: "Headings Only",
            layout: new DefaultLayout({
              sections: [new TextBlock({ heading: "Heading 1" }), new TextBlock({ heading: "Heading 2" })],
            }),
          }),
        ],
      })

      const html = await renderHtml(presentation)

      expect(html).toContain("Heading 1")
      expect(html).toContain("Heading 2")
      expect(html).toContain("class=\"slide content-slide\"")
    })

    it("should render default layout with body-only sections", async () => {
      const presentation = new Presentation({
        slides: [
          new ContentSlide({
            title: "Body Only",
            layout: new DefaultLayout({
              sections: [new TextBlock({ body: "Body text 1" }), new TextBlock({ body: "Body text 2" })],
            }),
          }),
        ],
      })

      const html = await renderHtml(presentation)

      expect(html).toContain("Body text 1")
      expect(html).toContain("Body text 2")
    })
  })

  describe("ContentSlide - LeftRightLayout", () => {
    it("should render left-right layout with 1:1 ratio", async () => {
      const presentation = new Presentation({
        slides: [
          new ContentSlide({
            title: "Left Right Title",
            layout: new LeftRightLayout({
              leftRatio: 1,
              rightRatio: 1,
              leftSections: [new TextBlock({ heading: "Left Section", body: "Left content" })],
              rightSections: [new TextBlock({ heading: "Right Section", body: "Right content" })],
            }),
          }),
        ],
      })

      const html = await renderHtml(presentation)

      expect(html).toContain("Left Right Title")
      expect(html).toContain("Left Section")
      expect(html).toContain("Left content")
      expect(html).toContain("Right Section")
      expect(html).toContain("Right content")

      // Should have border boxes for left-right layout
      expect(html).toContain("class=\"border-box\"")
    })

    it("should render left-right layout with 2:1 ratio", async () => {
      const presentation = new Presentation({
        slides: [
          new ContentSlide({
            title: "Asymmetric Layout",
            layout: new LeftRightLayout({
              leftRatio: 2,
              rightRatio: 1,
              leftSections: [new TextBlock({ body: "Wider left side" })],
              rightSections: [new TextBlock({ body: "Narrower right side" })],
            }),
          }),
        ],
      })

      const html = await renderHtml(presentation)

      expect(html).toContain("Wider left side")
      expect(html).toContain("Narrower right side")
      expect(html).toContain("class=\"border-box\"")
    })
  })

  describe("ContentSlide - TopBottomLayout", () => {
    it("should render top-bottom layout with 1:1 ratio", async () => {
      const presentation = new Presentation({
        slides: [
          new ContentSlide({
            title: "Top Bottom Title",
            layout: new TopBottomLayout({
              topRatio: 1,
              bottomRatio: 1,
              topSections: [new TextBlock({ heading: "Top Section", body: "Top content" })],
              bottomSections: [new TextBlock({ heading: "Bottom Section", body: "Bottom content" })],
            }),
          }),
        ],
      })

      const html = await renderHtml(presentation)

      expect(html).toContain("Top Bottom Title")
      expect(html).toContain("Top Section")
      expect(html).toContain("Top content")
      expect(html).toContain("Bottom Section")
      expect(html).toContain("Bottom content")

      // Should have border boxes for top-bottom layout
      expect(html).toContain("class=\"border-box\"")
    })

    it("should render top-bottom layout with 4:1 ratio", async () => {
      const presentation = new Presentation({
        slides: [
          new ContentSlide({
            title: "Asymmetric Layout",
            layout: new TopBottomLayout({
              topRatio: 4,
              bottomRatio: 1,
              topSections: [new TextBlock({ body: "Taller top side" })],
              bottomSections: [new TextBlock({ body: "Shorter bottom side" })],
            }),
          }),
        ],
      })

      const html = await renderHtml(presentation)

      expect(html).toContain("Taller top side")
      expect(html).toContain("Shorter bottom side")
      expect(html).toContain("class=\"border-box\"")
    })
  })

  describe("ContentSlide - GridLayout", () => {
    it("should render 2x2 grid layout", async () => {
      const presentation = new Presentation({
        slides: [
          new ContentSlide({
            title: "Grid Title",
            layout: new GridLayout({
              rows: 2,
              cols: 2,
              cells: [
                new TextBlock({ heading: "Cell 1" }),
                new TextBlock({ heading: "Cell 2" }),
                new TextBlock({ heading: "Cell 3" }),
                new TextBlock({ heading: "Cell 4" }),
              ],
            }),
          }),
        ],
      })

      const html = await renderHtml(presentation)

      expect(html).toContain("Grid Title")
      expect(html).toContain("Cell 1")
      expect(html).toContain("Cell 2")
      expect(html).toContain("Cell 3")
      expect(html).toContain("Cell 4")

      // Should have border boxes for grid layout
      expect(html).toContain("class=\"border-box\"")
    })

    it("should render 1x3 grid layout (3 columns)", async () => {
      const presentation = new Presentation({
        slides: [
          new ContentSlide({
            title: "Three Columns",
            layout: new GridLayout({
              rows: 1,
              cols: 3,
              cells: [
                new TextBlock({ heading: "Col 1", body: "Content 1" }),
                new TextBlock({ heading: "Col 2", body: "Content 2" }),
                new TextBlock({ heading: "Col 3", body: "Content 3" }),
              ],
            }),
          }),
        ],
      })

      const html = await renderHtml(presentation)

      expect(html).toContain("Three Columns")
      expect(html).toContain("Col 1")
      expect(html).toContain("Content 1")
      expect(html).toContain("Col 2")
      expect(html).toContain("Content 2")
      expect(html).toContain("Col 3")
      expect(html).toContain("Content 3")
    })
  })

  describe("Theme color reflection", () => {
    it("should reflect custom content slide background color", async () => {
      const customTheme: Theme = {
        ...DEFAULT_THEME,
        contentSlide: {
          ...DEFAULT_THEME.contentSlide,
          background: "F0F0F0", // Light gray
        },
      }

      const presentation = new Presentation({
        slides: [
          new ContentSlide({
            title: "Custom BG",
            layout: new DefaultLayout({
              sections: [new TextBlock({ body: "Test" })],
            }),
          }),
        ],
      })

      const html = await renderHtml(presentation, customTheme)

      expect(html).toContain("background-color: #F0F0F0")
    })

    it("should reflect custom border color and width", async () => {
      const customTheme: Theme = {
        ...DEFAULT_THEME,
        border: {
          color: "FF0000", // Red border
          width: 5,
        },
      }

      const presentation = new Presentation({
        slides: [
          new ContentSlide({
            title: "Custom Border",
            layout: new LeftRightLayout({
              leftRatio: 1,
              rightRatio: 1,
              leftSections: [new TextBlock({ body: "Left" })],
              rightSections: [new TextBlock({ body: "Right" })],
            }),
          }),
        ],
      })

      const html = await renderHtml(presentation, customTheme)

      expect(html).toContain("border: 5px solid #FF0000")
    })

    it("should reflect custom font family", async () => {
      const customTheme: Theme = {
        ...DEFAULT_THEME,
        fonts: {
          body: "Helvetica",
        },
      }

      const presentation = new Presentation({
        slides: [new TitleSlide({ title: "Custom Font" })],
      })

      const html = await renderHtml(presentation, customTheme)

      expect(html).toContain("font-family: Helvetica")
    })
  })

  describe("data-inches-* attribute accuracy", () => {
    it("should include data-inches attributes for title slide text boxes", async () => {
      const presentation = new Presentation({
        slides: [new TitleSlide({ title: "Test Title" })],
      })

      const html = await renderHtml(presentation)

      // Should have data-inches-x, y, w, h attributes
      expect(html).toContain('data-inches-x="')
      expect(html).toContain('data-inches-y="')
      expect(html).toContain('data-inches-w="')
      expect(html).toContain('data-inches-h="')
    })

    it("should include data-inches attributes for content slide text boxes", async () => {
      const presentation = new Presentation({
        slides: [
          new ContentSlide({
            title: "Content",
            layout: new DefaultLayout({
              sections: [new TextBlock({ heading: "Heading", body: "Body" })],
            }),
          }),
        ],
      })

      const html = await renderHtml(presentation)

      // Multiple text boxes should have data-inches attributes
      const dataInchesCount = (html.match(/data-inches-x="/g) || []).length
      expect(dataInchesCount).toBeGreaterThan(0)
    })

    it("should include data-inches attributes for border boxes", async () => {
      const presentation = new Presentation({
        slides: [
          new ContentSlide({
            title: "Grid",
            layout: new GridLayout({
              rows: 2,
              cols: 2,
              cells: [
                new TextBlock({ body: "1" }),
                new TextBlock({ body: "2" }),
                new TextBlock({ body: "3" }),
                new TextBlock({ body: "4" }),
              ],
            }),
          }),
        ],
      })

      const html = await renderHtml(presentation)

      // Border boxes should also have data-inches attributes
      expect(html).toContain('class="border-box"')
      expect(html).toContain('data-inches-x="')
    })

    it("should have numeric values for data-inches attributes", async () => {
      const presentation = new Presentation({
        slides: [new TitleSlide({ title: "Numeric Test" })],
      })

      const html = await renderHtml(presentation)

      // Extract a data-inches-x value and verify it's a valid number
      const match = html.match(/data-inches-x="([\d.]+)"/)
      expect(match).toBeTruthy()
      if (match) {
        const value = parseFloat(match[1])
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(10) // Within slide width
      }
    })
  })

  describe("Multiple slides", () => {
    it("should render multiple slides with correct structure", async () => {
      const presentation = new Presentation({
        slides: [
          new TitleSlide({ title: "Slide 1" }),
          new ContentSlide({
            title: "Slide 2",
            layout: new DefaultLayout({
              sections: [new TextBlock({ body: "Content" })],
            }),
          }),
          new TitleSlide({ title: "Slide 3" }),
        ],
      })

      const html = await renderHtml(presentation)

      // Should have 3 slide elements (match opening div tag)
      const slideCount = (html.match(/<div class="slide /g) || []).length
      expect(slideCount).toBe(3)

      // Should have slide counter showing 3 total slides
      expect(html).toContain('<span id="total-slides">3</span>')

      // Should contain all slide content
      expect(html).toContain("Slide 1")
      expect(html).toContain("Slide 2")
      expect(html).toContain("Slide 3")
      expect(html).toContain("Content")
    })
  })

  describe("HTML escaping", () => {
    it("should escape HTML special characters in text content", async () => {
      const presentation = new Presentation({
        slides: [new TitleSlide({ title: "Test <tag> & \"quotes\"" })],
      })

      const html = await renderHtml(presentation)

      // Should escape <, >, &, and "
      expect(html).toContain("&lt;tag&gt;")
      expect(html).toContain("&amp;")
      expect(html).toContain("&quot;")
    })
  })

  describe("Slide navigation controls", () => {
    it("should include navigation buttons", async () => {
      const presentation = new Presentation({
        slides: [new TitleSlide({ title: "Test" })],
      })

      const html = await renderHtml(presentation)

      expect(html).toContain('<button id="prev-btn">← Previous</button>')
      expect(html).toContain('<button id="next-btn">Next →</button>')
    })

    it("should include keyboard navigation script", async () => {
      const presentation = new Presentation({
        slides: [new TitleSlide({ title: "Test" })],
      })

      const html = await renderHtml(presentation)

      expect(html).toContain("addEventListener('keydown'")
      expect(html).toContain("ArrowRight")
      expect(html).toContain("ArrowLeft")
    })
  })
})

describe("html-renderer - links", () => {
  const deckWithBody = (body: string) =>
    new Presentation({
      slides: [
        new ContentSlide({
          title: "リンク",
          layout: new DefaultLayout({ sections: [new TextBlock({ heading: "H", body })] }),
        }),
      ],
    })

  it("should render an external link as a safe anchor", async () => {
    const html = await renderHtml(deckWithBody("[Anthropic](https://anthropic.com)"))
    expect(html).toContain('<a class="ext-link" href="https://anthropic.com"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain(">Anthropic</a>")
  })

  it("should render an internal link as an in-page anchor carrying its target", async () => {
    const html = await renderHtml(deckWithBody("[[intro|はじめに]]"))
    expect(html).toContain(
      '<a class="wikilink" href="#intro" data-wikilink="intro" data-slide-ref="intro">はじめに</a>'
    )
  })

  it("should keep the local slide id addressable when the ref names another deck", async () => {
    // **単体 HTML の内部リンクが死ぬのを止める1本。** ビューアは data-wikilink
    // （サイト全体の参照）で解決表を引くが、単体 HTML は1デッキしか知らないので
    // data-slide-ref（ローカルの ID）でスライド番号を引く。1属性に畳むと
    // Wiki だけ動いて単体 HTML と PPTX のリンクが黙って死ぬ
    const html = await renderHtml(deckWithBody("[剪定](/patterns-wiki.md#剪定)"))
    expect(html).toContain('data-wikilink="patterns-wiki/剪定"')
    expect(html).toContain('data-slide-ref="剪定"')
    expect(html).toContain('href="#剪定"')
  })

  it("should never leak raw link syntax into the rendered slide", async () => {
    const html = await renderHtml(deckWithBody("[[intro]] と [x](https://e.com)"))
    const slideMarkup = html.slice(
      html.indexOf('<div class="slide content-slide"'),
      html.indexOf('<div class="slide-counter">')
    )
    expect(slideMarkup).not.toBe("")
    expect(slideMarkup).not.toContain("[[")
    expect(slideMarkup).not.toContain("](")
  })

  it("should escape quotes in an href instead of breaking out of the attribute", async () => {
    const html = await renderHtml(deckWithBody('[x](https://e.com/"onmouseover=alert(1))'))
    expect(html).not.toContain('"onmouseover=alert(1)')
    expect(html).toContain("&quot;onmouseover=alert(1)")
  })

  it("should render links inside a takeaway", async () => {
    const pres = new Presentation({
      slides: [
        new ContentSlide({
          title: "出典",
          layout: new DefaultLayout({
            sections: [new TextBlock({ heading: "H", body: "b" })],
            takeaway: "出典: [調査](https://example.com)",
          }),
        }),
      ],
    })
    const html = await renderHtml(pres)
    expect(html).toContain('href="https://example.com"')
  })

  it("should emit no id attribute inside slide markup (clone safety for previews)", async () => {
    // Wiki のホバープレビューはスライド DOM を cloneNode する。
    // スライド内に id= があると、プレビューを開いた瞬間に id が重複する。
    const html = await renderHtml(deckWithBody("[[a]] plain body"))
    const slideMarkup = html.slice(
      html.indexOf('<div class="slide content-slide"'),
      html.indexOf('<div class="slide-counter">')
    )
    expect(slideMarkup).not.toBe("")
    expect(slideMarkup).not.toMatch(/\sid="/)
  })
})
