import { existsSync, readFileSync } from "fs"
import { join } from "path"
import { parse } from "yaml"
import { isReservedOkfFile, parseOkfLink } from "./okf.js"

/**
 * 想定問答の宣言。Wiki のディレクトリ直下に置く（`order.yaml` と同じ置き方）。
 *
 * バンドルが「答えられるべき問い」を、答えのアンカーと一緒に持ち歩くためのもの。
 * サイトの中で `動かない物差し` が説いている「役に立った形を先に書き、事前に置く」を
 * バンドル自身に当てている — 問いが先に無ければ、「AI にも読める」は誰も確かめていない
 * 言葉のままになる（`okf-conformance.test.ts` が「準拠した」に置いたのと同じ理由）。
 *
 * 答えの綴りは本文の内部リンクと同じ形（`デッキ名.md#スライドID`）。**ここに新しい
 * 正規表現を持たない** — 読めるかどうかは `parseOkfLink` が、予約ファイルかどうかは
 * `isReservedOkfFile` が決める。綴りの判定を2箇所に書くと、リンクとしては当たるのに
 * 問いの検査だけが落ちる（またはその逆の）食い違いが入る。
 */
export const QUESTIONS_FILE = "questions.yaml"

/**
 * answered = 答えのアンカーを持つ。gap = まだ答えられない問いを、そのまま置いてある
 * （`街灯の外へ` の形。答えを書いたら answered に上げる）。
 *
 * **綴りの正本はこの配列1つ**で、宣言（ontology.yaml の `okf.questions.expect-values`）
 * との一致は selfcheck が見る。型は配列から導く — 別々に持つと、値を片方だけに
 * 足したとき宣言と実装が黙ってずれる。
 */
export const QUESTION_EXPECT_VALUES = ["answered", "gap"] as const
export type QuestionExpect = (typeof QUESTION_EXPECT_VALUES)[number]

export interface Question {
  /** 問い。読み手の状況（いつ・なにが困るか）の言葉で書かれている */
  readonly q: string
  /** 答えのアンカー（canonical な内部リンクの綴り、または予約ファイル名）。gap なら空 */
  readonly answers: readonly string[]
  /** 到達可能性の検査語。答えの側に実際に現れる語。gap なら空でよい */
  readonly keywords: readonly string[]
  readonly expect: QuestionExpect
  /** gap の理由や、answered に上げる条件の覚え書き */
  readonly note?: string
}

export interface QuestionsResult {
  readonly questions: Question[]
  /** 誤り。1件でもあれば宣言は壊れている（読めた分の questions は返す） */
  readonly errors: string[]
}

/**
 * アンカー1つの綴りの検査。誤りの文面を返す（正しければ null）。
 *
 * 受けるのは2種類 — 内部リンクの綴り（`parseOkfLink` が読み、かつ書く形
 * `canonicalHref` と一致するもの）と、予約ファイル名そのもの（`log.md` を
 * 「いつ書かれたか」の答えにできる。デッキではないので内部リンクにはならない）。
 *
 * **読める・でも書く形から外れている**（`./x.md` など）は誤りにする。問いの答えは
 * 本文のリンクと同じ語彙に揃っていてこそ、突き合わせが文字列比較で済む。
 */
export function questionAnchorError(anchor: string): string | null {
  if (isReservedOkfFile(anchor)) return null
  const link = parseOkfLink(anchor)
  if (!link) return `答えのアンカーとして読めない: ${anchor}（\`デッキ名.md#スライドID\` か予約ファイル名を書く）`
  if (link.canonicalHref !== anchor) {
    return `答えのアンカーが書く形から外れている: ${anchor} → ${link.canonicalHref} と書く`
  }
  return null
}

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === "string")

/**
 * ディレクトリ直下の `questions.yaml` を読む。ファイルが無ければ問いゼロ・誤りゼロ
 * （想定問答はまだ全バンドルの義務ではない。置いたバンドルだけが検査される）。
 *
 * 誤りは集めて返す（例外にしない）。宣言の誤りは1つ直すと次が見えるものなので、
 * 最初の1件で止めると直す側が往復させられる。
 */
export function loadQuestions(dir: string): QuestionsResult {
  const declPath = join(dir, QUESTIONS_FILE)
  if (!existsSync(declPath)) return { questions: [], errors: [] }

  const at = (message: string): string => `${declPath}: ${message}`

  let doc: unknown
  try {
    doc = parse(readFileSync(declPath, "utf-8"))
  } catch (e) {
    return { questions: [], errors: [at(`YAML として読めない: ${(e as Error).message}`)] }
  }

  const root = doc as { questions?: unknown } | null
  if (!Array.isArray(root?.questions)) {
    return { questions: [], errors: [at("questions: に `{q, answers, keywords, expect, note}` の配列を書く")] }
  }

  const questions: Question[] = []
  const errors: string[] = []

  for (const [i, item] of root.questions.entries()) {
    const where = (message: string): void => {
      errors.push(at(`questions[${i}]: ${message}`))
    }

    const raw = item as {
      q?: unknown
      answers?: unknown
      keywords?: unknown
      expect?: unknown
      note?: unknown
    } | null

    if (typeof raw?.q !== "string" || raw.q.trim() === "") {
      where("q に問いの文字列を書く")
      continue
    }

    const expect = raw.expect ?? "answered"
    if (!(QUESTION_EXPECT_VALUES as readonly unknown[]).includes(expect)) {
      where(`expect は ${QUESTION_EXPECT_VALUES.join(" か ")}（${String(expect)} は読めない）`)
      continue
    }

    const answers = raw.answers ?? []
    const keywords = raw.keywords ?? []
    if (!isStringArray(answers)) {
      where("answers に答えのアンカーの配列を書く")
      continue
    }
    if (!isStringArray(keywords)) {
      where("keywords に検査語の配列を書く")
      continue
    }

    if (expect === "answered") {
      // 答えの無い answered は「答えられる」と名乗るだけの宣言になる。
      // 検査語の無い answered も同じ — 到達可能性を誰も確かめられない
      if (answers.length === 0) where("answered の問いには answers を1つ以上書く")
      if (keywords.length === 0) where("answered の問いには keywords を1つ以上書く")
    } else if (answers.length > 0) {
      // answers を持つ gap は、answered への上げ忘れ（またはその逆）が宣言の中で
      // 矛盾している状態。どちらが正しいか機械には決められないので、書き手に返す
      where("gap の問いが answers を持っている（答えがあるなら expect を answered に上げる）")
    }

    for (const anchor of answers) {
      const e = questionAnchorError(anchor)
      if (e) where(e)
    }

    questions.push({
      q: raw.q,
      answers,
      keywords,
      expect: expect as QuestionExpect,
      note: typeof raw.note === "string" ? raw.note : undefined,
    })
  }

  return { questions, errors }
}
