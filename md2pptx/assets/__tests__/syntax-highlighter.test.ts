import { describe, it, expect } from "vitest"
import { highlightForPptx, parseHljsHtml, codeTextRunsToPptxRuns, CodeTextRun } from "../src/renderer/syntax-highlighter.js"

describe("parseHljsHtml", () => {
  const DEFAULT = "D4D4D4"

  it("parses plain text without spans", () => {
    const result = parseHljsHtml("hello world", DEFAULT)
    expect(result).toEqual([{ text: "hello world", color: DEFAULT }])
  })

  it("parses simple span", () => {
    const html = '<span class="hljs-keyword">const</span>'
    const result = parseHljsHtml(html, DEFAULT)
    expect(result).toEqual([{ text: "const", color: "569CD6" }])
  })

  it("parses mixed text and spans", () => {
    const html = 'x = <span class="hljs-number">42</span>;'
    const result = parseHljsHtml(html, DEFAULT)
    expect(result).toEqual([
      { text: "x = ", color: DEFAULT },
      { text: "42", color: "B5CEA8" },
      { text: ";", color: DEFAULT },
    ])
  })

  it("handles nested spans", () => {
    const html = '<span class="hljs-params"><span class="hljs-keyword">private</span> name</span>'
    const result = parseHljsHtml(html, DEFAULT)
    expect(result).toEqual([
      { text: "private", color: "569CD6" }, // inner span: hljs-keyword
      { text: " name", color: "9CDCFE" },   // outer span: hljs-params
    ])
  })

  it("handles multi-class spans (first class wins)", () => {
    const html = '<span class="hljs-title class_">MyClass</span>'
    const result = parseHljsHtml(html, DEFAULT)
    expect(result).toEqual([{ text: "MyClass", color: "DCDCAA" }]) // hljs-title
  })

  it("decodes HTML entities", () => {
    const html = '<span class="hljs-string">&quot;hello&quot;</span>'
    const result = parseHljsHtml(html, DEFAULT)
    expect(result).toEqual([{ text: '"hello"', color: "CE9178" }])
  })

  it("handles entities in plain text", () => {
    const html = 'a &lt; b &amp;&amp; c &gt; d'
    const result = parseHljsHtml(html, DEFAULT)
    expect(result).toEqual([{ text: "a < b && c > d", color: DEFAULT }])
  })

  it("handles deeply nested spans", () => {
    const html = '<span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">foo</span></span>'
    const result = parseHljsHtml(html, DEFAULT)
    expect(result).toEqual([
      { text: "function", color: "569CD6" },
      { text: " ", color: "DCDCAA" }, // hljs-function color
      { text: "foo", color: "DCDCAA" }, // hljs-title
    ])
  })
})

describe("highlightForPptx", () => {
  it("highlights JavaScript code with multiple colors", () => {
    const code = 'const x = 42;'
    const result = highlightForPptx(code, "javascript")
    // Should produce multiple runs with different colors
    expect(result.length).toBeGreaterThan(1)
    // At least one non-default color should appear (keyword, number, etc.)
    const colors = new Set(result.map(r => r.color))
    expect(colors.size).toBeGreaterThan(1)
  })

  it("highlights TypeScript code", () => {
    const code = 'function greet(name: string): void {\n  console.log(name)\n}'
    const result = highlightForPptx(code, "typescript")
    expect(result.length).toBeGreaterThan(1)
    const colors = new Set(result.map(r => r.color))
    expect(colors.size).toBeGreaterThan(1)
  })

  it("falls back to single run for unknown language", () => {
    const code = 'some random text'
    const result = highlightForPptx(code, "nonexistent_language_xyz")
    expect(result).toEqual([{ text: code, color: "D4D4D4" }])
  })

  it("preserves indentation", () => {
    const code = '  const x = 1;\n    const y = 2;'
    const result = highlightForPptx(code, "javascript")
    const fullText = result.map(r => r.text).join("")
    expect(fullText).toBe(code)
  })

  it("preserves newlines in output", () => {
    const code = 'const a = 1;\nconst b = 2;'
    const result = highlightForPptx(code, "javascript")
    const fullText = result.map(r => r.text).join("")
    expect(fullText).toBe(code)
  })

  it("uses custom default color", () => {
    const code = 'some text'
    const result = highlightForPptx(code, "nonexistent_language_xyz", "FFFFFF")
    expect(result[0].color).toBe("FFFFFF")
  })
})

