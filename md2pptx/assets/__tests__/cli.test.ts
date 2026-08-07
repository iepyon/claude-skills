import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { execSync } from "child_process"
import { readFileSync, unlinkSync, existsSync, writeFileSync } from "fs"

const TEST_MARKDOWN = `# CLIテスト
サブタイトル
---
## コンテンツスライド
### セクションA
本文テキスト`

describe("CLI", () => {
  const testMd = "/tmp/cli-test-sample.md"
  const cliPath = "src/cli.ts"

  beforeAll(() => {
    writeFileSync(testMd, TEST_MARKDOWN, "utf-8")
  })

  afterAll(() => {
    if (existsSync(testMd)) unlinkSync(testMd)
  })

  it("should generate PPTX by default", () => {
    const outputPath = "/tmp/cli-test-default.pptx"

    // Clean up if exists
    if (existsSync(outputPath)) {
      unlinkSync(outputPath)
    }

    // Run CLI
    const result = execSync(`npx tsx ${cliPath} ${testMd} ${outputPath}`, {
      encoding: "utf-8",
      cwd: process.cwd(),
    })

    expect(result).toContain("Generated PPTX")
    expect(existsSync(outputPath)).toBe(true)

    // Verify it's a valid ZIP file (PPTX is ZIP-based)
    const buffer = readFileSync(outputPath)
    expect(buffer.subarray(0, 4).toString("hex")).toBe("504b0304") // ZIP magic number

    // Clean up
    unlinkSync(outputPath)
  })

  it("should generate HTML with --html flag", () => {
    const outputPath = "/tmp/cli-test-html.html"

    // Clean up if exists
    if (existsSync(outputPath)) {
      unlinkSync(outputPath)
    }

    // Run CLI
    const result = execSync(`npx tsx ${cliPath} --html ${testMd} ${outputPath}`, {
      encoding: "utf-8",
      cwd: process.cwd(),
    })

    expect(result).toContain("Generated HTML")
    expect(existsSync(outputPath)).toBe(true)

    // Verify it's HTML
    const content = readFileSync(outputPath, "utf-8")
    expect(content).toContain("<!DOCTYPE html>")
    expect(content).toContain("data-slide-id")

    // Clean up
    unlinkSync(outputPath)
  })

  it("should run verification with --verify flag", () => {
    const outputPath = "/tmp/cli-test-verify.pptx"

    // Clean up if exists
    if (existsSync(outputPath)) {
      unlinkSync(outputPath)
    }
    const htmlPath = outputPath.replace(".pptx", ".html")
    if (existsSync(htmlPath)) {
      unlinkSync(htmlPath)
    }

    // Run CLI
    const result = execSync(`npx tsx ${cliPath} --verify ${testMd} ${outputPath}`, {
      encoding: "utf-8",
      cwd: process.cwd(),
    })

    expect(result).toContain("Verify mode")
    expect(result).toContain("PPTX vs Expected")
    expect(result).toContain("HTML vs Expected")
    expect(result).toContain("PPTX vs HTML")

    expect(existsSync(outputPath)).toBe(true)
    expect(existsSync(htmlPath)).toBe(true)

    // Clean up
    unlinkSync(outputPath)
    unlinkSync(htmlPath)
  })

  it("should show help when insufficient arguments", () => {
    try {
      execSync(`npx tsx ${cliPath}`, {
        encoding: "utf-8",
        cwd: process.cwd(),
      })
      // Should not reach here
      expect(true).toBe(false)
    } catch (error: any) {
      expect(error.stderr).toContain("Usage:")
      expect(error.stderr).toContain("--html")
      expect(error.stderr).toContain("--verify")
    }
  })
})
