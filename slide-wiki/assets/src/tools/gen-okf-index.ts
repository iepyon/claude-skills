#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "fs"
import { basename, extname, join } from "path"
import { Effect } from "effect"

import { parseMarkdown } from "../parser/index.js"
import { readFrontmatter, splitFrontmatter } from "../ontology/frontmatter.js"
import { matchesDeclaredForm } from "../ontology/index.js"
import { OKF_VERSION, deckSlug, listDeckFiles } from "../okf.js"
import { orderDeckFiles, type DeckGroup } from "../deck-order.js"

/**
 * OKF の予約ファイル — バンドルの目録 `index.md` と更新履歴 `log.md` — を生成する。
 *
 * **バンドルに置いて追跡する生成物**であって、ビルド時だけの成果物ではない。
 * `doc/wiki/` をそのまま tarball で配っても・GitHub で開いても、目録が付いてくる
 * ようにするのが目的なので、置かれていなければ意味が無い。鮮度は `--check` と
 * テストが見る（`gen-ontology-doc.ts` と同じ形）。
 *
 *   npx tsx src/tools/gen-okf-index.ts [--check] [<dir>]
 */

const DEFAULT_DIR = join(import.meta.dirname, "..", "..", "doc", "wiki")

interface Deck {
  readonly name: string
  readonly fileName: string
  readonly title: string
  readonly description?: string
  readonly created?: string
  readonly updated?: string
}

/**
 * frontmatter が名乗った日付。宣言に無い形は読まない（lint の仕事なのでここでは黙る）。
 * 形の正規表現は書かない — `ontology.yaml` の `value-patterns.date` が正本で、
 * 宣言を緩めたときにここだけが古い形を要求し続けるのを避ける。
 */
const dateOf = (meta: Record<string, unknown> | undefined, key: string): string | undefined => {
  const value = meta?.[key]
  return typeof value === "string" && matchesDeclaredForm("date", value) ? value : undefined
}

function loadDecks(dir: string): { decks: Deck[]; groups: readonly DeckGroup[] } {
  const { files, groups, errors } = orderDeckFiles(listDeckFiles(dir), dir)
  if (errors.length > 0) throw new Error(errors.join("\n"))

  const decks = files.map((path) => {
    const markdown = readFileSync(path, "utf-8")

    // frontmatter は**1回だけ**読む。`readDeckMeta` が返すのは描画側が使う5キーだけなので、
    // created / updated まで要るここは1つ下の `readFrontmatter` を直に呼ぶ
    // （手で YAML を読み直すと、認識規則が本体と割れる）
    const block = splitFrontmatter(markdown).block
    const meta = block ? readFrontmatter(block).data : undefined

    // 表示名の正本は1枚目の見出し。frontmatter の title はその写しなので、
    // 食い違ったときに目録が古いほうを載せることのないよう、見出しを先に採る
    const pres = Effect.runSync(parseMarkdown(markdown, { baseDir: dir }))
    const first = pres.slides[0]
    const heading = (first?._tag === "TitleSlide" ? first.title : undefined) || first?.title

    const text = (key: string): string | undefined => {
      const value = meta?.[key]
      return typeof value === "string" ? value : undefined
    }

    return {
      name: basename(path, extname(path)),
      fileName: basename(path),
      title: heading || text("title") || basename(path, extname(path)),
      description: text("description"),
      created: dateOf(meta, "created"),
      updated: dateOf(meta, "updated"),
    }
  })

  return { decks, groups }
}

/**
 * 目録（SPEC.md §8）。
 *
 * frontmatter は `okf_version` だけ。§8 が「index files contain no frontmatter,
 * with one exception」と定めているので、`type` すら置いてはいけない。
 * リンクは §8 の例に合わせて相対 URL にする（本文中のリンクの推奨形＝絶対とは別の話）。
 */
