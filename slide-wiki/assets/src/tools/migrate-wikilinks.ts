#!/usr/bin/env node
import { readFileSync, writeFileSync, statSync } from "fs"
import { basename, extname } from "path"
import { Effect } from "effect"

import { parseMarkdown } from "../parser/index.js"
import {
  MD_LINK,
  deckSlug,
  findDeckSlugCollisions,
  hrefRangeOf,
  isReservedOkfFile,
  listDeckFiles,
  parseOkfLink,
} from "../okf.js"
import { buildSiteIndex } from "../renderer/wiki/site-index.js"
import type { WikiDeck, WikiEntry } from "../renderer/wiki/types.js"

/**
 * 内部リンクの記法を、いまの書き方へ揃える。**過去2回の破壊的変更ぶんを持つ。**
 *
 * 1. 旧 `[[…]]` 記法 → md のリンク（宣言の版 4）
 *
 *      [[種ノート]]              → [種ノート](patterns-wiki.md#種ノート)
 *      [[patterns-wiki/剪定]]     → [patterns-wiki/剪定](patterns-wiki.md#剪定)
 *      [[動く北極星|北極星]]      → [北極星](patterns-wiki.md#動く北極星)
 *
 * 2. 先頭に `/`・`./` の付いた綴り → デッキ名だけの相対パス（版 6）
 *
 *      [剪定](/patterns-wiki.md#剪定)   → [剪定](patterns-wiki.md#剪定)
 *      [剪定](./patterns-wiki.md#剪定)  → [剪定](patterns-wiki.md#剪定)
 *
 * **2つは難しさが違う。** 1 は参照だけでは行き先が決まらないのでスライド ID の
 * 索引と4段階の解決順が要り、解決に失敗しうる。2 は接頭辞を落とすだけで、
 * 行き先は変わらないので失敗しない — だから `--check` の目的も違う。
 * 1 の残存は「サイトで折れているリンク」、2 の残存は「サイトでは当たるが
 * github.com で折れるリンク」であり、後者は走らせないと誰も気づけない。
 *
 * **どちらの綴りが正しいかは持たない。** 2 の書き換え先は `parseOkfLink` が返す
 * `canonicalHref` そのもので、接頭辞の集合をこのファイルが知ることはない
 * （知ると、`okf.ts` が受ける綴りを増やしたときにここだけ古い規則で通す）。
 *
 * **表示テキストは1文字も変えない。** 1 のラベルは旧記法の表示規則（縦棒の右、
 * 無ければ参照そのもの）のまま写し、2 は href だけを差し替える。整形したくなるが、
 * そうすると `stripInlineFormatting` の出力が変わり、文字数・高さ見積り・
 * レイアウトのスナップショット・3者比較が一斉に動く。記法の移行と見た目の変更を
 * 1つのコミットに混ぜると、どちらが原因か分からなくなる。
 *
 * **パーサには依存しない。** `[[…]]` を自分で正規表現で拾い、解決に要るのは
 * スライド ID の索引（見出しと `<!--id:-->` から作られる）だけなので、
 * パーサから `[[…]]` を落としたあともこのツールは動き続ける
 * — 他人のデッキを受け取るスキルとして、移行路は同梱しておく必要がある。
 *
 * **旧記法の綴りと解決順を持っているのは、いまやこのファイルだけである。**
 */

/** 旧記法。パーサから消したので、綴りの正本はここになった */
const WIKILINK = /\[\[([^\[\]|]+?)(?:\|([^\[\]]+?))?\]\]/g
/** インラインコード。綴りは `inline-formatter.ts` の `code` 交替と同じ */
const INLINE_CODE = /`[^`]+?`/g
/**
 * フェンス。**開きと閉じで規則が違う**（`tokenizer.ts` の `matchCodeFence` と同じ）:
 * 開きは ``` で始まる行（言語名が続いてよい）、閉じは**ちょうど** ``` の行。
 * 対称に書くと ```ts のような行が閉じと解釈され、フェンスの途中から保護が外れる。
 */
const isFenceOpen = (line: string): boolean => line.trim().startsWith("```")
const isFenceClose = (line: string): boolean => line.trim() === "```" 

