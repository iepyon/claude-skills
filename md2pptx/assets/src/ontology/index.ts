/**
 * スライド Markdown オントロジーのローダ（唯一の正本 ../../../ontology.yaml を読む）。
 *
 * ディレクティブ・文字数上限・見出し語彙・メタキーの定義はすべて ontology.yaml に集約し、
 * このモジュールがそれを実装側が使う形に射影する。コード側に語彙を再定義しない
 * ＝二重管理・ドリフトを防ぐための単一の入口。
 *
 * 依存は `yaml` だけ（plugins/ や parser/ を import しない＝循環回避）。
 * registry.ts がこれを import するため、ここから registry を触ってはいけない。
 */
import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import { parse } from "yaml"
import type {
  Annotation,
  FieldSet,
  Layout,
  Limits,
  Ontology,
  VocabTerm,
  Vocabulary,
} from "./types.js"

export * from "./types.js"

/** src/ontology/ から見て md2pptx/ontology.yaml */
const ONTOLOGY_PATH = fileURLToPath(new URL("../../../ontology.yaml", import.meta.url))

let cached: Ontology | undefined

/** パース済みの宣言（プロセス内で1回だけ読む） */
export function loadOntology(): Ontology {
  if (!cached) {
    cached = parse(readFileSync(ONTOLOGY_PATH, "utf-8")) as Ontology
  }
  return cached
}

/** 生成物のヘッダに刻むスキーマ版 */
export function ontologyVersion(): number {
  return loadOntology().version
}

// --- 各層が使う導出ルックアップ ---

export function getLayouts(): readonly Layout[] {
  return loadOntology().layouts
}

/** _tag（layoutTag）で引く。PatternLanguageDetail のような produces 側も引ける */
export function getLayoutByTag(tag: string): Layout | undefined {
  const layouts = getLayouts()
  return (
    layouts.find((l) => l.name === tag) ??
    layouts.find((l) => l.produces?.includes(tag))
  )
}

/** プラグイン id で引く（registry がディレクティブを導出するのに使う） */
function getLayoutByPlugin(pluginId: string): Layout | undefined {
  return getLayouts().find((l) => l.plugin === pluginId)
}

/**
 * プラグインのディレクティブ。registry がトークンマッチャを導出する。
 *
 * 宣言に無いプラグインは登録できない（selfcheck が両方向を突き合わせるが、
 * ここでも落として「ontology に書き忘れたまま動く」状態を作らせない）。
 */
export function directiveForPlugin(pluginId: string): string {
  const layout = getLayoutByPlugin(pluginId)
  if (!layout || layout.directives.length !== 1) {
    throw new Error(
      `ontology.yaml にプラグイン '${pluginId}' のレイアウト宣言（directives 1件）が無い。` +
        `layouts に追記してから registerPlugin する`
    )
  }
  return layout.directives[0].syntax
}

/**
 * その _tag の文字数上限。宣言が無ければデッキ全体の上限。
 *
 * PatternLanguageDetail のように produces 側の _tag でも、宣言元のレイアウトの
 * 上限が返る（かつて Detail だけ registry に無く 1024 が効いていなかった）。
 */
export function maxCharsForTag(tag: string): number {
  return getLayoutByTag(tag)?.["max-chars"] ?? getLimits()["max-chars-per-slide"]
}

/** 文字数を数えないレイアウトか */
export function isCharCountExcluded(tag: string): boolean {
  return getLimits()["excluded-layouts"].includes(tag)
}

export function getAnnotations(): readonly Annotation[] {
  return loadOntology().annotations
}

export function getVocabularies(): Readonly<Record<string, Vocabulary>> {
  return loadOntology().vocabularies
}

export function getVocabulary(name: string): Vocabulary | undefined {
  return getVocabularies()[name]
}

export function getFieldSets(): Readonly<Record<string, FieldSet>> {
  return loadOntology()["field-sets"]
}

export function getFieldSet(name: string): FieldSet | undefined {
  return getFieldSets()[name]
}

export function getLimits(): Limits {
  return loadOntology().limits
}

/** 宣言は不変なので、コンパイル済みの正規表現は使い回してよい */
const patternCache = new Map<string, RegExp>()

const compiled = (pattern: string): RegExp => {
  let re = patternCache.get(pattern)
  if (!re) {
    re = new RegExp(pattern)
    patternCache.set(pattern, re)
  }
  return re
}

/**
 * 見出しを語彙の項目に解決する。**見出しの正規化はここが唯一の正本。**
 *
 * 小文字化・トリム・末尾コロン（半角/全角の両方）の除去をしてから照合する。
 * プラグインが自前で正規化すると規則がずれ、lint が「宣言どおり」と言う裏で
 * 描画だけが落ちる（実際 customer-journey は半角コロンしか剥がしていなかった）。
 */
export function resolveTerm(vocab: Vocabulary, heading: string): VocabTerm | undefined {
  const trimmed = heading.trim()
  const normalized = trimmed.replace(/[:：]\s*$/, "").toLowerCase()
  for (const term of vocab.terms) {
    if (term.canonical.toLowerCase() === normalized) return term
    if (term.aliases?.some((a) => a.toLowerCase() === normalized)) return term
    // pattern は原文に当てる（小文字化すると全角数字以外の表記を壊しうる）
    if (term.pattern && compiled(term.pattern).test(trimmed)) return term
  }
  return undefined
}

/** cardinality 宣言の解釈結果 */
export interface Cardinality {
  readonly min: number
  /** 上限なしは undefined */
  readonly max?: number
  /** 診断メッセージに出す期待値の言い方 */
  readonly label: string
}

/** ディレクティブの引数で件数が決まる cardinality（grid の R×C） */
const DYNAMIC = "rows*cols"

/**
 * cardinality 宣言を範囲に直す。
 *
 * `resolved` は grid のようにディレクティブの引数で件数が決まる宣言に、実行時の値を渡す。
 * これを引数にしたのは、`rows*cols` という綴りを知っている場所をこの関数1つに閉じるため
 * （かつては呼ぶ側が文字列を再照合し、返り値の `dynamic` は誰も読まなかった）。
 */
export function parseCardinality(spec: string, resolved?: number): Cardinality {
  if (spec === DYNAMIC) {
    return resolved === undefined
      ? { min: 0, label: spec }
      : { min: resolved, max: resolved, label: `${resolved}件` }
  }
  const range = spec.match(/^(\d+)\.\.(\d+|n)$/)
  if (range) {
    return {
      min: parseInt(range[1], 10),
      max: range[2] === "n" ? undefined : parseInt(range[2], 10),
      label: spec,
    }
  }
  const exact = spec.match(/^(\d+)$/)
  if (exact) {
    const n = parseInt(exact[1], 10)
    return { min: n, max: n, label: spec }
  }
  throw new Error(`ontology.yaml の cardinality '${spec}' を解釈できない`)
}

/** 件数がディレクティブの引数で決まる宣言か */
export function isDynamicCardinality(spec: string): boolean {
  return spec === DYNAMIC
}
