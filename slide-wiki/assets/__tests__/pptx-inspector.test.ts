import { describe, it, expect, beforeAll } from "vitest"
import { Effect } from "effect"
import { inspectPptx } from "../src/tools/pptx-inspector.js"
import { md2pptx } from "../src/index.js"
import JSZip from "jszip"

const TEST_MARKDOWN = `# スライドタイトル
---
## コンテンツスライド
### 見出しA
デフォルトレイアウトでは本文が表示されます`

let pptxBuffer: Buffer

beforeAll(async () => {
  pptxBuffer = await Effect.runPromise(md2pptx(TEST_MARKDOWN))
})

describe("pptx-inspector", () => {
  it("should extract inventory from PPTX binary", async () => {
    const inventory = await Effect.runPromise(inspectPptx(pptxBuffer))

    // Verify slide-0 (title slide)
    expect(inventory["slide-0"]).toBeDefined()
    expect(inventory["slide-0"]["shape-0"]).toBeDefined()

    const titlePara = inventory["slide-0"]["shape-0"].paragraphs[0]
    expect(titlePara.text).toBe("スライドタイトル")
    expect(titlePara.font_name).toBe("Arial")
    expect(titlePara.font_size).toBe(32)
    expect(titlePara.bold).toBe(true)
    expect(titlePara.color).toBe("FFFFFF")
    expect(titlePara.alignment).toBe("CENTER")

    // Verify slide-1 (content slide)
    expect(inventory["slide-1"]).toBeDefined()
    expect(inventory["slide-1"]["shape-0"]).toBeDefined()

    const contentTitle = inventory["slide-1"]["shape-0"].paragraphs[0]
    expect(contentTitle.text).toBe("コンテンツスライド")
    expect(contentTitle.font_size).toBe(24)
    expect(contentTitle.bold).toBe(true)
    expect(contentTitle.color).toBe("1E40AF")

    // Verify shape-1 (heading A)
    expect(inventory["slide-1"]["shape-1"]).toBeDefined()
    const headingA = inventory["slide-1"]["shape-1"].paragraphs[0]
    expect(headingA.text).toBe("見出しA")
    expect(headingA.font_size).toBe(18)
    expect(headingA.bold).toBe(true)
    expect(headingA.color).toBe("3B82F6")

    // Verify shape-2 (body text)
    expect(inventory["slide-1"]["shape-2"]).toBeDefined()
    const bodyA = inventory["slide-1"]["shape-2"].paragraphs[0]
    expect(bodyA.text).toContain("デフォルトレイアウトでは")
    expect(bodyA.font_size).toBe(16)
    expect(bodyA.bold).toBeUndefined()
    expect(bodyA.color).toBe("1F2937")
  })

  it("should preserve box-level bold on the richText path", async () => {
    const md = `# T
---
## Content
### 見出し
本文に**強調**を含む`
    const inventory = await Effect.runPromise(inspectPptx(await Effect.runPromise(md2pptx(md))))

    // shape-1 = セクション見出し。layout が isBold: true を付けている
    expect(inventory["slide-1"]["shape-1"].paragraphs[0].bold).toBe(true)
    // shape-2 = 本文。ボックス自体は太字ではないので先頭 run も太字にならない。
    // parseParagraph は段落内の最初の <a:rPr> だけを読むため、本文は
    // インライン強調を後方に置いて先頭 run が素であることを確かめる。
    expect(inventory["slide-1"]["shape-2"].paragraphs[0].bold).toBeUndefined()
  })

  it("should key shapes by the name the renderer declared, not by drawing order", async () => {
    // 位置で数えていたときは、境界ボックスやアイコンを描くレイアウトで
    // 全キーがずれた（BACKLOG B-24）。レンダラが objectName で宣言した名前を
    // 読むので、テキストボックスは描画順の最後でも shape-0 から始まる。
    const md = `# T
---
## アイコン付き
<!--icon-cols-->
### 速い
<!--icon:🚀-->
説明A

### 賢い
<!--icon:💡-->
説明B

### 安全
<!--icon:🛡️-->
説明C`
    const inventory = await Effect.runPromise(inspectPptx(await Effect.runPromise(md2pptx(md))))
    const keys = Object.keys(inventory["slide-1"])

    // アイコンは icon-N、テキストは shape-N。連番の1本の空間に潰れていない
    expect(keys).toContain("shape-0")
    expect(keys.some((k) => k.startsWith("icon-"))).toBe(true)
    expect(inventory["slide-1"]["shape-0"].paragraphs[0].text).toBe("アイコン付き")
  })

  it("should drop decorative shapes from the inventory", async () => {
    // 境界ボックス・塗り・コード背景はテキストを運ばない。deco: を付けて
    // 比較対象から外してある — 外し方が生成物に書かれていることが要点。
    const md = `# T
---
## コード
\`\`\`ts
const x = 1
\`\`\``
    const buffer = await Effect.runPromise(md2pptx(md))
    const xml = await (await JSZip.loadAsync(buffer)).file("ppt/slides/slide2.xml")!.async("string")

    // 生成物には deco: の図形が実在する
    expect(xml).toContain('name="deco:code-0-bg"')

    // インベントリには入らない
    const inventory = await Effect.runPromise(inspectPptx(buffer))
    expect(Object.keys(inventory["slide-1"]).some((k) => k.startsWith("deco:"))).toBe(false)
    expect(inventory["slide-1"]["code-0"]).toBeDefined()
  })

  it("should handle PPTX with multiple slides", async () => {
    const inventory = await Effect.runPromise(inspectPptx(pptxBuffer))

    expect(Object.keys(inventory).length).toBeGreaterThanOrEqual(2)
    expect(inventory["slide-0"]).toBeDefined()
    expect(inventory["slide-1"]).toBeDefined()
  })

  it("should convert EMU to inches correctly", async () => {
    const inventory = await Effect.runPromise(inspectPptx(pptxBuffer))

    // All coordinates should be in inches (0-10 for x, 0-6 for y)
    const shape = inventory["slide-0"]["shape-0"]
    expect(shape.left).toBeGreaterThan(0)
    expect(shape.left).toBeLessThan(10)
    expect(shape.top).toBeGreaterThan(0)
    expect(shape.top).toBeLessThan(6)
    expect(shape.width).toBeGreaterThan(0)
    expect(shape.width).toBeLessThanOrEqual(10)
    expect(shape.height).toBeGreaterThan(0)
    expect(shape.height).toBeLessThanOrEqual(6)
  })

  it("should handle invalid PPTX gracefully", async () => {
    const invalidBuffer = Buffer.from("not a valid zip file")
    const result = await Effect.runPromise(
      Effect.either(inspectPptx(invalidBuffer))
    )

    expect(result._tag).toBe("Left")
  })
})
