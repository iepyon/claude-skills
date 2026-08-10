import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { tokenize } from "../src/parser/tokenizer.js"
import { buildAST } from "../src/parser/ast-builder.js"

const CUSTOMER_JOURNEY_MD = `# カスタマージャーニーテスト

---

## 推し活サポートアプリ
<!--カスタマージャーニー:-->

### 認知
#### タッチ:
- SNS広告
- 友人の口コミ
#### 行動:
- SNSで投稿を閲覧
#### 判断:
- 複数SNS見るの大変
#### 感情:
- 効率化できそう

### 検討
#### タッチ:
- アプリストア
#### 行動:
- レビュー確認
#### 判断:
- 使いやすいか不安
#### 感情:
- 評判が良さそう
`

describe("Customer Journey", () => {
  describe("Tokenization", () => {
    it("should tokenize customer journey directive", () => {
      const markdown = "<!--カスタマージャーニー:-->"
      const tokens = tokenize(markdown)
      expect(tokens).toHaveLength(1)
      expect(tokens[0].type).toBe("PluginDirective")
      expect(tokens[0]).toHaveProperty("pluginId", "customer-journey")
    })

    it("should tokenize H4 headers", () => {
      const markdown = "#### タッチ:"
      const tokens = tokenize(markdown)
      expect(tokens).toHaveLength(1)
      expect(tokens[0].type).toBe("H4")
      expect(tokens[0]).toHaveProperty("text", "タッチ:")
    })
  })

  describe("AST Building", () => {
    it("should parse customer journey with 2 phases", async () => {
      const tokens = tokenize(CUSTOMER_JOURNEY_MD)
      const presentation = await Effect.runPromise(buildAST(tokens))

      expect(presentation.slides).toHaveLength(2) // Title + Content

      const contentSlide = presentation.slides[1]
      expect(contentSlide._tag).toBe("ContentSlide")
      expect(contentSlide.title).toBe("推し活サポートアプリ")

      if (contentSlide._tag === "ContentSlide") {
        expect(contentSlide.layout._tag).toBe("CustomerJourney")

        if (contentSlide.layout._tag === "CustomerJourney") {
          // フェーズ確認
          expect(contentSlide.layout.phases).toHaveLength(2)
          expect(contentSlide.layout.phases).toEqual(["認知", "検討"])

          // 行確認
          expect(contentSlide.layout.rows).toHaveLength(4)
          expect(contentSlide.layout.rows[0].label).toBe("タッチ")
          expect(contentSlide.layout.rows[1].label).toBe("行動")
          expect(contentSlide.layout.rows[2].label).toBe("判断")
          expect(contentSlide.layout.rows[3].label).toBe("感情")

          // セルの内容確認（認知フェーズ、タッチ行）
          expect(contentSlide.layout.rows[0].cells[0].items).toEqual([
            "SNS広告",
            "友人の口コミ",
          ])

          // セルの内容確認（検討フェーズ、タッチ行）
          expect(contentSlide.layout.rows[0].cells[1].items).toEqual([
            "アプリストア",
          ])

          // セルの内容確認（認知フェーズ、判断行）
          expect(contentSlide.layout.rows[2].cells[0].items).toEqual([
            "複数SNS見るの大変",
          ])
        }
      }
    })

    it("should handle empty sections gracefully", async () => {
      const markdown = `## テスト
<!--カスタマージャーニー:-->
### フェーズ1
#### タッチ:
- 項目1
#### 行動:
#### 判断:
- 項目2
#### 感情:
`
      const tokens = tokenize(markdown)
      const presentation = await Effect.runPromise(buildAST(tokens))

      const contentSlide = presentation.slides[0]
      if (
        contentSlide._tag === "ContentSlide" &&
        contentSlide.layout._tag === "CustomerJourney"
      ) {
        const rows = contentSlide.layout.rows

        // タッチ行には項目がある
        expect(rows[0].cells[0].items).toHaveLength(1)

        // 行動行は空
        expect(rows[1].cells[0].items).toHaveLength(0)

        // 判断行には項目がある
        expect(rows[2].cells[0].items).toHaveLength(1)

        // 感情行は空
        expect(rows[3].cells[0].items).toHaveLength(0)
      }
    })
  })

  describe("Pagination", () => {
    it("should paginate customer journey with more than 4 phases", async () => {
      const markdown = `## テスト
<!--カスタマージャーニー:-->
### フェーズ1
#### タッチ:
- 項目1
#### 行動:
- 項目1
#### 判断:
- 項目1
#### 感情:
- 項目1
### フェーズ2
#### タッチ:
- 項目1
#### 行動:
- 項目1
#### 判断:
- 項目1
#### 感情:
- 項目1
### フェーズ3
#### タッチ:
- 項目1
#### 行動:
- 項目1
#### 判断:
- 項目1
#### 感情:
- 項目1
### フェーズ4
#### タッチ:
- 項目1
#### 行動:
- 項目1
#### 判断:
- 項目1
#### 感情:
- 項目1
### フェーズ5
#### タッチ:
- 項目1
#### 行動:
- 項目1
#### 判断:
- 項目1
#### 感情:
- 項目1
### フェーズ6
#### タッチ:
- 項目1
#### 行動:
- 項目1
#### 判断:
- 項目1
#### 感情:
- 項目1
`
      const tokens = tokenize(markdown)
      const presentation = await Effect.runPromise(buildAST(tokens))

      // 6フェーズあるので2スライドに分割される
      expect(presentation.slides).toHaveLength(2)

      // 1枚目: フェーズ1-4
      const slide1 = presentation.slides[0]
      if (
        slide1._tag === "ContentSlide" &&
        slide1.layout._tag === "CustomerJourney"
      ) {
        expect(slide1.title).toBe("テスト (1/2)")
        expect(slide1.layout.phases).toHaveLength(4)
        expect(slide1.layout.phases).toEqual([
          "フェーズ1",
          "フェーズ2",
          "フェーズ3",
          "フェーズ4",
        ])
      }

      // 2枚目: フェーズ5-6
      const slide2 = presentation.slides[1]
      if (
        slide2._tag === "ContentSlide" &&
        slide2.layout._tag === "CustomerJourney"
      ) {
        expect(slide2.title).toBe("テスト (2/2)")
        expect(slide2.layout.phases).toHaveLength(2)
        expect(slide2.layout.phases).toEqual(["フェーズ5", "フェーズ6"])
      }
    })

    it("should not add page numbers for 4 or fewer phases", async () => {
      const markdown = `## テスト
<!--カスタマージャーニー:-->
### フェーズ1
#### タッチ:
- 項目1
#### 行動:
- 項目1
#### 判断:
- 項目1
#### 感情:
- 項目1
### フェーズ2
#### タッチ:
- 項目1
#### 行動:
- 項目1
#### 判断:
- 項目1
#### 感情:
- 項目1
`
      const tokens = tokenize(markdown)
      const presentation = await Effect.runPromise(buildAST(tokens))

      expect(presentation.slides).toHaveLength(1)

      const slide = presentation.slides[0]
      if (
        slide._tag === "ContentSlide" &&
        slide.layout._tag === "CustomerJourney"
      ) {
        // ページ番号なし
        expect(slide.title).toBe("テスト")
        expect(slide.layout.phases).toHaveLength(2)
      }
    })
  })
})
