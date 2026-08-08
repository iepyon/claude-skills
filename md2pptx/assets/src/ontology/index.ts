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
export const ONTOLOGY_PATH = fileURLToPath(new URL("../../../ontology.yaml", import.meta.url))

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
export function getLayoutByPlugin(pluginId: string): Layout | undefined {
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

export function getAnnotation(name: string): Annotation | undefined {
  return getAnnotations().find((a) => a.name === name)
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

/**
 * 見出しを語彙の項目に解決する。
 *
 * 照合は実装（LEAN_CANVAS_HEADING_MAP・行ラベルのコロン除去）に合わせて、
 * 小文字化・トリム・末尾コロン（半角/全角）の除去をしてから行う。
 */
export function resolveTerm(vocab: Vocabulary, heading: string): VocabTerm | undefined {
  const normalized = heading.trim().replace(/[:：]\s*$/, "").toLowerCase()
  for (const term of vocab.terms) {
    if (term.canonical.toLowerCase() === normalized) return term
    if (term.aliases?.some((a) => a.toLowerCase() === normalized)) return term
    // pattern は原文に当てる（小文字化すると全角数字以外の表記を壊しうる）
    if (term.pattern && new RegExp(term.pattern).test(heading.trim())) return term
  }
  return undefined
}

/** cardinality 文字列の解釈。`resolved` は grid のように実行時に決まる件数 */
export interface Cardinality {
  readonly min: number
  /** 上限なしは undefined */
  readonly max?: number
  /** "rows*cols" のように、ディレクティブの引数から決まる */
  readonly dynamic: boolean
}

export function parseCardinality(spec: string): Cardinality {
  if (spec === "rows*cols") return { min: 0, dynamic: true }
  const range = spec.match(/^(\d+)\.\.(\d+|n)$/)
  if (range) {
    return {
      min: parseInt(range[1], 10),
      max: range[2] === "n" ? undefined : parseInt(range[2], 10),
      dynamic: false,
    }
  }
  const exact = spec.match(/^(\d+)$/)
  if (exact) {
    const n = parseInt(exact[1], 10)
    return { min: n, max: n, dynamic: false }
  }
  throw new Error(`ontology.yaml の cardinality '${spec}' を解釈できない`)
}
