import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { md2pptx, md2html } from "../src/index.js"
import { readdirSync, readFileSync } from "fs"
import { join } from "path"
import JSZip from "jszip"

const MARKDOWN_SPEC_DIR = join(__dirname, "markdown-spec")

// Get all .md files from markdown-spec directory (excluding README.md)
const getSpecFiles = (): Array<{ name: string; path: string }> => {
  const files = readdirSync(MARKDOWN_SPEC_DIR)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .sort()
  return files.map((name) => ({
    name: name.replace(/\.md$/, ""),
    path: join(MARKDOWN_SPEC_DIR, name),
  }))
}

// Extract text content from Markdown (headings and body text)
const extractTextFromMarkdown = (markdown: string): string[] => {
  const lines = markdown.split("\n")
  const texts: string[] = []
  let inCodeBlock = false
  let inCustomerJourney = false

  for (const line of lines) {
    const trimmed = line.trim()

    // Toggle code block state
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock
      continue
    }

    // Track customer-journey context (parser converts "- item" → "• item")
    if (trimmed.startsWith("<!--") && trimmed.includes("カスタマージャーニー")) {
      inCustomerJourney = true
      continue
    }
    if (trimmed === "---") {
      inCustomerJourney = false
      continue
    }

    // Skip code block content, HTML comments, and empty lines
    if (inCodeBlock || trimmed.startsWith("<!--") || trimmed === "") {
      continue
    }

    // Extract heading text
    if (trimmed.startsWith("#")) {
      const text = trimmed.replace(/^#+\s*/, "").replace(/:$/, "") // strip trailing colon (H4 row labels)
      if (text) texts.push(text)
    }
    // Extract body text (non-heading lines with content)
    else if (trimmed.length > 0) {
      // In customer-journey mode, parser strips "- " and layout adds "• " prefix
      if (inCustomerJourney && trimmed.startsWith("- ")) {
        texts.push(`• ${trimmed.slice(2)}`)
      } else {
        texts.push(trimmed)
      }
    }
  }

  return texts
}

// Extract text from PPTX buffer
const extractTextFromPptx = async (buffer: Buffer): Promise<string[]> => {
  const zip = await JSZip.loadAsync(buffer)
  const texts: string[] = []

  // Extract text from all slide XML files
  const slideFiles = Object.keys(zip.files).filter((name) =>
    name.match(/ppt\/slides\/slide\d+\.xml/)
  )

  for (const fileName of slideFiles) {
    const content = await zip.files[fileName].async("string")
    // Extract text from <a:t> tags (text runs in pptxgenjs)
    const textMatches = content.matchAll(/<a:t>([^<]+)<\/a:t>/g)
    for (const match of textMatches) {
      texts.push(match[1])
    }
  }

  return texts
}

describe("md2pptx e2e", () => {
  const specFiles = getSpecFiles()

  describe("PPTX generation", () => {
    specFiles.forEach(({ name, path }) => {
      it(`should generate PPTX from ${name}`, async () => {
        const markdown = readFileSync(path, "utf-8")
        const buffer = await Effect.runPromise(md2pptx(markdown))

        // Structure validation
        expect(buffer).toBeInstanceOf(Buffer)
        expect(buffer.length).toBeGreaterThan(0)
        // Check ZIP signature (PK)
        expect(buffer[0]).toBe(0x50) // P
        expect(buffer[1]).toBe(0x4b) // K

        // Content validation - verify all text from markdown is in PPTX
        const expectedTexts = extractTextFromMarkdown(markdown)
        const actualTexts = await extractTextFromPptx(buffer)
        const actualContent = actualTexts.join(" ")

        for (const text of expectedTexts) {
          expect(actualContent).toContain(text)
        }
      })
    })
  })

  describe("HTML generation", () => {
    specFiles.forEach(({ name, path }) => {
      it(`should generate HTML from ${name}`, async () => {
        const markdown = readFileSync(path, "utf-8")
        const html = await Effect.runPromise(md2html(markdown))

        // Structure validation
        expect(html).toBeTruthy()
        expect(html).toContain('class="slide')
        expect(html).toContain("data-slide-id")
        expect(html).toContain('class="text-box"')

        // Content validation - verify all text from markdown is in HTML
        const expectedTexts = extractTextFromMarkdown(markdown)
        for (const text of expectedTexts) {
          expect(html).toContain(text)
        }
      })
    })
  })

  describe("Format consistency", () => {
    specFiles.forEach(({ name, path }) => {
      it(`should generate consistent output for ${name}`, async () => {
        const markdown = readFileSync(path, "utf-8")

        // Both should succeed without errors
        const [pptxBuffer, htmlString] = await Effect.runPromise(
          Effect.all([md2pptx(markdown), md2html(markdown)], {
            concurrency: 2,
          })
        )

        // Basic validations
        expect(pptxBuffer).toBeInstanceOf(Buffer)
        expect(pptxBuffer.length).toBeGreaterThan(0)
        expect(htmlString).toBeTruthy()
        expect(htmlString).toContain("data-inches-x")
      })
    })
  })
})
