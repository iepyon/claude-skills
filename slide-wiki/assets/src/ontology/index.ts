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
  FieldKind,
  Frontmatter,
  Layout,
  Limits,
  Okf,
  Ontology,
  VocabTerm,
  Vocabulary,
} from "./types.js"

export * from "./types.js"

/** src/ontology/ から見て slide-wiki/ontology.yaml */
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

/** _tag（layoutTag）で引く。宣言と _tag は1対1なので、たどるのは名前だけ */
export function getLayoutByTag(tag: string): Layout | undefined {
  return getLayouts().find((l) => l.name === tag)
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

/** その _tag の文字数上限。宣言が無ければデッキ全体の上限 */
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

export function getLimits(): Limits {
  return loadOntology().limits
}

export function getFrontmatter(): Frontmatter {
  return loadOntology().frontmatter
}

/**
 * バンドル（サイトの階層）の宣言。
 *
 * 予約ファイル名と版の**綴り**は `src/okf.ts` にある（パーサ・CLI・lint・生成器が
 * 同じものを見る必要があり、宣言の読み込みを挟むと依存が増えるため）。
 * こちらが持つのは規則と理由で、両者の一致は `ontology.test.ts` が留める。
 */
export function getOkf(): Okf {
  return loadOntology().okf
}

/**
 * 値が宣言された形に合っているか。**正規表現はすべて `value-patterns` から引く。**
 *
 * `kind` に対応するパターンが無いもの（text / object / list-*）は形を持たないので
 * 常に true。持つはずの `kind` にパターンが無ければ selfcheck が落とす
 * （実装だけが知っている形を作らせない）。
 */
export function matchesDeclaredForm(kind: FieldKind, value: string): boolean {
  const pattern = getFrontmatter()["value-patterns"][kind]
  return pattern === undefined || compiled(pattern).test(value)
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

const FENCE_MARKER = /^```(\S+)$/

/**
 * スロットの marker がコードフェンスを指すなら、その言語名を返す。
 *
 * `###` / `####` は「見出しを数える」枠だが、図解のようにフェンスそのものが1枠に
 * なるスロットもある（```pattern-diagram）。綴りの解釈をここ1箇所に閉じておくと、
 * 数える側（lint）・宣言を検める側（selfcheck）・中身を集める側（プラグイン）が
 * 同じ規則で動く。
 */
export function codeFenceLanguage(marker: string): string | undefined {
  const match = marker.match(FENCE_MARKER)
  return match ? match[1] : undefined
}

const IMAGE_MARKER = /^!\[.*\]\(.*(\.[A-Za-z0-9]+)\)$/

/**
 * スロットの marker が画像参照を指すなら、受理する拡張子（`.svg` 等）を返す。
 *
 * `codeFenceLanguage` の相方。フェンスと同じく「行そのものが1つの枠」になる
 * スロットで、拡張子まで marker に書かせているのは、**受理する種類の正本を
 * 宣言側に置く**ため（実装が独自に `.svg` を知っていると、宣言を変えても
 * 読める種類が変わらない）。拡張子を名乗らない marker は画像枠と認めない。
 */
export function imageExtension(marker: string): string | undefined {
  return marker.match(IMAGE_MARKER)?.[1].toLowerCase()
}

/** 宣言されたスロットの marker。書き手が打つ形の正本で、診断にもそのまま出す */
export function markerForSlot(tag: string, slotName: string): string | undefined {
  return getLayoutByTag(tag)?.slots.find((s) => s.name === slotName)?.marker
}

/**
 * marker を「その枠をどう数えるか」に読み替える。**許される形の解釈はここだけ。**
 *
 * `###` / `####` は見出しを数える枠、フェンスと画像は行そのものが1つの枠。
 * 数える側（lint）・宣言を検める側（selfcheck）・中身を集める側（プラグイン）が
 * 同じ規則で動くように、判定を1箇所に閉じる。
 */
export type MarkerKind =
  | { readonly kind: "heading" }
  | { readonly kind: "code-fence"; readonly language: string }
  | { readonly kind: "image"; readonly extension: string }
  | { readonly kind: "unknown" }

export function markerKind(marker: string): MarkerKind {
  if (marker === "###" || marker === "####") return { kind: "heading" }
  const language = codeFenceLanguage(marker)
  if (language !== undefined) return { kind: "code-fence", language }
  const extension = imageExtension(marker)
  if (extension !== undefined) return { kind: "image", extension }
  return { kind: "unknown" }
}

/**
 * そのレイアウトの画像枠が受理する拡張子。宣言から導くので、プラグインが綴りを
 * 持たなくてよい（`registerPlugin` がディレクティブを宣言から導くのと同じ理由 —
 * 書き手が打つ文字列・lint が数える文字列・実装が集める文字列を1つにする）。
 *
 * **期待した種類でなければ落とす** — 宣言を書き替えたのに実装が古い種類を
 * 集め続ける、という緑のままの食い違いを作らせない。
 */
export function imageExtensionForLayout(tag: string, slotName: string): string {
  const kind = markerKind(markerForSlot(tag, slotName) ?? "")
  if (kind.kind !== "image") {
    throw new Error(`ontology.yaml: ${tag}.slots.${slotName} が画像の枠として宣言されていない`)
  }
  return kind.extension
}
