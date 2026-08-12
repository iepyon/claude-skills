#!/usr/bin/env node
import { readFileSync, writeFileSync, statSync, mkdirSync } from "fs"
import { basename, extname, dirname } from "path"
import { Effect, Exit } from "effect"
import { md2pptx, md2html, md2wiki, loadThemeFile, parseMarkdown, validatePresentation, DEFAULT_THEME } from "./index.js"
import type { WikiSource } from "./index.js"
import { isReservedOkfFile, listDeckFiles } from "./okf.js"
import { slidesToInventory } from "./tools/inventory.js"
import { inspectPptx } from "./tools/pptx-inspector.js"
import { extractInventoryFromHtml } from "./tools/html-inspector.js"
import { verifyInventories, printVerifyReport } from "./tools/verify.js"
import { formatDiagnostic, lintSource, shouldFail, type Diagnostic } from "./ontology/lint.js"
import { orderDeckFiles } from "./deck-order.js"

const args = process.argv.slice(2)

// フラグ解析
let compression = false
let themePath: string | undefined
let htmlMode = false
let verifyMode = false
let wikiMode = false
let lintOnly = false
let strict = false
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
  } else if (arg === "--lint") {
    lintOnly = true
  } else if (arg === "--strict") {
    strict = true
  } else if (arg === "--site-title") {
    siteTitle = args[++i]
  } else {
    nonFlagArgs.push(arg)
  }
}

/**
 * ディレクトリなら *.md をソートして展開、ファイルならそれ自身。重複は落とす。
 * ディレクトリに `order.yaml` があれば、その宣言がファイル名順より優先する
 * （Wiki のデッキの並びは、リンク先を兼ねるファイル名ではなく宣言で決める）。
 *
 * **誤りは返す。終わらせるかどうかは呼び手が決める**（`orderDeckFiles` と同じ形）。
 * 集める関数の中から `process.exit` すると、「警告して飛ばす」を選べなくなるうえ、
 * プロセスを起こさないとテストから触れなくなる。
 */
function collectMarkdownFiles(paths: readonly string[]): { files: string[]; errors: string[] } {
  const files: string[] = []
  const errors: string[] = []
  for (const path of paths) {
    if (statSync(path).isDirectory()) {
      const { files: ordered, errors: declErrors } = orderDeckFiles(listDeckFiles(path), path)
      // 所在は `orderDeckFiles` が付ける。ここで一律に前置していたころは、
      // `order.yaml` が無くても起きる誤り（デッキ slug の衝突）にまで
      // その名前が付いて、実在しないファイルを指していた
      declErrors.forEach((e) => errors.push(e))
      ordered.forEach((f) => files.push(f))
    } else if (isReservedOkfFile(basename(path))) {
      // 名指しされた予約ファイルは黙って飛ばさない。飛ばすと `--lint doc/wiki/index.md` が
      // 「問題なし」と読める（何も検査していないだけなのに）
      errors.push(`${path}: OKF の予約ファイルなのでデッキとして読めない`)
    } else {
      files.push(path)
    }
  }
  const seen = new Set<string>()
  return { files: files.filter((f) => !seen.has(f) && (seen.add(f), true)), errors }
}

/** 集めた結果を受け取り、誤りがあればそこで終わる。exit を持つのは入口の役目 */
function collectOrExit(paths: readonly string[]): string[] {
  const { files, errors } = collectMarkdownFiles(paths)
  if (errors.length > 0) {
    for (const e of errors) console.error(e)
    process.exit(1)
  }
  return files
}

/** 宣言違反の表示。パイプラインは出力を持たないので、見せ方は CLI が決める */
const reportDiagnostics = (diagnostics: readonly Diagnostic[], where: string): void => {
  for (const d of diagnostics) console.error(formatDiagnostic(d, where))
}