describe("codeTextRunsToPptxRuns", () => {
  const FONT = "Courier New"
  const SIZE = 12

  it("converts simple runs without newlines", () => {
    const textRuns: CodeTextRun[] = [
      { text: "const", color: "569CD6" },
      { text: " x = ", color: "D4D4D4" },
      { text: "42", color: "B5CEA8" },
    ]
    const result = codeTextRunsToPptxRuns(textRuns, FONT, SIZE)
    expect(result).toEqual([
      { text: "const", options: { color: "569CD6", fontFace: FONT, fontSize: SIZE } },
      { text: " x = ", options: { color: "D4D4D4", fontFace: FONT, fontSize: SIZE } },
      { text: "42", options: { color: "B5CEA8", fontFace: FONT, fontSize: SIZE } },
    ])
  })

  it("splits runs at newlines with breakLine", () => {
    const textRuns: CodeTextRun[] = [
      { text: "line1\nline2", color: "D4D4D4" },
    ]
    const result = codeTextRunsToPptxRuns(textRuns, FONT, SIZE)
    expect(result).toEqual([
      { text: "line1", options: { color: "D4D4D4", fontFace: FONT, fontSize: SIZE, breakLine: true } },
      { text: "line2", options: { color: "D4D4D4", fontFace: FONT, fontSize: SIZE } },
    ])
  })

  it("handles multiple newlines", () => {
    const textRuns: CodeTextRun[] = [
      { text: "a\nb\nc", color: "D4D4D4" },
    ]
    const result = codeTextRunsToPptxRuns(textRuns, FONT, SIZE)
    expect(result).toEqual([
      { text: "a", options: { color: "D4D4D4", fontFace: FONT, fontSize: SIZE, breakLine: true } },
      { text: "b", options: { color: "D4D4D4", fontFace: FONT, fontSize: SIZE, breakLine: true } },
      { text: "c", options: { color: "D4D4D4", fontFace: FONT, fontSize: SIZE } },
    ])
  })

  it("handles trailing newline by skipping empty last part", () => {
    const textRuns: CodeTextRun[] = [
      { text: "line1\n", color: "D4D4D4" },
    ]
    const result = codeTextRunsToPptxRuns(textRuns, FONT, SIZE)
    expect(result).toEqual([
      { text: "line1", options: { color: "D4D4D4", fontFace: FONT, fontSize: SIZE, breakLine: true } },
    ])
  })

  it("preserves indentation in split lines", () => {
    const textRuns: CodeTextRun[] = [
      { text: "  indented\n    more", color: "D4D4D4" },
    ]
    const result = codeTextRunsToPptxRuns(textRuns, FONT, SIZE)
    expect(result[0].text).toBe("  indented")
    expect(result[1].text).toBe("    more")
  })

  it("handles mixed runs with and without newlines", () => {
    const textRuns: CodeTextRun[] = [
      { text: "const", color: "569CD6" },
      { text: " x = ", color: "D4D4D4" },
      { text: "42", color: "B5CEA8" },
      { text: ";\n", color: "D4D4D4" },
      { text: "const", color: "569CD6" },
      { text: " y = ", color: "D4D4D4" },
      { text: "10", color: "B5CEA8" },
    ]
    const result = codeTextRunsToPptxRuns(textRuns, FONT, SIZE)
    // ";" should have breakLine, rest should not
    const semiRun = result.find(r => r.text === ";")
    expect(semiRun?.options.breakLine).toBe(true)
    // "const" runs should not have breakLine
    const constRuns = result.filter(r => r.text === "const")
    expect(constRuns.every(r => r.options.breakLine === undefined)).toBe(true)
  })
})
