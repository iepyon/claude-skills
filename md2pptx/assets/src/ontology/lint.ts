/**
 * 書かれた Markdown を ontology.yaml の宣言に照らして検証する。
 *
 * なぜトークン層で見るか: 語彙外の `###` / `####` や未宣言のメタキーは、AST に変換される
 * 時点でもう失われている（どのマスにも入らなかったブロックは消え、未知のメタキーは
 * 捨てられる）。「黙って消えた」を捕まえるには、消える前＝トークン列を見るしかない。
 *
 * 文字数はここでは見ない。schema/validation.ts が同じ宣言（limits / max-chars）を読んで
 * ValidationError として弾いており、二重に報告しても直し方は増えないため。
 */
import "../plugins/index.js" // side-effect: 登録が済んでいないとプラグインのディレクティブが本文に落ちる
import { tokenize, type Token } from "../parser/tokenizer.js"
import {
  getAnnotations,
  getFieldSet,
  getLayouts,
  getVocabulary,
  parseCardinality,
  resolveTerm,
} from "./index.js"
import type { Layout, Slot } from "./types.js"

export interface Diagnostic {
  readonly level: "error" | "warning"
  /** チェック名（kebab-case）。grep できるように短く保つ */
  readonly check: string
  readonly line: number
  readonly message: string
}

/** 1スライドぶんのトークン */
interface SlideTokens {
  readonly tokens: readonly Token[]
  /** スライドの見出し行（メッセージで場所を示すのに使う） */
  readonly line: number
}

const splitSlides = (tokens: readonly Token[]): SlideTokens[] => {
  const slides: SlideTokens[] = []
  let current: Token[] = []
  let line = 1
  for (const token of tokens) {
    if (token.type === "HorizontalRule") {
      if (current.length > 0) slides.push({ tokens: current, line })
      current = []
      line = token.line
      continue
    }
    if (current.length === 0) line = token.line
    current.push(token)
  }
  if (current.length > 0) slides.push({ tokens: current, line })
  return slides
}

/**
 * このスライドが選んだレイアウト。
 *
 * プラグインのディレクティブは `pluginId` で分かる。numbered-list だけは
 * `numbered-list:circle` のように変種を後ろに付けるので、コロンの前で照合する。
 */
function detectLayout(tokens: readonly Token[]): Layout | undefined {
  const layouts = getLayouts()
  const byName = (name: string): Layout | undefined => layouts.find((l) => l.name === name)

  for (const token of tokens) {
    if (token.type === "PluginDirective") {
      const id = token.pluginId
      const found =
        layouts.find((l) => l.plugin === id) ?? layouts.find((l) => l.plugin === id.split(":")[0])
      if (found) return found
    }
  }
  if (tokens.some((t) => t.type === "GridDirective")) return byName("Grid")
  if (tokens.some((t) => t.type === "LeftDirective" || t.type === "RightDirective")) {
    return byName("LeftRight")
  }
  if (tokens.some((t) => t.type === "TopDirective" || t.type === "BottomDirective")) {
    return byName("TopBottom")
  }
  if (tokens.some((t) => t.type === "CodeFenceOpen")) return byName("CodeDisplay")
  // タイトルスライドはレイアウトを持たない。`##` の無い断片（先頭の空行など）も同じく対象外
  if (!tokens.some((t) => t.type === "H2")) return undefined
  return byName("Default")
}

/** グリッドの `###` 件数はディレクティブの引数で決まる */
function gridCellCount(tokens: readonly Token[]): number | undefined {
  const grid = tokens.find((t) => t.type === "GridDirective")
  return grid && grid.type === "GridDirective" ? grid.rows * grid.cols : undefined
}

const headings = (tokens: readonly Token[], marker: "###" | "####"): Token[] =>
  tokens.filter((t) => t.type === (marker === "###" ? "H3" : "H4"))

/** `####` は直前の `###` に属する。件数はその区切りごとに数える */
function h4Groups(tokens: readonly Token[]): Token[][] {
  const groups: Token[][] = []
  let current: Token[] | undefined
  for (const token of tokens) {
    if (token.type === "H3") {
      current = []
      groups.push(current)
    } else if (token.type === "H4" && current) {
      current.push(token)
    }
  }
  return groups
}

function checkCardinality(
  slot: Slot,
  count: number,
  line: number,
  expectedOverride?: number
): Diagnostic[] {
  const card = parseCardinality(slot.cardinality)
  const min = expectedOverride ?? card.min
  const max = expectedOverride ?? card.max
  const describe = expectedOverride !== undefined ? `${expectedOverride}件` : slot.cardinality

  if (count < min) {
    return [
      {
        level: "warning",
        check: "slot-cardinality",
        line,
        message: `${slot.marker} が ${count} 件しかない（${slot.name} は ${describe}）`,
      },
    ]
  }
  if (max !== undefined && count > max) {
    return [
      {
        level: "warning",
        check: "slot-cardinality",
        line,
        message: `${slot.marker} が ${count} 件ある（${slot.name} は ${describe}。超過分は描かれない）`,
      },
    ]
  }
  return []
}

function checkVocabulary(slot: Slot, tokens: readonly Token[]): Diagnostic[] {
  if (slot.heading !== "vocabulary" || !slot.vocabulary) return []
  const vocab = getVocabulary(slot.vocabulary)
  if (!vocab || vocab.unknown === "ignore") return []

  const out: Diagnostic[] = []
  for (const token of headings(tokens, slot.marker)) {
    const text = "text" in token ? token.text : ""
    if (resolveTerm(vocab, text)) continue
    const accepted = vocab.terms.map((t) => t.canonical).join("・")
    out.push({
      level: vocab.unknown,
      check: "slot-vocabulary",
      line: token.line,
      message:
        `${slot.marker} '${text}' は ${vocab.label} の語彙に無い` +
        (vocab["unknown-effect"] ? `（${vocab["unknown-effect"]}）` : "") +
        `。受理されるのは ${accepted}`,
    })
  }
  return out
}

