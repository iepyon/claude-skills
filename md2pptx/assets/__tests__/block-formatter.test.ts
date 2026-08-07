import { describe, it, expect } from "vitest"
import { hasListMarker, parseBlockToParagraphs, stripListMarkers } from "../src/parser/block-formatter.js"

describe("hasListMarker", () => {
  it("detects hyphen, asterisk, plus and ordered markers", () => {
    expect(hasListMarker("- item")).toBe(true)
    expect(hasListMarker("* item")).toBe(true)
    expect(hasListMarker("+ item")).toBe(true)
    expect(hasListMarker("1. item")).toBe(true)
    expect(hasListMarker("plain body\n- item")).toBe(true)
  })

  it("does not treat inline emphasis as a list", () => {
    expect(hasListMarker("*italic* text")).toBe(false)
    expect(hasListMarker("plain body")).toBe(false)
  })
})

describe("parseBlockToParagraphs", () => {
  it("marks unordered items and strips the marker", () => {
    const result = parseBlockToParagraphs("- first\n- second")
    expect(result).toHaveLength(2)
    expect(result[0].bullet).toEqual({ type: "bullet" })
    expect(result[0].runs.map(r => r.text).join("")).toBe("first")
    expect(result[1].runs.map(r => r.text).join("")).toBe("second")
  })

  it("carries startAt on the first item of a numbered group only", () => {
    const result = parseBlockToParagraphs("3. three\n4. four")
    expect(result[0].bullet).toEqual({ type: "number", startAt: 3 })
    expect(result[1].bullet).toEqual({ type: "number" })
  })

  it("restarts numbering after a non-list line", () => {
    const result = parseBlockToParagraphs("1. one\nprose\n5. five")
    expect(result[0].bullet).toEqual({ type: "number", startAt: 1 })
    expect(result[1].bullet).toBeUndefined()
    expect(result[2].bullet).toEqual({ type: "number", startAt: 5 })
  })

  it("keeps inline formatting inside list items", () => {
    const result = parseBlockToParagraphs("- has **bold**")
    expect(result[0].runs).toEqual([{ text: "has " }, { text: "bold", bold: true }])
  })

  it("leaves plain paragraphs without a bullet", () => {
    const result = parseBlockToParagraphs("just text")
    expect(result[0].bullet).toBeUndefined()
    expect(result[0].runs.map(r => r.text).join("")).toBe("just text")
  })

  it("treats a task-list marker as an unordered item and keeps the checkbox text", () => {
    const result = parseBlockToParagraphs("- [ ] todo")
    expect(result[0].bullet).toEqual({ type: "bullet" })
    expect(result[0].runs.map(r => r.text).join("")).toBe("[ ] todo")
  })
})

describe("stripListMarkers", () => {
  it("removes markers while preserving line structure", () => {
    expect(stripListMarkers("- a\n1. b\nc")).toBe("a\nb\nc")
  })
})