interface Candidate {
  readonly start: number
  readonly end: number
  readonly line: number
  readonly ref: string
  readonly label: string
}

/** 据え置いた箇所（コード表記の中）。2つの記法を同じ形で報告するために綴りだけ持つ */
interface Skipped {
  readonly line: number
  readonly text: string
}

interface Range {
  readonly start: number
  readonly end: number
}

/**
 * 書き換えてはいけない範囲。frontmatter・フェンス・インラインコード。
 *
 * **文字列の置換ではなく範囲で持つ。** 置換で潰すと、書き戻すときに必要な
 * オフセットが壊れる。`guide.md` は `` `[[種ノート]]` `` と記法の見本を
 * コードで囲んで置いているので、ここを飛ばせないと見本が実リンクに化ける。
 */
function protectedRanges(source: string): Range[] {
  const ranges: Range[] = []

  // frontmatter（1行目が `---` で2行目がキー行のときだけ。frontmatter.ts の認識規則）
  const lines = source.split("\n")
  if (lines[0]?.replace(/\r$/, "") === "---" && /^[A-Za-z_][A-Za-z0-9_.-]*[ \t]*:([ \t]|$)/.test(lines[1] ?? "")) {
    const close = lines.slice(2).findIndex((l) => l.replace(/\r$/, "") === "---")
    if (close >= 0) {
      const end = lines.slice(0, close + 3).join("\n").length
      ranges.push({ start: 0, end })
    }
  }

  // フェンスで囲まれた範囲
  let offset = 0
  let fenceStart: number | null = null
  for (const line of lines) {
    if (fenceStart === null) {
      if (isFenceOpen(line)) fenceStart = offset
    } else if (isFenceClose(line)) {
      ranges.push({ start: fenceStart, end: offset + line.length })
      fenceStart = null
    }
    offset += line.length + 1
  }
  if (fenceStart !== null) ranges.push({ start: fenceStart, end: source.length })

  // インラインコード
  for (const m of source.matchAll(INLINE_CODE)) {
    ranges.push({ start: m.index, end: m.index + m[0].length })
  }

  return ranges
}

const lineOf = (source: string, index: number): number =>
  source.slice(0, index).split("\n").length

/**
 * 旧 `[[…]]` の書き換え候補と、保護されて見送った箇所を分けて返す。
 *
 * 走査を2つに分けてあるのは、拾うものの形が違うから（`[[…]]` はブロックまるごと、
 * 接頭辞つきリンクは href だけ）。**保護範囲の判定は共有する** — 片方だけが
 * コード表記を書き換えると、記法の見本が実リンクに化ける。
 */
function scanWikilinks(source: string, isProtected: (i: number) => boolean): {
  candidates: Candidate[]
  skipped: Skipped[]
} {
  const candidates: Candidate[] = []
  const skipped: Skipped[] = []

  for (const m of source.matchAll(WIKILINK)) {
    if (isProtected(m.index)) {
      skipped.push({ line: lineOf(source, m.index), text: m[0] })
      continue
    }
    candidates.push({
      start: m.index,
      end: m.index + m[0].length,
      line: lineOf(source, m.index),
      ref: m[1].trim(),
      label: (m[2] ?? m[1]).trim(),
    })
  }

  return { candidates, skipped }
}

/**
 * 書く形から外れた href（先頭に `/`・`./`）を、`canonicalHref` に寄せる候補を返す。
 *
 * **接頭辞を判定しない。** `parseOkfLink` が読めた href のうち、綴りが
 * `canonicalHref` と違うものがそれである。ここで `/^\//` のような判定を持つと、
 * `okf.ts` が受ける綴りを増やしたときにこのツールだけが取り残される。
 *
 * 読めない href（`sub/x.md` `../x.md` `/index.md`）は触らない。行き先を決められない
 * ので、寄せ先が無い — そちらは lint が「内部リンクにならない」として報せる。
 */
