import { describe, it, expect } from "vitest"
import {
  layoutTitleSlide,
  layoutDefault,
  layoutLeftRight,
  layoutTopBottom,
  layoutGrid,
  layoutIconColumns,
  layoutIconCards,
  layoutSteps,
  layoutLeanCanvas,
  layoutNumberedList,
  layoutContentSlide,
  layoutSlide,
  calculateGridSpacing,
  estimateTextHeight,
} from "../src/renderer/layout/index.js"
import { layoutTextOnly } from "../src/plugins/text-only/layout.js"
import {
  TAKEAWAY_HEIGHT,
  TAKEAWAY_GAP,
  SLIDE_HEIGHT,
  MARGIN_Y,
  MARGIN_X,
  SLIDE_WIDTH,
} from "../src/constants.js"
import {
  ICON_CARD_ACCENT_HEIGHT,
  ICON_CARD_ICON_HEIGHT,
  ICON_CARD_HEADING_HEIGHT,
  ICON_CARD_BODY_HEIGHT,
  ICON_CARD_PADDING,
  ICON_CARD_INNER_GAP,
} from "../src/plugins/icon-layout/constants.js"
import { DEFAULT_THEME } from "../src/schema/theme.js"
import {
  TitleSlide,
  ContentSlide,
  DefaultLayout,
  LeftRightLayout,
  GridLayout,
  TextBlock,
} from "../src/schema/presentation.js"

