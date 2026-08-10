import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { parseMarkdown } from "../src/parser/index.js"

describe("parseMarkdown", () => {
  it("should parse a simple title slide", async () => {
    const md = `---\n# タイトル\nサブタイトル`
    const result = await Effect.runPromise(parseMarkdown(md))

    expect(result.slides).toHaveLength(1)
    expect(result.slides[0]._tag).toBe("TitleSlide")
    expect(result.slides[0].title).toBe("タイトル")
    expect((result.slides[0] as any).subtitle).toBe("サブタイトル")
  })

  it("should parse a content slide with default layout", async () => {
    const md = `---\n## コンテンツ\n### 見出し1\n本文1\n\n### 見出し2\n本文2`
    const result = await Effect.runPromise(parseMarkdown(md))

    expect(result.slides).toHaveLength(1)
    expect(result.slides[0]._tag).toBe("ContentSlide")
    const slide = result.slides[0] as any
    expect(slide.title).toBe("コンテンツ")
    expect(slide.layout._tag).toBe("Default")
    expect(slide.layout.sections).toHaveLength(2)
  })

  it("should parse left-right layout", async () => {
    const md = `---\n## タイトル\n<!--left:2-->\n### 左見出し\n左本文\n\n<!--right:1-->\n### 右見出し\n右本文`
    const result = await Effect.runPromise(parseMarkdown(md))

    const slide = result.slides[0] as any
    expect(slide.layout._tag).toBe("LeftRight")
    expect(slide.layout.leftRatio).toBe(2)
    expect(slide.layout.rightRatio).toBe(1)
    expect(slide.layout.leftSections).toHaveLength(1)
    expect(slide.layout.rightSections).toHaveLength(1)
  })

  it("should parse grid layout", async () => {
    const md = `---\n## タイトル\n<!--grid:2x3-->\n### A\n本文A\n\n### B\n本文B`
    const result = await Effect.runPromise(parseMarkdown(md))

    const slide = result.slides[0] as any
    expect(slide.layout._tag).toBe("Grid")
    expect(slide.layout.rows).toBe(2)
    expect(slide.layout.cols).toBe(3)
    expect(slide.layout.cells).toHaveLength(2)
  })

  it("should parse lean-canvas layout", async () => {
    const md = `---\n## Lean Canvas\n<!--lean-canvas-->\n### Problem\nHigh costs\n\n### Solution\nMarketplace platform\n\n### Key Metrics\nConversion rate`
    const result = await Effect.runPromise(parseMarkdown(md))

    const slide = result.slides[0] as any
    expect(slide.layout._tag).toBe("LeanCanvas")
    expect(slide.layout.blocks).toHaveLength(3)
    expect(slide.layout.blocks[0].heading).toBe("Problem")
    expect(slide.layout.blocks[0].body).toBe("High costs")
    expect(slide.layout.blocks[1].heading).toBe("Solution")
    expect(slide.layout.blocks[1].body).toBe("Marketplace platform")
    expect(slide.layout.blocks[2].heading).toBe("Key Metrics")
    expect(slide.layout.blocks[2].body).toBe("Conversion rate")
  })

  it("should parse lean-canvas with multiple blocks in order", async () => {
    const md = `---\n## Product Canvas\n<!--lean-canvas-->\n### Problem\n- Cost issue\n- Time issue\n\n### Solution\n- Platform\n- Automation\n\n### Unique Value\nQuality at low cost\n\n### Channels\nOnline marketing`
    const result = await Effect.runPromise(parseMarkdown(md))

    const slide = result.slides[0] as any
    expect(slide.layout._tag).toBe("LeanCanvas")
    expect(slide.layout.blocks).toHaveLength(4)
    expect(slide.layout.blocks[0].heading).toBe("Problem")
    expect(slide.layout.blocks[1].heading).toBe("Solution")
    expect(slide.layout.blocks[2].heading).toBe("Unique Value")
    expect(slide.layout.blocks[3].heading).toBe("Channels")
  })

  it("should parse top-bottom layout", async () => {
    const md = `---\n## タイトル\n<!--top:4-->\n### 上見出し\n上本文\n\n<!--bottom:1-->\n### 下見出し\n下本文`
    const result = await Effect.runPromise(parseMarkdown(md))

    const slide = result.slides[0] as any
    expect(slide.layout._tag).toBe("TopBottom")
    expect(slide.layout.topRatio).toBe(4)
    expect(slide.layout.bottomRatio).toBe(1)
    expect(slide.layout.topSections).toHaveLength(1)
    expect(slide.layout.bottomSections).toHaveLength(1)
  })

  it("should parse numbered-list:circle layout", async () => {
    const md = `---\n## 学習目的\n<!--numbered-list:circle-->\n### 項目1\n本文1\n\n### 項目2\n本文2\n\n### 項目3\n本文3`
    const result = await Effect.runPromise(parseMarkdown(md))

    const slide = result.slides[0] as any
    expect(slide.layout._tag).toBe("NumberedList")
    expect(slide.layout.variant).toBe("circle")
    expect(slide.layout.items).toHaveLength(3)
    expect(slide.layout.items[0].heading).toBe("項目1")
    expect(slide.layout.items[0].body).toBe("本文1")
  })

  it("should parse numbered-list:bar layout", async () => {
    const md = `---\n## 注意点\n<!--numbered-list:bar-->\n### AI盲信\nAIの出力を検証なしに採用する\n\n### 回答者否定\n仮説が外れたとき対象者が間違いと結論づける`
    const result = await Effect.runPromise(parseMarkdown(md))

    const slide = result.slides[0] as any
    expect(slide.layout._tag).toBe("NumberedList")
    expect(slide.layout.variant).toBe("bar")
    expect(slide.layout.items).toHaveLength(2)
    expect(slide.layout.items[0].heading).toBe("AI盲信")
  })

  it("should parse multiple slides separated by ---", async () => {
    const md = `---\n# タイトル\nサブタイトル\n---\n## スライド1\n### 見出し\n本文\n---\n## スライド2\n本文のみ`
    const result = await Effect.runPromise(parseMarkdown(md))

    expect(result.slides).toHaveLength(3)
    expect(result.slides[0]._tag).toBe("TitleSlide")
    expect(result.slides[1]._tag).toBe("ContentSlide")
    expect(result.slides[2]._tag).toBe("ContentSlide")
  })

  it("should parse steps layout with icons and body splitting", async () => {
    const md = `---
## 5段階習得レベル
<!--steps-->
### 見る
<!--icon:👁-->
観察者
全体像を理解し 各フェーズの目的を 説明できる

### 習う
<!--icon:🎓-->
見習い
現場に出始め 先輩を手本に スクリプトを組む

### 動く
<!--icon:🏃-->
実践者
自律的に判断し 適切なツールを 選択できる`

    const result = await Effect.runPromise(parseMarkdown(md))

    expect(result.slides).toHaveLength(1)
    const slide = result.slides[0] as any
    expect(slide._tag).toBe("ContentSlide")
    expect(slide.title).toBe("5段階習得レベル")
    expect(slide.layout._tag).toBe("Steps")
    expect(slide.layout.steps).toHaveLength(3)

    // Check first step
    expect(slide.layout.steps[0].heading).toBe("見る")
    expect(slide.layout.steps[0].icon).toBe("👁")
    expect(slide.layout.steps[0].name).toBe("観察者")
    expect(slide.layout.steps[0].body).toBe("全体像を理解し 各フェーズの目的を 説明できる")

    // Check second step
    expect(slide.layout.steps[1].heading).toBe("習う")
    expect(slide.layout.steps[1].icon).toBe("🎓")
    expect(slide.layout.steps[1].name).toBe("見習い")
    expect(slide.layout.steps[1].body).toBe("現場に出始め 先輩を手本に スクリプトを組む")

    // Check third step
    expect(slide.layout.steps[2].heading).toBe("動く")
    expect(slide.layout.steps[2].icon).toBe("🏃")
    expect(slide.layout.steps[2].name).toBe("実践者")
    expect(slide.layout.steps[2].body).toBe("自律的に判断し 適切なツールを 選択できる")
  })

  it("should parse steps layout with takeaway", async () => {
    const md = `---
## 成長プロセス
<!--steps-->
### 初級
<!--icon:🌱-->
ビギナー
基本を学ぶ

### 中級
<!--icon:🌿-->
アドバンス
実践する

### 上級
<!--icon:🌳-->
エキスパート
指導する

<!--takeaway-->
段階的に成長していく`

    const result = await Effect.runPromise(parseMarkdown(md))

    const slide = result.slides[0] as any
    expect(slide.layout._tag).toBe("Steps")
    expect(slide.layout.steps).toHaveLength(3)
    expect(slide.layout.takeaway).toBe("段階的に成長していく")
  })
})
