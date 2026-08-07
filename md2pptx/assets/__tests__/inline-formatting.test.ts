import { describe, it, expect } from "vitest"
import { parseInlineFormatting, stripInlineFormatting } from "../src/parser/inline-formatter.js"

describe("parseInlineFormatting - Phase 1 (Bold only)", () => {
  it("should parse bold text", () => {
    const runs = parseInlineFormatting("Hello **world**")
    expect(runs).toEqual([
      { text: "Hello " },
      { text: "world", bold: true }
    ])
  })

  it("should handle multiple bold segments", () => {
    const runs = parseInlineFormatting("**First** normal **second**")
    expect(runs).toEqual([
      { text: "First", bold: true },
      { text: " normal " },
      { text: "second", bold: true }
    ])
  })

  it("should handle text without formatting", () => {
    const runs = parseInlineFormatting("Plain text")
    expect(runs).toEqual([{ text: "Plain text" }])
  })

  it("should handle CJK text", () => {
    const runs = parseInlineFormatting("日本語の**太字**テスト")
    expect(runs).toEqual([
      { text: "日本語の" },
      { text: "太字", bold: true },
      { text: "テスト" }
    ])
  })

  it("should handle bold at start", () => {
    const runs = parseInlineFormatting("**Bold** at start")
    expect(runs).toEqual([
      { text: "Bold", bold: true },
      { text: " at start" }
    ])
  })

  it("should handle bold at end", () => {
    const runs = parseInlineFormatting("End with **bold**")
    expect(runs).toEqual([
      { text: "End with " },
      { text: "bold", bold: true }
    ])
  })

  it("should handle only bold text", () => {
    const runs = parseInlineFormatting("**AllBold**")
    expect(runs).toEqual([
      { text: "AllBold", bold: true }
    ])
  })

  it("should handle empty string", () => {
    const runs = parseInlineFormatting("")
    expect(runs).toEqual([{ text: "" }])
  })

  it("should handle incomplete markers", () => {
    const runs = parseInlineFormatting("**incomplete")
    expect(runs).toEqual([{ text: "**incomplete" }])
  })

  it("should handle spaces inside bold", () => {
    const runs = parseInlineFormatting("Text **with spaces** here")
    expect(runs).toEqual([
      { text: "Text " },
      { text: "with spaces", bold: true },
      { text: " here" }
    ])
  })
})

describe("stripInlineFormatting - Phase 1", () => {
  it("should strip bold markers", () => {
    expect(stripInlineFormatting("Hello **world**")).toBe("Hello world")
  })

  it("should handle multiple markers", () => {
    expect(stripInlineFormatting("**First** and **second**")).toBe("First and second")
  })

  it("should handle text without markers", () => {
    expect(stripInlineFormatting("Plain text")).toBe("Plain text")
  })

  it("should handle CJK text", () => {
    expect(stripInlineFormatting("日本語の**太字**テスト")).toBe("日本語の太字テスト")
  })

  it("should handle incomplete markers", () => {
    expect(stripInlineFormatting("**incomplete")).toBe("**incomplete")
  })
})

describe("parseInlineFormatting - Phase 3 (Inline Code)", () => {
  it("should parse inline code", () => {
    const runs = parseInlineFormatting("Use `npm install` to install")
    expect(runs).toEqual([
      { text: "Use " },
      { text: "npm install", code: true },
      { text: " to install" }
    ])
  })

  it("should handle both code and bold", () => {
    const runs = parseInlineFormatting("Use **bold** and `code`")
    expect(runs).toEqual([
      { text: "Use " },
      { text: "bold", bold: true },
      { text: " and " },
      { text: "code", code: true }
    ])
  })

  it("should handle multiple code segments", () => {
    const runs = parseInlineFormatting("`first` and `second` code")
    expect(runs).toEqual([
      { text: "first", code: true },
      { text: " and " },
      { text: "second", code: true },
      { text: " code" }
    ])
  })

  it("should handle CJK in code", () => {
    const runs = parseInlineFormatting("コマンド`npm install`を実行")
    expect(runs).toEqual([
      { text: "コマンド" },
      { text: "npm install", code: true },
      { text: "を実行" }
    ])
  })

  it("should handle all three formats together", () => {
    const runs = parseInlineFormatting("**Bold** and `code` together")
    expect(runs).toEqual([
      { text: "Bold", bold: true },
      { text: " and " },
      { text: "code", code: true },
      { text: " together" }
    ])
  })
})

describe("stripInlineFormatting - Phase 3", () => {
  it("should strip code markers", () => {
    expect(stripInlineFormatting("Use `npm install`")).toBe("Use npm install")
  })

  it("should strip both code and bold markers", () => {
    expect(stripInlineFormatting("**Bold** and `code`")).toBe("Bold and code")
  })

  it("should handle mixed CJK and markers", () => {
    expect(stripInlineFormatting("日本語の**太字**と`コード`")).toBe("日本語の太字とコード")
  })
})

describe("parseInlineFormatting - Phase 2 (Italic)", () => {
  it("should parse italic text", () => {
    const runs = parseInlineFormatting("Hello *italic*")
    expect(runs).toEqual([
      { text: "Hello " },
      { text: "italic", italic: true }
    ])
  })

  it("should handle both bold and italic", () => {
    const runs = parseInlineFormatting("**bold** and *italic*")
    expect(runs).toEqual([
      { text: "bold", bold: true },
      { text: " and " },
      { text: "italic", italic: true }
    ])
  })

  it("should handle multiple italic segments", () => {
    const runs = parseInlineFormatting("*First* and *second* italic")
    expect(runs).toEqual([
      { text: "First", italic: true },
      { text: " and " },
      { text: "second", italic: true },
      { text: " italic" }
    ])
  })

  it("should handle CJK italic", () => {
    const runs = parseInlineFormatting("日本語の*イタリック*テスト")
    expect(runs).toEqual([
      { text: "日本語の" },
      { text: "イタリック", italic: true },
      { text: "テスト" }
    ])
  })
})

describe("All formats together", () => {
  it("should handle all three formats in one string", () => {
    const runs = parseInlineFormatting("**Bold**, *italic*, and `code` together")
    expect(runs).toEqual([
      { text: "Bold", bold: true },
      { text: ", " },
      { text: "italic", italic: true },
      { text: ", and " },
      { text: "code", code: true },
      { text: " together" }
    ])
  })

  it("should handle complex mixed formatting", () => {
    const runs = parseInlineFormatting("Use `npm install` to install **packages** with *ease*")
    expect(runs).toEqual([
      { text: "Use " },
      { text: "npm install", code: true },
      { text: " to install " },
      { text: "packages", bold: true },
      { text: " with " },
      { text: "ease", italic: true }
    ])
  })

  it("should strip all three markers", () => {
    expect(stripInlineFormatting("**Bold**, *italic*, and `code`"))
      .toBe("Bold, italic, and code")
  })

  it("should handle CJK with all formats", () => {
    expect(stripInlineFormatting("日本語の**太字**と*イタリック*と`コード`"))
      .toBe("日本語の太字とイタリックとコード")
  })
})
