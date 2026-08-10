import { describe, it, expect } from "vitest"
import { Effect as E } from "effect"
import { extractInventoryFromHtml } from "../src/tools/html-inspector.js"

describe("html-inspector", () => {
  it("should extract inventory from HTML with data-inches attributes", async () => {
    const html = `
      <div data-slide-id="slide-0">
        <div data-shape-id="shape-0" data-inches-x="0.5" data-inches-y="2.31" data-inches-w="9.0" data-inches-h="1.0">
          <h1 data-font-size="32" data-color="FFFFFF" data-bold="true" data-alignment="CENTER">スライドタイトル</h1>
        </div>
      </div>
      <div data-slide-id="slide-1">
        <div data-shape-id="shape-0" data-inches-x="0.5" data-inches-y="0.3" data-inches-w="9.0" data-inches-h="0.6">
          <h2 data-font-size="28" data-color="1E40AF" data-bold="true">コンテンツスライド</h2>
        </div>
        <div data-shape-id="shape-1" data-inches-x="0.5" data-inches-y="1.0" data-inches-w="9.0" data-inches-h="0.3">
          <h3 data-font-size="18" data-color="3B82F6" data-bold="true">見出しA</h3>
        </div>
        <div data-shape-id="shape-2" data-inches-x="0.5" data-inches-y="1.5" data-inches-w="9.0" data-inches-h="0.5">
          <p data-font-size="16" data-color="1F2937">デフォルトレイアウトでは各セクションが縦方向に配置されます。</p>
        </div>
      </div>
    `

    const result = await E.runPromise(extractInventoryFromHtml(html))

    expect(result).toEqual({
      "slide-0": {
        "shape-0": {
          left: 0.5,
          top: 2.31,
          width: 9.0,
          height: 1.0,
          paragraphs: [
            {
              text: "スライドタイトル",
              font_name: "Arial",
              font_size: 32,
              bold: true,
              color: "FFFFFF",
              alignment: "CENTER"
            }
          ]
        }
      },
      "slide-1": {
        "shape-0": {
          left: 0.5,
          top: 0.3,
          width: 9.0,
          height: 0.6,
          paragraphs: [
            {
              text: "コンテンツスライド",
              font_name: "Arial",
              font_size: 28,
              bold: true,
              color: "1E40AF"
            }
          ]
        },
        "shape-1": {
          left: 0.5,
          top: 1.0,
          width: 9.0,
          height: 0.3,
          paragraphs: [
            {
              text: "見出しA",
              font_name: "Arial",
              font_size: 18,
              bold: true,
              color: "3B82F6"
            }
          ]
        },
        "shape-2": {
          left: 0.5,
          top: 1.5,
          width: 9.0,
          height: 0.5,
          paragraphs: [
            {
              text: "デフォルトレイアウトでは各セクションが縦方向に配置されます。",
              font_name: "Arial",
              font_size: 16,
              color: "1F2937"
            }
          ]
        }
      }
    })
  })

  it("should handle missing slides gracefully", async () => {
    const html = `<div>No slides here</div>`

    const result = E.runPromise(extractInventoryFromHtml(html))

    await expect(result).rejects.toThrow("No slides found in HTML")
  })

  it("should handle slides without shapes", async () => {
    const html = `
      <div data-slide-id="slide-0">
        <p>No shapes with data-inches attributes</p>
      </div>
    `

    const result = E.runPromise(extractInventoryFromHtml(html))

    await expect(result).rejects.toThrow("No valid shapes found in HTML")
  })

  it("should extract multiple paragraphs from a single shape", async () => {
    const html = `
      <div data-slide-id="slide-0">
        <div data-shape-id="shape-0" data-inches-x="1" data-inches-y="2" data-inches-w="8" data-inches-h="3">
          <p data-font-size="18" data-color="000000" data-bold="true">First paragraph</p>
          <p data-font-size="14" data-color="666666">Second paragraph</p>
        </div>
      </div>
    `

    const result = await E.runPromise(extractInventoryFromHtml(html))

    expect(result["slide-0"]["shape-0"].paragraphs).toHaveLength(2)
    expect(result["slide-0"]["shape-0"].paragraphs[0].text).toBe("First paragraph")
    expect(result["slide-0"]["shape-0"].paragraphs[1].text).toBe("Second paragraph")
  })

  it("should use default values when optional attributes are missing", async () => {
    const html = `
      <div data-slide-id="slide-0">
        <div data-shape-id="shape-0" data-inches-x="0.5" data-inches-y="1" data-inches-w="9" data-inches-h="1">
          <p>Plain text without styling attributes</p>
        </div>
      </div>
    `

    const result = await E.runPromise(extractInventoryFromHtml(html))

    expect(result["slide-0"]["shape-0"].paragraphs[0]).toEqual({
      text: "Plain text without styling attributes",
      font_name: "Arial",
      font_size: 16,
      color: "000000"
    })
  })
})
