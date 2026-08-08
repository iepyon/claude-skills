/**
 * ontology.yaml から人間/AI 可読なドキュメントを生成する（決定論・手編集禁止）。
 *
 * 正本は ontology.yaml。このスクリプトはそれを Markdown に射影するだけ。
 *   npx tsx src/tools/gen-ontology-doc.ts          … ../ontology.md と SKILL.md 生成領域を上書き
 *   npx tsx src/tools/gen-ontology-doc.ts --check   … 生成せずドリフトの有無を exit code で返す
 *
 * SKILL.md は全体を生成しない。Claude が最初に読む文書なので、手書きの散文（Quick Start・
 * Wiki の読み方）はそのまま残す価値がある。表と数字だけを BEGIN/END GENERATED で囲って
 * 差し替える。
 */
import { existsSync, readFileSync, writeFileSync } from "fs"
import { fileURLToPath } from "url"
import {
  getAnnotations,
  getFieldSets,
  getLayouts,
  getLimits,
  getVocabularies,
  loadOntology,
  ontologyVersion,
} from "../ontology/index.js"
import type { Layout, SubLabels, Vocabulary } from "../ontology/types.js"

const ONTOLOGY_MD = fileURLToPath(new URL("../../../ontology.md", import.meta.url))
const SKILL_MD = fileURLToPath(new URL("../../../SKILL.md", import.meta.url))

/** Markdown 表のセルに入れる（改行とパイプを潰す） */
const cell = (s: string | undefined): string =>
  (s ?? "").split(/\s+/).filter(Boolean).join(" ").replace(/\|/g, "\\|")

/**
 * インラインコード。値にバッククォートが混ざるとき（コードフェンスの記法や `` `text` ``）は
 * 二重バッククォートで囲む — 素の `…` で囲むと隣り合ったバッククォートが打ち消し合って
 * 記法そのものが表示されなくなる。
 */
const code = (s: string): string => (s.includes("`") ? "`` " + s + " ``" : "`" + s + "`")

/** 表のセルに入れるインラインコード。`[[a|b]]` のパイプは列区切りに食われるのでエスケープする */
const codeCell = (s: string): string => code(s).replace(/\|/g, "\\|")

/** 散文を段落として出す（YAML のブロックスカラー末尾の改行を落とす） */
const prose = (s: string | undefined): string[] => (s ? ["", s.trimEnd(), ""] : [])

const directiveCell = (layout: Layout): string =>
  layout.directives.length === 0
    ? "(なし)"
    : layout.directives.map((d) => codeCell(d.syntax)).join(" ")

// ── 部品（ontology.md と SKILL.md で共有する表） ─────────────────────

function layoutsTable(): string[] {
  const lines = ["| レイアウト | ディレクティブ | 説明 |", "|---|---|---|"]
  for (const l of getLayouts()) {
    lines.push(`| ${l.label} | ${directiveCell(l)} | ${cell(l.description)} |`)
  }
  return lines
}

function annotationsTable(): string[] {
  const lines = ["| 注釈 | 記法 | 効くレイアウト | 説明 |", "|---|---|---|---|"]
  for (const a of getAnnotations()) {
    // 逆リストは layouts[].annotations から毎回導く（宣言に逆向きを持たせない）
    const users = getLayouts().filter((l) => l.annotations.includes(a.name))
    const where =
      users.length === getLayouts().length ? "すべて" : users.map((l) => l.label).join("・")
    lines.push(`| ${codeCell(a.name)} | ${codeCell(a.syntax)} | ${cell(where)} | ${cell(a.description)} |`)
  }
  return lines
}

function inlineTable(): string[] {
  const inline = loadOntology().inline
  const lines = ["| 書き方 | 意味 |", "|---|---|"]
  for (const s of inline.syntaxes) {
    lines.push(`| ${codeCell(s.syntax)} | ${cell(s.description)} |`)
  }
  lines.push("")
  lines.push(`効くのは ${inline["effective-in"].map(code).join("・")}。${cell(inline["not-effective-in-note"])}`)
  return lines
}

function limitsBullets(): string[] {
  const limits = getLimits()
  const overrides = getLayouts().filter((l) => l["max-chars"] !== undefined)
  const lines = [
    `- 1スライド **${limits["max-chars-per-slide"]}文字**を超えると ValidationError。${cell(limits.counts)}`,
    `- 読みやすさの目安は **${limits["recommended-chars-per-slide"]}文字程度**（ツールでは強制しない）`,
  ]
  for (const l of overrides) {
    lines.push(`- ${l.label} だけは **${l["max-chars"]}文字**まで（レイアウトごとの上書き）`)
  }
  lines.push(
    `- ${limits["excluded-layouts"].map((t) => code(t)).join("・")} は文字数を数えない（タイトルのみ）`
  )
  return lines
}