/** `key: value` のメタ相は、ディレクティブから最初の `###` までの本文行 */
function metaLines(tokens: readonly Token[]): Token[] {
  const out: Token[] = []
  let started = false
  for (const token of tokens) {
    if (token.type === "PluginDirective") {
      started = true
      continue
    }
    if (!started) continue
    if (token.type === "H3") break
    if (token.type === "BodyText") out.push(token)
  }
  return out
}

function checkFieldSet(layout: Layout, tokens: readonly Token[], line: number): Diagnostic[] {
  const name = layout["field-set"]
  if (!name) return []
  const fieldSet = getFieldSet(name)
  if (!fieldSet) return []

  const out: Diagnostic[] = []
  const seen = new Map<string, number>()
  for (const token of metaLines(tokens)) {
    const text = "text" in token ? token.text : ""
    const colon = text.indexOf(":")
    if (colon <= 0) continue // メタ相の非 key:value 行は実装も読み飛ばす
    seen.set(text.slice(0, colon).trim(), token.line)
  }

  const declared = new Set(fieldSet.keys.map((k) => k.name))
  if (fieldSet.unknown !== "ignore") {
    for (const [key, keyLine] of seen) {
      if (declared.has(key)) continue
      out.push({
        level: fieldSet.unknown,
        check: "meta-keys",
        line: keyLine,
        message: `メタキー '${key}' は ${name} に宣言が無い（どこにも描かれない。タイポか宣言漏れ）`,
      })
    }
  }
  for (const key of fieldSet.keys) {
    if (key.required && !seen.has(key.name)) {
      out.push({
        level: "warning",
        check: "meta-keys",
        line,
        message: `必須のメタキー '${key.name}' が無い（${key.description}）`,
      })
    }
  }
  return out
}

function checkAnnotationScope(layout: Layout, tokens: readonly Token[]): Diagnostic[] {
  const allowed = new Set(layout.annotations)
  const used: Array<{ name: string; token: Token }> = []
  for (const token of tokens) {
    if (token.type === "IconDirective") used.push({ name: "icon", token })
    if (token.type === "TakeawayMarker") used.push({ name: "takeaway", token })
    if (token.type === "IdDirective") used.push({ name: "id", token })
  }
  return used
    .filter((u) => !allowed.has(u.name))
    .map((u) => ({
      level: "warning" as const,
      check: "annotation-scope",
      line: u.token.line,
      message: `${layout.label} では注釈 '${u.name}' は効かない（黙って捨てられる）`,
    }))
}

/**
 * どの宣言にも一致しない `<!--…-->`。
 *
 * トークナイザは知らないコメントを BodyText に落とすので、綴りを間違えたディレクティブは
 * 効かないどころか**本文としてスライドに描かれる**。
 */
function checkUnknownDirectives(tokens: readonly Token[]): Diagnostic[] {
  return tokens
    .filter((t) => t.type === "BodyText" && /^<!--[\s\S]*-->$/.test(t.text))
    .map((t) => ({
      level: "warning" as const,
      check: "unknown-directive",
      line: t.line,
      message: `'${"text" in t ? t.text : ""}' はどのディレクティブ・注釈の宣言にも一致しない（本文として描かれる）`,
    }))
}

/** 宣言に照らして Markdown を検証する。行番号順に返す */
export function lintSource(markdown: string): Diagnostic[] {
  const out: Diagnostic[] = []

  for (const slide of splitSlides(tokenize(markdown))) {
    out.push(...checkUnknownDirectives(slide.tokens))

    const layout = detectLayout(slide.tokens)
    if (!layout) continue

    out.push(...checkAnnotationScope(layout, slide.tokens))
    out.push(...checkFieldSet(layout, slide.tokens, slide.line))

    const h4Slot = layout.slots.find((s) => s.marker === "####")
    for (const slot of layout.slots) {
      out.push(...checkVocabulary(slot, slide.tokens))
      if (slot.marker === "###") {
        const expected = slot.cardinality === "rows*cols" ? gridCellCount(slide.tokens) : undefined
        out.push(
          ...checkCardinality(slot, headings(slide.tokens, "###").length, slide.line, expected)
        )
      } else {
        // `####` は `###` ごとに数える（フェーズ4つ × 行4つ を16件と読まないため）
        for (const group of h4Groups(slide.tokens)) {
          out.push(...checkCardinality(slot, group.length, group[0]?.line ?? slide.line))
        }
      }
    }

    if (!h4Slot && headings(slide.tokens, "####").length > 0) {
      const first = headings(slide.tokens, "####")[0]
      out.push({
        level: "warning",
        check: "slot-cardinality",
        line: first.line,
        message: `${layout.label} は #### を読まない（この行以下は描かれない）`,
      })
    }
  }

  return out.sort((a, b) => a.line - b.line)
}

/** 人が読む1行にする。`file:line` は端末からクリックできる */
export function formatDiagnostic(d: Diagnostic, file?: string): string {
  const where = file ? `${file}:${d.line}` : `line ${d.line}`
  return `  [${d.level}] ${d.check} | ${where} | ${d.message}`
}

/** どの注釈がどこで効くかは宣言が正本。テストが宣言の網羅を確かめるために使う */
export function annotationNames(): string[] {
  return getAnnotations().map((a) => a.name)
}