describe("layout-engine baseline snapshots", () => {
  describe("layoutTitleSlide", () => {
    it("should match title slide layout with title and subtitle", () => {
      const slide = new TitleSlide({ title: "Test Title", subtitle: "Test Subtitle" })
      const result = layoutTitleSlide(slide, DEFAULT_THEME)
      expect(result).toMatchSnapshot()
    })

    it("should match title slide layout with title only", () => {
      const slide = new TitleSlide({ title: "Title Only" })
      const result = layoutTitleSlide(slide, DEFAULT_THEME)
      expect(result).toMatchSnapshot()
    })
  })

  describe("layoutDefault", () => {
    it("should match default layout with 2 sections (heading + body)", () => {
      const sections = [
        new TextBlock({ heading: "Section 1", body: "Body text 1" }),
        new TextBlock({ heading: "Section 2", body: "Body text 2" }),
      ]
      const result = layoutDefault(sections, 1.0, DEFAULT_THEME)
      expect(result).toMatchSnapshot()
    })

    it("should match default layout with heading-only sections", () => {
      const sections = [
        new TextBlock({ heading: "Heading 1" }),
        new TextBlock({ heading: "Heading 2" }),
      ]
      const result = layoutDefault(sections, 1.0, DEFAULT_THEME)
      expect(result).toMatchSnapshot()
    })

    it("should match default layout with body-only sections", () => {
      const sections = [
        new TextBlock({ body: "Body only 1" }),
        new TextBlock({ body: "Body only 2" }),
      ]
      const result = layoutDefault(sections, 1.0, DEFAULT_THEME)
      expect(result).toMatchSnapshot()
    })

    it("should emit paragraphs with bullets for a list body", () => {
      const sections = [new TextBlock({ heading: "H", body: "- first\n- second" })]
      const result = layoutDefault(sections, 1.0, DEFAULT_THEME)

      const bodyBox = result.textBoxes.find(box => box.paragraphs !== undefined)
      expect(bodyBox).toBeDefined()
      expect(bodyBox!.richText).toBeUndefined()
      expect(bodyBox!.paragraphs).toHaveLength(2)
      expect(bodyBox!.paragraphs![0].bullet).toEqual({ type: "bullet" })
      expect(bodyBox!.paragraphs![0].runs.map(r => r.text).join("")).toBe("first")
    })

    it("should keep non-list bodies on the richText path", () => {
      const sections = [new TextBlock({ heading: "H", body: "plain body" })]
      const result = layoutDefault(sections, 1.0, DEFAULT_THEME)

      const bodyBox = result.textBoxes.find(box => box.richText !== undefined && !box.isBold)
      expect(bodyBox).toBeDefined()
      expect(bodyBox!.paragraphs).toBeUndefined()
    })
  })

  describe("layoutLeftRight", () => {
    it("should match left-right layout with 2:1 ratio", () => {
      const leftSections = [new TextBlock({ heading: "Left Section", body: "Left content here" })]
      const rightSections = [new TextBlock({ heading: "Right Section", body: "Right content here" })]
      const result = layoutLeftRight(2, 1, leftSections, rightSections, 1.0, DEFAULT_THEME)
      expect(result).toMatchSnapshot()
    })

    it("should match left-right layout with 1:1 ratio", () => {
      const leftSections = [
        new TextBlock({ heading: "Left 1", body: "Content 1" }),
        new TextBlock({ heading: "Left 2", body: "Content 2" }),
      ]
      const rightSections = [new TextBlock({ heading: "Right", body: "Right content" })]
      const result = layoutLeftRight(1, 1, leftSections, rightSections, 1.0, DEFAULT_THEME)
      expect(result).toMatchSnapshot()
    })

    it("should match left-right layout with borderBoxes", () => {
      const leftSections = [new TextBlock({ heading: "Left" })]
      const rightSections = [new TextBlock({ heading: "Right" })]
      const result = layoutLeftRight(2, 1, leftSections, rightSections, 1.0, DEFAULT_THEME)

      expect(result.borderBoxes).toBeDefined()
      expect(result.borderBoxes).toHaveLength(2)
      expect(result).toMatchSnapshot()
    })
  })

  describe("layoutTopBottom", () => {
    it("should match top-bottom layout with 4:1 ratio", () => {
      const topSections = [new TextBlock({ heading: "Top Section", body: "Top content here" })]
      const bottomSections = [new TextBlock({ heading: "Bottom Section", body: "Bottom content here" })]
      const result = layoutTopBottom(4, 1, topSections, bottomSections, 1.0, DEFAULT_THEME)
      expect(result).toMatchSnapshot()
    })

    it("should match top-bottom layout with 1:1 ratio", () => {
      const topSections = [
        new TextBlock({ heading: "Top 1", body: "Content 1" }),
        new TextBlock({ heading: "Top 2", body: "Content 2" }),
      ]
      const bottomSections = [new TextBlock({ heading: "Bottom", body: "Bottom content" })]
      const result = layoutTopBottom(1, 1, topSections, bottomSections, 1.0, DEFAULT_THEME)
      expect(result).toMatchSnapshot()
    })

    it("should match top-bottom layout with borderBoxes", () => {
      const topSections = [new TextBlock({ heading: "Top" })]
      const bottomSections = [new TextBlock({ heading: "Bottom" })]
      const result = layoutTopBottom(4, 1, topSections, bottomSections, 1.0, DEFAULT_THEME)

      expect(result.borderBoxes).toBeDefined()
      expect(result.borderBoxes).toHaveLength(2)
      expect(result).toMatchSnapshot()
    })
  })

  describe("layoutGrid", () => {
    it("should match grid layout 2x2", () => {
      const cells = [
        new TextBlock({ heading: "Cell 1", body: "Content 1" }),
        new TextBlock({ heading: "Cell 2", body: "Content 2" }),
        new TextBlock({ heading: "Cell 3", body: "Content 3" }),
        new TextBlock({ heading: "Cell 4", body: "Content 4" }),
      ]
      const result = layoutGrid(2, 2, cells, 1.0, DEFAULT_THEME)
      expect(result).toMatchSnapshot()
    })

    it("should match grid layout 1x3 (single row)", () => {
      const cells = [
        new TextBlock({ heading: "Cell 1" }),
        new TextBlock({ heading: "Cell 2" }),
        new TextBlock({ heading: "Cell 3" }),
      ]
      const result = layoutGrid(1, 3, cells, 1.0, DEFAULT_THEME)
      expect(result).toMatchSnapshot()
    })

    it("should match grid layout 3x1 (single column)", () => {
      const cells = [
        new TextBlock({ body: "Content 1" }),
        new TextBlock({ body: "Content 2" }),
        new TextBlock({ body: "Content 3" }),
      ]
      const result = layoutGrid(3, 1, cells, 1.0, DEFAULT_THEME)
      expect(result).toMatchSnapshot()
    })

    it("should match grid layout with borderBoxes", () => {
      const cells = [
        new TextBlock({ heading: "A" }),
        new TextBlock({ heading: "B" }),
        new TextBlock({ heading: "C" }),
        new TextBlock({ heading: "D" }),
      ]
      const result = layoutGrid(2, 2, cells, 1.0, DEFAULT_THEME)

      expect(result.borderBoxes).toBeDefined()
      expect(result.borderBoxes).toHaveLength(4)
      expect(result).toMatchSnapshot()
    })
  })

  describe("layoutLeanCanvas", () => {
    it("should match lean canvas layout with 9 blocks", () => {
      const blocks = [
        new TextBlock({ heading: "Problem", body: "High costs" }),
        new TextBlock({ heading: "Solution", body: "Platform" }),
        new TextBlock({ heading: "UVP", body: "Quality at low cost" }),
        new TextBlock({ heading: "Unfair Advantage", body: "Network" }),
        new TextBlock({ heading: "Customer Segments", body: "Startups" }),
        new TextBlock({ heading: "Key Metrics", body: "Conversion" }),
        new TextBlock({ heading: "Channels", body: "Online" }),
        new TextBlock({ heading: "Cost Structure", body: "Development" }),
        new TextBlock({ heading: "Revenue Streams", body: "Commission" }),
      ]
      const result = layoutLeanCanvas(blocks, 1.0, DEFAULT_THEME)
      expect(result).toMatchSnapshot()
    })

    it("should always generate 9 borderBoxes even with fewer blocks", () => {
      const blocks = [
        new TextBlock({ heading: "Problem", body: "Issue" }),
        new TextBlock({ heading: "Solution", body: "Fix" }),
      ]
      const result = layoutLeanCanvas(blocks, 1.0, DEFAULT_THEME)

      expect(result.borderBoxes).toBeDefined()
      expect(result.borderBoxes).toHaveLength(9)
      expect(result.textBoxes).toHaveLength(4) // 2 blocks × 2 textBoxes (heading + body)
    })

    it("should handle empty blocks gracefully", () => {
      const blocks: TextBlock[] = []
      const result = layoutLeanCanvas(blocks, 1.0, DEFAULT_THEME)

      expect(result.borderBoxes).toHaveLength(9)
      expect(result.textBoxes).toHaveLength(0)
      expect(result).toMatchSnapshot()
    })

    it("should handle exactly 9 blocks", () => {
      const blocks = [
        new TextBlock({ heading: "Problem", body: "Content 1" }),
        new TextBlock({ heading: "Solution", body: "Content 2" }),
        new TextBlock({ heading: "Unique Value Proposition", body: "Content 3" }),
        new TextBlock({ heading: "Unfair Advantage", body: "Content 4" }),
        new TextBlock({ heading: "Customer Segments", body: "Content 5" }),
        new TextBlock({ heading: "Key Metrics", body: "Content 6" }),
        new TextBlock({ heading: "Channels", body: "Content 7" }),
        new TextBlock({ heading: "Cost Structure", body: "Content 8" }),
        new TextBlock({ heading: "Revenue Streams", body: "Content 9" }),
      ]
      const result = layoutLeanCanvas(blocks, 1.0, DEFAULT_THEME)

      expect(result.borderBoxes).toHaveLength(9)
      expect(result.textBoxes.length).toBeGreaterThan(0)
    })

    it("should use gridHeadingSize and gridBodySize from theme", () => {
      const blocks = [new TextBlock({ heading: "Problem", body: "Body" })]
      const result = layoutLeanCanvas(blocks, 1.0, DEFAULT_THEME)

      // Verify that textBoxes exist and have the expected font sizes
      expect(result.textBoxes.length).toBeGreaterThan(0)
      const headingBox = result.textBoxes.find(box =>
        (box.richText && box.richText[0]?.text === "Problem") || box.text === "Problem"
      )
      const bodyBox = result.textBoxes.find(box =>
        (box.richText && box.richText[0]?.text === "Body") || box.text === "Body"
      )

      expect(headingBox?.fontSize).toBe(DEFAULT_THEME.contentSlide.gridHeadingSize)
      expect(bodyBox?.fontSize).toBe(DEFAULT_THEME.contentSlide.gridBodySize)
    })
  })

  describe("layoutIconColumns", () => {
    it("should match icon column layout with emoji icons", () => {
      const columns = [
        { heading: "Vision", icon: "👁️", body: "See the future" },
        { heading: "Growth", icon: "🌱", body: "Continuous improvement" },
        { heading: "Speed", icon: "⚡", body: "Fast delivery" },
      ] as const
      const result = layoutIconColumns(columns, undefined, 1.0, DEFAULT_THEME)
      expect(result).toMatchSnapshot()
    })

    it("should match icon column layout with Material Icons", () => {
      const columns = [
        { heading: "Home", icon: "mi:home", body: "Back to start" },
        { heading: "Search", icon: "mi:search:outlined", body: "Find content" },
        { heading: "Settings", icon: "mi:settings:round", body: "Configure app" },
      ] as const
      const result = layoutIconColumns(columns, undefined, 1.0, DEFAULT_THEME)
      expect(result).toMatchSnapshot()
    })

    it("should match icon column layout with takeaway", () => {
      const columns = [
        { heading: "Fast", icon: "⚡" },
        { heading: "Reliable", icon: "🔒" },
        { heading: "Scalable", icon: "📈" },
      ] as const
      const takeaway = "Our Core Values"
      const result = layoutIconColumns(columns, takeaway, 1.0, DEFAULT_THEME)
      expect(result).toMatchSnapshot()
    })

    it("should have iconBoxes instead of textBoxes for icons", () => {
      const columns = [
        { heading: "Test", icon: "mi:check", body: "Body" },
        { heading: "Dev", icon: "mi:code", body: "Code" },
        { heading: "Prod", icon: "mi:cloud", body: "Deploy" },
      ] as const
      const result = layoutIconColumns(columns, undefined, 1.0, DEFAULT_THEME)

      expect(result.iconBoxes).toBeDefined()
      expect(result.iconBoxes).toHaveLength(3)
      expect(result.iconBoxes![0].icon).toBe("mi:check")
      expect(result.iconBoxes![1].icon).toBe("mi:code")
      expect(result.iconBoxes![2].icon).toBe("mi:cloud")
    })

    it("should have borderBoxes for columns", () => {
      const columns = [
        { heading: "A", icon: "👁️" },
        { heading: "B", icon: "🔍" },
        { heading: "C", icon: "⚙️" },
      ] as const
      const result = layoutIconColumns(columns, undefined, 1.0, DEFAULT_THEME)

      expect(result.borderBoxes).toBeDefined()
      expect(result.borderBoxes).toHaveLength(3)
    })
  })

  describe("layoutNumberedList", () => {
    it("should match circle variant with 3 items", () => {
      const items = [
        new TextBlock({ heading: "Item 1", body: "Body 1" }),
        new TextBlock({ heading: "Item 2", body: "Body 2" }),
        new TextBlock({ heading: "Item 3", body: "Body 3" }),
      ]
      const result = layoutNumberedList("circle", items, 1.0, DEFAULT_THEME)
      expect(result).toMatchSnapshot()
    })

    it("should match bar variant with 3 items", () => {
      const items = [
        new TextBlock({ heading: "Item 1", body: "Body 1" }),
        new TextBlock({ heading: "Item 2", body: "Body 2" }),
        new TextBlock({ heading: "Item 3", body: "Body 3" }),
      ]
      const result = layoutNumberedList("bar", items, 1.0, DEFAULT_THEME)
      expect(result).toMatchSnapshot()
    })

    it("should generate shapeBoxes for circle variant", () => {
      const items = [
        new TextBlock({ heading: "Item 1", body: "Body 1" }),
        new TextBlock({ heading: "Item 2", body: "Body 2" }),
      ]
      const result = layoutNumberedList("circle", items, 1.0, DEFAULT_THEME)

      expect(result.shapeBoxes).toBeDefined()
      // 2 badges (ellipse) + 1 separator (line) = 3
      expect(result.shapeBoxes).toHaveLength(3)

      // Item 1: badge (ellipse), then separator (line)
      expect(result.shapeBoxes![0].shapeType).toBe("ellipse")
      expect(result.shapeBoxes![0].text).toBe("1")
      expect(result.shapeBoxes![1].shapeType).toBe("line") // separator

      // Item 2: badge (ellipse), no separator
      expect(result.shapeBoxes![2].shapeType).toBe("ellipse")
      expect(result.shapeBoxes![2].text).toBe("2")
    })

    it("should generate shapeBoxes for bar variant with alternating rows", () => {
      const items = [
        new TextBlock({ heading: "Item 1", body: "Body 1" }),
        new TextBlock({ heading: "Item 2", body: "Body 2" }),
        new TextBlock({ heading: "Item 3", body: "Body 3" }),
      ]
      const result = layoutNumberedList("bar", items, 1.0, DEFAULT_THEME)

      expect(result.shapeBoxes).toBeDefined()
      // 1 alt row bg (item 2) + 3 badges (rect) + 3 accent bars (rect) = 7
      expect(result.shapeBoxes).toHaveLength(7)

      // First shape should be alt row bg for item 2
      const altRowShapes = result.shapeBoxes!.filter(
        s => s.fillColor === DEFAULT_THEME.numberedList.altRowColor
      )
      expect(altRowShapes).toHaveLength(1)
    })

    it("should cycle badge colors from theme palette", () => {
      const items = Array.from({ length: 5 }, (_, i) =>
        new TextBlock({ heading: `Item ${i + 1}` })
      )
      const result = layoutNumberedList("circle", items, 1.0, DEFAULT_THEME)

      const badges = result.shapeBoxes!.filter(s => s.shapeType === "ellipse")
      expect(badges).toHaveLength(5)
      expect(badges[0].fillColor).toBe(DEFAULT_THEME.numberedList.badgeColors[0])
      expect(badges[1].fillColor).toBe(DEFAULT_THEME.numberedList.badgeColors[1])
      expect(badges[4].fillColor).toBe(DEFAULT_THEME.numberedList.badgeColors[4])
    })

    it("should add takeaway to numbered list", () => {
      const items = [new TextBlock({ heading: "Item 1", body: "Body 1" })]
      const result = layoutNumberedList("circle", items, 1.0, DEFAULT_THEME, "Key takeaway")

      const takeawayBox = result.textBoxes.find(b => b.text === "Key takeaway")
      expect(takeawayBox).toBeDefined()
      expect(takeawayBox!.isBold).toBe(true)
      expect(takeawayBox!.align).toBe("center")
    })
  })

  describe("layoutContentSlide", () => {
    it("should match content slide with default layout", () => {
      const slide = new ContentSlide({
        title: "Content Title",
        layout: new DefaultLayout({
          sections: [new TextBlock({ heading: "Section", body: "Body" })],
        }),
      })
      const result = layoutContentSlide(slide as any, DEFAULT_THEME)
      expect(result).toMatchSnapshot()
    })

    it("should match content slide with left-right layout", () => {
      const slide = new ContentSlide({
        title: "Split Layout",
        layout: new LeftRightLayout({
          leftRatio: 2,
          rightRatio: 1,
          leftSections: [new TextBlock({ heading: "Left" })],
          rightSections: [new TextBlock({ heading: "Right" })],
        }),
      })
      const result = layoutContentSlide(slide as any, DEFAULT_THEME)
      expect(result).toMatchSnapshot()
    })

    it("should match content slide with grid layout", () => {
      const slide = new ContentSlide({
        title: "Grid Layout",
        layout: new GridLayout({
          rows: 2,
          cols: 2,
          cells: [
            new TextBlock({ heading: "1" }),
            new TextBlock({ heading: "2" }),
            new TextBlock({ heading: "3" }),
            new TextBlock({ heading: "4" }),
          ],
        }),
      })
      const result = layoutContentSlide(slide as any, DEFAULT_THEME)
      expect(result).toMatchSnapshot()
    })
  })

  describe("layoutSlide", () => {
    it("should match title slide dispatch", () => {
      const slide = new TitleSlide({ title: "Main Title", subtitle: "Subtitle" })
      const result = layoutSlide(slide, DEFAULT_THEME)
      expect(result).toMatchSnapshot()
    })

    it("should match content slide dispatch", () => {
      const slide = new ContentSlide({
        title: "Content",
        layout: new DefaultLayout({
          sections: [new TextBlock({ heading: "Test", body: "Content" })],
        }),
      })
      const result = layoutSlide(slide as any, DEFAULT_THEME)
      expect(result).toMatchSnapshot()
    })
  })

  describe("calculateGridSpacing", () => {
    it("should return largest font sizes for 1x1 grid", () => {
      const spacing = calculateGridSpacing(1, 1, DEFAULT_THEME)
      expect(spacing.headingSize).toBe(18)
      expect(spacing.bodySize).toBe(16)
      expect(spacing.headingHeight).toBe(0.22)
      expect(spacing.headingBodyGap).toBe(0.08)
      expect(spacing.bodyHeight).toBe(0.3)
      expect(spacing.padding).toBe(0.1)
    })

    it("should return medium font sizes for 2x2 grid", () => {
      const spacing = calculateGridSpacing(2, 2, DEFAULT_THEME)
      expect(spacing.headingSize).toBe(16)
      expect(spacing.bodySize).toBe(14)
      expect(spacing.headingHeight).toBe(0.22)
      expect(spacing.headingBodyGap).toBe(0.07)
      expect(spacing.bodyHeight).toBe(0.3)
      expect(spacing.padding).toBe(0.08)
    })

    it("should return medium font sizes for 2x1 grid (max=2)", () => {
      const spacing = calculateGridSpacing(2, 1, DEFAULT_THEME)
      expect(spacing.headingSize).toBe(16)
      expect(spacing.bodySize).toBe(14)
      expect(spacing.padding).toBe(0.08)
    })

    it("should return smaller font sizes for 3x3 grid", () => {
      const spacing = calculateGridSpacing(3, 3, DEFAULT_THEME)
      expect(spacing.headingSize).toBe(14)
      expect(spacing.bodySize).toBe(12)
      expect(spacing.headingHeight).toBe(0.18)
      expect(spacing.headingBodyGap).toBe(0.06)
      expect(spacing.bodyHeight).toBe(0.25)
      expect(spacing.padding).toBe(0.05)
    })

    it("should return dense grid values for 4x4 grid", () => {
      const spacing = calculateGridSpacing(4, 4, DEFAULT_THEME)
      expect(spacing.headingSize).toBe(12)
      expect(spacing.bodySize).toBe(10)
      expect(spacing.headingHeight).toBe(0.15)
      expect(spacing.headingBodyGap).toBe(0.05)
      expect(spacing.bodyHeight).toBe(0.2)
      expect(spacing.padding).toBe(0.03)
    })

    it("should use max(rows, cols) for asymmetric grids like 1x3", () => {
      const spacing = calculateGridSpacing(1, 3, DEFAULT_THEME)
      expect(spacing.headingSize).toBe(14)
      expect(spacing.bodySize).toBe(12)
      expect(spacing.padding).toBe(0.05)
    })

    it("should use custom theme headingSize/bodySize as base", () => {
      const customTheme = {
        ...DEFAULT_THEME,
        contentSlide: { ...DEFAULT_THEME.contentSlide, headingSize: 24, bodySize: 20 },
      }
      const spacing = calculateGridSpacing(1, 1, customTheme)
      expect(spacing.headingSize).toBe(24)
      expect(spacing.bodySize).toBe(20)
    })

    it("should apply density scaling to custom theme values", () => {
      const customTheme = {
        ...DEFAULT_THEME,
        contentSlide: { ...DEFAULT_THEME.contentSlide, headingSize: 24, bodySize: 20 },
      }
      const s2 = calculateGridSpacing(2, 2, customTheme)
      expect(s2.headingSize).toBe(22)
      expect(s2.bodySize).toBe(18)

      const s3 = calculateGridSpacing(3, 3, customTheme)
      expect(s3.headingSize).toBe(20)
      expect(s3.bodySize).toBe(16)

      const s4 = calculateGridSpacing(4, 4, customTheme)
      expect(s4.headingSize).toBe(18)
      expect(s4.bodySize).toBe(14)
    })

    it("should enforce minimum font size of 6", () => {
      const tinyTheme = {
        ...DEFAULT_THEME,
        contentSlide: { ...DEFAULT_THEME.contentSlide, headingSize: 8, bodySize: 7 },
      }
      const spacing = calculateGridSpacing(4, 4, tinyTheme)
      expect(spacing.headingSize).toBe(6)
      expect(spacing.bodySize).toBe(6)
    })
  })

  describe("coordinate precision", () => {
    it("should calculate exact grid dimensions for 2x2", () => {
      const cells = [
        new TextBlock({ heading: "1" }),
        new TextBlock({ heading: "2" }),
        new TextBlock({ heading: "3" }),
        new TextBlock({ heading: "4" }),
      ]
      const result = layoutGrid(2, 2, cells, 1.0, DEFAULT_THEME)

      // Verify border boxes have expected dimensions
      expect(result.borderBoxes).toHaveLength(4)

      // Cell width calculation: (SLIDE_WIDTH - 2*MARGIN_X - (cols-1)*CELL_GAP) / cols
      // = (10 - 2*0.4 - 1*0.08) / 2 = 9.12 / 2 = 4.56
      const expectedCellWidth = 4.56

      // Cell height calculation: (SLIDE_HEIGHT - titleY - MARGIN_Y - (rows-1)*CELL_GAP) / rows
      // = (5.625 - 1.0 - 0.3 - 1*0.08) / 2 = 4.245 / 2 = 2.1225
      const expectedCellHeight = 2.1225

      result.borderBoxes!.forEach(box => {
        expect(box.w).toBeCloseTo(expectedCellWidth, 4)
        expect(box.h).toBeCloseTo(expectedCellHeight, 4)
      })
    })

    it("should calculate exact column widths for 2:1 ratio", () => {
      const leftSections = [new TextBlock({ heading: "Left" })]
      const rightSections = [new TextBlock({ heading: "Right" })]
      const result = layoutLeftRight(2, 1, leftSections, rightSections, 1.0, DEFAULT_THEME)

      // Verify border boxes exist
      expect(result.borderBoxes).toHaveLength(2)

      // Left width calculation: (contentWidth - CELL_GAP) * (leftRatio/totalRatio)
      // contentWidth = SLIDE_WIDTH - 2*MARGIN_X = 10 - 0.8 = 9.2
      // leftWidth = (9.2 - 0.08) * (2/3) = 9.12 * (2/3) = 6.08
      const expectedLeftWidth = 6.08

      // Right width calculation: (contentWidth - CELL_GAP) * (rightRatio/totalRatio)
      // rightWidth = (9.2 - 0.08) * (1/3) = 9.12 * (1/3) = 3.04
      const expectedRightWidth = 3.04

      expect(result.borderBoxes![0].w).toBeCloseTo(expectedLeftWidth, 4)
      expect(result.borderBoxes![1].w).toBeCloseTo(expectedRightWidth, 4)
    })

    it("should calculate exact grid dimensions for 1x3 (single row)", () => {
      const cells = [
        new TextBlock({ heading: "1" }),
        new TextBlock({ heading: "2" }),
        new TextBlock({ heading: "3" }),
      ]
      const result = layoutGrid(1, 3, cells, 1.0, DEFAULT_THEME)

      expect(result.borderBoxes).toHaveLength(3)

      // Cell width: (contentWidth - (cols-1)*CELL_GAP) / cols
      // = (9.2 - 2*0.08) / 3 = 9.04 / 3 = 3.013333...
      const expectedCellWidth = 9.04 / 3

      result.borderBoxes!.forEach(box => {
        expect(box.w).toBeCloseTo(expectedCellWidth, 4)
      })
    })

    it("should calculate exact grid dimensions for 3x1 (single column)", () => {
      const cells = [
        new TextBlock({ body: "1" }),
        new TextBlock({ body: "2" }),
        new TextBlock({ body: "3" }),
      ]
      const result = layoutGrid(3, 1, cells, 1.0, DEFAULT_THEME)

      expect(result.borderBoxes).toHaveLength(3)

      // Cell height: (availableHeight - (rows-1)*CELL_GAP) / rows
      // availableHeight = SLIDE_HEIGHT - titleY - MARGIN_Y = 5.625 - 1.0 - 0.3 = 4.325
      // cellHeight = (4.325 - 2*0.08) / 3 = 4.165 / 3 = 1.388333...
      const expectedCellHeight = 4.165 / 3

      result.borderBoxes!.forEach(box => {
        expect(box.h).toBeCloseTo(expectedCellHeight, 4)
      })
    })

    it("should calculate exact row heights for 4:1 top-bottom ratio", () => {
      const topSections = [new TextBlock({ heading: "Top" })]
      const bottomSections = [new TextBlock({ heading: "Bottom" })]
      const result = layoutTopBottom(4, 1, topSections, bottomSections, 1.0, DEFAULT_THEME)

      // Verify border boxes have expected dimensions
      expect(result.borderBoxes).toHaveLength(2)

      // availableHeight = SLIDE_HEIGHT - titleY - MARGIN_Y = 5.625 - 1.0 - 0.3 = 4.325
      // topHeight = (4.325 - 0.08) * (4/5) = 4.245 * 0.8 = 3.396
      const expectedTopHeight = 3.396

      // bottomHeight = (4.325 - 0.08) * (1/5) = 4.245 * 0.2 = 0.849
      const expectedBottomHeight = 0.849

      // availableWidth = SLIDE_WIDTH - 2*MARGIN_X = 10 - 0.8 = 9.2
      const expectedWidth = 9.2

      expect(result.borderBoxes![0].h).toBeCloseTo(expectedTopHeight, 4)
      expect(result.borderBoxes![0].w).toBeCloseTo(expectedWidth, 4)
      expect(result.borderBoxes![1].h).toBeCloseTo(expectedBottomHeight, 4)
      expect(result.borderBoxes![1].w).toBeCloseTo(expectedWidth, 4)

      // bottomY = titleY + topHeight + CELL_GAP = 1.0 + 3.396 + 0.08 = 4.476
      expect(result.borderBoxes![1].y).toBeCloseTo(4.476, 4)
    })

    it("should calculate exact lean canvas problem cell dimensions", () => {
      const blocks = [new TextBlock({ heading: "Problem", body: "Test" })]
      const result = layoutLeanCanvas(blocks, 1.0, DEFAULT_THEME)

      expect(result.borderBoxes).toHaveLength(9)

      // Problem cell: colStart=0, colSpan=2, rowStart=0, rowSpan=2
      // contentWidth = SLIDE_WIDTH - 2*MARGIN_X = 10 - 0.8 = 9.2
      // LEAN_CANVAS_COLS = 10
      // colWidth = (9.2 - (10-1)*0.08) / 10 = (9.2 - 0.72) / 10 = 8.48 / 10 = 0.848
      const expectedColWidth = 0.848

      // availableHeight = SLIDE_HEIGHT - titleY - MARGIN_Y = 5.625 - 1.0 - 0.3 = 4.325
      // availableRowHeight = 4.325 - 2*0.08 = 4.165
      // LEAN_CANVAS_ROW_RATIOS = [1, 1, 0.75], totalRatio = 2.75
      // rowHeights[0] = 4.165 * (1/2.75)
      // rowHeights[1] = 4.165 * (1/2.75)

      // Problem cell width: 2 * colWidth + 1 * CELL_GAP = 2 * 0.848 + 0.08 = 1.776
      const expectedProblemWidth = 2 * expectedColWidth + 0.08

      // Problem cell height: spans rows 0-1, so: rowHeights[0] + rowHeights[1] + CELL_GAP
      const rowHeight01 = 4.165 * (1 / 2.75)
      const expectedProblemHeight = 2 * rowHeight01 + 0.08

      const problemCell = result.borderBoxes![0]
      expect(problemCell.w).toBeCloseTo(expectedProblemWidth, 4)
      expect(problemCell.h).toBeCloseTo(expectedProblemHeight, 4)
    })

    it("should calculate exact lean canvas cost cell dimensions", () => {
      const blocks = Array.from({ length: 8 }, () => new TextBlock({ heading: "Test" }))
      const result = layoutLeanCanvas(blocks, 1.0, DEFAULT_THEME)

      // Cost cell: colStart=0, colSpan=5, rowStart=2, rowSpan=1
      // colWidth = 0.848
      // Cost width: 5 * 0.848 + 4 * 0.08 = 4.24 + 0.32 = 4.56
      const expectedCostWidth = 5 * 0.848 + 4 * 0.08

      // rowHeights[2] = 4.165 * (0.75/2.75)
      const expectedCostHeight = 4.165 * (0.75 / 2.75)

      const costCell = result.borderBoxes![7]
      expect(costCell.w).toBeCloseTo(expectedCostWidth, 4)
      expect(costCell.h).toBeCloseTo(expectedCostHeight, 4)
    })

    it("should calculate exact lean canvas revenue cell dimensions", () => {
      const blocks = Array.from({ length: 9 }, () => new TextBlock({ heading: "Test" }))
      const result = layoutLeanCanvas(blocks, 1.0, DEFAULT_THEME)

      // Revenue cell: colStart=5, colSpan=5, rowStart=2, rowSpan=1
      // Revenue width: same as cost = 5 * 0.848 + 4 * 0.08 = 4.56
      const expectedRevenueWidth = 5 * 0.848 + 4 * 0.08

      // rowHeights[2] = 4.165 * (0.75/2.75) (same as cost)
      const expectedRevenueHeight = 4.165 * (0.75 / 2.75)

      const revenueCell = result.borderBoxes![8]
      expect(revenueCell.w).toBeCloseTo(expectedRevenueWidth, 4)
      expect(revenueCell.h).toBeCloseTo(expectedRevenueHeight, 4)
    })
  })

  describe("takeaway support", () => {
    const takeawayText = "Takeaway content"
    const expectedTakeawayY = SLIDE_HEIGHT - MARGIN_Y - TAKEAWAY_HEIGHT // 4.725

    it("should add takeaway to default layout", () => {
      const sections = [new TextBlock({ heading: "Section 1", body: "Body text" })]
      const result = layoutDefault(sections, 1.0, DEFAULT_THEME, takeawayText)

      const takeawayBox = result.textBoxes.find(b => b.text === takeawayText)
      expect(takeawayBox).toBeDefined()
      expect(takeawayBox!.y).toBeCloseTo(expectedTakeawayY, 4)
      expect(takeawayBox!.isBold).toBe(true)
      expect(takeawayBox!.align).toBe("center")
      expect(takeawayBox!.w).toBeCloseTo(SLIDE_WIDTH - 2 * MARGIN_X, 4)
    })

    it("should not add takeaway to default layout when takeaway is undefined", () => {
      const sections = [new TextBlock({ heading: "Section 1" })]
      const result = layoutDefault(sections, 1.0, DEFAULT_THEME)

      const takeawayBox = result.textBoxes.find(b => b.y >= expectedTakeawayY)
      expect(takeawayBox).toBeUndefined()
    })

    it("should add takeaway to left-right layout and shrink columns", () => {
      const leftSections = [new TextBlock({ heading: "Left" })]
      const rightSections = [new TextBlock({ heading: "Right" })]
      const withTakeaway = layoutLeftRight(1, 1, leftSections, rightSections, 1.0, DEFAULT_THEME, takeawayText)
      const withoutTakeaway = layoutLeftRight(1, 1, leftSections, rightSections, 1.0, DEFAULT_THEME)

      // Takeaway text box present
      const takeawayBox = withTakeaway.textBoxes.find(b => b.text === takeawayText)
      expect(takeawayBox).toBeDefined()
      expect(takeawayBox!.y).toBeCloseTo(expectedTakeawayY, 4)

      // Border boxes should be shorter with takeaway
      expect(withTakeaway.borderBoxes![0].h).toBeLessThan(withoutTakeaway.borderBoxes![0].h)
      expect(withTakeaway.borderBoxes![0].h).toBeCloseTo(
        withoutTakeaway.borderBoxes![0].h - TAKEAWAY_HEIGHT - TAKEAWAY_GAP, 4
      )
    })

    it("should add takeaway to top-bottom layout and shrink rows", () => {
      const topSections = [new TextBlock({ heading: "Top" })]
      const bottomSections = [new TextBlock({ heading: "Bottom" })]
      const withTakeaway = layoutTopBottom(1, 1, topSections, bottomSections, 1.0, DEFAULT_THEME, takeawayText)
      const withoutTakeaway = layoutTopBottom(1, 1, topSections, bottomSections, 1.0, DEFAULT_THEME)

      // Takeaway text box present
      const takeawayBox = withTakeaway.textBoxes.find(b => b.text === takeawayText)
      expect(takeawayBox).toBeDefined()
      expect(takeawayBox!.y).toBeCloseTo(expectedTakeawayY, 4)

      // Total height of both rows should be smaller with takeaway
      const totalWithTakeaway = withTakeaway.borderBoxes![0].h + withTakeaway.borderBoxes![1].h
      const totalWithout = withoutTakeaway.borderBoxes![0].h + withoutTakeaway.borderBoxes![1].h
      expect(totalWithTakeaway).toBeLessThan(totalWithout)
    })

    it("should add takeaway to grid layout and shrink cells", () => {
      const cells = [
        new TextBlock({ heading: "A" }),
        new TextBlock({ heading: "B" }),
        new TextBlock({ heading: "C" }),
        new TextBlock({ heading: "D" }),
      ]
      const withTakeaway = layoutGrid(2, 2, cells, 1.0, DEFAULT_THEME, takeawayText)
      const withoutTakeaway = layoutGrid(2, 2, cells, 1.0, DEFAULT_THEME)

      // Takeaway text box present
      const takeawayBox = withTakeaway.textBoxes.find(b => b.text === takeawayText)
      expect(takeawayBox).toBeDefined()
      expect(takeawayBox!.y).toBeCloseTo(expectedTakeawayY, 4)

      // Cells should be shorter with takeaway
      expect(withTakeaway.borderBoxes![0].h).toBeLessThan(withoutTakeaway.borderBoxes![0].h)
    })

    it("should match default layout with takeaway snapshot", () => {
      const sections = [new TextBlock({ heading: "Heading", body: "Body" })]
      const result = layoutDefault(sections, 1.0, DEFAULT_THEME, takeawayText)
      expect(result).toMatchSnapshot()
    })

    it("should match left-right layout with takeaway snapshot", () => {
      const leftSections = [new TextBlock({ heading: "Left", body: "Content" })]
      const rightSections = [new TextBlock({ heading: "Right", body: "Content" })]
      const result = layoutLeftRight(2, 1, leftSections, rightSections, 1.0, DEFAULT_THEME, takeawayText)
      expect(result).toMatchSnapshot()
    })

    it("should match top-bottom layout with takeaway snapshot", () => {
      const topSections = [new TextBlock({ heading: "Top", body: "Content" })]
      const bottomSections = [new TextBlock({ heading: "Bottom", body: "Content" })]
      const result = layoutTopBottom(3, 1, topSections, bottomSections, 1.0, DEFAULT_THEME, takeawayText)
      expect(result).toMatchSnapshot()
    })

    it("should match grid layout with takeaway snapshot", () => {
      const cells = [
        new TextBlock({ heading: "A", body: "1" }),
        new TextBlock({ heading: "B", body: "2" }),
        new TextBlock({ heading: "C", body: "3" }),
        new TextBlock({ heading: "D", body: "4" }),
      ]
      const result = layoutGrid(2, 2, cells, 1.0, DEFAULT_THEME, takeawayText)
      expect(result).toMatchSnapshot()
    })
  })

  describe("layoutIconCards", () => {
    const columns = [
      { heading: "認知科学", icon: "mi:psychology", body: "人間の思考プロセスを理解" },
      { heading: "コーディング", icon: "mi:code", body: "効率的なアルゴリズム" },
      { heading: "自動化", icon: "mi:auto_awesome", body: "反復タスクを自動化" },
    ] as const

    it("should match icon cards layout with takeaway (snapshot)", () => {
      const result = layoutIconCards(columns, "テイクアウェイ", 1.0, DEFAULT_THEME)
      expect(result).toMatchSnapshot()
    })

    it("should match icon cards layout without takeaway (snapshot)", () => {
      const result = layoutIconCards(columns, undefined, 1.0, DEFAULT_THEME)
      expect(result).toMatchSnapshot()
    })

    it("should have borderBoxes with fillColor and accentColor", () => {
      const result = layoutIconCards(columns, undefined, 1.0, DEFAULT_THEME)

      expect(result.borderBoxes).toBeDefined()
      expect(result.borderBoxes).toHaveLength(3)

      // All borderBoxes should have fillColor (card background)
      result.borderBoxes!.forEach((box) => {
        expect(box.fillColor).toBe(DEFAULT_THEME.contentSlide.iconCardBackground)
      })

      // Each borderBox should have its own accentColor
      const accentColors = DEFAULT_THEME.contentSlide.iconCardAccentColors
      result.borderBoxes!.forEach((box, i) => {
        expect(box.accentColor).toBe(accentColors[i])
      })
    })

    it("should have iconBoxes with accent color matching borderBox", () => {
      const result = layoutIconCards(columns, undefined, 1.0, DEFAULT_THEME)

      expect(result.iconBoxes).toBeDefined()
      expect(result.iconBoxes).toHaveLength(3)

      const accentColors = DEFAULT_THEME.contentSlide.iconCardAccentColors
      result.iconBoxes!.forEach((box, i) => {
        expect(box.color).toBe(accentColors[i])
      })
    })

    it("should have correct vertical ordering: icon.y < heading.y < body.y", () => {
      const result = layoutIconCards(columns, undefined, 1.0, DEFAULT_THEME)

      // For each column, check vertical ordering
      for (let i = 0; i < 3; i++) {
        const iconY = result.iconBoxes![i].y
        const headingY = result.textBoxes.filter(b => b.isBold)[i].y
        const bodyY = result.textBoxes.filter(b => !b.isBold)[i].y

        expect(iconY).toBeLessThan(headingY)
        expect(headingY).toBeLessThan(bodyY)
      }
    })

    it("should calculate correct card height", () => {
      const result = layoutIconCards(columns, undefined, 1.0, DEFAULT_THEME)
      const padding = ICON_CARD_PADDING

      const expectedCardHeight =
        ICON_CARD_ACCENT_HEIGHT +
        padding +
        ICON_CARD_ICON_HEIGHT +
        ICON_CARD_INNER_GAP +
        ICON_CARD_HEADING_HEIGHT +
        ICON_CARD_INNER_GAP +
        ICON_CARD_BODY_HEIGHT +
        padding

      result.borderBoxes!.forEach((box) => {
        expect(box.h).toBeCloseTo(expectedCardHeight, 4)
      })
    })
  })

  describe("layoutSteps", () => {
    const steps5 = [
      { heading: "見る", icon: "👁", name: "観察者", body: "全体像を理解し 各フェーズの目的を 説明できる" },
      { heading: "習う", icon: "🎓", name: "見習い", body: "現場に出始め 先輩を手本に スクリプトを組む" },
      { heading: "動く", icon: "🏃", name: "実践者", body: "自律的に判断し 適切なツールを 選択できる" },
      { heading: "深める", icon: "🔬", name: "専門家", body: "理論と実践を統合 最適な設計を 提案できる" },
      { heading: "伝える", icon: "🎤", name: "指導者", body: "他者を育成し 組織の知見を 体系化できる" },
    ] as const

    const steps3 = [
      { heading: "初級", icon: "🌱", name: "ビギナー", body: "基本を学ぶ" },
      { heading: "中級", icon: "🌿", name: "アドバンス", body: "実践する" },
      { heading: "上級", icon: "🌳", name: "エキスパート", body: "指導する" },
    ] as const

    it("should match 5-step layout with takeaway (snapshot)", () => {
      const result = layoutSteps(steps5, "段階的に成長する", 1.0, DEFAULT_THEME)
      expect(result).toMatchSnapshot()
    })

    it("should match 5-step layout without takeaway (snapshot)", () => {
      const result = layoutSteps(steps5, undefined, 1.0, DEFAULT_THEME)
      expect(result).toMatchSnapshot()
    })

    it("should match 3-step layout (snapshot)", () => {
      const result = layoutSteps(steps3, undefined, 1.0, DEFAULT_THEME)
      expect(result).toMatchSnapshot()
    })

    it("should have staircase effect: box heights increase from left to right", () => {
      const result = layoutSteps(steps5, undefined, 1.0, DEFAULT_THEME)

      expect(result.borderBoxes).toBeDefined()
      expect(result.borderBoxes).toHaveLength(5)

      // Heights should increase
      for (let i = 0; i < 4; i++) {
        const currentHeight = result.borderBoxes![i].h
        const nextHeight = result.borderBoxes![i + 1].h
        expect(nextHeight).toBeGreaterThan(currentHeight)
      }
    })

    it("should align all boxes to the same bottom edge", () => {
      const result = layoutSteps(steps5, undefined, 1.0, DEFAULT_THEME)

      expect(result.borderBoxes).toBeDefined()
      expect(result.borderBoxes).toHaveLength(5)

      // Calculate bottom edge for each box (y + h)
      const bottoms = result.borderBoxes!.map(box => box.y + box.h)

      // All bottoms should be equal
      const firstBottom = bottoms[0]
      bottoms.forEach(bottom => {
        expect(bottom).toBeCloseTo(firstBottom, 4)
      })
    })

    it("should have correct number of elements", () => {
      const result = layoutSteps(steps5, undefined, 1.0, DEFAULT_THEME)

      // 5 border boxes (colored rectangles)
      expect(result.borderBoxes).toHaveLength(5)

      // 5 icon boxes
      expect(result.iconBoxes).toHaveLength(5)

      // Text boxes: 5 labels + 5 levels + 5 names + 5 descriptions + 4 arrows = 24
      const labels = result.textBoxes.filter(box => steps5.some(s => s.heading === box.text))
      const levels = result.textBoxes.filter(box => box.text.startsWith("Lv."))
      const arrows = result.textBoxes.filter(box => box.text === "→")

      expect(labels).toHaveLength(5)
      expect(levels).toHaveLength(5)
      expect(arrows).toHaveLength(4) // N-1 arrows
    })

    it("should use stepsColors from theme", () => {
      const result = layoutSteps(steps5, undefined, 1.0, DEFAULT_THEME)

      const stepsColors = DEFAULT_THEME.contentSlide.stepsColors

      // Border boxes should use step colors
      result.borderBoxes!.forEach((box, i) => {
        expect(box.fillColor).toBe(stepsColors[i % stepsColors.length])
      })

      // Icon boxes should use step colors
      result.iconBoxes!.forEach((box, i) => {
        expect(box.color).toBe(stepsColors[i % stepsColors.length])
      })
    })

    it("should have correct vertical ordering: label.y < icon.y < box.y < description.y", () => {
      const result = layoutSteps(steps5, undefined, 1.0, DEFAULT_THEME)

      for (let i = 0; i < 5; i++) {
        const labelY = result.textBoxes.find(b => b.text === steps5[i].heading)!.y
        const iconY = result.iconBoxes![i].y
        const boxY = result.borderBoxes![i].y
        const descY = result.textBoxes.find(b => b.text === steps5[i].body)!.y

        expect(labelY).toBeLessThan(iconY)
        expect(iconY).toBeLessThan(boxY)
        expect(boxY).toBeLessThan(descY)
      }
    })
  })

  describe("estimateTextHeight", () => {
    it("counts half-width characters as half the width of full-width ones", () => {
      const ascii = estimateTextHeight("a".repeat(40), 16, 2.0)
      const cjk = estimateTextHeight("あ".repeat(40), 16, 2.0)
      expect(ascii).toBeLessThan(cjk)
    })

    it("wraps ASCII at roughly twice the characters per line as CJK", () => {
      // 幅 2.0in、16pt → 全角幅 16/72in ≈ 0.222in → 全角は約9文字/行、半角は約18文字/行
      const oneLineAscii = estimateTextHeight("a".repeat(18), 16, 2.0)
      const oneLineCjk = estimateTextHeight("あ".repeat(9), 16, 2.0)
      expect(oneLineAscii).toBeCloseTo(oneLineCjk, 5)
    })

    it("still counts explicit newlines as separate lines", () => {
      const one = estimateTextHeight("a", 16, 2.0)
      const three = estimateTextHeight("a\na\na", 16, 2.0)
      expect(three).toBeGreaterThan(one * 2)
    })

    it("never returns less than the minimum box height", () => {
      // 空文字でも1行ぶんは数えるため 16pt では 16/72*1.5 + 0.05 ≈ 0.383in になる。
      // 下限 0.25 が効くのはフォントが極端に小さいときだけ。
      expect(estimateTextHeight("", 1, 2.0)).toBe(0.25)
      expect(estimateTextHeight("", 16, 2.0)).toBeGreaterThanOrEqual(0.25)
    })
  })

  describe("layoutTextOnly", () => {
    it("should emit paragraphs with bullets for a list body", () => {
      const result = layoutTextOnly("- alpha\n- beta", undefined, 1.0, DEFAULT_THEME)

      const box = result.textBoxes.find(b => b.paragraphs !== undefined)
      expect(box).toBeDefined()
      expect(box!.text).toBeUndefined()
      expect(box!.paragraphs).toHaveLength(2)
      expect(box!.paragraphs![1].runs.map(r => r.text).join("")).toBe("beta")
    })

    it("should keep non-list bodies on the plain text path", () => {
      const result = layoutTextOnly("plain prose", undefined, 1.0, DEFAULT_THEME)

      const box = result.textBoxes[0]
      expect(box.text).toBe("plain prose")
      expect(box.paragraphs).toBeUndefined()
    })
  })
})