function scanLinkForm(source: string, isProtected: (i: number) => boolean): {
  candidates: { start: number; end: number; line: number; from: string; to: string }[]
  skipped: Skipped[]
} {
  const candidates: { start: number; end: number; line: number; from: string; to: string }[] = []
  const skipped: Skipped[] = []

  for (const m of source.matchAll(MD_LINK)) {
    const href = m[1]
    const target = parseOkfLink(href)
    if (!target || href === target.canonicalHref) continue

    const { start, end } = hrefRangeOf(m)
    if (isProtected(m.index)) skipped.push({ line: lineOf(source, m.index), text: m[0] })
    else candidates.push({ start, end, line: lineOf(source, m.index), from: href, to: target.canonicalHref })
  }

  return { candidates, skipped }
}

/**
 * フラグメントに書けない文字だけを退避する。
 *
 * パーサの `mdHref` は `[^()\s]+` なので、丸括弧と空白が入ると
 * リンクとして読まれなくなる。それ以外（日本語・ハイフン・`--2`）は
 * 既存のアンカーと同じ綴りのまま残す。
 */
const encodeFragment = (id: string): string =>
  id.replace(/[()\s]/g, (c) => encodeURIComponent(c))

interface DeckFile {
  readonly path: string
  readonly fileName: string
  readonly slug: string
}

/**
 * ディレクトリまたはファイルの列から md を集める（order.yaml は見ない。並びは要らない）。
 *
 * 集めるのは `listDeckFiles` に任せる。**自前で `.md` を拾うと予約ファイルが混ざる** —
 * 生成された `index.md` がデッキとして解析され、その見出しが旧記法の解決先になってしまう
 * （`okf.ts` が「集める場所が複数あるとどれか1つが取り残される」と言っているのはこのこと）。
 */
function collectFiles(paths: readonly string[]): { files: string[]; skipped: string[] } {
  const files: string[] = []
  const skipped: string[] = []
  for (const path of paths) {
    if (statSync(path).isDirectory()) {
      listDeckFiles(path).forEach((f) => files.push(f))
    } else if (isReservedOkfFile(basename(path))) {
      // 名指しされたら黙って飛ばさない。飛ばすと「旧記法は無かった」と読める
      skipped.push(path)
    } else {
      files.push(path)
    }
  }
  return { files, skipped }
}

/**
 * デッキ集合を読み、参照を解決するための索引を作る。
 *
 * slug → ファイル名の逆引きは**ここで控える**。`deckSlug` は非可逆なので、
 * slug だけからファイル名は復元できない（衝突そのものは下で誤りとして弾くが、
 * 弾けるのは「同じ slug が2つある」ことだけで、元の綴りは戻らない）。
 */
function loadDecks(files: readonly string[]): {
  deckFiles: DeckFile[]
  entries: WikiEntry[]
  byId: Map<string, WikiEntry>
} {
  const deckFiles: DeckFile[] = []
  const decks: WikiDeck[] = []

  for (const path of files) {
    const name = basename(path, extname(path))
    const markdown = readFileSync(path, "utf-8")
    // 文字数検証は通さない。要るのはスライドの ID だけで、上限超過で止まると
    // 「直すために移行したい md」が移行できなくなる
    const pres = Effect.runSync(
      parseMarkdown(markdown, { baseDir: path.slice(0, path.lastIndexOf("/")) || "." })
    )
    const slug = deckSlug(name)
    deckFiles.push({ path, fileName: basename(path), slug })
    decks.push({ slug, title: name, presentation: pres })
  }

  // 判定は okf.ts が持つ（`--wiki` の入口と同じもの。ここが写しを持つと、
  // 移行ツールだけが古い規則で通す状態が作れてしまう）
  const collisions = findDeckSlugCollisions(deckFiles)
  if (collisions.length > 0) throw new Error(collisions.join("\n"))

  const { entries, byId } = buildSiteIndex(decks)
  return { deckFiles, entries, byId }
}

/**
 * **旧記法の解決順。ここが唯一の置き場所になった。**
 *
 * `[[…]]` は短く書けることを売りにしていたので、参照だけでは行き先が決まらず、
 * 4段階を順に試す必要があった:
 *
 *   1. `deck/slide` の明示
 *   2. 自デッキ内の `slide`
 *   3. デッキを問わずサイト全体で `slide` がちょうど1つ
 *   4. それ以外は未解決（見つからない、または曖昧）
 *
 * 本体（`link-graph.ts` の `resolveRef`）はこの段をもう持たない。リンクが常に
 * ファイルを名指しするようになり、表を1回引けば済むようになったため。
 * **規則を本体から消してもここに残す**のは、旧記法の md を読めるのが
 * このツールだけになったからで、写しではなく移譲である。
 */
