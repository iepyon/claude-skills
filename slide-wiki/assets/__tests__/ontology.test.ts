import { describe, it, expect } from "vitest"
import { OKF_VERSION, RESERVED_OKF_FILES, listDeckFiles } from "../src/okf.js"
import { DECK_ORDER_FILE } from "../src/deck-order.js"
import { Effect } from "effect"
import { readFileSync, readdirSync } from "fs"
import { join } from "path"
import { getCharCounter, getPlugins } from "../src/plugins/registry.js"
import { tokenize } from "../src/parser/tokenizer.js"
import { parseMarkdown } from "../src/parser/index.js"
import { layoutSlide } from "../src/renderer/layout/index.js"
import { DEFAULT_THEME } from "../src/schema/theme.js"
import { detectLayout, lintSource } from "../src/ontology/lint.js"
import { selfcheckProblems } from "../src/ontology/selfcheck.js"
import {
  getLayouts,
  getLimits,
  getOkf,
  getVocabulary,
  isDynamicCardinality,
  maxCharsForTag,
  parseCardinality,
  resolveTerm,
} from "../src/ontology/index.js"
import {
  applySkillRegions,
  buildOntologyDoc,
  ONTOLOGY_MD,
  SKILL_MD,
} from "../src/tools/gen-ontology-doc.js"
import "../src/plugins/index.js" // side-effect: self-registration

/**
 * ontology.yaml が「md の構造の唯一の正本」であり続けることを守るテスト。
 *
 * 宣言は壊れても静かに壊れる — 語彙の参照先が消えれば照合が空振りするだけで、lint は
 * 「問題なし」と言う。だから (1) 宣言そのもの、(2) 宣言と実装の一致、(3) 生成物の鮮度、
 * (4) 実際のデッキが宣言を満たすこと、の4方向から留める。
 */

const ASSETS_DIR = join(__dirname, "..")
const read = (path: string): string => readFileSync(path, "utf-8")

describe("ontology declaration", () => {
  it("passes its own selfcheck", () => {
    expect(selfcheckProblems()).toEqual([])
  })

  it("declares every registered plugin, and every declared plugin is registered", () => {
    // selfcheck も見ているが、片方向だけ通る状態を作らないよう明示的に置く
    const registered = getPlugins().map((p) => p.id).sort()
    const declared = getLayouts()
      .map((l) => l.plugin)
      .filter((p): p is string => p !== null)
      .sort()
    expect(declared).toEqual(registered)
    expect(registered.length).toBeGreaterThan(0)
  })

  // ── バンドルの宣言 ⇔ コードの綴り（B-41）──────────────────────────
  //
  // 予約名・版・並び順の宣言のファイル名は、規則を ontology.yaml が持ち、綴りを
  // src/ 側が持つ。分けているのは、パーサ・CLI・lint・生成器が宣言の読み込みを
  // 挟まずに綴りを引けるようにするため。**分けたぶん、ここで縛らないとドリフトする。**

  it("declares the same reserved OKF file names that src/okf.ts spells", () => {
    const declared = getOkf()["reserved-files"].map((f) => f.name).sort()
    expect(declared).toEqual([...RESERVED_OKF_FILES].sort())
  })

  it("declares the same OKF version that src/okf.ts spells", () => {
    expect(getOkf()["okf-version"]).toBe(OKF_VERSION)
  })

  it("declares the order file that deck-order.ts actually reads", () => {
    expect(getOkf()["deck-set"]["order-file"]).toBe(DECK_ORDER_FILE)
  })

  it("declares a directive that the tokenizer actually recognizes", () => {
    // registry がディレクティブを ontology から導出している証拠。プラグイン側に
    // 文字列が残っていれば、宣言だけ直しても綴りがずれる。
    for (const layout of getLayouts()) {
      if (!layout.plugin) continue
      const directive = layout.directives[0].syntax
      const [token] = tokenize(directive)
      expect(token.type, `${directive} は PluginDirective にならない`).toBe("PluginDirective")
      expect(
        token.type === "PluginDirective" ? token.pluginId.split(":")[0] : "",
        `${directive} が別のプラグインに解決された`
      ).toBe(layout.plugin)
    }
  })

  it("resolves every layout's own example as that layout", () => {
    // 宣言の example が宣言どおりに読まれること。ドキュメントの実例が嘘にならない。
    //
    // 診断が空であることだけを見てはいけない — detectLayout が解決に失敗すると
    // lintSource はそのスライドを丸ごと飛ばすので、**失敗したときこそ緑になる**。
    // どのレイアウトとして読まれたかを直接見る。
    for (const layout of getLayouts()) {
      const tokens = tokenize(layout.example ?? "")
      expect(detectLayout(tokens)?.name, `${layout.name} の example が別のレイアウトに解決された`).toBe(
        layout.name
      )
      expect(lintSource(layout.example ?? ""), `${layout.name} の example が宣言に違反`).toEqual([])
    }
  })

  it("follows the same layout precedence as the converter", () => {
    // 本物の順序は parser/slide-converter.ts の rawSlideToSlide（CodeDisplay が Grid より先）。
    // ずれると「実際には適用されない規則」を報告する。
    const gridAndCode = ["## 両方", "<!--grid:2x2-->", "```ts", "const a = 1", "```"].join("\n")
    expect(detectLayout(tokenize(gridAndCode))?.name).toBe("CodeDisplay")
    expect(lintSource(gridAndCode)).toEqual([])
  })
})