// ── ontology.md ────────────────────────────────────────────────────

function subLabelsTable(sub: SubLabels, indent: string): string[] {
  const lines = [`${indent}| 小項目 | ラベル |`, `${indent}|---|---|`]
  for (const t of sub.terms) {
    const conditions: string[] = []
    if (t.contains?.length) conditions.push(`${t.contains.map(code).join(" か ")} を含む`)
    if (t["contains-all"]?.length) {
      conditions.push(`${t["contains-all"].map(code).join(" と ")} を両方含む`)
    }
    const label = sub.match === "exact" ? code(`**${t.canonical}:**`) : conditions.join(" / ")
    lines.push(`${indent}| ${code(t.key)} | ${label} |`)
  }
  return lines
}

function vocabularySection(name: string, vocab: Vocabulary): string[] {
  const lines = [`### ${vocab.label}（${code(name)}）`, ""]
  lines.push(
    `語彙外の見出しの扱い: **${vocab.unknown}**` +
      (vocab["unknown-effect"] ? ` — ${cell(vocab["unknown-effect"])}` : "")
  )
  lines.push(...prose(vocab.guidance))
  lines.push("")
  lines.push("| キー | 正書 | 別表記 | 説明 |", "|---|---|---|---|")
  for (const t of vocab.terms) {
    const alt = t.pattern
      ? `正規表現 ${code(t.pattern)}`
      : (t.aliases ?? []).map(code).join("・") || "—"
    lines.push(`| ${code(t.key)} | ${cell(t.canonical)} | ${alt} | ${cell(t.description)} |`)
  }
  for (const t of vocab.terms) {
    const sub = t["sub-labels"]
    if (!sub) continue
    lines.push("", `**${t.canonical}** の中の小項目:`, "")
    lines.push(...subLabelsTable(sub, ""))
  }
  return lines
}

function layoutSection(layout: Layout): string[] {
  const lines = [`### ${layout.label}`, ""]
  lines.push(
    `- ディレクティブ: ${directiveCell(layout)}`,
    `- ${code("_tag")}: ${code(layout.name)}` +
      (layout.plugin ? `（プラグイン ${code(layout.plugin)}）` : "（コアレイアウト）"),
    `- 説明: ${cell(layout.description)}`
  )
  if (layout.annotations.length > 0) {
    lines.push(`- 効く注釈: ${layout.annotations.map(code).join("・")}`)
  }
  if (layout["max-chars"] !== undefined) {
    lines.push(`- 文字数上限: **${layout["max-chars"]}**（既定の上書き）`)
  }
  if (layout.produces) {
    lines.push(`- 生成されるスライド: ${layout.produces.map(code).join(" → ")}`)
  }
  if (layout["field-set"]) {
    lines.push(`- メタ: ${code(layout["field-set"])}（下記「メタ」節）`)
  }
  if (layout["leading-body"]) {
    lines.push(`- ディレクティブ直後の本文: ${cell(layout["leading-body"])}`)
  }
  lines.push(...prose(layout.guidance))

  if (layout.slots.length > 0) {
    lines.push("")
    lines.push("| スロット | 記号 | 個数 | 見出し | 本文 | 説明 |", "|---|---|---|---|---|---|")
    for (const s of layout.slots) {
      const heading =
        s.heading === "vocabulary" ? `語彙 ${code(s.vocabulary ?? "")}` : "自由"
      lines.push(
        `| ${code(s.name)} | ${code(s.marker)} | ${code(s.cardinality)} | ${heading} | ` +
          `${code(s.body ?? "free")} | ${cell(s.description)} |`
      )
    }
  }

  if (layout.example) {
    lines.push("", "```markdown", layout.example.trimEnd(), "```")
  }
  return lines
}

