import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "fs"
import { basename, join } from "path"
import { Effect } from "effect"

import { parseMarkdown } from "../src/parser/index.js"
import { readDeckMeta } from "../src/ontology/frontmatter.js"
import { listDeckFiles, parseOkfLink, isReservedOkfFile } from "../src/okf.js"
import { loadQuestions, QUESTIONS_FILE } from "../src/questions.js"
import { buildWikiSite } from "../src/renderer/wiki/index.js"
import { buildRefIndex, collectText } from "../src/renderer/wiki/link-graph.js"
import { DEFAULT_THEME } from "../src/schema/index.js"
import "../src/plugins/index.js"

/**
 * 配っているバンドル `doc/wiki/` が**想定の問いに答えられる**ことを、主張ではなく検査にする。
 *
 * 問いの正本は `doc/wiki/questions.yaml`。「AI にも読める」は、読み手の問いに
 * 答えられて初めて言える言葉で、これが無いと OKF 適合（okf-conformance.test.ts）が
 * 緑でも「読めるが答えは引けない」バンドルが黙って通る。
 *
 * **ここにあるのは決定論の半分だけ** — 答えのアンカーが実在すること、答えまで
 * 検索語で届くこと。エージェントに問いだけ渡して実際に解かせる非決定論の半分は
 * `docs/answerability-eval.md` の手順で行い、**CI には入れない**
 * （BACKLOG-WONTDO B-10: 決定論的な検査が効いている場所に非決定論的な工程を戻さない）。
 */

const BUNDLE = join(import.meta.dirname, "..", "doc", "wiki")

const read = (path: string): string => readFileSync(path, "utf-8")
const deckFiles = listDeckFiles(BUNDLE)

const { questions, errors } = loadQuestions(BUNDLE)

/** 実バンドルからサイトを組む。アンカーの解決は本物の索引・本物の解決規則で行う */
const decks = deckFiles.map((path) => {
  const markdown = read(path)
  const meta = readDeckMeta(markdown)
  return {
    slug: basename(path, ".md"),
    title: basename(path, ".md"),
    presentation: Effect.runSync(parseMarkdown(markdown, { baseDir: BUNDLE })),
    ...(meta ? { meta } : {}),
  }
})
const site = buildWikiSite(decks, DEFAULT_THEME)
const refIndex = buildRefIndex(site.entries)

/** デッキ slug → frontmatter が名乗った言葉（short / description / tags）。 */
const deckWords = new Map(
  decks.map((d) => [
    d.slug,
    [d.meta?.short, d.meta?.description, ...(d.meta?.tags ?? [])].filter(Boolean).join(" "),
  ])
)

/**
 * アンカー1つが読ませるテキスト。スライドなら**描画されるテキスト**（collectText —
 * 語彙外で消えた節を「書いてある」と数えないため）に、そのデッキが名乗った言葉を
 * 加える。予約ファイル（log.md 等）は生成された md をそのまま読む。
 */
const textOf = (anchor: string): string => {
  if (isReservedOkfFile(anchor)) {
    const path = join(BUNDLE, anchor)
    return existsSync(path) ? read(path) : ""
  }
  const ref = parseOkfLink(anchor)!.ref
  const entry = site.byId.get(refIndex.get(ref)!)
  if (!entry) return ""
  return `${collectText(entry, DEFAULT_THEME)}\n${deckWords.get(entry.deckSlug) ?? ""}`
}

const answered = questions.filter((q) => q.expect === "answered")

describe("想定問答の宣言", () => {
  it("questions.yaml がバンドルに置かれ、読める", () => {
    // 宣言の形の誤り（answered なのに答えが無い・gap なのに答えを持つ・
    // アンカーの綴りが書く形から外れている）はローダーが集めて返す
    expect(errors).toEqual([])
    expect(questions.length).toBeGreaterThan(0)
  })

  it("問いの文言が重複していない", () => {
    const texts = questions.map((q) => q.q)
    expect(new Set(texts).size).toBe(texts.length)
  })
})

describe("答えのアンカーが実在する", () => {
  it.each(answered.map((q) => [q.q, q] as const))("%s", (_q, question) => {
    for (const anchor of question.answers) {
      if (isReservedOkfFile(anchor)) {
        // 予約ファイルはサイトの索引に載らない（デッキではない）ので、実在だけを見る
        expect(existsSync(join(BUNDLE, anchor)), `${anchor} がバンドルに無い`).toBe(true)
        continue
      }
      const ref = parseOkfLink(anchor)!.ref
      expect(refIndex.get(ref), `${anchor} がサイトの索引で解決できない`).toBeDefined()
    }
  })
})

describe("答えまで検索語で届く", () => {
  // keywords のどれかが、answers のどれかの読ませるテキストに現れること。
  // **問いの言い回しではなく答えの側の語**を検査する — 読み手（人も AI も）は
  // まず検索で当たりを付けるので、答えの語彙で引けない答えは有っても無いのと同じ
  // （デッキ単位の語しか引けない絞り込みの穴は BACKLOG B-37）。
  it.each(answered.map((q) => [q.q, q] as const))("%s", (_q, question) => {
    const haystack = question.answers.map(textOf).join("\n")
    const hit = question.keywords.some((k) => haystack.includes(k))
    expect(
      hit,
      `keywords [${question.keywords.join(", ")}] のどれも答えの側に現れない — ` +
        `問いに合わせて本文を直すか、答えに実際にある語へ keywords を直す`
    ).toBe(true)
  })
})

describe("物差しがバンドル全体を張っている", () => {
  it("どのデッキにも、それを答えとする問いが少なくとも1つある", () => {
    // 問いの無いデッキは「何のために読むのか」を誰も言えていないデッキである。
    // 1:1 は求めない（1つの問いが複数デッキに跨がってよいし、その逆もよい）
    const targeted = new Set(
      answered.flatMap((q) =>
        q.answers.filter((a) => !isReservedOkfFile(a)).map((a) => parseOkfLink(a)!.ref.split("/")[0])
      )
    )
    for (const path of deckFiles) {
      expect(targeted.has(basename(path, ".md")), `${basename(path)} を答えとする問いが無い`).toBe(true)
    }
  })
})