describe("ontology drives validation", () => {
  it("gives both PatternLanguage pages the declared limit", () => {
    // Detail は layoutTag として登録されていないので、レジストリを引くだけだと
    // 宣言が 1024 と言っている裏で 1000 が効いていた。
    expect(maxCharsForTag("PatternLanguageOverview")).toBe(1024)
    expect(maxCharsForTag("PatternLanguageDetail")).toBe(1024)
    expect(getCharCounter("PatternLanguageDetail")).toBeTypeOf("function")
  })

  it("falls back to the declared deck-wide limit", () => {
    expect(maxCharsForTag("Default")).toBe(getLimits()["max-chars-per-slide"])
    expect(maxCharsForTag("NotALayout")).toBe(getLimits()["max-chars-per-slide"])
  })

  it("keeps the character limit out of the code", () => {
    // 数字がコードに戻ってくると、ドキュメント生成と検証が別々の値を見るようになる
    const constants = read(join(ASSETS_DIR, "src", "constants.ts"))
    expect(constants).not.toMatch(/MAX_CHARS/)
    for (const entry of readdirSync(join(ASSETS_DIR, "src", "plugins"), { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const dir = join(ASSETS_DIR, "src", "plugins", entry.name)
      for (const file of readdirSync(dir)) {
        expect(read(join(dir, file)), `${entry.name}/${file}`).not.toMatch(
          /^\s*(docDirective|maxChars):/m
        )
      }
    }
  })
})

describe("vocabulary resolution", () => {
  const leanCanvas = getVocabulary("lean-canvas-blocks")!

  it("accepts the canonical name and every declared alias", () => {
    for (const term of leanCanvas.terms) {
      expect(resolveTerm(leanCanvas, term.canonical)?.key).toBe(term.key)
      for (const alias of term.aliases ?? []) {
        expect(resolveTerm(leanCanvas, alias)?.key, `alias ${alias}`).toBe(term.key)
      }
    }
  })

  it("matches case-insensitively and ignores a trailing colon", () => {
    // 実装は heading.toLowerCase().trim()、行ラベルは末尾コロンを剥がしてから照合する
    expect(resolveTerm(leanCanvas, "  Problem ")?.key).toBe("problem")
    const rows = getVocabulary("journey-rows")!
    expect(resolveTerm(rows, "タッチ:")?.key).toBe("touch")
    expect(resolveTerm(rows, "タッチ：")?.key).toBe("touch")
  })

  it("matches numbered sections by their declared pattern", () => {
    const sections = getVocabulary("pattern-sections")!
    expect(resolveTerm(sections, "具体例1：短い例")?.key).toBe("concrete-example")
    expect(resolveTerm(sections, "具体例２:全角")?.key).toBe("concrete-example")
    expect(resolveTerm(sections, "具体例")).toBeUndefined()
  })

  it("rejects a plausible-but-undeclared heading", () => {
    expect(resolveTerm(leanCanvas, "収益モデル")).toBeUndefined()
  })
})

/**
 * 宣言した語彙を、実際に描画するコードが本当に受理するか。
 *
 * lint が語彙を照合するようになった以上、宣言とパーサがずれると最悪の形で壊れる —
 * lint は「宣言どおり」と言い、描画だけが黙って落ちる。ここはその一致を留める。
 */
describe("the implementation accepts every declared vocabulary term", () => {
  const parse = (markdown: string): any => Effect.runSync(parseMarkdown(markdown))

  it("lean-canvas draws every canonical and alias into a cell", () => {
    // 「パーサが拾ったか」では足りない — マスを決めるのは layout 側で、そこで語彙が
    // 解決できないとブロックはどのマスにも入らず**描かれない**（旧来の失敗はこれ）。
    // 実際に座標計算まで通して、本文が描かれることを見る。
    const vocab = getVocabulary("lean-canvas-blocks")!
    for (const term of vocab.terms) {
      for (const spelling of [term.canonical, ...(term.aliases ?? [])]) {
        const deck = ["## C", "<!--lean-canvas-->", `### ${spelling}`, "本文XYZ"].join("\n")
        const slide = parse(deck).slides[0]
        expect(slide.layout._tag, `'${spelling}' が LeanCanvas として読まれない`).toBe("LeanCanvas")

        const drawn = layoutSlide(slide, DEFAULT_THEME).textBoxes.some((b) =>
          JSON.stringify(b).includes("本文XYZ")
        )
        expect(drawn, `'${spelling}' のブロックがどのマスにも入らず描かれない`).toBe(true)
        expect(lintSource(deck), `'${spelling}' が lint に弾かれる`).toEqual([])
      }
    }
  })

  it("customer-journey routes every row label, with either colon or none", () => {
    const vocab = getVocabulary("journey-rows")!
    for (const term of vocab.terms) {
      for (const suffix of ["", ":", "："]) {
        const deck = [
          "## J",
          "<!--カスタマージャーニー:-->",
          "### 認知",
          `#### ${term.canonical}${suffix}`,
          "- 項目",
        ].join("\n")
        const rows = parse(deck).slides[0].layout.rows
        const row = rows.find((r: any) => r.label === term.canonical)
        expect(row?.cells[0].items, `'${term.canonical}${suffix}' の項目が落ちた`).toEqual(["項目"])
        expect(lintSource(deck)).toEqual([])
      }
    }
  })

  it("pattern-language's handler still spells every declared section the same way", () => {
    // このプラグインの語彙はまだハンドラ側が持っている（BACKLOG B-23）。
    // 移すまでの間、2つの写しが一致していることだけを留める。
    const handler = read(join(ASSETS_DIR, "src", "plugins", "pattern-language", "handler.ts"))
    for (const term of getVocabulary("pattern-sections")!.terms) {
      if (term.pattern) {
        expect(handler, `具体例の正規表現が宣言とずれている`).toContain(term.pattern)
        continue
      }
      expect(handler, `節 '${term.canonical}' がハンドラに無い`).toContain(term.canonical)
    }
  })
})

describe("cardinality parsing", () => {
  it("reads every form the declarations use", () => {
    expect(parseCardinality("0..n")).toEqual({ min: 0, max: undefined, label: "0..n" })
    expect(parseCardinality("3..n")).toEqual({ min: 3, max: undefined, label: "3..n" })
    expect(parseCardinality("1..9")).toEqual({ min: 1, max: 9, label: "1..9" })
    expect(parseCardinality("3")).toEqual({ min: 3, max: 3, label: "3" })
  })

  it("pins a directive-resolved count to an exact range", () => {
    // grid のように件数が実行時に決まる宣言。resolved が無いうちは下限も課さない
    expect(isDynamicCardinality("rows*cols")).toBe(true)
    expect(isDynamicCardinality("1..n")).toBe(false)
    expect(parseCardinality("rows*cols")).toEqual({ min: 0, label: "rows*cols" })
    expect(parseCardinality("rows*cols", 4)).toEqual({ min: 4, max: 4, label: "4件" })
  })

  it("refuses a form it cannot interpret", () => {
    expect(() => parseCardinality("いくつか")).toThrow(/cardinality/)
  })
})

describe("lint", () => {
  const checks = (markdown: string): string[] => lintSource(markdown).map((d) => d.check)

  it("flags a heading outside the declared vocabulary", () => {
    // 今までは黙って1マス消えていた
    const diagnostics = lintSource(
      ["## キャンバス", "<!--lean-canvas-->", "### 課題", "高い", "### 収益モデル", "月額"].join("\n")
    )
    expect(diagnostics.map((d) => d.check)).toEqual(["slot-vocabulary"])
    expect(diagnostics[0].message).toContain("収益モデル")
    expect(diagnostics[0].line).toBe(5)
  })

  it("flags a grid whose cell count does not match its directive", () => {
    const short = ["## G", "<!--grid:2x2-->", "### A", "1", "### B", "2", "### C", "3"].join("\n")
    expect(checks(short)).toEqual(["slot-cardinality"])
    const exact = short + "\n### D\n4"
    expect(checks(exact)).toEqual([])
  })

  it("flags icon columns that are not exactly three", () => {
    const two = ["## I", "<!--icon-cols-->", "### A", "1", "### B", "2"].join("\n")
    expect(checks(two)).toEqual(["slot-cardinality"])
  })

  it("flags an undeclared pattern-language meta key and a missing required one", () => {
    const diagnostics = lintSource(
      ["## P", "<!--pattern-language-a-->", "name: 反証条件", "categoly: 仮説検証", "### 注意", "無し"].join(
        "\n"
      )
    )
    expect(diagnostics.map((d) => d.check)).toEqual(["meta-keys", "meta-keys"])
    expect(diagnostics.map((d) => d.message).join(" ")).toContain("categoly")
    expect(diagnostics.map((d) => d.message).join(" ")).toContain("number")
  })

  it("flags an annotation the layout cannot use", () => {
    const diagnostics = lintSource(
      ["## Agenda", "<!--agenda-->", "副題", "### 項目", "<!--takeaway-->", "まとめ"].join("\n")
    )
    expect(diagnostics.map((d) => d.check)).toEqual(["annotation-scope"])
    expect(diagnostics[0].message).toContain("takeaway")
  })

  it("flags a misspelled directive, which today renders as body text", () => {
    const diagnostics = lintSource(["## 名言", "<!--qoute-->", "引用文"].join("\n"))
    expect(diagnostics.map((d) => d.check)).toEqual(["unknown-directive"])
  })

  it("counts #### per phase, not per slide", () => {
    // 4フェーズ × 4行ラベル = 16 を「多すぎる」と読まないこと
    const journey = ["## CJ", "<!--カスタマージャーニー:-->"]
    for (const phase of ["認知", "検討", "導入", "継続"]) {
      journey.push(`### ${phase}`)
      for (const row of ["タッチ", "行動", "判断", "感情"]) {
        journey.push(`#### ${row}:`, "- 何か")
      }
    }
    expect(checks(journey.join("\n"))).toEqual([])
  })

  it("says nothing about a body-only slide", () => {
    // `###` を書かない本文だけのスライドは、見出しの無いセクション1件として成立する
    expect(checks(["## 制限", "- 1つ目", "- 2つ目"].join("\n"))).toEqual([])
  })

  it("flags the same explicit id on two slides, naming both lines", () => {
    // 折れたリンクより見つけにくい壊れ方。#seed は解決する（常に1枚目へ）ので
    // 未解決リンクの一覧にも出ず、2枚目が誰からも指せないまま公開される
    const deck = ["## 一枚目", "<!--id:seed-->", "本文", "", "---", "", "## 二枚目", "<!--id:seed-->", "本文"]
    const diagnostics = lintSource(deck.join("\n"))
    expect(diagnostics.map((d) => d.check)).toEqual(["slide-id", "slide-id"])
    expect(diagnostics.map((d) => d.line)).toEqual([2, 8])
    expect(diagnostics[0].message).toContain("8 行目")
    expect(diagnostics[1].message).toContain("2 行目")
  })

  it("says nothing when two slides merely share a title", () => {
    // 自動 slug の衝突は連番が正しい振る舞い。書き手の意思表示ではないので報告しない
    expect(checks(["## まとめ", "本文", "", "---", "", "## まとめ", "本文"].join("\n"))).toEqual([])
  })

  it("flags a heading whose automatic id is already claimed by an explicit one", () => {
    // 採番は明示 ID を優先するのでリンクは正しい行き先に着くが、この見出しの ID は
    // '設計' ではなく '設計-2' になる。推測できない綴りなので書き手に知らせる
    const deck = ["# 設計", "", "---", "", "## 設計の考え方", "<!--id:設計-->", "本文"]
    const diagnostics = lintSource(deck.join("\n"))
    expect(diagnostics.map((d) => d.check)).toEqual(["slide-id"])
    expect(diagnostics[0].line).toBe(1)
    expect(diagnostics[0].message).toContain("設計-2")
  })

  it("reads the id from the last directive when a slide carries two", () => {
    // annotations の cardinality: one — 後ろが勝つ。採番と同じものを見ないと
    // 「効いていない ID」で衝突を報告してしまう
    const deck = ["## A", "<!--id:捨てられる-->", "<!--id:seed-->", "本文", "", "---", "", "## B", "<!--id:seed-->", "本文"]
    const diagnostics = lintSource(deck.join("\n"))
    expect(diagnostics.map((d) => d.check)).toEqual(["slide-id", "slide-id"])
    expect(diagnostics.map((d) => d.line)).toEqual([3, 9])
  })

  it("leaves the character limit to validatePresentation", () => {
    // 二重報告しない（直し方が増えないため）
    const long = ["## 長い", "### 見出し", "あ".repeat(getLimits()["max-chars-per-slide"] + 1)].join("\n")
    expect(checks(long)).toEqual([])
  })
})

describe("the decks in this repository satisfy the declaration", () => {
  // 宣言が実装とずれたらここで落ちる — 実際に動いているデッキが反例になる
  const decks = [
    join(ASSETS_DIR, "doc", "Spec.md"),
    ...listDeckFiles(join(ASSETS_DIR, "doc", "wiki")),
    ...readdirSync(join(ASSETS_DIR, "__tests__", "markdown-spec"))
      .filter((f) => f.endsWith(".md") && f !== "README.md")
      .map((f) => join(ASSETS_DIR, "__tests__", "markdown-spec", f)),
  ]

  it("finds decks to check", () => {
    expect(decks.length).toBeGreaterThan(10)
  })

  it.each(decks)("%s", (deck) => {
    expect(lintSource(read(deck))).toEqual([])
  })
})

describe("generated docs are fresh", () => {
  it("ontology.md matches what the generator would write", () => {
    expect(read(ONTOLOGY_MD)).toBe(
      buildOntologyDoc()
    )
  })

  it("SKILL.md's generated regions match", () => {
    const skill = read(SKILL_MD)
    expect(skill, "`npx tsx src/tools/gen-ontology-doc.ts` で再生成してコミットせよ").toBe(
      applySkillRegions(skill)
    )
  })

  it("fails loudly when a generated region's markers are gone", () => {
    expect(() => applySkillRegions("# SKILL\n本文だけ\n")).toThrow(/生成領域/)
  })
})

/**
 * リンクの書き方の検査。
 *
 * 守っているのは「**黙って通ってしまう**間違いを黙らせない」ことで、種類が2つある。
 *
 * `sub/x.md` `#か` は外部リンクとして `target="_blank"` で描かれるので、見た目は
 * リンクのままクリックすると別タブで存在しないパスを開く — 未解決リンクの一覧にも
 * 出ない（内部リンクとして解決を試みてすらいない）。
 *
 * 一方 `/x.md` `./x.md` は**パーサが解決するのでサイトでは当たる**。折れるのは生の md を
 * github.com で開いたときだけなので、サイトを目で追っても気づけない。lint しか見つけられない。
 */
describe("link form", () => {
  const deck = (body: string): string =>
    `---\ntype: deck\n---\n\n# あ\n\n---\n\n## か\n<!--id:か-->\n### さ\n${body}\n`

  const checks = (body: string): string[] => lintSource(deck(body)).map((d) => d.check)
  const messages = (body: string): string => lintSource(deck(body)).map((d) => d.message).join("\n")

  it("旧 [[…]] 記法を error にする", () => {
    expect(lintSource(deck("見よ [[か]]"))).toContainEqual(
      expect.objectContaining({ level: "error", check: "legacy-wikilink" })
    )
  })

  // **2つの診断は文面で見分ける。** どちらも check は `link-form` なので、
  // check だけを見ていると「解決しない」と「書く形から外れている」が入れ替わっても
  // 気づけない（読み手に見せる文面だけが違い、そこがこの検査の値打ちである）
  it("内部リンクにならない md へのリンクを報せる", () => {
    for (const href of ["sub/b.md#c", "../b.md", "/sub/b.md", "#か"]) {
      expect(checks(`見よ [x](${href})`), href).toContain("link-form")
      expect(messages(`見よ [x](${href})`), href).toMatch(/内部リンクにならない/)
    }
  })

  it("書く形から外れた綴りには、正しい綴りを見せて報せる", () => {
    // 断り書き: フラグメントの有無はこの検査に効かない（`canonicalHref` が写す）ので
    // 2形で足りる。効くのは先頭の `/` と `./` の2通りだけである
    expect(messages("見よ [x](/a.md#か)")).toContain("`a.md#か` と書く")
    expect(messages("見よ [x](./a.md)")).toContain("`a.md` と書く")
  })

  it("正しい内部リンクと外部リンクには何も言わない", () => {
    for (const href of ["a.md#か", "a.md", "https://example.com", "mailto:a@example.com"]) {
      expect(checks(`見よ [x](${href})`), href).not.toContain("link-form")
    }
  })

  it("画像やその他の資産への参照は対象外", () => {
    expect(checks("![図](diagrams/a.svg)")).not.toContain("link-form")
  })

  it("インラインコードの中の見本は数えない", () => {
    // guide デッキは記法の見本をコードで囲んで置いている。ここを数えると
    // 記法を説明したデッキが恒久的に赤くなる
    expect(checks("`[[か]]` と `[x](./b.md)` は書き方の見本")).toEqual([])
  })

  it("コードフェンスの中も数えない", () => {
    expect(lintSource(`---\ntype: deck\n---\n\n# あ\n\n---\n\n## か\n\`\`\`markdown\n[[か]]\n\`\`\`\n`)
      .map((d) => d.check)).not.toContain("legacy-wikilink")
  })
})