function buildOntologyDoc(): string {
  const onto = loadOntology()
  const L: string[] = [
    "<!-- 生成物: src/tools/gen-ontology-doc.ts による ontology.yaml からの機械生成。手編集禁止。",
    `     \`npx tsx src/tools/gen-ontology-doc.ts\` で再生成する。正本は ontology.yaml。`,
    `     ontology-version: ${ontologyVersion()} -->`,
    "",
    "# md2pptx スライド Markdown オントロジー",
    "",
    "md2pptx が読む Markdown の構造の全文リファレンス。**この文書は生成物**で、正本は",
    "[ontology.yaml](ontology.yaml)。書き方の要約は [SKILL.md](SKILL.md) にある。",
    "",
    "## md の骨格要素",
    "",
    "| 要素 | 記号 | 説明 |",
    "|---|---|---|",
  ]
  for (const [name, el] of Object.entries(onto.elements)) {
    L.push(`| ${code(name)}（${el.label}） | ${el.marker ? code(el.marker) : "—"} | ${cell(el.description)} |`)
  }
  for (const [name, el] of Object.entries(onto.elements)) {
    if (el.guidance) L.push("", `- ${code(name)} — ${cell(el.guidance)}`)
  }

  L.push("", "## 注釈ディレクティブ", "", ...annotationsTable())
  for (const a of getAnnotations()) {
    if (a.guidance) L.push("", `- ${code(a.name)} — ${cell(a.guidance)}`)
  }

  L.push("", "## レイアウト一覧", "", ...layoutsTable())
  L.push("", "## レイアウトごとの構造", "")
  L.push("`###` / `####` に何を書けばよいかの正本。")
  for (const layout of getLayouts()) {
    L.push("", ...layoutSection(layout))
  }

  L.push("", "## 語彙", "")
  L.push("見出し名そのものが意味を持つスロットで、受理される名前の一覧。")
  for (const [name, vocab] of Object.entries(getVocabularies())) {
    L.push("", ...vocabularySection(name, vocab))
  }

  L.push("", "## メタ（`key: value`）", "")
  for (const [name, fs] of Object.entries(getFieldSets())) {
    L.push(`### ${fs.label}（${code(name)}）`, "")
    L.push(`- レイアウト: ${code(fs.layout)}`, `- 書き方: ${cell(fs.syntax)}`, `- 未宣言キーの扱い: **${fs.unknown}**`)
    L.push(...prose(fs.guidance))
    L.push("", "| キー | 必須 | 種別 | 説明 | 例 |", "|---|---|---|---|---|")
    for (const k of fs.keys) {
      L.push(
        `| ${code(k.name)} | ${k.required ? "必須" : "省略可"} | ${code(k.kind)} | ` +
          `${cell(k.description)} | ${k.example ? code(k.example) : "—"} |`
      )
    }
  }

  L.push("", "## インライン記法", "", ...inlineTable())
  L.push("", "## 制限", "", ...limitsBullets())
  L.push("", ...prose(getLimits().guidance))

  return L.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n"
}

// ── SKILL.md の生成領域 ────────────────────────────────────────────

/** 生成領域の中身。キーは SKILL.md のマーカー名 */
function skillRegions(): Record<string, string[]> {
  return {
    limits: limitsBullets(),
    layouts: layoutsTable(),
    annotations: annotationsTable(),
    inline: inlineTable(),
  }
}

const BEGIN = (name: string): string => `<!-- BEGIN GENERATED: ${name} -->`
const END = (name: string): string => `<!-- END GENERATED: ${name} -->`

/** SKILL.md の各生成領域を差し替える。マーカーが無ければ落とす（黙って未生成にしない） */
export function applySkillRegions(skill: string): string {
  let out = skill
  for (const [name, lines] of Object.entries(skillRegions())) {
    const begin = BEGIN(name)
    const end = END(name)
    const start = out.indexOf(begin)
    const stop = out.indexOf(end)
    if (start < 0 || stop < 0 || stop < start) {
      throw new Error(`SKILL.md に生成領域 '${name}' のマーカー（${begin} … ${end}）が無い`)
    }
    out = out.slice(0, start + begin.length) + "\n" + lines.join("\n") + "\n" + out.slice(stop)
  }
  return out
}

// ── エントリポイント ───────────────────────────────────────────────

interface Target {
  readonly path: string
  readonly label: string
  readonly build: () => string
}

const targets = (): Target[] => [
  { path: ONTOLOGY_MD, label: "ontology.md", build: buildOntologyDoc },
  {
    path: SKILL_MD,
    label: "SKILL.md",
    build: () => applySkillRegions(readFileSync(SKILL_MD, "utf-8")),
  },
]

export function main(argv: readonly string[]): number {
  const check = argv.includes("--check")
  let drifted = 0

  for (const target of targets()) {
    const built = target.build()
    // 未生成（初回）もドリフト扱い。--check が「まだ無い」を見逃すと CI が素通りする
    const current = existsSync(target.path) ? readFileSync(target.path, "utf-8") : ""
    if (built === current) continue
    if (check) {
      console.error(
        `ドリフト検出: ${target.label} が ontology.yaml と不一致。` +
          "`npx tsx src/tools/gen-ontology-doc.ts` で再生成する"
      )
      drifted++
    } else {
      writeFileSync(target.path, built, "utf-8")
      console.log(`生成: ${target.label}`)
    }
  }

  if (check && drifted === 0) console.log("生成物は ontology.yaml と一致している")
  return drifted > 0 ? 1 : 0
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)))
}

export { buildOntologyDoc, ONTOLOGY_MD, SKILL_MD }