// --lint は検査だけなので出力先を取らない
if (lintOnly) {
  const files = nonFlagArgs.length > 0 ? collectOrExit(nonFlagArgs) : []
  if (files.length === 0) {
    console.error("Usage: tsx src/cli.ts --lint [--strict] <input.md|dir> [more...]")
    process.exit(1)
  }
  // 失敗の判定は shouldFail が正本。ここで書き下すとパイプラインと規則がずれる
  const failed = files
    .map((file) => {
      const diagnostics = lintSource(readFileSync(file, "utf-8"))
      reportDiagnostics(diagnostics, file)
      return shouldFail(diagnostics, strict)
    })
    .some(Boolean)

  console.log(
    failed
      ? `❌ 宣言違反あり（${files.length} 件のデッキを検査）`
      : `✅ ${files.length} 件のデッキは ontology.yaml の宣言に沿っている`
  )
  process.exit(failed ? 1 : 0)
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
  console.error("  --lint                Check the markdown against ontology.yaml and stop")
  console.error("  --strict              Treat declaration warnings as errors")
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

/**
 * 全パイプラインに同じ検査設定を渡す。deck 名は --wiki のときだけ渡ってくるので、
 * 単一デッキでは入力ファイル名を場所として使う。
 */
const lintOpts = {
  onDiagnostic: (diagnostics: readonly Diagnostic[], deck?: string) =>
    reportDiagnostics(diagnostics, deck ?? inputPath),
  strict,
}

function collectWikiSources(paths: readonly string[]): WikiSource[] {
  return collectOrExit(paths).map((f) => ({
    name: basename(f, extname(f)),
    markdown: readFileSync(f, "utf-8"),
    // 図解の `![…](….svg)` はその md からの相対で書かれている
    baseDir: dirname(f),
  }))
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
    const html = yield* md2wiki(sources, { theme: wikiTheme, siteTitle, ...lintOpts })
    // 出力先ディレクトリを作る。CI が _site/index.html のような
    // まだ存在しない場所へ書き出すため
    mkdirSync(dirname(outputPath), { recursive: true })
    writeFileSync(outputPath, html, "utf-8")
    console.log(`\u2705 Generated wiki: ${outputPath} (${sources.length} decks)`)
    return 0
  }

  const markdown = readFileSync(inputPath, "utf-8")
  const theme = themePath ? yield* loadThemeFile(themePath) : DEFAULT_THEME
  // 図解の `![…](….svg)` は md からの相対。出力先ではなく入力の場所から解く
  const baseDir = dirname(inputPath)

  // --html mode: Generate HTML output
  if (htmlMode && !verifyMode) {
    const html = yield* md2html(markdown, { theme, baseDir, ...lintOpts })
    writeFileSync(outputPath, html, "utf-8")
    console.log(`✅ Generated HTML: ${outputPath}`)
    return 0
  }

  // --verify mode: Generate both PPTX and HTML, compare inventories
  if (verifyMode) {
    console.log("🔍 Verify mode: Generating PPTX and HTML, comparing inventories...")

    // Generate PPTX
    const pptxBuffer = yield* md2pptx(markdown, { compression, theme, baseDir, ...lintOpts })
    const pptxPath = outputPath.replace(/\.(html|pptx)$/, ".pptx")
    writeFileSync(pptxPath, pptxBuffer)
    console.log(`✅ Generated PPTX: ${pptxPath}`)

    // Generate HTML — lintOpts をあえて渡さない。同じ markdown を上の md2pptx が
    // 既に検査しており、渡すと同じ違反が二度出る
    const html = yield* md2html(markdown, { theme, baseDir })
    const htmlPath = outputPath.replace(/\.(html|pptx)$/, ".html")
    writeFileSync(htmlPath, html, "utf-8")
    console.log(`✅ Generated HTML: ${htmlPath}`)

    // Build expected inventory from AST
    const raw = yield* parseMarkdown(markdown, { baseDir })
    const pres = yield* validatePresentation(raw)
    const expectedInventory = yield* slidesToInventory(pres.slides, theme)

    // Extract actual inventory from PPTX
    const pptxInventory = yield* inspectPptx(pptxBuffer)

    // Extract actual inventory from HTML
    const htmlInventory = yield* extractInventoryFromHtml(html)

    const report = verifyInventories(expectedInventory, pptxInventory, htmlInventory)
    printVerifyReport(report)

    // 食い違いを見つけたら非ゼロで終わる。検出したのに 0 を返すのでは、
    // CI に置いても何も守れない（BACKLOG B-24）。
    return report.totalMismatches > 0 ? 1 : 0
  }

  // Default mode: Generate PPTX
  const buffer = yield* md2pptx(markdown, { compression, theme, baseDir, ...lintOpts })
  writeFileSync(outputPath, buffer)
  console.log(`✅ Generated PPTX: ${outputPath} ${compression ? "(compressed)" : "(uncompressed)"}`)
  return 0
})

const exit = await Effect.runPromiseExit(program)

if (Exit.isFailure(exit)) {
  console.error("❌ Error:", exit.cause)
  process.exit(1)
}

// --verify は食い違いを見つけたら非ゼロで終わる。
// 検出したのに 0 を返すのでは、CI に置いても何も守れない。
if (exit.value !== 0) {
  process.exit(exit.value)
}
