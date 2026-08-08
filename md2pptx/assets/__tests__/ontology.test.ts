import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "fs"
import { join } from "path"
import { getPlugins, getValidationConfig } from "../src/plugins/registry.js"
import { tokenize } from "../src/parser/tokenizer.js"
import { lintSource } from "../src/ontology/lint.js"
import { selfcheckProblems } from "../src/ontology/selfcheck.js"
import {
  getLayouts,
  getLimits,
  getVocabulary,
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
    for (const layout of getLayouts()) {
      expect(lintSource(layout.example ?? ""), `${layout.name} の example が宣言に違反`).toEqual([])
    }
  })
})

describe("ontology drives validation", () => {
  it("gives both PatternLanguage pages the declared limit", () => {
    // Detail は layoutTag として登録されていないので、レジストリを引くだけだと
    // 宣言が 1024 と言っている裏で 1000 が効いていた。
    expect(maxCharsForTag("PatternLanguageOverview")).toBe(1024)
    expect(maxCharsForTag("PatternLanguageDetail")).toBe(1024)
    expect(getValidationConfig("PatternLanguageDetail").countChars).toBeTypeOf("function")
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

describe("cardinality parsing", () => {
  it("reads every form the declarations use", () => {
    expect(parseCardinality("0..n")).toEqual({ min: 0, max: undefined, dynamic: false })
    expect(parseCardinality("3..n")).toEqual({ min: 3, max: undefined, dynamic: false })
    expect(parseCardinality("1..9")).toEqual({ min: 1, max: 9, dynamic: false })
    expect(parseCardinality("3")).toEqual({ min: 3, max: 3, dynamic: false })
    expect(parseCardinality("rows*cols")).toEqual({ min: 0, dynamic: true })
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
    ...readdirSync(join(ASSETS_DIR, "doc", "wiki"))
      .filter((f) => f.endsWith(".md"))
      .map((f) => join(ASSETS_DIR, "doc", "wiki", f)),
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
