import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { tokenize } from "../src/parser/tokenizer.js"
import { buildAST } from "../src/parser/ast-builder.js"
import type { PatternLanguageOverviewLayout, PatternLanguageDetailLayout } from "../src/plugins/pattern-language/schema.js"

const PATTERN_LANGUAGE_MD = `# パターンランゲージテスト

---

## 百聞は一例にしかず
<!--pattern-language-a-->
number: "02"
name: "百聞は一例にしかず"
category: "指示の構成"
stage: "はじめの一歩"
oneliner: "言葉を尽くすより、入力と出力の実例をひとつ見せる方が正確に伝わる"
difficulty: 1
frequency: 5
related_patterns: "01", "03", "07"
takeaway: "百の言葉より一つの実例。AIは「こうしてほしい」を例から読み取る。"
reference: "Brown et al. (NeurIPS 2020)"

### 状況・いつ使うか
AIに出力の形式やスタイルを揃えてほしい場面。

### 問題・なぜ必要か
言葉だけで伝えると、AIは自分なりに解釈して違う出力を返す。

### 何をするのか
入力と期待出力のペアを1つ、プロンプトに含める。
**核となる原則:**
- 例は1つで十分な場合が多い
- 例のバリエーションが偏ると、AIはその偏りを再現する

### 期待結果
命名規則、出力構造が例に準拠した出力が返る。

### 注意
例の選び方が偏ると逆効果になる。

### 成功例
**タイトル:** APIレスポンス変換関数の生成
**Before:**
camelCaseにしてと伝えたが命名規則が混在。
**ズレ分析:**
暗黙のルールが伝わっていない。
**After:**
入力JSONと期待する出力の型を1ペア添えた。

### 失敗例
**タイトル:** テストコード生成で例が偏っていた
**やったこと:**
正常系のテスト例を5つ添えた。
**何がダメだったか:**
AIは正常系テストを大量に生成。異常系が一切なかった。
**こうすればよかった:**
正常系・異常系・エッジケースを各1つずつ示す。

### テンプレート
\`\`\`
# 依頼
[やってほしいこと]

# 入出力の例
入力: [具体的な入力データ]
期待する出力: [具体的な出力データ]
\`\`\`

### セルフチェック
- [ ] 入力→出力の実例を1つ以上含めたか
- [ ] 例のバリエーションに偏りがないか
- [ ] 指示文の内容と例が矛盾していないか

### チーム活用シナリオ
1. 有効だったfew-shot例をチームのプロンプトテンプレートに追加する
2. コードレビューで「この例を添えたら一発で通った」を共有する

### コミュニケーション図メモ
- アクター: 🧑あなた（左）、🤖AI（右）
- ライフライン: 両者から下に破線
`

