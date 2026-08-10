import { describe, it, expect } from "vitest"
import { resolveIconOrFallback } from "../src/renderer/icon-resolver.js"

describe("icon-resolver", () => {
  describe("emoji icons", () => {
    it("should resolve emoji icons", () => {
      const result = resolveIconOrFallback("👁️", "FF0000")
      expect(result._tag).toBe("emoji")
      if (result._tag === "emoji") {
        expect(result.text).toBe("👁️")
      }
    })

    it("should resolve plain text as emoji", () => {
      const result = resolveIconOrFallback("ABC", "FF0000")
      expect(result._tag).toBe("emoji")
      if (result._tag === "emoji") {
        expect(result.text).toBe("ABC")
      }
    })
  })

  describe("Material Design Icons", () => {
    it("should resolve mi:home as SVG", () => {
      const result = resolveIconOrFallback("mi:home", "FF0000")
      expect(result._tag).toBe("svg")
      if (result._tag === "svg") {
        expect(result.svgContent).toContain("<svg")
        expect(result.svgContent).toContain("fill=\"FF0000\"")
        expect(result.base64Data).toContain("data:image/svg+xml;base64,")
      }
    })

    it("should resolve mi:home:outlined as outlined style", () => {
      const result = resolveIconOrFallback("mi:home:outlined", "00FF00")
      expect(result._tag).toBe("svg")
      if (result._tag === "svg") {
        expect(result.svgContent).toContain("<svg")
        expect(result.svgContent).toContain("fill=\"00FF00\"")
      }
    })

    it("should resolve mi:visibility as SVG", () => {
      const result = resolveIconOrFallback("mi:visibility", "0000FF")
      expect(result._tag).toBe("svg")
      if (result._tag === "svg") {
        expect(result.svgContent).toContain("<svg")
        expect(result.svgContent).toContain("fill=\"0000FF\"")
      }
    })

    it("should resolve mi:check_circle:round as round style", () => {
      const result = resolveIconOrFallback("mi:check_circle:round", "FFFF00")
      expect(result._tag).toBe("svg")
      if (result._tag === "svg") {
        expect(result.svgContent).toContain("<svg")
        expect(result.svgContent).toContain("fill=\"FFFF00\"")
      }
    })
  })

  describe("unknown icons", () => {
    it("should fallback to ? for unknown Material Icon", () => {
      const result = resolveIconOrFallback("mi:nonexistent_icon_xyz", "FF0000")
      expect(result._tag).toBe("emoji")
      if (result._tag === "emoji") {
        expect(result.text).toBe("?")
      }
    })

    it("should fallback to ? for invalid Material Icon style", () => {
      const result = resolveIconOrFallback("mi:home:invalid_style", "FF0000")
      expect(result._tag).toBe("emoji")
      if (result._tag === "emoji") {
        expect(result.text).toBe("?")
      }
    })
  })
})
