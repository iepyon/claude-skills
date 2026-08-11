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
  getFrontmatter,
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

/** ヘッダと区切り行を手書きしない（列数の数え間違いが起きる） */
const table = (headers: readonly string[], rows: readonly (readonly string[])[]): string[] => [
  `| ${headers.join(" | ")} |`,
  `|${headers.map(() => "---").join("|")}|`,
  ...rows.map((r) => `| ${r.join(" | ")} |`),
]

/** 散文を段落として出す（YAML のブロックスカラー末尾の改行を落とす） */
const prose = (s: string | undefined): string[] => (s ? ["", s.trimEnd(), ""] : [])

const directiveCell = (layout: Layout): string =>
  layout.directives.length === 0
    ? "(なし)"
    : layout.directives.map((d) => codeCell(d.syntax)).join(" ")

// ── 部品（ontology.md と SKILL.md で共有する表） ─────────────────────

function layoutsTable(): string[] {
  return table(
    ["レイアウト", "ディレクティブ", "説明"],
    getLayouts().map((l) => [l.label, directiveCell(l), cell(l.description)])
  )
}

function annotationsTable(): string[] {
  const layouts = getLayouts()
  return table(
    ["注釈", "記法", "効くレイアウト", "説明"],
    getAnnotations().map((a) => {
      // 逆リストは layouts[].annotations から導く（宣言に逆向きを持たせない）
      const users = layouts.filter((l) => l.annotations.includes(a.name))
      const where =
        users.length === layouts.length ? "すべて" : users.map((l) => l.label).join("・")
      return [codeCell(a.name), codeCell(a.syntax), cell(where), cell(a.description)]
    })
  )
}

function inlineTable(): string[] {
  const inline = loadOntology().inline
  const lines = table(
    ["書き方", "意味"],
    inline.syntaxes.map((s) => [codeCell(s.syntax), cell(s.description)])
  )
  lines.push("")
  lines.push(`効くのは ${inline["effective-in"].map(code).join("・")}。${cell(inline["not-effective-in-note"])}`)
  return lines
}

function frontmatterTable(): string[] {
  const fm = getFrontmatter()
  const lines = table(
    ["キー", "level", "形", "説明"],
    fm.fields.map((f) => {
      const kind = f["allowed-values"] ? f["allowed-values"].map(code).join(" / ") : code(f.kind)
      return [codeCell(f.name), cell(f.level), kind, cell(f.description)]
    })
  )
  lines.push("")
  lines.push(
    `1行目がちょうど ${code(fm.recognition["first-line"])} で、2行目が ${code("key: value")} の形のときだけ` +
      "メタとして読む（どちらかを満たさない `---` は今までどおりスライド区切り）。"
  )
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

function subLabelsTable(sub: SubLabels): string[] {
  return table(
    ["小項目", "ラベル"],
    sub.terms.map((t) => {
      const conditions: string[] = []
      if (t.contains?.length) conditions.push(`${t.contains.map(code).join(" か ")} を含む`)
      if (t["contains-all"]?.length) {
        conditions.push(`${t["contains-all"].map(code).join(" と ")} を両方含む`)
      }
      const label = sub.match === "exact" ? code(`**${t.canonical}:**`) : conditions.join(" / ")
      return [code(t.key), label]
    })
  )
}

function vocabularySection(name: string, vocab: Vocabulary): string[] {
  const lines = [`### ${vocab.label}（${code(name)}）`, ""]
  lines.push(
    `語彙外の見出しの扱い: **${vocab.unknown}**` +
      (vocab["unknown-effect"] ? ` — ${cell(vocab["unknown-effect"])}` : "")
  )
  lines.push(...prose(vocab.guidance))
  lines.push("")
  lines.push(
    ...table(
      ["キー", "正書", "別表記", "説明"],
      vocab.terms.map((t) => [
        code(t.key),
        cell(t.canonical),
        t.pattern ? `正規表現 ${code(t.pattern)}` : (t.aliases ?? []).map(code).join("・") || "—",
        cell(t.description),
      ])
    )
  )
  for (const t of vocab.terms) {
    const sub = t["sub-labels"]
    if (!sub) continue
    lines.push("", `**${t.canonical}** の中の小項目:`, "", ...subLabelsTable(sub))
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
    lines.push(
      ...table(
        ["スロット", "記号", "個数", "見出し", "本文", "説明"],
        layout.slots.map((s) => [
          code(s.name),
          code(s.marker),
          code(s.cardinality),
          s.heading === "vocabulary" ? `語彙 ${code(s.vocabulary ?? "")}` : "自由",
          code(s.body ?? "free"),
          cell(s.description),
        ])
      )
    )
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
    "# slide-wiki スライド Markdown オントロジー",
    "",
    "slide-wiki が読む Markdown の構造の全文リファレンス。**この文書は生成物**で、正本は",
    "[ontology.yaml](ontology.yaml)。書き方の要約は [SKILL.md](SKILL.md) にある。",
    "",
    "## md の骨格要素",
    "",
    ...table(
      ["要素", "記号", "説明"],
      Object.entries(onto.elements).map(([name, el]) => [
        `${code(name)}（${el.label}）`,
        el.marker ? code(el.marker) : "—",
        cell(el.description),
      ])
    ),
  ]
  for (const [name, el] of Object.entries(onto.elements)) {
    if (el.guidance) L.push("", `- ${code(name)} — ${cell(el.guidance)}`)
  }

  const fm = getFrontmatter()
  L.push("", "## デッキのメタ（frontmatter）", "", cell(fm.description), "", ...frontmatterTable())
  if (fm.guidance) L.push("", ...fm.guidance.trim().split("\n").map((l) => l.trim()))
  L.push(
    "",
    `名乗っていない md の扱いは ${code(fm.require)}、宣言に無いキーは ${code(fm.unknown)}、` +
      `読めない frontmatter は ${code(fm.malformed)}。`
  )

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
    L.push(
      "",
      ...table(
        ["キー", "必須", "種別", "説明", "例"],
        fs.keys.map((k) => [
          code(k.name),
          k.required ? "必須" : "省略可",
          code(k.kind),
          cell(k.description),
          k.example ? code(k.example) : "—",
        ])
      )
    )
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
    frontmatter: frontmatterTable(),
    layouts: layoutsTable(),
    annotations: annotationsTable(),
    inline: inlineTable(),
  }
}