describe("Pattern Language", () => {
  describe("Tokenization", () => {
    it("should tokenize pattern-language-a directive", () => {
      const tokens = tokenize("<!--pattern-language-a-->")
      expect(tokens).toHaveLength(1)
      expect(tokens[0].type).toBe("PluginDirective")
      expect(tokens[0]).toHaveProperty("pluginId", "pattern-language")
    })
  })

  describe("AST Building", () => {
    it("should parse pattern language into 2 slides (overview + detail)", async () => {
      const tokens = tokenize(PATTERN_LANGUAGE_MD)
      const presentation = await Effect.runPromise(buildAST(tokens))

      // Title slide + Overview + Detail = 3 slides
      expect(presentation.slides).toHaveLength(3)

      // Slide 0: TitleSlide
      expect(presentation.slides[0]._tag).toBe("TitleSlide")

      // Slide 1: Overview
      const overviewSlide = presentation.slides[1]
      expect(overviewSlide._tag).toBe("ContentSlide")
      if (overviewSlide._tag === "ContentSlide") {
        expect(overviewSlide.title).toBe("")
        expect(overviewSlide.layout._tag).toBe("PatternLanguageOverview")

        const layout = overviewSlide.layout as PatternLanguageOverviewLayout
        expect(layout.meta.number).toBe("02")
        expect(layout.meta.name).toBe("百聞は一例にしかず")
        expect(layout.meta.category).toBe("指示の構成")
        expect(layout.meta.stage).toBe("はじめの一歩")
        expect(layout.meta.difficulty).toBe(1)
        expect(layout.meta.frequency).toBe(5)
        expect(layout.meta.relatedPatterns).toEqual(["01", "03", "07"])
        expect(layout.meta.takeaway).toContain("百の言葉より")

        expect(layout.situation).toContain("AIに出力の形式")
        expect(layout.problem).toContain("言葉だけで伝える")
        expect(layout.solution).toContain("入力と期待出力のペア")
        expect(layout.principles).toHaveLength(2)
        expect(layout.principles[0]).toContain("例は1つで十分")
        expect(layout.result).toContain("命名規則")
        expect(layout.caution).toContain("例の選び方")
      }

      // Slide 2: Detail
      const detailSlide = presentation.slides[2]
      expect(detailSlide._tag).toBe("ContentSlide")
      if (detailSlide._tag === "ContentSlide") {
        expect(detailSlide.title).toBe("")
        expect(detailSlide.layout._tag).toBe("PatternLanguageDetail")

        const layout = detailSlide.layout as PatternLanguageDetailLayout
        expect(layout.meta.number).toBe("02")

        // Success example
        expect(layout.success.title).toContain("API")
        expect(layout.success.before).toContain("camelCase")
        expect(layout.success.analysis).toContain("暗黙のルール")
        expect(layout.success.after).toContain("入力JSON")

        // Failure example
        expect(layout.failure.title).toContain("テストコード")
        expect(layout.failure.attempt).toContain("正常系のテスト例")
        expect(layout.failure.problem).toContain("正常系テストを大量")
        expect(layout.failure.improvement).toContain("各1つずつ")

        // Template
        expect(layout.template).toContain("# 依頼")
        expect(layout.template).toContain("入出力の例")

        // Checklist
        expect(layout.checklist).toHaveLength(3)
        expect(layout.checklist[0]).toContain("入力→出力の実例")
        expect(layout.checklist[1]).toContain("偏りがないか")

        // Team scenarios
        expect(layout.teamScenarios).toHaveLength(2)
        expect(layout.teamScenarios[0]).toContain("few-shot例")
      }
    })
  })

  describe("Frontmatter parsing", () => {
    it("should handle quoted and unquoted values", async () => {
      const md = `## テスト
<!--pattern-language-a-->
number: "02"
name: "テスト名"
category: カテゴリ
difficulty: 3
frequency: 4
related_patterns: "01", "03"

### 状況・いつ使うか
テスト状況
`
      const tokens = tokenize(md)
      const presentation = await Effect.runPromise(buildAST(tokens))

      const slide = presentation.slides[0]
      if (slide._tag === "ContentSlide" && slide.layout._tag === "PatternLanguageOverview") {
        const layout = slide.layout as PatternLanguageOverviewLayout
        expect(layout.meta.number).toBe("02")
        expect(layout.meta.name).toBe("テスト名")
        expect(layout.meta.category).toBe("カテゴリ")
        expect(layout.meta.difficulty).toBe(3)
        expect(layout.meta.frequency).toBe(4)
      }
    })
  })

  describe("Escaped quotes in frontmatter", () => {
    it("should unescape backslash-quoted double quotes in values", async () => {
      const md = `## テスト
<!--pattern-language-a-->
number: "02"
name: "テスト名"
reference: "Brown et al. \\"Language Models\\" (2020)"

### 状況・いつ使うか
テスト状況
`
      const tokens = tokenize(md)
      const presentation = await Effect.runPromise(buildAST(tokens))

      const slide = presentation.slides[0]
      if (slide._tag === "ContentSlide" && slide.layout._tag === "PatternLanguageOverview") {
        const layout = slide.layout as PatternLanguageOverviewLayout
        expect(layout.meta.reference).toBe('Brown et al. "Language Models" (2020)')
      }
    })
  })

  describe("Minimal input", () => {
    it("should handle pattern with only required sections", async () => {
      const md = `## テスト
<!--pattern-language-a-->
number: "01"
name: "テスト"

### 状況・いつ使うか
テスト状況

### 問題・なぜ必要か
テスト問題

### 何をするのか
テスト解決策

### 期待結果
テスト結果

### 注意
テスト注意

### 成功例
**タイトル:** 成功タイトル
**Before:**
ビフォー
**ズレ分析:**
分析
**After:**
アフター

### 失敗例
**タイトル:** 失敗タイトル
**やったこと:**
試み
**何がダメだったか:**
問題
**こうすればよかった:**
改善

### テンプレート
\`\`\`
テンプレート本文
\`\`\`

### セルフチェック
- [ ] チェック項目1

### チーム活用シナリオ
1. シナリオ1
`
      const tokens = tokenize(md)
      const presentation = await Effect.runPromise(buildAST(tokens))

      // Overview + Detail = 2 slides (no title slide)
      expect(presentation.slides).toHaveLength(2)

      const overview = presentation.slides[0]
      if (overview._tag === "ContentSlide") {
        expect(overview.layout._tag).toBe("PatternLanguageOverview")
      }

      const detail = presentation.slides[1]
      if (detail._tag === "ContentSlide") {
        expect(detail.layout._tag).toBe("PatternLanguageDetail")
        const layout = detail.layout as PatternLanguageDetailLayout
        expect(layout.template).toBe("テンプレート本文")
        expect(layout.checklist).toEqual(["チェック項目1"])
        expect(layout.teamScenarios).toEqual(["シナリオ1"])
      }
    })
  })

  describe("Concrete examples (具体例)", () => {
    const CONCRETE_EXAMPLE_MD = `## 答え合わせ
<!--pattern-language-a-->
number: "04"
name: "答え合わせを用意する"

### 状況・いつ使うか
テスト状況

### 問題・なぜ必要か
テスト問題

### 何をするのか
テスト解決策

### 期待結果
テスト結果

### 注意
テスト注意

### 具体例1：メールバリデーション関数
**良い例:**
\`\`\`
validateEmail関数を書いて。テストケース:
  user@example.com → true
  user@.com → false
\`\`\`

**良いポイント:**
- 具体的なテストケースで正解・不正解を明示
- エッジケースを含めている
- **結果:** AIが自己修正→全パス

**短すぎる例（NG）:**
\`メールアドレスを検証する関数を書いて\`

**失敗する理由:**
検証基準がないため、基本的な正規表現が返る。

### 具体例２:ダッシュボード画面の改修
**良い依頼例:**
\`\`\`
ダッシュボードの見た目を修正して。
添付したデザインカンプと同じ見た目にして。
\`\`\`

**良いポイント:**
- スクリーンショットという検証基準を提供
- **結果:** 1回の実装で完成

**短すぎる例（NG）:**
\`ダッシュボードの見た目をよくして\`

**失敗する理由:**
「よくする」は検証基準ではない。

### テンプレート
\`\`\`
テンプレート
\`\`\`

### セルフチェック
- [ ] チェック項目

### チーム活用シナリオ
1. シナリオ
`

    it("should embed concrete examples in Detail layout (success/failure positions)", async () => {
      const tokens = tokenize(CONCRETE_EXAMPLE_MD)
      const presentation = await Effect.runPromise(buildAST(tokens))

      // Overview + Detail = 2 slides (concrete examples embedded in Detail)
      expect(presentation.slides).toHaveLength(2)

      // Slide 0: Overview
      expect(presentation.slides[0]._tag).toBe("ContentSlide")
      if (presentation.slides[0]._tag === "ContentSlide") {
        expect(presentation.slides[0].layout._tag).toBe("PatternLanguageOverview")
      }

      // Slide 1: Detail with concrete examples
      const detailSlide = presentation.slides[1]
      expect(detailSlide._tag).toBe("ContentSlide")
      if (detailSlide._tag === "ContentSlide") {
        expect(detailSlide.layout._tag).toBe("PatternLanguageDetail")
        const detail = detailSlide.layout as PatternLanguageDetailLayout
        expect(detail.meta.number).toBe("04")

        // 2 concrete examples embedded
        expect(detail.concreteExamples).toHaveLength(2)

        // Example 1 (replaces success box)
        const ex1 = detail.concreteExamples[0]
        expect(ex1.number).toBe(1)
        expect(ex1.title).toBe("メールバリデーション関数")
        expect(ex1.goodExample).toContain("validateEmail")
        expect(ex1.goodPoints).toContain("テストケースで正解")
        expect(ex1.badExample).toContain("メールアドレスを検証する関数")
        expect(ex1.badReason).toContain("検証基準がない")

        // Example 2 (replaces failure box)
        const ex2 = detail.concreteExamples[1]
        expect(ex2.number).toBe(2)
        expect(ex2.title).toBe("ダッシュボード画面の改修")
        expect(ex2.goodExample).toContain("ダッシュボードの見た目を修正")
        expect(ex2.goodPoints).toContain("スクリーンショット")
        expect(ex2.badExample).toContain("見た目をよくして")
        expect(ex2.badReason).toContain("検証基準ではない")
      }
    })

    it("should coexist with success/failure examples (both stored in Detail)", async () => {
      const md = `## テスト
<!--pattern-language-a-->
number: "05"
name: "共存テスト"

### 状況・いつ使うか
テスト

### 成功例
**タイトル:** 成功例テスト
**Before:**
ビフォー
**ズレ分析:**
分析
**After:**
アフター

### 失敗例
**タイトル:** 失敗例テスト
**やったこと:**
試み
**何がダメだったか:**
問題
**こうすればよかった:**
改善

### 具体例1：テスト具体例
**良い例:**
\`\`\`
良い例コード
\`\`\`

**良いポイント:**
- ポイント1

**短すぎる例（NG）:**
NG例

**失敗する理由:**
理由

### テンプレート
\`\`\`
テンプレ
\`\`\`

### セルフチェック
- [ ] チェック

### チーム活用シナリオ
1. シナリオ
`
      const tokens = tokenize(md)
      const presentation = await Effect.runPromise(buildAST(tokens))

      // Overview + Detail = 2 slides
      expect(presentation.slides).toHaveLength(2)

      // Detail has both success/failure and concrete examples
      if (presentation.slides[1]._tag === "ContentSlide") {
        const detail = presentation.slides[1].layout as PatternLanguageDetailLayout
        expect(detail.success.title).toContain("成功例テスト")
        expect(detail.failure.title).toContain("失敗例テスト")
        expect(detail.concreteExamples).toHaveLength(1)
        expect(detail.concreteExamples[0].title).toBe("テスト具体例")
        expect(detail.concreteExamples[0].goodExample).toContain("良い例コード")
      }
    })

    it("should handle pattern without concrete examples (backward compat)", async () => {
      const tokens = tokenize(PATTERN_LANGUAGE_MD)
      const presentation = await Effect.runPromise(buildAST(tokens))

      // Original test: Title + Overview + Detail = 3 slides
      expect(presentation.slides).toHaveLength(3)
      if (presentation.slides[2]._tag === "ContentSlide") {
        const detail = presentation.slides[2].layout as PatternLanguageDetailLayout
        expect(detail.concreteExamples).toHaveLength(0)
      }
    })
  })
})