function resolveLegacyRef(
  ref: string,
  fromDeckSlug: string,
  byId: ReadonlyMap<string, WikiEntry>,
  byLocalId: ReadonlyMap<string, readonly WikiEntry[]>
): { globalId: string } | { reason: "not-found" | "ambiguous" } {
  if (byId.has(ref)) return { globalId: ref }

  const sameDeck = `${fromDeckSlug}/${ref}`
  if (byId.has(sameDeck)) return { globalId: sameDeck }

  const candidates = byLocalId.get(ref) ?? []
  if (candidates.length === 1) return { globalId: candidates[0].globalId }
  if (candidates.length > 1) return { reason: "ambiguous" }
  return { reason: "not-found" }
}

interface Failure {
  readonly file: string
  readonly line: number
  readonly ref: string
  readonly reason: string
}

interface Change {
  readonly line: number
  readonly from: string
  readonly to: string
  /** どちらの移行か。`--check` が残存の意味を書き分けるのに使う */
  readonly kind: "wikilink" | "link-form"
}

interface FileResult {
  readonly path: string
  readonly rewritten: string
  readonly changes: Change[]
  readonly skipped: Skipped[]
  readonly failures: Failure[]
}

function migrate(files: readonly string[]): FileResult[] {
  const { deckFiles, entries, byId } = loadDecks(files)
  const fileBySlug = new Map(deckFiles.map((d) => [d.slug, d.fileName]))

  const byLocalId = new Map<string, WikiEntry[]>()
  for (const entry of entries) {
    const bucket = byLocalId.get(entry.localId)
    if (bucket) bucket.push(entry)
    else byLocalId.set(entry.localId, [entry])
  }

  return deckFiles.map((deck) => {
    const source = readFileSync(deck.path, "utf-8")
    const ranges = protectedRanges(source)
    const isProtected = (i: number): boolean => ranges.some((r) => i >= r.start && i < r.end)

    const { candidates, skipped } = scanWikilinks(source, isProtected)
    const prefixed = scanLinkForm(source, isProtected)

    const changes: Change[] = []
    const failures: Failure[] = []
    const edits: { start: number; end: number; text: string }[] = []

    for (const p of prefixed.candidates) {
      edits.push({ start: p.start, end: p.end, text: p.to })
      changes.push({ line: p.line, from: p.from, to: p.to, kind: "link-form" })
    }

    for (const c of candidates) {
      const resolved = resolveLegacyRef(c.ref, deck.slug, byId, byLocalId)
      if ("reason" in resolved) {
        failures.push({ file: deck.fileName, line: c.line, ref: c.ref, reason: resolved.reason })
        continue
      }
      const entry = byId.get(resolved.globalId)!
      const target = fileBySlug.get(entry.deckSlug)
      if (!target) {
        failures.push({ file: deck.fileName, line: c.line, ref: c.ref, reason: "deck-not-a-file" })
        continue
      }
      const href = `${target}#${encodeFragment(entry.localId)}`
      const text = `[${c.label}](${href})`
      edits.push({ start: c.start, end: c.end, text })
      changes.push({ line: c.line, from: source.slice(c.start, c.end), to: text, kind: "wikilink" })
    }

    // **後ろから当てる前に並べ替える。** 前から書き換えると以降のオフセットが全部ずれ、
    // 走査が2本あるぶん `edits` はもう位置順に並んでいない（片方は `[[…]]`、
    // もう片方は href の範囲を、それぞれ独立に頭から拾ってくる）
    let rewritten = source
    for (const e of [...edits].sort((a, b) => b.start - a.start)) {
      rewritten = rewritten.slice(0, e.start) + e.text + rewritten.slice(e.end)
    }

    return {
      path: deck.path,
      rewritten,
      changes: changes.sort((a, b) => a.line - b.line),
      skipped: [...skipped, ...prefixed.skipped].sort((a, b) => a.line - b.line),
      failures,
    }
  })
}