/**
 * `buildOntologyDoc` が読むトップレベルキー。
 *
 * ここに無いキーを ontology.yaml に足すと、宣言したのに ontology.md へ出ないまま
 * すべてが緑になる（`--check` は生成物どうしを比べるだけなので気づけない）。
 * 「宣言＝ドキュメント」を掲げる以上、黙って文書化されない宣言は出してはいけないので、
 * selfcheck がこの集合を実際のキーと突き合わせる。
 */
export const CONSUMED_KEYS: ReadonlySet<string> = new Set([
  "version", // ヘッダの ontology-version に出る
  "elements",
  "frontmatter",
  "annotations",
  "layouts",
  "vocabularies",
  "field-sets",
  "inline",
  "limits",
])

/** SKILL.md にあるが生成側が作らない領域マーカー（＝永久に古いまま残る領域） */
export function staleSkillRegions(skill: string): string[] {
  const produced = new Set(Object.keys(skillRegions()))
  const found = [...skill.matchAll(/<!-- BEGIN GENERATED: ([\w-]+) -->/g)].map((m) => m[1])
  return found.filter((name) => !produced.has(name))
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

export function main(argv: readonly string[]): number {
  const check = argv.includes("--check")
  let drifted = 0

  // 未生成（初回）もドリフト扱い。--check が「まだ無い」を見逃すと CI が素通りする
  const current = (path: string): string => (existsSync(path) ? readFileSync(path, "utf-8") : "")

  // SKILL.md は現物を読んで生成領域だけ差し替えるので、比較対象と入力が同じ1回の読み取り
  const skill = current(SKILL_MD)
  const outputs: ReadonlyArray<readonly [string, string, string, string]> = [
    [ONTOLOGY_MD, "ontology.md", buildOntologyDoc(), current(ONTOLOGY_MD)],
    [SKILL_MD, "SKILL.md", skill === "" ? "" : applySkillRegions(skill), skill],
  ]

  for (const [path, label, built, existing] of outputs) {
    if (built === existing) continue
    if (check) {
      console.error(
        `ドリフト検出: ${label} が ontology.yaml と不一致。` +
          "`npx tsx src/tools/gen-ontology-doc.ts` で再生成する"
      )
      drifted++
    } else {
      writeFileSync(path, built, "utf-8")
      console.log(`生成: ${label}`)
    }
  }

  if (check && drifted === 0) console.log("生成物は ontology.yaml と一致している")
  return drifted > 0 ? 1 : 0
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)))
}

export { buildOntologyDoc, ONTOLOGY_MD, SKILL_MD }
