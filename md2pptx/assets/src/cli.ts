#!/usr/bin/env node
import { readFileSync, writeFileSync, statSync, readdirSync, mkdirSync } from "fs"
import { join, basename, extname, dirname } from "path"
import { Effect, Exit } from "effect"
import { md2pptx, md2html, md2wiki, loadThemeFile, parseMarkdown, validatePresentation, DEFAULT_THEME } from "./index.js"
import type { WikiSource } from "./index.js"
import { slidesToInventory } from "./tools/inventory.js"
import { inspectPptx } from "./tools/pptx-inspector.js"
import { extractInventoryFromHtml } from "./tools/html-inspector.js"
import { diffInventory } from "./tools/inventory-diff.js"

const args = process.argv.slice(2)

// フラグ解析
let compression = false
let themePath: string | undefined
let htmlMode = false
let verifyMode = false
let wikiMode = false
let siteTitle: string | undefined
const nonFlagArgs: string[] = []

for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === "--compress" || arg === "-c") {
    compression = true
  } else if (arg === "--theme" || arg === "-t") {
    themePath = args[++i]
  } else if (arg === "--html") {
    htmlMode = true
  } else if (arg === "--verify") {
    verifyMode = true
  } else if (arg === "--wiki") {
    wikiMode = true
  } else if (arg === "--site-title") {
    siteTitle = args[++i]
  } else {
    nonFlagArgs.push(arg)
  }
}

if (nonFlagArgs.length < 2) {
  console.error("Usage: tsx src/cli.ts [options] <input.md> <output.pptx|output.html>")
  console.error("Options:")
  console.error("  --compress, -c        Enable ZIP compression for PPTX (default: false)")
  console.error("  --theme, -t <path>    Path to YAML theme file (optional)")
  console.error("  --html                Generate HTML output instead of PPTX")
  console.error("  --verify              Generate both PPTX and HTML, compare inventories")
  console.error("  --wiki                Build one linked wiki site from one or more decks")
  console.error("  --site-title <text>   Title of the wiki site (with --wiki)")
  console.error("")
  console.error("Wiki: tsx src/cli.ts --wiki <input.md|dir> [more...] <output.html>")
  process.exit(1)
}

if (wikiMode && verifyMode) {
  console.error("--wiki and --verify cannot be combined")
  process.exit(1)
}

// --wiki は入力を複数取れる: 末尾が出力先、それ以外が入力
const wikiInputPaths = nonFlagArgs.slice(0, -1)
const [inputPath, outputPath] = wikiMode
  ? [wikiInputPaths[0], nonFlagArgs[nonFlagArgs.length - 1]]
  : nonFlagArgs

/** ディレクトリなら *.md をソートして展開、ファイルならそれ自身。 */
function collectWikiSources(paths: readonly string[]): WikiSource[] {
  const files: string[] = []
  for (const path of paths) {
    if (statSync(path).isDirectory()) {
      readdirSync(path)
        .filter((f) => f.endsWith(".md"))
        .sort()
        .forEach((f) => files.push(join(path, f)))
    } else {
      files.push(path)
    }
  }
  // 同じファイルを二度渡されてもデッキが重複しないようにする
  const seen = new Set<string>()
  return files
    .filter((f) => !seen.has(f) && (seen.add(f), true))
    .map((f) => ({ name: basename(f, extname(f)), markdown: readFileSync(f, "utf-8") }))
}