// ── CLI ──────────────────────────────────────────────────────────────

const USAGE = `Usage: tsx src/tools/migrate-wikilinks.ts [options] <dir|file...>

  --dry-run            書き換えずに差分だけ出す
  --check              古い記法が残っていれば非ゼロ終了（書き換えはしない）
                       見るのは2つ: [[…]] と、先頭に / ・ ./ の付いた内部リンク

終了コード: 0 = 問題なし / 1 = 未解決あり（--check では残存あり） / 2 = 使い方・入出力の誤り`

export function main(argv: readonly string[]): number {
  const dryRun = argv.includes("--dry-run")
  const check = argv.includes("--check")
  const paths = argv.filter((a) => !a.startsWith("--"))

  if (paths.length === 0) {
    console.error(USAGE)
    return 2
  }

  const { files, skipped: skippedFiles } = collectFiles(paths)
  for (const path of skippedFiles) {
    console.error(`${basename(path)}: OKF の予約ファイルなので走査しない`)
  }

  let results: FileResult[]
  try {
    results = migrate(files)
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e))
    return 2
  }

  const failures = results.flatMap((r) => r.failures)
  const changed = results.filter((r) => r.changes.length > 0)
  const totalChanges = results.reduce((n, r) => n + r.changes.length, 0)
  const totalSkipped = results.reduce((n, r) => n + r.skipped.length, 0)

  if (check) {
    const left = totalChanges + failures.length
    for (const r of results) {
      for (const c of r.changes) console.error(`${basename(r.path)}:${c.line}: ${c.from}`)
      for (const f of r.failures) console.error(`${f.file}:${f.line}: [[${f.ref}]]`)
    }
    if (left > 0) {
      // **2つを別に数える。** 残り方が違う — `[[…]]` はサイトでも折れているので
      // 見れば分かるが、接頭辞つきはサイトでは当たり github.com でだけ折れる
      const legacy = results.reduce((n, r) => n + r.changes.filter((c) => c.kind === "wikilink").length, 0)
      const linkForm = results.reduce((n, r) => n + r.changes.filter((c) => c.kind === "link-form").length, 0)
      const parts = [
        legacy + failures.length > 0 ? `旧 [[…]] 記法が ${legacy + failures.length} 件` : "",
        linkForm > 0 ? `先頭に \`/\`・\`./\` の付いた内部リンクが ${linkForm} 件` : "",
      ].filter(Boolean)
      console.error(`${parts.join("、")}残っている`)
    }
    return left > 0 ? 1 : 0
  }

  for (const r of changed) {
    console.log(`${basename(r.path)}`)
    for (const c of r.changes) console.log(`  ${c.line}: ${c.from} → ${c.to}`)
  }

  for (const r of results) {
    for (const s of r.skipped) {
      console.log(`${basename(r.path)}:${s.line}: ${s.text} はコード表記なので据え置き`)
    }
  }

  if (failures.length > 0) {
    console.error("")
    for (const f of failures) {
      console.error(`${f.file}:${f.line}: [[${f.ref}]] を解決できない (${f.reason})`)
    }
    console.error(
      `\n未解決が ${failures.length} 件あるので何も書き換えなかった。` +
        `半分だけ移した md はいちばん直しにくい状態になる`
    )
    return 1
  }

  if (!dryRun) {
    for (const r of changed) writeFileSync(r.path, r.rewritten, "utf-8")
  }

  console.log(
    `\n${totalChanges + totalSkipped + failures.length} 件中 ${totalChanges} 件を書き換え、` +
      `${totalSkipped} 件はコード表記のため据え置き、未解決 ${failures.length} 件` +
      (dryRun ? "（--dry-run なので書いていない）" : "")
  )

  return failures.length > 0 ? 1 : 0
}

// 直接実行されたときだけ走る（テストからは main を呼ぶ）
if (process.argv[1]?.endsWith("migrate-wikilinks.ts")) {
  process.exit(main(process.argv.slice(2)))
}