function buildIndex(decks: readonly Deck[], groups: readonly DeckGroup[]): string {
  // 照合は `orderDeckFiles` と同じ**デッキ slug**。ここだけ生のファイル名で引くと、
  // 並びのほうは当たったデッキが目録では引けず、黙って「その他」へ落ちる
  // （B-40 が直したのと同じ壊れ方を、直した側が作ることになる）
  const bySlug = new Map(decks.map((d) => [deckSlug(d.name), d]))
  const grouped = new Set<string>()

  const section = (title: string, members: readonly Deck[]): string => {
    const lines = members.map((d) =>
      d.description ? `* [${d.title}](${d.fileName}) - ${d.description}` : `* [${d.title}](${d.fileName})`
    )
    return `# ${title}\n\n${lines.join("\n")}\n`
  }

  const sections: string[] = []
  for (const group of groups) {
    const members = group.decks
      .map((n) => bySlug.get(deckSlug(n)))
      .filter((d): d is Deck => d !== undefined)
    if (members.length === 0) continue
    members.forEach((d) => grouped.add(deckSlug(d.name)))
    sections.push(section(group.title, members))
  }

  // 宣言に無いデッキも必ず載せる。目録から漏れると、バンドルを読む側からは
  // 存在しないのと同じになる
  const rest = decks.filter((d) => !grouped.has(deckSlug(d.name)))
  if (rest.length > 0) sections.push(section("その他", rest))

  return `---\nokf_version: "${OKF_VERSION}"\n---\n\n${sections.join("\n")}`
}

/**
 * 更新履歴（SPEC.md §9）。
 *
 * 種は frontmatter の `created` / `updated` で、**git は読まない**。
 * CI の checkout は `fetch-depth: 1` なので履歴が無く、git から作ると
 * ローカルで通って CI でだけ落ちる（しかも環境依存で再現しにくい）。
 *
 * 日付を1つも名乗っていなければ**書かない**。空の履歴を置くより、
 * 「まだ何も宣言していない」がそのまま見えるほうが正直である。
 */
function buildLog(decks: readonly Deck[]): string | undefined {
  const byDate = new Map<string, string[]>()
  const add = (date: string, entry: string): void => {
    const bucket = byDate.get(date)
    if (bucket) bucket.push(entry)
    else byDate.set(date, [entry])
  }

  for (const d of decks) {
    if (d.created) add(d.created, `* **Creation**: [${d.title}](${d.fileName}) を置いた。`)
    if (d.updated && d.updated !== d.created) {
      add(d.updated, `* **Update**: [${d.title}](${d.fileName}) に手を入れた。`)
    }
  }
  if (byDate.size === 0) return undefined

  const sections = [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1)) // 新しい順
    .map(([date, entries]) => `## ${date}\n\n${entries.join("\n")}\n`)

  return `# 更新履歴\n\n${sections.join("\n")}`
}

// ── エントリポイント ───────────────────────────────────────────────

export function main(argv: readonly string[]): number {
  const check = argv.includes("--check")
  const dir = argv.find((a) => !a.startsWith("--")) ?? DEFAULT_DIR

  let decks: readonly Deck[]
  let groups: readonly DeckGroup[]
  try {
    ;({ decks, groups } = loadDecks(dir))
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e))
    return 2
  }

  const current = (path: string): string => (existsSync(path) ? readFileSync(path, "utf-8") : "")
  const outputs: ReadonlyArray<readonly [string, string]> = [
    ["index.md", buildIndex(decks, groups)],
    ["log.md", buildLog(decks) ?? ""],
  ]

  let drifted = 0
  for (const [name, built] of outputs) {
    const path = join(dir, name)
    if (built === current(path)) continue
    if (check) {
      console.error(
        `ドリフト検出: ${name} がバンドルと不一致。` +
          "`npx tsx src/tools/gen-okf-index.ts` で再生成する"
      )
      drifted++
      continue
    }
    // 空＝生成しない、なので既にあるものは消す（残すと嘘の履歴になる）
    if (built === "") {
      if (existsSync(path)) unlinkSync(path)
      continue
    }
    writeFileSync(path, built, "utf-8")
    console.log(`生成: ${name}`)
  }

  if (check && drifted === 0) console.log("index.md / log.md はバンドルと一致している")
  return drifted > 0 ? 1 : 0
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)))
}