const program = Effect.gen(function* () {
  // --wiki mode: build a single linked site from one or more decks
  if (wikiMode) {
    const sources = collectWikiSources(wikiInputPaths)
    if (sources.length === 0) {
      console.error("No markdown files found in the given inputs")
      process.exit(1)
    }
    const wikiTheme = themePath ? yield* loadThemeFile(themePath) : DEFAULT_THEME
    const html = yield* md2wiki(sources, { theme: wikiTheme, siteTitle })
    // 出力先ディレクトリを作る。CI が _site/index.html のような
    // まだ存在しない場所へ書き出すため
    mkdirSync(dirname(outputPath), { recursive: true })
    writeFileSync(outputPath, html, "utf-8")
    console.log(`\u2705 Generated wiki: ${outputPath} (${sources.length} decks)`)
    return
  }

  const markdown = readFileSync(inputPath, "utf-8")
  const theme = themePath ? yield* loadThemeFile(themePath) : DEFAULT_THEME

  // --html mode: Generate HTML output
  if (htmlMode && !verifyMode) {
    const html = yield* md2html(markdown, { theme })
    writeFileSync(outputPath, html, "utf-8")
    console.log(`✅ Generated HTML: ${outputPath}`)
    return
  }

  // --verify mode: Generate both PPTX and HTML, compare inventories
  if (verifyMode) {
    console.log("🔍 Verify mode: Generating PPTX and HTML, comparing inventories...")

    // Generate PPTX
    const pptxBuffer = yield* md2pptx(markdown, { compression, theme })
    const pptxPath = outputPath.replace(/\.(html|pptx)$/, ".pptx")
    writeFileSync(pptxPath, pptxBuffer)
    console.log(`✅ Generated PPTX: ${pptxPath}`)

    // Generate HTML
    const html = yield* md2html(markdown, { theme })
    const htmlPath = outputPath.replace(/\.(html|pptx)$/, ".html")
    writeFileSync(htmlPath, html, "utf-8")
    console.log(`✅ Generated HTML: ${htmlPath}`)

    // Build expected inventory from AST
    const raw = yield* parseMarkdown(markdown)
    const pres = yield* validatePresentation(raw)
    const expectedInventory = yield* slidesToInventory(pres.slides, theme)

    // Extract actual inventory from PPTX
    const pptxInventory = yield* inspectPptx(pptxBuffer)

    // Extract actual inventory from HTML
    const htmlInventory = yield* extractInventoryFromHtml(html)

    // Compare PPTX vs expected
    console.log("\n📊 PPTX vs Expected:")
    const pptxDiff = diffInventory(expectedInventory, pptxInventory)
    if (pptxDiff.mismatches.length === 0) {
      console.log(`✅ All ${pptxDiff.matches} shapes match!`)
    } else {
      console.log(`⚠️  ${pptxDiff.matches} shapes match, ${pptxDiff.mismatches.length} mismatches:`)
      for (const mismatch of pptxDiff.mismatches) {
        const deltaStr = mismatch.delta !== undefined ? ` (Δ ${mismatch.delta.toFixed(4)})` : ""
        console.log(`  - ${mismatch.property}: expected ${mismatch.expected}, got ${mismatch.actual}${deltaStr}`)
      }
    }

    // Compare HTML vs expected
    console.log("\n📊 HTML vs Expected:")
    const htmlDiff = diffInventory(expectedInventory, htmlInventory)
    if (htmlDiff.mismatches.length === 0) {
      console.log(`✅ All ${htmlDiff.matches} shapes match!`)
    } else {
      console.log(`⚠️  ${htmlDiff.matches} shapes match, ${htmlDiff.mismatches.length} mismatches:`)
      for (const mismatch of htmlDiff.mismatches) {
        const deltaStr = mismatch.delta !== undefined ? ` (Δ ${mismatch.delta.toFixed(4)})` : ""
        console.log(`  - ${mismatch.property}: expected ${mismatch.expected}, got ${mismatch.actual}${deltaStr}`)
      }
    }

    // Compare PPTX vs HTML
    console.log("\n📊 PPTX vs HTML:")
    const crossDiff = diffInventory(pptxInventory, htmlInventory)
    if (crossDiff.mismatches.length === 0) {
      console.log(`✅ PPTX and HTML are identical (${crossDiff.matches} shapes)`)
    } else {
      console.log(`⚠️  ${crossDiff.matches} shapes match, ${crossDiff.mismatches.length} mismatches:`)
      for (const mismatch of crossDiff.mismatches) {
        const deltaStr = mismatch.delta !== undefined ? ` (Δ ${mismatch.delta.toFixed(4)})` : ""
        console.log(`  - ${mismatch.property}: PPTX=${mismatch.expected}, HTML=${mismatch.actual}${deltaStr}`)
      }
    }

    return
  }

  // Default mode: Generate PPTX
  const buffer = yield* md2pptx(markdown, { compression, theme })
  writeFileSync(outputPath, buffer)
  console.log(`✅ Generated PPTX: ${outputPath} ${compression ? "(compressed)" : "(uncompressed)"}`)
})

const exit = await Effect.runPromiseExit(program)

if (Exit.isFailure(exit)) {
  console.error("❌ Error:", exit.cause)
  process.exit(1)
}
