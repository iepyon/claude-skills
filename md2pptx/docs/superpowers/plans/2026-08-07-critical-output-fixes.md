# md2pptx 致命的欠陥の修正 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 「間違った出力・壊れた出力が黙って生成される」経路をすべて塞ぎ、md2pptx が主張する決定論性と3者比較検証を実際に機能させる。

**Architecture:** 4フェーズ。Phase 0 で赤いテストスイートを緑に戻す（3者比較検証の修復・PPTX 太字欠落・レイアウトの非決定論）。これが Phase 1 以降の安全網になる。Phase 1 で箇条書きをレイアウト段階の行頭解釈として実装（パーサに手を入れないためプラグイン衝突がゼロ）。Phase 2 でオーバーフローを段階縮小 → 収まらなければ ValidationError の2段構えにする。Phase 3 で B-02/B-08 の変更を反映した状態でドキュメントを統一する。

**Tech Stack:** TypeScript (ESM, `npx tsx` 直接実行・ビルドなし)、Effect-TS、pptxgenjs、vitest

## Global Constraints

- 作業ディレクトリは `/Users/eiji/.claude/skills/md2pptx`。npm コマンドは必ず `cd assets` してから実行する。
- `git commit` は可。**`git push` は明示的に要求されるまで禁止**（`CLAUDE.md` の Git Push Policy）。
- テストは `npm test`（= `vitest run`、CI モード）。スナップショット更新は `npx vitest run -u` を明示的に実行した場合のみ。
- 文字数制限の正は**実装値 1000**（`assets/src/constants.ts:31` の `MAX_CHARS_PER_SLIDE = 1000`）。240 と 800 はドキュメント上の誤りであり、実装を仕様に合わせるのではなくドキュメントを実装に合わせる。
- Effect-TS の制御フローは `Effect.gen` + `yield*`。失敗は `Effect.sync` の中で `Effect.fail(...)` を返して `Effect.flatten` する既存パターン（`assets/src/schema/validation.ts:74-104`）に従い、`throw` は使わない。
- PPTX/HTML 両レンダラは同一の `LayoutResult` を消費する。片側だけに描画分岐を足してはならない。
- リテラルのバレット記号（`•`）をテキストに埋め込むことは禁止。PPTX はネイティブ `bullet`、HTML は CSS 生成コンテンツを使う。二重表示を防ぐため。
- Phase 0 完了時点で `npm test` が完全に緑であること。以降の各タスクは「自分の変更以外でテストが赤くならない」ことを前提に検証する。

## 調査で判明した前提（重要 — 対象が3件から6件に増えた理由）

この計画はバックログの P0 指定（B-01/B-02/B-08）から出発したが、着手前調査で**バックログに記載のない欠陥3件**が見つかった。いずれも「壊れた出力が黙って出る」という同じ基準に該当し、かつ B-02/B-08 の前提条件でもある。B-02 と B-08 はどちらも `TextBox` と両レンダラを触るため、赤いスイートの上で作業すると自分の回帰と既存の失敗を区別できない。

`npm test` の現状（2026-08-07 実測）:

```
Test Files  3 failed | 13 passed (16)
     Tests  12 failed | 279 passed (291)
```

| ID | 症状 | 根本原因（実測で確定） |
|---|---|---|
| C-1 | 3者比較検証（AST/HTML/PPTX）が全コンテンツレイアウトで実質無効。9テスト赤 | `assets/src/tools/inventory.ts:39` が `box.text` のみを読み `richText` を無視 → 参照インベントリの `text` が `undefined`。加えて `assets/src/tools/html-inspector.ts:86` の `/>([^<]+)</i` は最初のテキストノードしか拾わない |
| C-2 | **PPTX のセクション見出しが太字にならない。HTML とは見た目が異なる** | `assets/src/renderer/pptx/slide-builder.ts:214-219` が richText パスで `box.isBold` / `box.isItalic` を渡していない |
| C-3 | レイアウトが非決定論的。2スナップショットが約6か月前から恒久的に赤 | `assets/src/plugins/lean-canvas/layout.ts:185` の `new Date()`。スナップショットには `"2026.02.16"` が保存されている |

C-1 の実測（probe 出力、`default-layout` の slide-1）:

```
REF : shape-1=[{bold:true,fs:18}]                     ← text が無い
PPTX: shape-1=[{text:"Section A",fs:18}]              ← bold が無い
HTML: shape-1=[{text:"Section A",bold:true,fs:18}]
```

C-1 と C-2 は独立した欠陥で、C-1 のせいで C-2 が検出されずに残っていた。C-3 は「決定論的再現性」（`BACKLOG.md:7` が標準スキルに対する優位点として挙げている性質）そのものを壊している。

Phase 0 は3箇所の外科的修正で、合計でも数十行に収まる。書き直しではない。

**この計画で扱わない既知バグ**: `PatternLanguageDetail` レイアウトは `assets/src/plugins/pattern-language/converter.ts:65` で生成されるが `registerPlugin` の `layoutTag` に登録されていない（`index.ts:42` は `PatternLanguageOverview` のみ）。結果として文字数上限が 1024 ではなく 1000 になり、`countChars` も `titleFontSize` も適用されない。別クラスのバグなので Task 10 でバックログに追記するのみ。

---

## Phase 0 — テストスイートを緑に戻す

### Task 1: lean-canvas から `new Date()` を除去して決定論を回復する

**Files:**
- Modify: `assets/src/plugins/lean-canvas/layout.ts:184-196`
- Modify: `assets/__tests__/layout-engine.test.ts:218`, `:226`
- Modify: `assets/__tests__/__snapshots__/layout-engine.test.ts.snap`

**Interfaces:**
- Consumes: なし（このタスクが最初）
- Produces: `layoutLeanCanvas(blocks, titleY, theme)` の `textBoxes` から日付ボックスが消え、要素数が 1 減る。以降のタスクはこの前提で `layoutLeanCanvas` の出力を扱う。

**判断の根拠:** 日付は Markdown に書かれていないため「レビュー可能な中間表現」という設計原則に反し、かつレイアウトを非決定論にしている。日付表示が必要なら将来 `<!--date:2026-08-07-->` のような明示的ディレクティブで再導入できる（10行程度）。ここでは削除する。

- [ ] **Step 1: 現状の失敗を確認する**

Run: `cd assets && npx vitest run __tests__/layout-engine.test.ts -t "lean canvas"`
Expected: FAIL — `Snapshot ... should match lean canvas layout with 9 blocks 1 mismatched`

- [ ] **Step 2: 日付ボックスの生成を削除する**

`assets/src/plugins/lean-canvas/layout.ts` の以下のブロックを削除する。

削除前:
```typescript
  // Add date in top right corner
  const today = new Date()
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`
  allTextBoxes.push({
    x: SLIDE_WIDTH - MARGIN_X - 1.2,
    y: 0.35,
    w: 1.2,
    h: 0.3,
    text: dateStr,
    fontSize: 10,
    color: theme.contentSlide.textColor,
  })

  return { textBoxes: allTextBoxes, borderBoxes }
```

削除後:
```typescript
  return { textBoxes: allTextBoxes, borderBoxes }
```

- [ ] **Step 3: 要素数を検証しているテストを更新する**

`assets/__tests__/layout-engine.test.ts:218` を変更する。

変更前:
```typescript
      expect(result.textBoxes).toHaveLength(5) // 2 blocks × 2 textBoxes (heading + body) + 1 date
```

変更後:
```typescript
      expect(result.textBoxes).toHaveLength(4) // 2 blocks × 2 textBoxes (heading + body)
```

`assets/__tests__/layout-engine.test.ts:226` を変更する。

変更前:
```typescript
      expect(result.textBoxes).toHaveLength(1) // date text box only
```

変更後:
```typescript
      expect(result.textBoxes).toHaveLength(0)
```

- [ ] **Step 4: 型チェックを通す**

Run: `cd assets && npx tsc --noEmit`
Expected: エラーなし。`SLIDE_WIDTH` / `MARGIN_X` は lean-canvas/layout.ts の他の箇所でも使われているため通常はインポート削除は不要。未使用エラーが出た場合のみ該当インポートを削除する。

- [ ] **Step 5: スナップショットを更新する**

Run: `cd assets && npx vitest run __tests__/layout-engine.test.ts -u`
Expected: PASS

- [ ] **Step 6: スナップショット差分が日付ボックスの削除だけであることを確認する**

Run: `cd assets && git diff __tests__/__snapshots__/layout-engine.test.ts.snap`
Expected: 削除行のみ。`"text": "2026.02.16"` を含むテキストボックス2個ぶんが消え、他の座標・フォントサイズは一切変わっていないこと。座標が動いていたら Step 2 の削除範囲が広すぎるので見直す。

- [ ] **Step 7: 全テストを実行して残りの失敗数を確認する**

Run: `cd assets && npm test`
Expected: `Tests 10 failed | 281 passed` — layout-engine の2件が緑になり、`pptx-inspector` の1件と `snapshot-comparison` の9件が残る。

- [ ] **Step 8: コミット**

```bash
git add assets/src/plugins/lean-canvas/layout.ts assets/__tests__/layout-engine.test.ts assets/__tests__/__snapshots__/layout-engine.test.ts.snap
git commit -m "fix(lean-canvas): remove new Date() from layout to restore determinism

The auto-inserted date made layoutLeanCanvas non-deterministic and had kept two
snapshots red since 2026-02-16. A date that is absent from the source Markdown
also breaks the reviewable-intermediate-representation property."
```

---

### Task 2: PPTX の richText パスで太字・斜体が失われる問題を直す

**Files:**
- Modify: `assets/src/renderer/pptx/slide-builder.ts:14-36`, `:214-219`
- Modify: `assets/__tests__/pptx-inspector.test.ts`

**Interfaces:**
- Consumes: Task 1 で緑になった layout-engine テスト
- Produces: `inlineTextRunsToPptxRuns(runs, baseFontSize, baseColor, baseFontFace, baseBold, baseItalic)` — 引数が6個に増える。Task 6（PPTX の箇条書き分岐）がこのシグネチャを使う。

- [ ] **Step 1: 現状の失敗を確認する**

Run: `cd assets && npx vitest run __tests__/pptx-inspector.test.ts`
Expected: FAIL — `__tests__/pptx-inspector.test.ts:49` で `expected undefined to be true`。これは `expect(headingA.bold).toBe(true)` であり、見出しが PPTX 上で太字になっていないことを示す。既存の失敗テストがそのまま「先に書く失敗テスト」の役割を果たす。

- [ ] **Step 2: 斜体とボックス単位の太字を検出するテストを追加する**

`assets/__tests__/pptx-inspector.test.ts` の `it("should extract inventory from PPTX binary", ...)` の直後に追加する。

```typescript
  it("should preserve box-level bold on the richText path", async () => {
    const md = `# T
---
## Content
### 見出し
**強調**を含む本文`
    const inventory = await Effect.runPromise(inspectPptx(await Effect.runPromise(md2pptx(md))))

    // shape-1 = セクション見出し。layout が isBold: true を付けている
    expect(inventory["slide-1"]["shape-1"].paragraphs[0].bold).toBe(true)
    // shape-2 = 本文。ボックス自体は太字ではない
    expect(inventory["slide-1"]["shape-2"].paragraphs[0].bold).toBeUndefined()
  })
```

- [ ] **Step 3: 追加したテストが失敗することを確認する**

Run: `cd assets && npx vitest run __tests__/pptx-inspector.test.ts -t "should preserve box-level bold"`
Expected: FAIL — `expected undefined to be true`

- [ ] **Step 4: `inlineTextRunsToPptxRuns` にボックス単位の太字・斜体を渡せるようにする**

`assets/src/renderer/pptx/slide-builder.ts:14-27` を置き換える。

変更前:
```typescript
function inlineTextRunsToPptxRuns(
  runs: InlineTextRun[],
  baseFontSize: number,
  baseColor: string,
  baseFontFace: string
): Array<{ text: string; options: any }> {
  return runs.map(run => {
    const options: any = {
      fontSize: baseFontSize,
      color: baseColor,
      fontFace: run.code ? "Courier New" : baseFontFace,
      bold: run.bold || false,
      italic: run.italic || false,
    }
```

変更後:
```typescript
function inlineTextRunsToPptxRuns(
  runs: InlineTextRun[],
  baseFontSize: number,
  baseColor: string,
  baseFontFace: string,
  baseBold: boolean,
  baseItalic: boolean
): Array<{ text: string; options: any }> {
  return runs.map(run => {
    const options: any = {
      fontSize: baseFontSize,
      color: baseColor,
      fontFace: run.code ? "Courier New" : baseFontFace,
      bold: run.bold || baseBold,
      italic: run.italic || baseItalic,
    }
```

以降（`if (run.code) { options.highlight = ... }` から `return { text: run.text, options }` まで）は変更しない。

- [ ] **Step 5: 呼び出し側で `box.isBold` / `box.isItalic` を渡す**

`assets/src/renderer/pptx/slide-builder.ts:214-219` を変更する。

変更前:
```typescript
        const pptxRuns = inlineTextRunsToPptxRuns(
          box.richText,
          box.fontSize || 14,
          box.color || "000000",
          box.fontFace || theme.fonts.body
        )
```

変更後:
```typescript
        const pptxRuns = inlineTextRunsToPptxRuns(
          box.richText,
          box.fontSize || 14,
          box.color || "000000",
          box.fontFace || theme.fonts.body,
          box.isBold || false,
          box.isItalic || false
        )
```

- [ ] **Step 6: テストが通ることを確認する**

Run: `cd assets && npx vitest run __tests__/pptx-inspector.test.ts`
Expected: PASS（4件すべて）

- [ ] **Step 7: 全テストを実行する**

Run: `cd assets && npm test`
Expected: `Tests 9 failed | 282 passed` — 残るのは `snapshot-comparison.test.ts` の9件のみ。

- [ ] **Step 8: コミット**

```bash
git add assets/src/renderer/pptx/slide-builder.ts assets/__tests__/pptx-inspector.test.ts
git commit -m "fix(pptx): honor TextBox isBold/isItalic on the richText path

Section headings carry isBold: true from the layout engine but the richText
branch never forwarded it to pptxgenjs, so every heading in Default/LeftRight/
TopBottom/Grid/LeanCanvas shipped non-bold - and diverged from the HTML output,
which did honor it."
```

---

### Task 3: 3者比較検証のテキスト抽出を修復する

**Files:**
- Modify: `assets/src/tools/inventory.ts:32-63`
- Modify: `assets/src/tools/pptx-inspector.ts:21-24`
- Modify: `assets/src/tools/html-inspector.ts:82-88`
- Modify: `assets/__tests__/snapshot-comparison.test.ts`

**Interfaces:**
- Consumes: Task 2 の PPTX 太字修正（これが入っていないと参照と PPTX で `bold` が食い違い、テキスト修正の効果を確認できない）
- Produces: `boxToParagraphTexts(box: TextBox): string[]`（`assets/src/tools/inventory.ts` から export）— ボックスが持つテキスト表現を段落ごとの文字列配列に平坦化する。Task 6 がここに `paragraphs` の分岐を1本追加する。

**正規化の規約（3者で必ず一致させる）:** どの抽出器も「そのボックスの run テキストを区切りなしで連結し、前後の空白を trim した文字列」を返す。根拠は `assets/src/tools/pptx-inspector.ts:23` の `Array.from(textMatches, (m) => m[1]).join("")` — PPTX 側は空文字連結である。したがって参照側も空文字連結にする。

- [ ] **Step 1: インライン整形を含むテストケースを追加する**

`assets/__tests__/snapshot-comparison.test.ts` の `testCases` オブジェクト（13-55行）の末尾、`"grid-2x2"` の値の後に追加する。

```typescript
  "inline-formatting": `# Title Slide
Subtitle
---
## Inline Formatting
### Section **A**
Body with **bold**, *italic*, and \`code\``,
```

- [ ] **Step 2: 追加したケースの3者比較テストを書く**

`assets/__tests__/snapshot-comparison.test.ts` の `describe("grid-2x2", ...)` ブロックの直後（最も外側の `describe` を閉じる `})` の前）に追加する。

```typescript
  describe("inline-formatting", () => {
    const markdown = testCases["inline-formatting"]

    it("should match: reference vs PPTX", async () => {
      const ast = await Effect.runPromise(parseMarkdown(markdown))
      const presentation = await Effect.runPromise(validatePresentation(ast))
      const referenceInventory = await Effect.runPromise(
        slidesToInventory(presentation.slides, DEFAULT_THEME)
      )
      const pptxBuffer = await Effect.runPromise(md2pptx(markdown))
      const pptxInventory = await Effect.runPromise(inspectPptx(pptxBuffer))

      const diff = diffInventory(referenceInventory, pptxInventory)
      expect(diff.mismatches).toEqual([])
    })

    it("should match: reference vs HTML", async () => {
      const ast = await Effect.runPromise(parseMarkdown(markdown))
      const presentation = await Effect.runPromise(validatePresentation(ast))
      const referenceInventory = await Effect.runPromise(
        slidesToInventory(presentation.slides, DEFAULT_THEME)
      )
      const html = await Effect.runPromise(md2html(markdown))
      const htmlInventory = await Effect.runPromise(extractInventoryFromHtml(html))

      const diff = diffInventory(referenceInventory, htmlInventory)
      expect(diff.mismatches).toEqual([])
    })

    it("should match: PPTX vs HTML", async () => {
      const pptxBuffer = await Effect.runPromise(md2pptx(markdown))
      const pptxInventory = await Effect.runPromise(inspectPptx(pptxBuffer))
      const html = await Effect.runPromise(md2html(markdown))
      const htmlInventory = await Effect.runPromise(extractInventoryFromHtml(html))

      const diff = diffInventory(pptxInventory, htmlInventory)
      expect(diff.mismatches).toEqual([])
    })
  })
```

- [ ] **Step 3: 12件すべてが失敗することを確認する**

Run: `cd assets && npx vitest run __tests__/snapshot-comparison.test.ts`
Expected: FAIL — 12件（既存9件 + 新規3件）。ミスマッチの `property` に `.text` を含む行があり、`expected` が `undefined` になっていること。

- [ ] **Step 4: 参照インベントリが richText を読むようにする**

`assets/src/tools/inventory.ts:32-48` を置き換える。

変更前:
```typescript
// Convert TextBox to ParagraphInventory
function textBoxToParagraph(
  box: TextBox,
  fontName: string,
  isTitleSlide: boolean
): ParagraphInventory {
  const paragraph: ParagraphInventory = {
    text: box.text,
    ...(isTitleSlide ? { alignment: "CENTER" as const } : {}),
    font_name: fontName,
    font_size: box.fontSize ?? 16,
    ...(box.isBold ? { bold: true } : {}),
    color: box.color ?? "000000",
  }

  return paragraph
}
```

変更後:
```typescript
// Flatten whichever text representation this box carries into one string per paragraph.
// Runs are joined without a separator to match pptx-inspector's extractText().
export function boxToParagraphTexts(box: TextBox): string[] {
  if (box.richText) return [box.richText.map((run) => run.text).join("").trim()]
  return [(box.text ?? "").trim()]
}

// Convert one paragraph of a TextBox to ParagraphInventory
function textBoxToParagraph(
  box: TextBox,
  text: string,
  fontName: string,
  isTitleSlide: boolean
): ParagraphInventory {
  const paragraph: ParagraphInventory = {
    text,
    ...(isTitleSlide ? { alignment: "CENTER" as const } : {}),
    font_name: fontName,
    font_size: box.fontSize ?? 16,
    ...(box.isBold ? { bold: true } : {}),
    color: box.color ?? "000000",
  }

  return paragraph
}
```

`ParagraphInventory.text` の型が `string` であるため（`inventory.ts:8`）、`box.text` が `string | undefined` だった従来の代入は型上も緩かった。この変更で `string` に確定する。

- [ ] **Step 5: `textBoxToShape` を段落配列に対応させる**

`assets/src/tools/inventory.ts:50-63` を置き換える。

変更前:
```typescript
// Convert TextBox to ShapeInventory
function textBoxToShape(
  box: TextBox,
  fontName: string,
  isTitleSlide: boolean
): ShapeInventory {
  return {
    left: box.x,
    top: box.y,
    width: box.w,
    height: box.h,
    paragraphs: [textBoxToParagraph(box, fontName, isTitleSlide)],
  }
}
```

変更後:
```typescript
// Convert TextBox to ShapeInventory
function textBoxToShape(
  box: TextBox,
  fontName: string,
  isTitleSlide: boolean
): ShapeInventory {
  return {
    left: box.x,
    top: box.y,
    width: box.w,
    height: box.h,
    paragraphs: boxToParagraphTexts(box).map((text) =>
      textBoxToParagraph(box, text, fontName, isTitleSlide)
    ),
  }
}
```

- [ ] **Step 6: PPTX 側も同じ trim 規約に揃える**

`assets/src/tools/pptx-inspector.ts:21-24` を変更する。

変更前:
```typescript
function extractText(xml: string): string {
  const textMatches = xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)
  return Array.from(textMatches, (m) => m[1]).join("")
}
```

変更後:
```typescript
function extractText(xml: string): string {
  const textMatches = xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)
  return Array.from(textMatches, (m) => m[1]).join("").trim()
}
```

- [ ] **Step 7: HTML 側が全テキストノードを拾うようにする**

`assets/src/tools/html-inspector.ts:82-88` を置き換える。

変更前:
```typescript
/**
 * Extracts text content from HTML element
 */
const extractTextContent = (element: string): string => {
  const textMatch = element.match(/>([^<]+)</i)
  return textMatch?.[1]?.trim() ?? ""
}
```

変更後:
```typescript
// &amp; must be decoded last so that "&amp;lt;" yields "&lt;" and not "<".
const decodeEntities = (text: string): string =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")

/**
 * Extracts text content from an HTML element.
 *
 * Strips the outer tag, then all inner markup, so that inline formatting
 * (<strong>, <em>, <code>) contributes its text instead of truncating the
 * result at the first child element.
 */
const extractTextContent = (element: string): string => {
  const inner = element.replace(/^<[^>]*>/, "").replace(/<\/[^>]*>\s*$/, "")
  return decodeEntities(inner.replace(/<[^>]*>/g, "")).trim()
}
```

- [ ] **Step 8: 3者比較テストが通ることを確認する**

Run: `cd assets && npx vitest run __tests__/snapshot-comparison.test.ts`
Expected: PASS（15件）

- [ ] **Step 9: html-inspector の既存テストが壊れていないか確認する**

Run: `cd assets && npx vitest run __tests__/html-inspector.test.ts`
Expected: PASS。落ちた場合は、テキスト抽出が「最初のテキストノードのみ」から「全テキストノード」に変わったことで期待値が変わったケース。テストの期待値が旧挙動（先頭ノードのみ）を固定していたなら期待値を新挙動に更新する。実際に余分なテキストを拾っている（例: 入れ子の別シェイプの中身まで連結している）場合は Step 7 の実装を見直す。

- [ ] **Step 10: 全テストを実行して緑を確認する**

Run: `cd assets && npm test`
Expected: `Test Files 16 passed (16)` / `Tests 294 passed (294)` — 完全に緑。

- [ ] **Step 11: `--verify` が実際に動くことを手で確認する**

Run: `cd assets && npx tsx src/cli.ts doc/Spec.md /tmp/spec-verify.html --html --verify`
Expected: 3者比較が実行され、結果が報告される。ミスマッチが報告された場合は内容を読み、プラグインが独自にテキストボックスを組んでいるケース（コアレイアウト外）かどうかを判断する。このタスクのスコープはコアレイアウトの緑化までなので、プラグイン固有のミスマッチは内容をメモして Task 10 でバックログに追記する。

- [ ] **Step 12: コミット**

```bash
git add assets/src/tools/inventory.ts assets/src/tools/html-inspector.ts assets/src/tools/pptx-inspector.ts assets/__tests__/snapshot-comparison.test.ts
git commit -m "fix(tools): make the 3-way inventory comparison actually compare text

The reference inventory read only box.text, so every richText box (all body and
heading text) compared as undefined; the HTML extractor read only the first text
node, so inline formatting truncated the result. Both sides now flatten the full
run list, and all three extractors share one trim/concat convention.

Adds an inline-formatting test case, which the previous four cases never covered."
```

---

## Phase 1 — B-02: 箇条書きリスト（1階層）

**設計判断:** 行頭のリストマーカーは**レイアウト段階**で解釈する。トークナイザ・AST・スキーマには一切手を入れない。

根拠2点。(1) インライン Markdown 解析はすでにレイアウト段階で行われている（`assets/src/renderer/layout/helpers.ts:307` が `parseInlineFormatting(section.body)` を呼ぶ）ので、行頭解釈を隣に置くのはこのコードベースの既存パターンに沿う。(2) パーサに `ListItem` トークンを導入すると、`assets/src/plugins/customer-journey/handler.ts:129`（H3 ガードなしで全 `BodyText` を処理）と `assets/src/plugins/pattern-language/handler.ts:367,563,578`（principles / チェックボックス / 番号付きリストの独自解釈）が一斉に壊れる。レイアウト段階で解釈すればこれらのハンドラが受け取るトークンはバイト単位で不変になり、衝突がゼロになる。

代償: バレットが効くのは `buildSectionBoxes` を通るレイアウト（Default / LeftRight / TopBottom / Grid / LeanCanvas）と、Task 5 で明示的に対応する TextOnly のみ。他プラグインは独自にテキストボックスを組んでいるため対象外であり、Task 10 でドキュメントに明記する。

### Task 4: `parseBlockToParagraphs` と `Paragraph` 型

**Files:**
- Create: `assets/src/parser/block-formatter.ts`
- Create: `assets/__tests__/block-formatter.test.ts`
- Modify: `assets/src/renderer/layout/types.ts:5-27`
- Modify: `assets/src/renderer/layout/index.ts:23-38`
- Modify: `assets/src/constants.ts`

**Interfaces:**
- Consumes: なし（純関数の新規追加）
- Produces:
  - `Paragraph` 型（`assets/src/renderer/layout/types.ts`）: `{ runs: InlineTextRun[]; bullet?: { type: "bullet" } | { type: "number"; startAt?: number } }`
  - `TextBox.paragraphs?: Paragraph[]`
  - `hasListMarker(body: string): boolean`
  - `parseBlockToParagraphs(body: string): Paragraph[]`
  - `stripListMarkers(body: string): string`
  - `BULLET_INDENT = 0.25`（インチ）、`PARA_SPACE_AFTER = 4`（ポイント）

- [ ] **Step 1: 失敗するテストを書く**

`assets/__tests__/block-formatter.test.ts` を新規作成する。

```typescript
import { describe, it, expect } from "vitest"
import { hasListMarker, parseBlockToParagraphs, stripListMarkers } from "../src/parser/block-formatter.js"

describe("hasListMarker", () => {
  it("detects hyphen, asterisk, plus and ordered markers", () => {
    expect(hasListMarker("- item")).toBe(true)
    expect(hasListMarker("* item")).toBe(true)
    expect(hasListMarker("+ item")).toBe(true)
    expect(hasListMarker("1. item")).toBe(true)
    expect(hasListMarker("plain body\n- item")).toBe(true)
  })

  it("does not treat inline emphasis as a list", () => {
    expect(hasListMarker("*italic* text")).toBe(false)
    expect(hasListMarker("plain body")).toBe(false)
  })
})

describe("parseBlockToParagraphs", () => {
  it("marks unordered items and strips the marker", () => {
    const result = parseBlockToParagraphs("- first\n- second")
    expect(result).toHaveLength(2)
    expect(result[0].bullet).toEqual({ type: "bullet" })
    expect(result[0].runs.map(r => r.text).join("")).toBe("first")
    expect(result[1].runs.map(r => r.text).join("")).toBe("second")
  })

  it("carries startAt on the first item of a numbered group only", () => {
    const result = parseBlockToParagraphs("3. three\n4. four")
    expect(result[0].bullet).toEqual({ type: "number", startAt: 3 })
    expect(result[1].bullet).toEqual({ type: "number" })
  })

  it("restarts numbering after a non-list line", () => {
    const result = parseBlockToParagraphs("1. one\nprose\n5. five")
    expect(result[0].bullet).toEqual({ type: "number", startAt: 1 })
    expect(result[1].bullet).toBeUndefined()
    expect(result[2].bullet).toEqual({ type: "number", startAt: 5 })
  })

  it("keeps inline formatting inside list items", () => {
    const result = parseBlockToParagraphs("- has **bold**")
    expect(result[0].runs).toEqual([{ text: "has " }, { text: "bold", bold: true }])
  })

  it("leaves plain paragraphs without a bullet", () => {
    const result = parseBlockToParagraphs("just text")
    expect(result[0].bullet).toBeUndefined()
    expect(result[0].runs.map(r => r.text).join("")).toBe("just text")
  })

  it("treats a task-list marker as an unordered item and keeps the checkbox text", () => {
    const result = parseBlockToParagraphs("- [ ] todo")
    expect(result[0].bullet).toEqual({ type: "bullet" })
    expect(result[0].runs.map(r => r.text).join("")).toBe("[ ] todo")
  })
})

describe("stripListMarkers", () => {
  it("removes markers while preserving line structure", () => {
    expect(stripListMarkers("- a\n1. b\nc")).toBe("a\nb\nc")
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `cd assets && npx vitest run __tests__/block-formatter.test.ts`
Expected: FAIL — `Cannot find module '../src/parser/block-formatter.js'`

- [ ] **Step 3: `Paragraph` 型と `TextBox.paragraphs` を追加する**

`assets/src/renderer/layout/types.ts:5-19` を置き換える。

変更前:
```typescript
export interface InlineTextRun {
  text: string
  bold?: boolean
  italic?: boolean
  code?: boolean
}

export interface TextBox {
  x: number
  y: number
  w: number
  h: number
  text?: string                    // シンプルテキスト（既存・後方互換用）
  richText?: InlineTextRun[]       // リッチテキスト（新規）
  isBold?: boolean
```

変更後:
```typescript
export interface InlineTextRun {
  text: string
  bold?: boolean
  italic?: boolean
  code?: boolean
}

// 段落。bullet があれば箇条書き項目として描画される。
// PPTX はネイティブ bullet、HTML は CSS 生成コンテンツで記号を出すため、
// runs のテキストにリテラルの記号を含めてはならない（二重表示になる）。
export interface Paragraph {
  runs: InlineTextRun[]
  bullet?: { type: "bullet" } | { type: "number"; startAt?: number }
}

export interface TextBox {
  x: number
  y: number
  w: number
  h: number
  text?: string                    // シンプルテキスト（既存・後方互換用）
  richText?: InlineTextRun[]       // リッチテキスト（単一段落）
  paragraphs?: Paragraph[]         // 複数段落（箇条書きを含む）
  isBold?: boolean
```

以降（`isItalic?` から `}` まで）は変更しない。

- [ ] **Step 4: barrel re-export に `Paragraph` を追加する**

`assets/src/renderer/layout/index.ts:23-38` の `export type { ... } from "./types.js"` リストで、`TextBox,` の直後に1行追加する。

```typescript
  TextBox,
  Paragraph,
  BorderBox,
```

- [ ] **Step 5: 定数を追加する**

`assets/src/constants.ts` の末尾（`export const MAX_CHARS_PER_SLIDE = 1000` の後）に追加する。

```typescript

// Bullet lists
export const BULLET_INDENT = 0.25   // 箇条書きのぶら下げインデント（インチ）
export const PARA_SPACE_AFTER = 4   // 段落間のスペース（ポイント）
```

- [ ] **Step 6: `block-formatter.ts` を実装する**

`assets/src/parser/block-formatter.ts` を新規作成する。

```typescript
import { parseInlineFormatting } from "./inline-formatter.js"
import type { Paragraph } from "../renderer/layout/types.js"

// 行頭のリストマーカー。マーカーの後に空白が必須なので "*italic*" とは衝突しない。
const UNORDERED = /^\s*[-*+]\s+(.*)$/
const ORDERED = /^\s*(\d+)\.\s+(.*)$/

/**
 * body のいずれかの行がリストマーカーで始まるか。
 * 呼び出し側はこれで richText パスと paragraphs パスを振り分ける。
 * リストを含まない body は従来どおり richText として扱われる（既存出力の不変性）。
 */
export function hasListMarker(body: string): boolean {
  return body.split("\n").some((line) => UNORDERED.test(line) || ORDERED.test(line))
}

/**
 * body を段落配列に変換する。リストマーカーは除去し、bullet として構造化する。
 *
 * 番号付きリストの startAt は連続グループの先頭にのみ付ける。全項目に付けると
 * pptxgenjs が段落ごとに番号をリセットしうるため。
 */
export function parseBlockToParagraphs(body: string): Paragraph[] {
  const paragraphs: Paragraph[] = []
  let prevWasOrdered = false

  for (const line of body.split("\n")) {
    const ordered = line.match(ORDERED)
    if (ordered) {
      paragraphs.push({
        runs: parseInlineFormatting(ordered[2]),
        bullet: prevWasOrdered
          ? { type: "number" }
          : { type: "number", startAt: parseInt(ordered[1], 10) },
      })
      prevWasOrdered = true
      continue
    }

    const unordered = line.match(UNORDERED)
    if (unordered) {
      paragraphs.push({
        runs: parseInlineFormatting(unordered[1]),
        bullet: { type: "bullet" },
      })
      prevWasOrdered = false
      continue
    }

    paragraphs.push({ runs: parseInlineFormatting(line) })
    prevWasOrdered = false
  }

  return paragraphs
}

/**
 * 高さ見積もり用。マーカーを除去して行構造だけを残す。
 */
export function stripListMarkers(body: string): string {
  return body
    .split("\n")
    .map((line) => {
      const ordered = line.match(ORDERED)
      if (ordered) return ordered[2]
      const unordered = line.match(UNORDERED)
      if (unordered) return unordered[1]
      return line
    })
    .join("\n")
}
```

- [ ] **Step 7: テストが通ることを確認する**

Run: `cd assets && npx vitest run __tests__/block-formatter.test.ts`
Expected: PASS（8件）

- [ ] **Step 8: 全テストが緑のままであることを確認する**

Run: `cd assets && npm test`
Expected: 全緑。`paragraphs` はまだどこからも設定されていないので既存出力は一切変わらない。

- [ ] **Step 9: コミット**

```bash
git add assets/src/parser/block-formatter.ts assets/__tests__/block-formatter.test.ts assets/src/renderer/layout/types.ts assets/src/renderer/layout/index.ts assets/src/constants.ts
git commit -m "feat(parser): add block-level list parsing and the Paragraph type

Pure functions only; nothing sets TextBox.paragraphs yet so output is unchanged."
```

---

### Task 5: 箇条書きをレイアウトエンジンに結線する

**Files:**
- Modify: `assets/src/renderer/layout/helpers.ts`（インポート、`:258-260`、`:302-311`）
- Modify: `assets/src/plugins/text-only/layout.ts`（インポート、`:47-56`）
- Modify: `assets/__tests__/layout-engine.test.ts`

**Interfaces:**
- Consumes: Task 4 の `hasListMarker` / `parseBlockToParagraphs` / `stripListMarkers` / `BULLET_INDENT`
- Produces: `buildSectionBoxes` と `layoutTextOnly` が、リストを含む body に対して `paragraphs` を持つ TextBox を返す。Task 6 のレンダラがこれを消費する。

- [ ] **Step 1: 失敗するテストを書く**

`assets/__tests__/layout-engine.test.ts` の `describe("layoutDefault", ...)` ブロック内の末尾に追加する。

```typescript
    it("should emit paragraphs with bullets for a list body", () => {
      const sections = [new TextBlock({ heading: "H", body: "- first\n- second" })]
      const result = layoutDefault(sections, 1.0, DEFAULT_THEME)

      const bodyBox = result.textBoxes.find(box => box.paragraphs !== undefined)
      expect(bodyBox).toBeDefined()
      expect(bodyBox!.richText).toBeUndefined()
      expect(bodyBox!.paragraphs).toHaveLength(2)
      expect(bodyBox!.paragraphs![0].bullet).toEqual({ type: "bullet" })
      expect(bodyBox!.paragraphs![0].runs.map(r => r.text).join("")).toBe("first")
    })

    it("should keep non-list bodies on the richText path", () => {
      const sections = [new TextBlock({ heading: "H", body: "plain body" })]
      const result = layoutDefault(sections, 1.0, DEFAULT_THEME)

      const bodyBox = result.textBoxes.find(box => box.richText !== undefined && !box.isBold)
      expect(bodyBox).toBeDefined()
      expect(bodyBox!.paragraphs).toBeUndefined()
    })
```

同ファイルの最も外側の `describe` を閉じる直前に、TextOnly の describe ブロックを追加する。

```typescript
  describe("layoutTextOnly", () => {
    it("should emit paragraphs with bullets for a list body", () => {
      const result = layoutTextOnly("- alpha\n- beta", undefined, 1.0, DEFAULT_THEME)

      const box = result.textBoxes.find(b => b.paragraphs !== undefined)
      expect(box).toBeDefined()
      expect(box!.text).toBeUndefined()
      expect(box!.paragraphs).toHaveLength(2)
      expect(box!.paragraphs![1].runs.map(r => r.text).join("")).toBe("beta")
    })

    it("should keep non-list bodies on the plain text path", () => {
      const result = layoutTextOnly("plain prose", undefined, 1.0, DEFAULT_THEME)

      const box = result.textBoxes[0]
      expect(box.text).toBe("plain prose")
      expect(box.paragraphs).toBeUndefined()
    })
  })
```

同ファイルのインポート群に追加する（`layoutTextOnly` は `renderer/layout/index.js` から re-export されていないため直接インポートする）。

```typescript
import { layoutTextOnly } from "../src/plugins/text-only/layout.js"
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `cd assets && npx vitest run __tests__/layout-engine.test.ts -t "paragraphs with bullets"`
Expected: FAIL — `expected undefined not to be undefined`（`paragraphs` を持つボックスが存在しない）

- [ ] **Step 3: `helpers.ts` のインポートを追加する**

`assets/src/renderer/layout/helpers.ts` の先頭のインポート群に追加する。`BULLET_INDENT` は既存の `import { ... } from "../../constants.js"` に追記してもよい。

```typescript
import { hasListMarker, parseBlockToParagraphs, stripListMarkers } from "../../parser/block-formatter.js"
import { BULLET_INDENT } from "../../constants.js"
```

- [ ] **Step 4: body の TextBox 生成をリスト対応にする**

`assets/src/renderer/layout/helpers.ts:302-311` を置き換える。

変更前:
```typescript
      boxes.push({
        x: context.baseX + context.padding + context.theme.indent.body,
        y: currentY,
        w: context.contentWidth - 2 * context.padding - context.theme.indent.body,
        h: bodyH,
        richText: parseInlineFormatting(section.body),
        fontSize: context.theme.contentSlide.bodySize,
        color: context.theme.contentSlide.textColor,
        valign: "top",
      })
```

変更後:
```typescript
      boxes.push({
        x: context.baseX + context.padding + context.theme.indent.body,
        y: currentY,
        w: context.contentWidth - 2 * context.padding - context.theme.indent.body,
        h: bodyH,
        ...(hasListMarker(section.body)
          ? { paragraphs: parseBlockToParagraphs(section.body) }
          : { richText: parseInlineFormatting(section.body) }),
        fontSize: context.theme.contentSlide.bodySize,
        color: context.theme.contentSlide.textColor,
        valign: "top",
      })
```

- [ ] **Step 5: 高さ見積もりでバレットのインデントを考慮する**

`assets/src/renderer/layout/helpers.ts:258-260` を置き換える。

変更前:
```typescript
    const naturalBodyHeights: number[] = sections.map(section =>
      section.body ? estimateTextHeight(section.body, bodyFontSize, textWidth) : 0
    )
```

変更後:
```typescript
    const naturalBodyHeights: number[] = sections.map(section => {
      if (!section.body) return 0
      // 箇条書きはぶら下げインデントのぶん実効幅が狭く、折返しが増える
      if (hasListMarker(section.body)) {
        return estimateTextHeight(
          stripListMarkers(section.body),
          bodyFontSize,
          textWidth - BULLET_INDENT
        )
      }
      return estimateTextHeight(section.body, bodyFontSize, textWidth)
    })
```

- [ ] **Step 6: TextOnly レイアウトを対応させる**

`assets/src/plugins/text-only/layout.ts:47-56` を置き換える。

変更前:
```typescript
  const textBoxes: TextBox[] = [{
    x: MARGIN_X + ACCENT_BAR_WIDTH + PADDING,
    y: titleY + PADDING,
    w: contentWidth - ACCENT_BAR_WIDTH - 2 * PADDING,
    h: availableHeight - 2 * PADDING,
    text: body,
    fontSize,
    color: theme.contentSlide.textColor,
    valign: "top",
  }]
```

変更後:
```typescript
  const textBoxes: TextBox[] = [{
    x: MARGIN_X + ACCENT_BAR_WIDTH + PADDING,
    y: titleY + PADDING,
    w: contentWidth - ACCENT_BAR_WIDTH - 2 * PADDING,
    h: availableHeight - 2 * PADDING,
    ...(hasListMarker(body)
      ? { paragraphs: parseBlockToParagraphs(body) }
      : { text: body }),
    fontSize,
    color: theme.contentSlide.textColor,
    valign: "top",
  }]
```

同ファイルのインポートに追加する。

```typescript
import { hasListMarker, parseBlockToParagraphs } from "../../parser/block-formatter.js"
```

- [ ] **Step 7: テストが通ることを確認する**

Run: `cd assets && npx vitest run __tests__/layout-engine.test.ts`
Expected: PASS。新規4件が緑。

- [ ] **Step 8: 既存スナップショットが変わっていないことを確認する**

Run: `cd assets && git diff --stat __tests__/__snapshots__/layout-engine.test.ts.snap`
Expected: 差分なし。既存のテストデータにはリストが含まれないため richText パスを通り、座標も高さも変わらない。差分が出た場合は Step 4/5 の条件分岐が非リスト body にも影響しているので見直す。

- [ ] **Step 9: 全テストを実行する**

Run: `cd assets && npm test`
Expected: 全緑。この時点でレンダラはまだ `paragraphs` を知らないため、**リストを含むスライドはテキストが描画されない**。Task 6 で結線するまでの一時的な状態であることを認識しておく（`markdown-spec/` の既存ゴールデンにリストを含むファイルがあるため e2e が落ちる場合は、Task 6 まで進めて再確認する。落ちた場合は Task 5 と Task 6 を1コミットにまとめてよい）。

- [ ] **Step 10: コミット**

```bash
git add assets/src/renderer/layout/helpers.ts assets/src/plugins/text-only/layout.ts assets/__tests__/layout-engine.test.ts
git commit -m "feat(layout): route list bodies to TextBox.paragraphs

Applies to buildSectionBoxes (Default/LeftRight/TopBottom/Grid/LeanCanvas) and
TextOnly. Non-list bodies keep the richText path, so existing snapshots are
byte-identical. Renderers are wired up in the next commit."
```

---

### Task 6: PPTX と HTML に箇条書きを描画する

**Files:**
- Modify: `assets/src/renderer/pptx/slide-builder.ts`（インポート、`:212-228`）
- Modify: `assets/src/renderer/html/element-renderers.ts:40-98`
- Modify: `assets/src/renderer/html/template.ts`
- Modify: `assets/src/tools/inventory.ts`（`boxToParagraphTexts`）
- Modify: `assets/src/schema/validation.ts:8-17`
- Modify: `assets/__tests__/e2e.test.ts:21-69`
- Modify: `assets/__tests__/snapshot-comparison.test.ts`

**Interfaces:**
- Consumes: Task 5 が生成する `TextBox.paragraphs`、Task 2 の `inlineTextRunsToPptxRuns(runs, fontSize, color, fontFace, bold, italic)`、Task 3 の `boxToParagraphTexts`
- Produces: リストを含むスライドが PPTX / HTML 両方に描画され、3者比較が一致する

**HTML の設計:** バレット記号は CSS の `::before` で出す。理由は2つ。(1) CSS 生成コンテンツは DOM のテキストに含まれないため、PPTX のネイティブバレット（記号が `<a:t>` に入らない）と抽出結果が自動的に一致する。(2) `<ul>/<li>` は `element-renderers.ts:60` の `display: flex` で潰れる。段落は `<p>` 要素で出す — `html-inspector.ts:151` の段落正規表現がすでに `<p>` を拾うので、PPTX 側の `<a:p>` 個数と自然に対応する。

- [ ] **Step 1: 失敗する3者比較テストを書く**

`assets/__tests__/snapshot-comparison.test.ts` の `testCases` に追加する。

```typescript
  "bullet-list": `# Title Slide
Subtitle
---
## Bullet List
### Items
- first item
- second item with **bold**`,
```

同ファイルの `describe("inline-formatting", ...)` の直後に追加する。

```typescript
  describe("bullet-list", () => {
    const markdown = testCases["bullet-list"]

    it("should match: reference vs PPTX", async () => {
      const ast = await Effect.runPromise(parseMarkdown(markdown))
      const presentation = await Effect.runPromise(validatePresentation(ast))
      const referenceInventory = await Effect.runPromise(
        slidesToInventory(presentation.slides, DEFAULT_THEME)
      )
      const pptxBuffer = await Effect.runPromise(md2pptx(markdown))
      const pptxInventory = await Effect.runPromise(inspectPptx(pptxBuffer))

      const diff = diffInventory(referenceInventory, pptxInventory)
      expect(diff.mismatches).toEqual([])
    })

    it("should match: reference vs HTML", async () => {
      const ast = await Effect.runPromise(parseMarkdown(markdown))
      const presentation = await Effect.runPromise(validatePresentation(ast))
      const referenceInventory = await Effect.runPromise(
        slidesToInventory(presentation.slides, DEFAULT_THEME)
      )
      const html = await Effect.runPromise(md2html(markdown))
      const htmlInventory = await Effect.runPromise(extractInventoryFromHtml(html))

      const diff = diffInventory(referenceInventory, htmlInventory)
      expect(diff.mismatches).toEqual([])
    })

    it("should match: PPTX vs HTML", async () => {
      const pptxBuffer = await Effect.runPromise(md2pptx(markdown))
      const pptxInventory = await Effect.runPromise(inspectPptx(pptxBuffer))
      const html = await Effect.runPromise(md2html(markdown))
      const htmlInventory = await Effect.runPromise(extractInventoryFromHtml(html))

      const diff = diffInventory(pptxInventory, htmlInventory)
      expect(diff.mismatches).toEqual([])
    })

    it("should not embed a literal bullet glyph in either output", async () => {
      const html = await Effect.runPromise(md2html(markdown))
      expect(html).not.toContain("• first item")

      const pptxBuffer = await Effect.runPromise(md2pptx(markdown))
      const zip = await JSZip.loadAsync(pptxBuffer)
      const slideXml = await zip.files["ppt/slides/slide2.xml"].async("string")
      expect(slideXml).not.toContain("<a:t>• first item</a:t>")
      // ネイティブバレットが入っていること
      expect(slideXml).toMatch(/<a:buChar|<a:buAutoNum/)
    })
  })
```

同ファイルのインポートに追加する。

```typescript
import JSZip from "jszip"
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `cd assets && npx vitest run __tests__/snapshot-comparison.test.ts -t "bullet-list"`
Expected: FAIL — 参照側は `paragraphs` を平坦化していないため text が空、PPTX/HTML 側は描画分岐がないためテキストが存在しない。

- [ ] **Step 3: 参照インベントリを `paragraphs` 対応にする**

`assets/src/tools/inventory.ts` の `boxToParagraphTexts`（Task 3 で作成）に分岐を1本追加する。

変更前:
```typescript
export function boxToParagraphTexts(box: TextBox): string[] {
  if (box.richText) return [box.richText.map((run) => run.text).join("").trim()]
  return [(box.text ?? "").trim()]
}
```

変更後:
```typescript
export function boxToParagraphTexts(box: TextBox): string[] {
  if (box.paragraphs) {
    return box.paragraphs.map((para) => para.runs.map((run) => run.text).join("").trim())
  }
  if (box.richText) return [box.richText.map((run) => run.text).join("").trim()]
  return [(box.text ?? "").trim()]
}
```

- [ ] **Step 4: PPTX に描画分岐を追加する**

`assets/src/renderer/pptx/slide-builder.ts:212-229` を置き換える。

変更前:
```typescript
      // richText がある場合は TextRun[] で描画
      if (box.richText) {
        const pptxRuns = inlineTextRunsToPptxRuns(
          box.richText,
          box.fontSize || 14,
          box.color || "000000",
          box.fontFace || theme.fonts.body,
          box.isBold || false,
          box.isItalic || false
        )
        pptxSlide.addText(pptxRuns, {
          x: box.x,
          y: box.y,
          w: box.w,
          h: box.h,
          align,
          valign,
          ...(box.lineHeight ? { lineSpacing: box.lineHeight * (box.fontSize || 14) } : {}),
        })
      } else {
```

変更後:
```typescript
      // paragraphs がある場合は段落ごとに bullet/breakLine を付けて描画
      if (box.paragraphs) {
        const paras = box.paragraphs
        const pptxRuns = paras.flatMap((para, paraIndex) => {
          const runs = inlineTextRunsToPptxRuns(
            para.runs,
            box.fontSize || 14,
            box.color || "000000",
            box.fontFace || theme.fonts.body,
            box.isBold || false,
            box.isItalic || false
          )
          const isLastPara = paraIndex === paras.length - 1
          return runs.map((run, runIndex) => ({
            text: run.text,
            options: {
              ...run.options,
              // bullet は段落プロパティ。同一段落の全 run に付けて取りこぼしを防ぐ
              ...(para.bullet ? { bullet: para.bullet } : {}),
              // 最終 run に breakLine を立てると次の段落が始まる
              ...(runIndex === runs.length - 1 && !isLastPara ? { breakLine: true } : {}),
            },
          }))
        })
        pptxSlide.addText(pptxRuns, {
          x: box.x,
          y: box.y,
          w: box.w,
          h: box.h,
          align,
          valign,
          paraSpaceAfter: PARA_SPACE_AFTER,
          ...(box.lineHeight ? { lineSpacing: box.lineHeight * (box.fontSize || 14) } : {}),
        })
      } else if (box.richText) {
        const pptxRuns = inlineTextRunsToPptxRuns(
          box.richText,
          box.fontSize || 14,
          box.color || "000000",
          box.fontFace || theme.fonts.body,
          box.isBold || false,
          box.isItalic || false
        )
        pptxSlide.addText(pptxRuns, {
          x: box.x,
          y: box.y,
          w: box.w,
          h: box.h,
          align,
          valign,
          ...(box.lineHeight ? { lineSpacing: box.lineHeight * (box.fontSize || 14) } : {}),
        })
      } else {
```

同ファイルのインポートに `PARA_SPACE_AFTER` を追加する。

```typescript
import { PARA_SPACE_AFTER } from "../../constants.js"
```

- [ ] **Step 5: PPTX の XML を実測して bullet 指定が正しいか確認する**

Run:
```bash
cd assets && cat > probe-bullet.ts <<'PROBE'
import { Effect } from "effect"
import JSZip from "jszip"
import { md2pptx } from "./src/pipeline.js"

const md = `# T
---
## Lists
### Unordered
- alpha
- beta
### Ordered
3. three
4. four`

async function main() {
  const zip = await JSZip.loadAsync(await Effect.runPromise(md2pptx(md)))
  const xml = await zip.files["ppt/slides/slide2.xml"].async("string")
  for (const m of xml.matchAll(/<a:pPr[^>]*\/>|<a:pPr[^>]*>[\s\S]*?<\/a:pPr>/g)) console.log(m[0])
  console.log("--- texts ---")
  for (const m of xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)) console.log(JSON.stringify(m[1]))
}
main()
PROBE
npx tsx probe-bullet.ts; rm -f probe-bullet.ts
```

Expected: 検証すべき3点。
1. 順不同リストの段落に `<a:buChar char="•"/>`（または同等の `buChar`）が出ている
2. 番号付きリストの段落に `<a:buAutoNum type="arabicPeriod" startAt="3"/>` が出ており、`startAt` が 3 になっている
3. `--- texts ---` の出力に `"alpha"` `"beta"` `"three"` `"four"` が含まれ、記号（`-` や `•` や `3.`）が**含まれていない**

`startAt` が反映されていない、または各項目が "1." にリセットされている場合は、`bullet` を段落の先頭 run のみに付ける形（`runIndex === 0 && para.bullet`）に変えて再測定する。それでも駄目なら `startAt` の指定を諦め、`Paragraph.bullet` から `startAt` を落として「番号は常に 1 から」と Task 10 のドキュメントに明記する。**推測で進めず、必ずこの probe の出力で判断する。**

- [ ] **Step 6: HTML のスタイルシートにバレット用 CSS を追加する**

`assets/src/renderer/html/template.ts` の `<style>` ブロック内（17行目が `<style>`、111行目が `</style>`。既存の `.text-box` ルールは 59/64行目）の、`</style>` の直前に追加する。

```css
    .para-stack { width: 100%; counter-reset: para-num; }
    .para-stack > p { margin: 0; }
    .para-bullet, .para-number { padding-left: 0.25in; text-indent: -0.25in; }
    .para-bullet::before { content: "\2022  "; }
    .para-number { counter-increment: para-num; }
    .para-number::before { content: counter(para-num) ". "; }
```

`content` に CSS のエスケープ（`\2022`）を使うのは、テンプレートリテラル内でリテラルの `•` を書かないため。CSS 生成コンテンツは DOM テキストに含まれないので、抽出器には現れない。

- [ ] **Step 7: HTML に描画分岐を追加する**

`assets/src/renderer/html/element-renderers.ts:40-98` の `textBoxToHtml` を変更する。`const dataAttrs = [...]` の定義（71-84行）の後、`// richText がある場合は HTML タグでレンダリング` のコメント（86行）の直前に、段落分岐を挿入する。

```typescript
  // paragraphs がある場合は段落ごとに <p> を出す。
  // バレット記号は CSS の ::before で描画するため DOM テキストには含まれない
  // （PPTX のネイティブバレットと抽出結果を一致させるため）。
  if (box.paragraphs) {
    const first = box.paragraphs.find(p => p.bullet?.type === "number")
    const startAt = first?.bullet?.type === "number" ? first.bullet.startAt : undefined
    const stackStyle = startAt !== undefined ? ` style="counter-reset: para-num ${startAt - 1}"` : ""

    // 段落には html-inspector の parseParagraphStyle が読む属性だけを付ける。
    // data-shape-id / data-inches-* を付けてはならない（後述の理由）。
    const paraDataAttrs = [
      box.fontSize ? `data-font-size="${box.fontSize}"` : "",
      box.color ? `data-color="${box.color}"` : "",
      box.isBold ? `data-bold="true"` : "",
      isTitleSlide || box.align === "center" ? `data-alignment="CENTER"` : "",
    ]
      .filter(Boolean)
      .join(" ")

    const items = box.paragraphs
      .map(para => {
        const cls = !para.bullet
          ? "para-plain"
          : para.bullet.type === "bullet"
            ? "para-bullet"
            : "para-number"
        return `<p class="${cls}" ${paraDataAttrs}>${richTextToHtml(para.runs)}</p>`
      })
      .join("")

    // display: flex の子は1つに保つ。段落は stack 側で縦に積む
    const listStyle = style.replace("white-space: pre-wrap", "white-space: normal")
    return `<div class="text-box" style="${listStyle}" ${dataAttrs}><div class="para-stack"${stackStyle}>${items}</div></div>`
  }

```

`white-space: pre-wrap` を `normal` に落とすのは、段落が個別の `<p>` 要素になったため改行を保持する必要がなく、また `<p>` 間の余白が可視化されるのを防ぐため。

**`<p>` に `dataAttrs` をそのまま流用してはならない（実測で確認済み）。** `dataAttrs`（`element-renderers.ts:71-84`）には `data-shape-id` と `data-inches-*` が含まれる。`html-inspector.ts:220-239` の `extractElements` は `regex.exec` のループで走査し、マッチ後の再開位置が**開始タグの直後**（閉じタグの後ではない）なので、外側の `<div data-shape-id="shape-2">` に加えて内側の `<p data-shape-id="shape-2">` も全部マッチする。

実測（`<div data-shape-id="shape-2">` に同属性の `<p>` を2個入れた場合）:

```
match 1: index=0  tag=<div data-shape-id="shape-2" ...
match 2: index=47 tag=<p data-shape-id="shape-2" ...
match 3: index=97 tag=<p data-shape-id="shape-2" ...
総マッチ数: 3
```

`shapeData[shape.id] = parsed.value`（`html-inspector.ts:272`）は同じ id で上書きされ、かつ `<p>` が `data-inches-*` を持つと `parseShape` が `O.none()` を返さず成功してしまう。結果、最後の `<p>` が勝ってシェイプの段落数が N ではなく 1 になり、`diffInventory` が `paragraphs.length` の不一致を報告する — `breakLine` の付け方を疑って無駄な調査に入りやすい罠。

`data-shape-id` を `<p>` に付けなければ `extractElements` は外側の div のみを拾い、`parseShape` の `paragraphRegex`（`:151`）が `<p>` の一覧を正しく段落として拾う。これがこの設計が依拠しているメカニズムである。

なお、現状 `data-shape-id` を持つ要素が入れ子になるケースは存在しないため、この `extractElements` のループは一度も踏まれていない。この変更が最初の利用者になる。

- [ ] **Step 8: 文字数カウントからリストマーカーを除外する**

`assets/src/schema/validation.ts:8-17` を置き換える。

変更前:
```typescript
function countPlainTextChars(text: string): number {
  return text
    .replace(/^#+\s+/gm, "") // # ## ###
    .replace(/<!--.*?-->/gs, "") // HTML comments
    .replace(/`(.+?)`/g, '$1')        // `code` → code
    .replace(/\*\*(.+?)\*\*/g, '$1')  // **bold** → bold
    .replace(/\*(.+?)\*/g, '$1')      // *italic* → italic
    .replace(/^\s*$/gm, "") // 空行
    .trim().length
}
```

変更後:
```typescript
function countPlainTextChars(text: string): number {
  return text
    .replace(/^#+\s+/gm, "") // # ## ###
    .replace(/^\s*[-*+]\s+/gm, "")    // - item / * item / + item
    .replace(/^\s*\d+\.\s+/gm, "")    // 1. item
    .replace(/<!--.*?-->/gs, "") // HTML comments
    .replace(/`(.+?)`/g, '$1')        // `code` → code
    .replace(/\*\*(.+?)\*\*/g, '$1')  // **bold** → bold
    .replace(/\*(.+?)\*/g, '$1')      // *italic* → italic
    .replace(/^\s*$/gm, "") // 空行
    .trim().length
}
```

リストマーカーの除去を `*italic*` の除去より**前**に置くのは、行頭 `* item` が斜体パターンに食われるのを防ぐため。

- [ ] **Step 9: 文字数カウントのテストを追加する**

`assets/__tests__/validation.test.ts` の `describe("validatePresentation", ...)` 内に追加する。既存テストと同じスタイル（`Presentation` を組み立てて `validatePresentation` を直接呼ぶ）に合わせる。

マーカーを数えるかどうかで合否が変わる境界を突くことで、「除外されている」ことを実証する。

```typescript
  it("does not count list markers toward the character limit", async () => {
    // 199行 × "- aaaa"（6文字）+ 改行198個 = 1392文字。
    // マーカー "- " を199回除去すると 1392 - 398 = 994 文字。
    // タイトル1文字を足して 995 <= 1000 なので通る。
    // マーカーを数えると 1393 > 1000 で落ちる。
    const body = Array.from({ length: 199 }, () => "- aaaa").join("\n")
    const pres = new Presentation({
      slides: [
        new ContentSlide({
          title: "T",
          layout: new DefaultLayout({ sections: [new TextBlock({ body })] }),
        }),
      ],
    })

    const result = await Effect.runPromiseExit(validatePresentation(pres))
    expect(Exit.isSuccess(result)).toBe(true)
  })
```

`TextBlock` の `heading` を省略できることは `assets/src/schema/presentation.ts:2-9` で確認済み（両方 optional）。

- [ ] **Step 10: e2e のテキスト抽出ヘルパーを一般化する**

`assets/__tests__/e2e.test.ts:57-65` を置き換える。既存の customer-journey 専用の特例を、全リストマーカーを扱う汎用処理に置き換える。

変更前:
```typescript
    // Extract body text (non-heading lines with content)
    else if (trimmed.length > 0) {
      // In customer-journey mode, parser strips "- " and layout adds "• " prefix
      if (inCustomerJourney && trimmed.startsWith("- ")) {
        texts.push(`• ${trimmed.slice(2)}`)
      } else {
        texts.push(trimmed)
      }
    }
```

変更後:
```typescript
    // Extract body text (non-heading lines with content)
    else if (trimmed.length > 0) {
      // List markers never survive into the output: customer-journey strips "- " and
      // re-adds a literal "• " in its layout, while every other layout renders native
      // PPTX bullets / CSS glyphs, neither of which appears in the extracted text.
      const listMatch = trimmed.match(/^(?:[-*+]|\d+\.)\s+(.*)$/)
      if (listMatch) {
        texts.push(inCustomerJourney ? `• ${listMatch[1]}` : listMatch[1])
      } else {
        texts.push(trimmed)
      }
    }
```

- [ ] **Step 11: 3者比較テストが通ることを確認する**

Run: `cd assets && npx vitest run __tests__/snapshot-comparison.test.ts`
Expected: PASS（19件）。落ちた場合はミスマッチの `property` を読む。`paragraphs.length` の不一致なら PPTX の段落数と参照/HTML の段落数がずれている（`breakLine` の付け方を Step 4 で見直す）。`.text` の不一致なら trim/連結規約のずれ。

- [ ] **Step 12: e2e が通ることを確認する**

Run: `cd assets && npx vitest run __tests__/e2e.test.ts`
Expected: PASS。`08-lean-canvas.md`（リスト26行）と `09-takeaway-layouts.md`（同9行）が Step 10 の変更で通るようになる。落ちたファイル名とアサート内容を読み、そのレイアウトが `buildSectionBoxes` を通らないプラグインである場合は、そのプラグインが `- ` をどう扱っているかを確認して個別に判断する。

- [ ] **Step 13: 全テストを実行する**

Run: `cd assets && npm test`
Expected: 全緑。

- [ ] **Step 14: HTML を目で確認する**

Run:
```bash
cd assets && cat > /tmp/bullet-demo.md <<'MD'
# 箇条書きデモ
サブタイトル

---

## 順不同リスト
### 項目
- 一つめ
- **強調**を含む二つめ
- 三つめ

---

## 番号付きリスト
### 手順
1. 最初にこれ
2. 次にこれ
3. 最後にこれ

---

## TextOnly
<!--text-only-->
- 自由形式でも箇条書きが効く
- 二行目
MD
npx tsx src/cli.ts /tmp/bullet-demo.md /tmp/bullet-demo.html --html && open /tmp/bullet-demo.html
npx tsx src/cli.ts /tmp/bullet-demo.md /tmp/bullet-demo.pptx && open /tmp/bullet-demo.pptx
```

Expected: HTML と PowerPoint の両方で、(1) バレット記号が1個だけ表示される（二重表示していない）、(2) ハイフンや `1.` がテキストとして残っていない、(3) 番号付きリストが 1,2,3 と振られている、(4) 折返しがぶら下げインデントになっている。

- [ ] **Step 15: コミット**

```bash
git add assets/src/renderer/pptx/slide-builder.ts assets/src/renderer/html/element-renderers.ts assets/src/renderer/html/template.ts assets/src/tools/inventory.ts assets/src/schema/validation.ts assets/__tests__/
git commit -m "feat(render): draw bullet lists in PPTX and HTML

PPTX uses native pptxgenjs bullets with breakLine per paragraph; HTML emits one
<p> per paragraph and draws the glyph via CSS ::before, so neither output carries
a literal bullet character and all three inventory extractors agree.

Validation no longer counts list markers toward the per-slide character limit,
and the e2e text extractor handles list markers generically instead of only in
customer-journey mode."
```

---

## Phase 2 — B-08: オーバーフローの検出と縮小

**スコープの明示（できることとできないこと）:**

- **段階縮小**が効くのはテーマからフォントサイズを読むレイアウトのみ: Default / LeftRight / TopBottom / Grid / LeanCanvas。`steps` / `pattern-language` / `table` / `agenda` / `icon-layout` は自前の定数を使うため縮小は効かない。
- **検出と失敗**は全レイアウトに効く。縮小が効かないプラグインは「黙ってはみ出す」代わりに「明確に失敗する」。これで B-08 の受け入れ基準「はみ出したまま成功終了するケースがない」は満たされる。

この分割を Task 10 でドキュメントに明記する。

### Task 7: テキスト高さ見積もりを文字幅対応にする

**Files:**
- Modify: `assets/src/renderer/layout/helpers.ts:182-207`, `:258-269`
- Modify: `assets/__tests__/layout-engine.test.ts`
- Modify: `assets/__tests__/__snapshots__/layout-engine.test.ts.snap`

**Interfaces:**
- Consumes: Task 5 の `stripListMarkers`
- Produces: `estimateTextHeight(text, fontSize, containerWidth)` — シグネチャは不変だが、半角文字を全角の 0.5 倍幅として数えるようになる。Task 8 の `detectOverflow` がこの精度に依存する。

**なぜ先にやるか:** 現在の `estimateTextHeight` は全文字を全角相当（`fontSize/72` インチ ≈ 1em）として数えており、ASCII 主体のテキストで約2倍の過大評価になる。この見積もりの上に `ValidationError` を載せると、正しい英語スライドが失敗する。検出より先に精度を上げる。

- [ ] **Step 1: 失敗するテストを書く**

`assets/__tests__/layout-engine.test.ts` の最も外側の `describe` 内に追加する。

```typescript
  describe("estimateTextHeight", () => {
    it("counts half-width characters as half the width of full-width ones", () => {
      const ascii = estimateTextHeight("a".repeat(40), 16, 2.0)
      const cjk = estimateTextHeight("あ".repeat(40), 16, 2.0)
      expect(ascii).toBeLessThan(cjk)
    })

    it("wraps ASCII at roughly twice the characters per line as CJK", () => {
      // 幅 2.0in、16pt → 全角幅 16/72in ≈ 0.222in → 全角は約9文字/行、半角は約18文字/行
      const oneLineAscii = estimateTextHeight("a".repeat(18), 16, 2.0)
      const oneLineCjk = estimateTextHeight("あ".repeat(9), 16, 2.0)
      expect(oneLineAscii).toBeCloseTo(oneLineCjk, 5)
    })

    it("still counts explicit newlines as separate lines", () => {
      const one = estimateTextHeight("a", 16, 2.0)
      const three = estimateTextHeight("a\na\na", 16, 2.0)
      expect(three).toBeGreaterThan(one * 2)
    })

    it("never returns less than the minimum box height", () => {
      expect(estimateTextHeight("", 16, 2.0)).toBe(0.25)
    })
  })
```

`estimateTextHeight` がテストファイルにインポートされていない場合は、既存の import 群に追加する（`renderer/layout/index.js` から re-export されている）。

- [ ] **Step 2: テストが失敗することを確認する**

Run: `cd assets && npx vitest run __tests__/layout-engine.test.ts -t "estimateTextHeight"`
Expected: FAIL — 現在は全文字が同じ幅なので `ascii` と `cjk` が等しくなる。

- [ ] **Step 3: 文字幅を考慮した見積もりに置き換える**

`assets/src/renderer/layout/helpers.ts:182-207` を置き換える。

変更前:
```typescript
/**
 * Estimate text height based on content length and container width.
 *
 * Algorithm:
 * 1. Approximate character width as fontSize/72 inches (works for CJK and Latin).
 * 2. Line height = fontSize/72 * 1.5 (standard 150% line spacing).
 * 3. For each explicit newline, calculate how many visual lines it wraps to
 *    given the container width.
 * 4. Sum all visual lines, convert to inches, add 0.05" padding.
 * 5. Clamp minimum to 0.25" to prevent zero-height boxes.
 */
export function estimateTextHeight(
  text: string,
  fontSize: number,
  containerWidth: number
): number {
  const charWidth = fontSize / 72        // approximate char width (CJK-safe)
  const lineHeight = fontSize / 72 * 1.5 // line height in inches
  const lines = text.split('\n')
  let totalLines = 0
  for (const line of lines) {
    const lineWidth = line.length * charWidth
    totalLines += Math.max(1, Math.ceil(lineWidth / containerWidth))
  }
  return Math.max(0.25, totalLines * lineHeight + 0.05)
}
```

変更後:
```typescript
// 全角として数える文字の範囲（CJK 統合漢字・かな・全角記号・全角英数）
const FULL_WIDTH = /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦]/

/**
 * 1行の視覚的な幅を「全角文字何個ぶんか」で返す。
 * 半角は 0.5、全角は 1。
 */
function visualWidthInEm(line: string): number {
  let width = 0
  for (const char of line) {
    width += FULL_WIDTH.test(char) ? 1 : 0.5
  }
  return width
}

/**
 * Estimate text height based on content length and container width.
 *
 * Algorithm:
 * 1. Measure each line in "em" units: full-width chars count 1, half-width 0.5.
 *    Counting ASCII as full-width over-estimates Latin text by about 2x, which
 *    would make the overflow check reject correct slides.
 * 2. Em width = fontSize/72 inches. Line height = em width * 1.5 (150% spacing).
 * 3. For each explicit newline, calculate how many visual lines it wraps to
 *    given the container width.
 * 4. Sum all visual lines, convert to inches, add 0.05" padding.
 * 5. Clamp minimum to 0.25" to prevent zero-height boxes.
 */
export function estimateTextHeight(
  text: string,
  fontSize: number,
  containerWidth: number
): number {
  const emWidth = fontSize / 72
  const lineHeight = emWidth * 1.5
  const lines = text.split('\n')
  let totalLines = 0
  for (const line of lines) {
    const lineWidth = visualWidthInEm(line) * emWidth
    totalLines += Math.max(1, Math.ceil(lineWidth / containerWidth))
  }
  return Math.max(0.25, totalLines * lineHeight + 0.05)
}
```

- [ ] **Step 4: 見積もりが実描画されないマークアップを数えないようにする**

`assets/src/renderer/layout/helpers.ts:258-269`（Task 5 で書き換えた `naturalBodyHeights`）を置き換える。

変更前:
```typescript
    const naturalBodyHeights: number[] = sections.map(section => {
      if (!section.body) return 0
      // 箇条書きはぶら下げインデントのぶん実効幅が狭く、折返しが増える
      if (hasListMarker(section.body)) {
        return estimateTextHeight(
          stripListMarkers(section.body),
          bodyFontSize,
          textWidth - BULLET_INDENT
        )
      }
      return estimateTextHeight(section.body, bodyFontSize, textWidth)
    })
```

変更後:
```typescript
    const naturalBodyHeights: number[] = sections.map(section => {
      if (!section.body) return 0
      // 実際に描画されるのは parseInlineFormatting 後のテキストなので、
      // 見積もりでも `**` や `` ` `` を除いた長さで数える
      if (hasListMarker(section.body)) {
        // 箇条書きはぶら下げインデントのぶん実効幅が狭く、折返しが増える
        return estimateTextHeight(
          stripInlineFormatting(stripListMarkers(section.body)),
          bodyFontSize,
          textWidth - BULLET_INDENT
        )
      }
      return estimateTextHeight(
        stripInlineFormatting(section.body),
        bodyFontSize,
        textWidth
      )
    })
```

同ファイルのインポートに追加する（`parseInlineFormatting` と同じモジュールから）。

```typescript
import { parseInlineFormatting, stripInlineFormatting } from "../../parser/inline-formatter.js"
```

- [ ] **Step 5: テストが通ることを確認する**

Run: `cd assets && npx vitest run __tests__/layout-engine.test.ts -t "estimateTextHeight"`
Expected: PASS（4件）

- [ ] **Step 6: スナップショットの差分を確認してから更新する**

Run: `cd assets && npx vitest run __tests__/layout-engine.test.ts`
Expected: FAIL — 動的な body 高さが変わるため複数のスナップショットが不一致になる。**これは意図した改善であり回帰ではない。** 失敗したスナップショット名を一覧で控える。

Run: `cd assets && npx vitest run -u`
Expected: PASS

Run: `cd assets && git diff __tests__/__snapshots__/layout-engine.test.ts.snap`
Expected: 変わっているのは body ボックスの `h`（と、それに連なる後続ボックスの `y`）だけであること。ASCII のテストデータでは `h` が**小さく**なる（過大評価が解消された）。`w` / `x` / `fontSize` / `color` は変わっていないこと。変わっていたら Step 3 の実装を見直す。

- [ ] **Step 7: 全テストを実行する**

Run: `cd assets && npm test`
Expected: 全緑。3者比較は座標を比較するため、レイアウト側が変わっても PPTX/HTML 双方が同じ `LayoutResult` を消費するので一致は保たれる。

- [ ] **Step 8: コミット**

```bash
git add assets/src/renderer/layout/helpers.ts assets/__tests__/layout-engine.test.ts assets/__tests__/__snapshots__/layout-engine.test.ts.snap
git commit -m "fix(layout): make estimateTextHeight width-aware

Counting every character as full-width over-estimated Latin text by ~2x. The
estimator now weighs half-width characters at 0.5em, and callers strip inline
markup that is never rendered. Dynamic body heights shift accordingly; snapshots
updated deliberately.

Prerequisite for gating a hard overflow error on this estimate."
```

---

### Task 8: オーバーフロー検出と段階的フォント縮小

**Files:**
- Create: `assets/src/renderer/layout/overflow.ts`
- Create: `assets/__tests__/overflow.test.ts`
- Modify: `assets/src/renderer/layout/index.ts:140-153`

**Interfaces:**
- Consumes: Task 7 の `estimateTextHeight`、Task 4 の `Paragraph` 型
- Produces:
  - `detectOverflow(result: LayoutResult): Overflow[]`
  - `Overflow` 型: `{ kind: "outOfBounds" | "textTooTall"; box: TextBox; needed?: number }`
  - `dispatchLayout` がオーバーフロー時にフォントを段階縮小した `LayoutResult` を返す
  - Task 9 の `validateLayout` が `detectOverflow` を使う

- [ ] **Step 1: 失敗するテストを書く**

`assets/__tests__/overflow.test.ts` を新規作成する。

```typescript
import { describe, it, expect } from "vitest"
import { detectOverflow } from "../src/renderer/layout/overflow.js"
import { layoutSlide } from "../src/renderer/layout/index.js"
import { ContentSlide, DefaultLayout, TextBlock, DEFAULT_THEME } from "../src/schema/index.js"

describe("detectOverflow", () => {
  it("reports nothing for a box that comfortably fits", () => {
    const result = {
      textBoxes: [{ x: 0.4, y: 1.0, w: 9.2, h: 1.0, text: "short", fontSize: 16 }],
    }
    expect(detectOverflow(result)).toEqual([])
  })

  it("reports a box that extends past the bottom margin", () => {
    const result = {
      textBoxes: [{ x: 0.4, y: 5.0, w: 9.2, h: 1.0, text: "x", fontSize: 16 }],
    }
    const overflows = detectOverflow(result)
    expect(overflows).toHaveLength(1)
    expect(overflows[0].kind).toBe("outOfBounds")
  })

  it("reports a box whose text needs more height than the box has", () => {
    const result = {
      textBoxes: [{ x: 0.4, y: 1.0, w: 2.0, h: 0.3, text: "あ".repeat(300), fontSize: 16 }],
    }
    const overflows = detectOverflow(result)
    expect(overflows).toHaveLength(1)
    expect(overflows[0].kind).toBe("textTooTall")
    expect(overflows[0].needed).toBeGreaterThan(0.3)
  })

  it("tolerates a small estimation margin rather than flagging borderline boxes", () => {
    // 16pt 全角1行 = 16/72*1.5 + 0.05 ≈ 0.383in。箱がわずかに小さい程度では報告しない
    const result = {
      textBoxes: [{ x: 0.4, y: 1.0, w: 9.2, h: 0.36, text: "あ", fontSize: 16 }],
    }
    expect(detectOverflow(result)).toEqual([])
  })

  it("measures paragraphs, not just plain text", () => {
    const result = {
      textBoxes: [{
        x: 0.4, y: 1.0, w: 2.0, h: 0.3, fontSize: 16,
        paragraphs: Array.from({ length: 20 }, () => ({
          runs: [{ text: "あ".repeat(20) }],
          bullet: { type: "bullet" as const },
        })),
      }],
    }
    expect(detectOverflow(result)[0]?.kind).toBe("textTooTall")
  })
})

describe("dispatchLayout font shrinking", () => {
  it("shrinks body font when content does not fit at full size", () => {
    const long = "あ".repeat(700)
    const slide = new ContentSlide({
      title: "Overflowing",
      layout: new DefaultLayout({ sections: [new TextBlock({ heading: "H", body: long })] }),
    })
    const result = layoutSlide(slide, DEFAULT_THEME)

    const bodyBox = result.textBoxes.find(b => b.richText || b.paragraphs)
    expect(bodyBox).toBeDefined()
    expect(bodyBox!.fontSize).toBeLessThan(DEFAULT_THEME.contentSlide.bodySize)
  })

  it("leaves font sizes untouched when content already fits", () => {
    const slide = new ContentSlide({
      title: "Fits",
      layout: new DefaultLayout({ sections: [new TextBlock({ heading: "H", body: "short" })] }),
    })
    const result = layoutSlide(slide, DEFAULT_THEME)

    const bodyBox = result.textBoxes.find(b => b.richText && !b.isBold)
    expect(bodyBox!.fontSize).toBe(DEFAULT_THEME.contentSlide.bodySize)
  })
})
```

`ContentSlide` / `DefaultLayout` / `TextBlock` / `DEFAULT_THEME` の正確なインポート元とコンストラクタ引数は `assets/__tests__/layout-engine.test.ts` の冒頭を参照して合わせる。

- [ ] **Step 2: テストが失敗することを確認する**

Run: `cd assets && npx vitest run __tests__/overflow.test.ts`
Expected: FAIL — `Cannot find module '../src/renderer/layout/overflow.js'`

- [ ] **Step 3: `overflow.ts` を実装する**

`assets/src/renderer/layout/overflow.ts` を新規作成する。

```typescript
import { SLIDE_WIDTH, SLIDE_HEIGHT, MARGIN_X, MARGIN_Y } from "../../constants.js"
import { stripInlineFormatting } from "../../parser/inline-formatter.js"
import { estimateTextHeight } from "./helpers.js"
import type { LayoutResult, TextBox } from "./types.js"

// 見積もりは近似なので、この倍率を超えて溢れた場合のみ報告する。
// 正しいスライドを誤って失敗させないためのマージン。
const ESTIMATE_TOLERANCE = 1.2

// 座標の丸め誤差を吸収する許容値（インチ）
const BOUNDS_EPSILON = 0.02

export interface Overflow {
  readonly kind: "outOfBounds" | "textTooTall"
  readonly box: TextBox
  readonly needed?: number
}

/**
 * ボックスが保持するテキストを、行区切り付きのプレーンテキストに平坦化する。
 * 高さ見積もりに渡すため、実描画されないインライン記法は除去する。
 */
function boxPlainText(box: TextBox): string {
  if (box.paragraphs) {
    return box.paragraphs.map((para) => para.runs.map((run) => run.text).join("")).join("\n")
  }
  if (box.richText) return box.richText.map((run) => run.text).join("")
  return stripInlineFormatting(box.text ?? "")
}

/**
 * LayoutResult のテキストボックスを検査して、はみ出しを列挙する。
 *
 * 2種類を検出する:
 * - outOfBounds: ボックス自体がスライドの安全領域を超えている
 * - textTooTall: ボックスはスライド内だが、テキストがボックスより高い
 *
 * 純関数。座標のみを見るため、PPTX/HTML どちらのレンダラでも同じ判定になる。
 */
export function detectOverflow(result: LayoutResult): Overflow[] {
  const overflows: Overflow[] = []

  for (const box of result.textBoxes) {
    // 下辺・右辺のみを見る。全コアレイアウトが availableHeight を
    // SLIDE_HEIGHT - titleY - MARGIN_Y で計算しており、この境界を守る前提で
    // 書かれている。左辺・上辺をデザインマージンで判定すると、独自のオフセットを
    // 持つプラグイン（customer-journey は自グリッド原点から +0.03 する等）が
    // 正常なスライドでも失敗する。
    if (
      box.y + box.h > SLIDE_HEIGHT - MARGIN_Y + BOUNDS_EPSILON ||
      box.x + box.w > SLIDE_WIDTH - MARGIN_X + BOUNDS_EPSILON
    ) {
      overflows.push({ kind: "outOfBounds", box })
      continue
    }

    const text = boxPlainText(box)
    if (!text) continue

    const needed = estimateTextHeight(text, box.fontSize ?? 14, box.w)
    if (needed > box.h * ESTIMATE_TOLERANCE) {
      overflows.push({ kind: "textTooTall", box, needed })
    }
  }

  return overflows
}
```

- [ ] **Step 4: 検出テストだけが通ることを確認する**

Run: `cd assets && npx vitest run __tests__/overflow.test.ts -t "detectOverflow"`
Expected: PASS（5件）。`dispatchLayout font shrinking` の2件はまだ失敗する。

- [ ] **Step 5: `dispatchLayout` に段階縮小の再試行ループを入れる**

`assets/src/renderer/layout/index.ts:140-153` を置き換える。

変更前:
```typescript
// Dispatch layout to appropriate handler
function dispatchLayout(
  layout: SlideLayout,
  titleY: number,
  theme: Theme
): LayoutResult {
  const handlers = buildLayoutHandlers()
  return pipe(
    handlers.map(handler => handler(layout, titleY, theme)),
    A.findFirst(O.isSome),
    O.flatten,
    O.getOrElse(() => ({ textBoxes: [] }))
  )
}
```

変更後:
```typescript
// テーマのフォントサイズをこの倍率で段階的に下げて再レイアウトを試みる。
// 下限 6pt は calculateGridSpacing の下限と揃えている。
const FONT_SCALE_STEPS = [0.9, 0.8, 0.7, 0.6] as const
const MIN_FONT_SIZE = 6

function scaleThemeFonts(theme: Theme, scale: number): Theme {
  const scaled = (size: number) => Math.max(MIN_FONT_SIZE, Math.round(size * scale))
  return {
    ...theme,
    contentSlide: {
      ...theme.contentSlide,
      headingSize: scaled(theme.contentSlide.headingSize),
      bodySize: scaled(theme.contentSlide.bodySize),
      gridHeadingSize: scaled(theme.contentSlide.gridHeadingSize),
      gridBodySize: scaled(theme.contentSlide.gridBodySize),
    },
  }
}

function dispatchLayoutOnce(
  layout: SlideLayout,
  titleY: number,
  theme: Theme
): LayoutResult {
  const handlers = buildLayoutHandlers()
  return pipe(
    handlers.map(handler => handler(layout, titleY, theme)),
    A.findFirst(O.isSome),
    O.flatten,
    O.getOrElse(() => ({ textBoxes: [] }))
  )
}

/**
 * Dispatch layout, shrinking theme font sizes stepwise if the content overflows.
 *
 * Only layouts that read font sizes from the theme respond to this (Default,
 * LeftRight, TopBottom, Grid, LeanCanvas). Plugins with hardcoded sizes get the
 * same result on every attempt; their overflow is reported by validateLayout
 * instead of being silently shipped.
 */
function dispatchLayout(
  layout: SlideLayout,
  titleY: number,
  theme: Theme
): LayoutResult {
  let result = dispatchLayoutOnce(layout, titleY, theme)
  if (detectOverflow(result).length === 0) return result

  for (const scale of FONT_SCALE_STEPS) {
    const attempt = dispatchLayoutOnce(layout, titleY, scaleThemeFonts(theme, scale))
    if (detectOverflow(attempt).length === 0) return attempt
    result = attempt
  }

  // 最小サイズでも収まらない。validateLayout が ValidationError にする
  return result
}
```

同ファイルのインポートに追加する。

```typescript
import { detectOverflow } from "./overflow.js"
```

同ファイルの barrel re-export セクションに追加する（`export { ... } from "./helpers.js"` の後）。

```typescript
export { detectOverflow } from "./overflow.js"
export type { Overflow } from "./overflow.js"
```

- [ ] **Step 6: 縮小テストが通ることを確認する**

Run: `cd assets && npx vitest run __tests__/overflow.test.ts`
Expected: PASS（7件）

- [ ] **Step 7: 既存スナップショットが変わっていないことを確認する**

Run: `cd assets && npx vitest run __tests__/layout-engine.test.ts`
Expected: PASS。既存のテストデータは短文でオーバーフローしないため、スケール 1.0 の結果がそのまま返り、スナップショットは不変。落ちた場合は差分を読み、`detectOverflow` が短いテキストを誤検出していないか（`ESTIMATE_TOLERANCE` が小さすぎないか）を確認する。

- [ ] **Step 8: 全テストを実行する**

Run: `cd assets && npm test`
Expected: 全緑。落ちたテストがある場合は、そのゴールデン入力が実際にオーバーフローしていて縮小が発生した可能性がある。`e2e.test.ts` はテキストの包含のみを見るので縮小では落ちないが、`snapshot-comparison.test.ts` は座標を見るので PPTX と HTML の両方が同じ縮小結果を消費していれば一致は保たれる。

- [ ] **Step 9: コミット**

```bash
git add assets/src/renderer/layout/overflow.ts assets/src/renderer/layout/index.ts assets/__tests__/overflow.test.ts
git commit -m "feat(layout): detect overflow and shrink theme fonts to fit

detectOverflow is a pure geometric + estimate-based check over LayoutResult, so
PPTX and HTML agree. dispatchLayout now retries the layout with progressively
smaller theme font sizes (down to 6pt) before giving up.

Layouts with hardcoded font sizes do not shrink; their overflow is surfaced as
an error in the next commit instead of shipping silently."
```

---

### Task 9: 収まらないスライドを ValidationError で弾く

**Files:**
- Create: `assets/src/renderer/layout/validate-layout.ts`
- Modify: `assets/src/pipeline.ts`
- Modify: `assets/src/renderer/layout/index.ts`（barrel）
- Modify: `assets/__tests__/overflow.test.ts`

**Interfaces:**
- Consumes: Task 8 の `detectOverflow`、`layoutSlide`
- Produces: `validateLayout(pres: Presentation, theme: Theme): Effect.Effect<Presentation, ValidationError>` — `md2pptx` / `md2html` の Stage 2.5 として呼ばれる

**テーマのスレッド:** `pipeline.ts` は現在テーマをレンダラに素通ししており、`DEFAULT_THEME` へのフォールバックはレンダラ内（`renderer/pptx/index.ts:20`、`renderer/html/index.ts:20`）で起きている。レイアウトを検証段階で走らせるにはテーマがそこで確定していなければならないので、フォールバックを `pipeline.ts` に引き上げる。レンダラ側のフォールバックはそのまま残す（他からの直接呼び出しを壊さないため）。

- [ ] **Step 1: 失敗するテストを書く**

`assets/__tests__/overflow.test.ts` の末尾に追加する。

```typescript
describe("validateLayout via the pipeline", () => {
  it("fails with a ValidationError when a slide overflows even at the minimum font size", async () => {
    // 1000文字制限には収まるが 4x4 グリッドの1セルには到達不能な量
    const md = `# T
---
## Dense
<!--grid:4x4-->
${Array.from({ length: 16 }, (_, i) => `### Cell ${i + 1}\n${"あ".repeat(55)}`).join("\n")}`

    const exit = await Effect.runPromiseExit(md2pptx(md))
    expect(Exit.isFailure(exit)).toBe(true)
    const message = JSON.stringify(exit)
    expect(message).toContain("overflow")
    expect(message).toContain("Slide 2")
  })

  it("passes slides that fit after shrinking", async () => {
    const md = `# T
---
## Fits after shrink
### H
${"あ".repeat(600)}`

    await expect(Effect.runPromise(md2pptx(md))).resolves.toBeInstanceOf(Buffer)
  })

  it("applies the same check to the HTML path", async () => {
    const md = `# T
---
## Dense
<!--grid:4x4-->
${Array.from({ length: 16 }, (_, i) => `### Cell ${i + 1}\n${"あ".repeat(55)}`).join("\n")}`

    const exit = await Effect.runPromiseExit(md2html(md))
    expect(Exit.isFailure(exit)).toBe(true)
  })
})
```

同ファイルのインポートに追加する。

```typescript
import { Effect, Exit } from "effect"
import { md2pptx, md2html } from "../src/pipeline.js"
```

`4x4` グリッドの文字数（55文字 × 16セル = 880文字 + 見出し）が 1000 文字制限に収まっていることを確認する。収まらない場合は、文字数制限のエラーが先に出て**オーバーフローのテストにならない**ため、セル当たりの文字数を減らして 1000 未満に収める。

- [ ] **Step 2: テストが失敗することを確認する**

Run: `cd assets && npx vitest run __tests__/overflow.test.ts -t "validateLayout"`
Expected: FAIL — 現在はオーバーフローしても成功するため `Exit.isFailure` が false になる。

- [ ] **Step 3: `validate-layout.ts` を実装する**

`assets/src/renderer/layout/validate-layout.ts` を新規作成する。

```typescript
import { Effect, pipe } from "effect"
import { ValidationError } from "../../errors.js"
import type { Presentation, Theme } from "../../schema/index.js"
import { layoutSlide } from "./index.js"
import { detectOverflow, type Overflow } from "./overflow.js"

function describeOverflow(overflow: Overflow): string {
  const at = `(${overflow.box.x.toFixed(2)}, ${overflow.box.y.toFixed(2)})`
  if (overflow.kind === "outOfBounds") {
    return `a box at ${at} sized ${overflow.box.w.toFixed(2)}x${overflow.box.h.toFixed(2)}in extends outside the slide's safe area`
  }
  return `text in the box at ${at} needs about ${overflow.needed!.toFixed(2)}in but the box is only ${overflow.box.h.toFixed(2)}in tall`
}

/**
 * Fail the pipeline when a slide still overflows after dispatchLayout has
 * exhausted its font-shrinking steps.
 *
 * This is what makes "silently overflowing output" impossible: content either
 * shrinks to fit or the build stops with the slide number and the reason.
 */
export function validateLayout(
  pres: Presentation,
  theme: Theme
): Effect.Effect<Presentation, ValidationError> {
  return pipe(
    Effect.sync(() => {
      for (let i = 0; i < pres.slides.length; i++) {
        const overflows = detectOverflow(layoutSlide(pres.slides[i], theme))
        if (overflows.length > 0) {
          const detail = overflows.slice(0, 3).map(describeOverflow).join("; ")
          const more = overflows.length > 3 ? ` (and ${overflows.length - 3} more)` : ""
          return Effect.fail(
            new ValidationError({
              message:
                `Slide ${i + 1} overflows even at the smallest font size: ${detail}${more}. ` +
                `Shorten the content or split it across slides.`,
              slideIndex: i,
            })
          )
        }
      }
      return Effect.succeed(pres)
    }),
    Effect.flatten
  )
}
```

- [ ] **Step 4: barrel に追加する**

`assets/src/renderer/layout/index.ts` の barrel re-export セクション（Task 8 で `detectOverflow` を追加した箇所の隣）に追加する。

```typescript
export { validateLayout } from "./validate-layout.js"
```

- [ ] **Step 5: パイプラインに Stage 2.5 を追加する**

`assets/src/pipeline.ts` を全面的に置き換える。

変更前:
```typescript
import "./plugins/index.js"
import { Effect } from "effect"
import { Md2PptxError } from "./errors.js"
import { parseMarkdown } from "./parser/index.js"
import { validatePresentation, Theme } from "./schema/index.js"
import { renderPresentation, renderToHtml, RenderOptions } from "./renderer/index.js"

export interface Md2PptxOptions {
  compression?: boolean
  theme?: Theme
}

export function md2pptx(
  markdown: string,
  options: Md2PptxOptions = {}
): Effect.Effect<Buffer, Md2PptxError> {
  return Effect.gen(function* () {
    // Stage 1: MD → 生AST
    const raw = yield* parseMarkdown(markdown)

    // Stage 2: Schema decode + 240文字チェック
    const pres = yield* validatePresentation(raw)

    // Stage 3: AST → pptxgenjs → Buffer
    const renderOpts: RenderOptions = {
      compression: options.compression ?? false,
      theme: options.theme,
    }
    const bytes = yield* renderPresentation(pres, renderOpts)

    return bytes
  })
}

export interface Md2HtmlOptions {
  theme?: Theme
}

export function md2html(
  markdown: string,
  options: Md2HtmlOptions = {}
): Effect.Effect<string, Md2PptxError> {
  return Effect.gen(function* () {
    // Stage 1: MD → 生AST
    const raw = yield* parseMarkdown(markdown)

    // Stage 2: Schema decode + 240文字チェック
    const pres = yield* validatePresentation(raw)

    // Stage 3: AST → HTML
    const html = yield* renderToHtml(pres, options.theme)

    return html
  })
}
```

変更後:
```typescript
import "./plugins/index.js"
import { Effect } from "effect"
import { Md2PptxError } from "./errors.js"
import { parseMarkdown } from "./parser/index.js"
import { validatePresentation, Theme, DEFAULT_THEME } from "./schema/index.js"
import { renderPresentation, renderToHtml, RenderOptions } from "./renderer/index.js"
import { validateLayout } from "./renderer/layout/validate-layout.js"

export interface Md2PptxOptions {
  compression?: boolean
  theme?: Theme
}

export function md2pptx(
  markdown: string,
  options: Md2PptxOptions = {}
): Effect.Effect<Buffer, Md2PptxError> {
  return Effect.gen(function* () {
    // レイアウト検証がテーマを必要とするため、ここで確定させる
    const theme = options.theme ?? DEFAULT_THEME

    // Stage 1: MD → 生AST
    const raw = yield* parseMarkdown(markdown)

    // Stage 2: Schema decode + 文字数チェック
    const pres = yield* validatePresentation(raw)

    // Stage 2.5: レイアウトを計算してはみ出しを検査
    yield* validateLayout(pres, theme)

    // Stage 3: AST → pptxgenjs → Buffer
    const renderOpts: RenderOptions = {
      compression: options.compression ?? false,
      theme,
    }
    const bytes = yield* renderPresentation(pres, renderOpts)

    return bytes
  })
}

export interface Md2HtmlOptions {
  theme?: Theme
}

export function md2html(
  markdown: string,
  options: Md2HtmlOptions = {}
): Effect.Effect<string, Md2PptxError> {
  return Effect.gen(function* () {
    const theme = options.theme ?? DEFAULT_THEME

    // Stage 1: MD → 生AST
    const raw = yield* parseMarkdown(markdown)

    // Stage 2: Schema decode + 文字数チェック
    const pres = yield* validatePresentation(raw)

    // Stage 2.5: レイアウトを計算してはみ出しを検査
    yield* validateLayout(pres, theme)

    // Stage 3: AST → HTML
    const html = yield* renderToHtml(pres, theme)

    return html
  })
}
```

- [ ] **Step 6: テストが通ることを確認する**

Run: `cd assets && npx vitest run __tests__/overflow.test.ts`
Expected: PASS（10件）

- [ ] **Step 7: 既存のゴールデン入力が新しい検査を通るか確認する**

Run: `cd assets && npx vitest run __tests__/e2e.test.ts`
Expected: PASS が望ましいが、**失敗する可能性が高い**。既存の `markdown-spec/*.md` の中に実際にはみ出しているスライドがあれば、それが今回初めて検出される。

失敗した場合の判断手順:
1. エラーメッセージの `Slide N` とボックス寸法を読む
2. 該当ファイルを `npx tsx src/cli.ts __tests__/markdown-spec/<file>.md /tmp/check.html --html` で HTML 化し（この時点では失敗するので、一時的に `pipeline.ts` の `validateLayout` 呼び出しをコメントアウトして生成する）、ブラウザで実際にはみ出しているか目で見る
3. **実際にはみ出している場合**: ゴールデン入力の該当スライドの本文を短くする。これは検出器が正しく働いた証拠であり、修正すべきはコンテンツ側
4. **`textTooTall` なのに見た目は収まっている場合（誤検出）**: `overflow.ts` の `ESTIMATE_TOLERANCE`（初期値 1.2）を上げる。ただし上げすぎると検出器の意味がなくなるので、1.5 を超える必要がある場合は `estimateTextHeight` の精度自体を見直す
5. **`outOfBounds` がプラグインレイアウトで出ている場合**: 境界の定義が間違っている。`ESTIMATE_TOLERANCE` はこのケースに何の効果もないので触らないこと。該当プラグインがどの座標系でボックスを置いているかを確認し、`detectOverflow` の境界判定を緩める（例: 右辺を `SLIDE_WIDTH - MARGIN_X` ではなく `SLIDE_WIDTH` で判定する）
6. どの判断をしたかを次のコミットメッセージに残す

- [ ] **Step 8: 全テストを実行する**

Run: `cd assets && npm test`
Expected: 全緑。

- [ ] **Step 9: エラーメッセージが実際に読めるものか確認する**

Run:
```bash
cd assets && cat > /tmp/overflow-demo.md <<'MD'
# はみ出しデモ

---

## 4x4 に詰め込みすぎ
<!--grid:4x4-->
### セル1
これは一つのセルに入れるには明らかに長すぎる本文でグリッドの密度に対して収まりません
### セル2
これは一つのセルに入れるには明らかに長すぎる本文でグリッドの密度に対して収まりません
### セル3
これは一つのセルに入れるには明らかに長すぎる本文でグリッドの密度に対して収まりません
### セル4
これは一つのセルに入れるには明らかに長すぎる本文でグリッドの密度に対して収まりません
MD
npx tsx src/cli.ts /tmp/overflow-demo.md /tmp/overflow-demo.pptx; echo "exit=$?"
```

Expected: exit code 1 で終了し、「どのスライドか」「どのくらい溢れているか」「どうすればよいか」が読み取れるメッセージが出ること。読み取れない場合は `describeOverflow` の文言を直す。

- [ ] **Step 10: コミット**

```bash
git add assets/src/renderer/layout/validate-layout.ts assets/src/renderer/layout/index.ts assets/src/pipeline.ts assets/__tests__/overflow.test.ts
git commit -m "feat(pipeline): fail the build when a slide still overflows after shrinking

Adds Stage 2.5: the layout is computed during validation and any remaining
overflow becomes a ValidationError naming the slide and the amount. Silently
shipping text that runs off the slide is now impossible.

Theme resolution moves up into pipeline.ts because layout validation needs a
concrete theme; the renderers keep their own DEFAULT_THEME fallback for direct
callers."
```

---

## Phase 3 — B-01: ドキュメントを実装に一致させる

### Task 10: ドキュメント乖離を解消する

**Files:**
- Modify: `SKILL.md:46`, `:48-66`
- Modify: `CLAUDE.md:53`, `:69`, `:131`, `:140-157`, `:167-181`
- Modify: `assets/README.md:29`, `:153`, `:158`, `:161-179`, `:14-22`, `:30-34`, `:44-56`
- Modify: `assets/src/schema/validation.ts:73`
- Modify: `BACKLOG.md`

**Interfaces:**
- Consumes: Phase 1 と Phase 2 で確定した挙動（箇条書き記法、縮小と失敗の挙動、縮小が効くレイアウトの範囲）
- Produces: なし（ドキュメントのみ）

**最後にやる理由:** B-02 と B-08 が SKILL.md / CLAUDE.md の記述内容を変えるため。先にやると二度書くことになる。

**なぜ「体裁」ではないか:** `SKILL.md` は Claude がこのツールを**使うために読む**ファイルである。46行目が「240文字以内」と書いていることで、実際には 1000 文字入るスライドが 240 文字で作られている。これは現に発生している出力品質の劣化であり、整理整頓ではない。

- [ ] **Step 1: 文字数制限の記述を実装値に統一する**

`SKILL.md:46` を変更する。

変更前:
```markdown
- 各スライド全体で **240文字以内**（Markdown 構文を除く）
```

変更後:
```markdown
- 各スライド全体で **1000文字以内**（Markdown 構文・リストマーカー・見出し記号を除く本文+見出し）
- `CodeDisplay`（コードフェンス）はカウント対象外。タイトルのみ数える
- `pattern-language` レイアウトのみ上限 1024 文字
```

`CLAUDE.md:53` を変更する。

変更前:
```
└── validation.ts       240文字制限バリデーション
```

変更後:
```
└── validation.ts       1000文字制限バリデーション（プラグインは maxChars で上書き可）
```

`CLAUDE.md:131` を変更する。

変更前:
```markdown
- 240文字制限 (Markdown 構文を除く本文+見出し)
```

変更後:
```markdown
- 1000文字制限 (Markdown 構文・リストマーカーを除く本文+見出し)。CodeDisplay は対象外、pattern-language は 1024
```

`CLAUDE.md:171` を変更する。

変更前:
```
| `validation.test.ts` | schema/validation.ts (240文字制限) |
```

変更後:
```
| `validation.test.ts` | schema/validation.ts (1000文字制限) |
```

`assets/__tests__/validation.test.ts:8` のテスト名も 240 を含んでいるので変更する。

変更前:
```typescript
  it("should accept a presentation under 240 chars per slide", async () => {
```

変更後:
```typescript
  it("should accept a presentation under 1000 chars per slide", async () => {
```

`assets/src/schema/validation.ts:73` を変更する。

変更前:
```typescript
// Presentation全体をバリデート（240文字チェック、LeanCanvasは800文字まで）
```

変更後:
```typescript
// Presentation全体をバリデート（既定 1000 文字。プラグインは registerPlugin の maxChars で上書き）
```

`assets/README.md` の4箇所を変更する。

- `:29` `- 240-character validation per slide (excludes MD syntax)` → `- 1000-character validation per slide (excludes MD syntax and list markers)`
- `:153` `Each slide is limited to 240 characters` → `Each slide is limited to 1000 characters`
- `:158` `Slide 2 exceeds 240 characters (found 186)` → `Slide 2 exceeds 1000 characters (found 1183)`（元の例は 186 < 240 で数値が破綻していた）
- `:174` `validation.ts     # 240-char validation logic` → `validation.ts     # 1000-char validation logic`

- [ ] **Step 2: SKILL.md のレイアウト一覧に欠落分を追加する**

`SKILL.md:66`（`| CustomerJourney | ... |` の行）の直後に追加する。

```markdown
| PatternLanguage | `<!--pattern-language-a-->` | パターン・ランゲージ（概要 + 詳細に自動分割） |
```

- [ ] **Step 3: SKILL.md に箇条書きの記法を追加する**

`SKILL.md` の「### Takeaway」セクション（68行目付近）の直前に追加する。

```markdown
### 箇条書き

```markdown
## タイトル
### 見出し
- 順不同の項目
- **強調**を含む項目
1. 番号付きの項目
2. 二つめ
```

`- ` / `* ` / `+ ` / `1. ` が使える。ネストは非対応（1階層のみ）。

記号は PPTX ではネイティブのバレット、HTML では CSS で描画されるため、本文にリテラルの `•` を書く必要はない（書くと二重表示になる）。

対応レイアウトは Default / LeftRight / TopBottom / Grid / LeanCanvas / TextOnly。他のレイアウトは独自にテキストを組むため箇条書きにならない。
```

- [ ] **Step 4: SKILL.md にオーバーフロー時の挙動を追加する**

`SKILL.md` の「### 箇条書き」の直後に追加する。

```markdown
### はみ出し時の挙動

コンテンツがスライドに収まらない場合、まずテーマのフォントサイズを段階的に縮小して収めようとする（最小 6pt）。それでも収まらない場合は**エラーで停止**する。はみ出したまま出力されることはない。

```
Slide 2 overflows even at the smallest font size: text in the box at (0.48, 0.88)
needs about 1.42in but the box is only 0.95in tall. Shorten the content or split
it across slides.
```

自動縮小が効くのは Default / LeftRight / TopBottom / Grid / LeanCanvas（テーマからフォントサイズを読むレイアウト）。それ以外のレイアウトは縮小されず、収まらなければエラーになる。
```

- [ ] **Step 5: CLAUDE.md の layout ツリーから存在しないファイルを消す**

`CLAUDE.md:65-71` 付近の layout ツリーを変更する。

変更前:
```
├── layout/             ★ 共有レイアウトエンジン (PPTX・HTML 両方が使う)
│   ├── index.ts        layoutSlide() ディスパッチャ + barrel re-export
│   ├── types.ts        TextBox, BorderBox, IconBox, CodeBox, ShapeBox, LayoutResult
│   ├── helpers.ts      buildSectionBoxes, 座標計算ユーティリティ
│   ├── basic.ts        Default, LeftRight, TopBottom, Grid, TitleSlide
│   ├── visual.ts       IconColumns, IconCards, Steps, NumberedList
│   └── special.ts      CodeDisplay
```

変更後:
```
├── layout/             ★ 共有レイアウトエンジン (PPTX・HTML 両方が使う)
│   ├── index.ts        layoutSlide() ディスパッチャ + フォント段階縮小 + barrel re-export
│   ├── types.ts        TextBox, Paragraph, BorderBox, IconBox, CodeBox, ShapeBox, LayoutResult
│   ├── helpers.ts      buildSectionBoxes, estimateTextHeight, 座標計算ユーティリティ
│   ├── basic.ts        Default, LeftRight, TopBottom, Grid, TitleSlide
│   ├── special.ts      CodeDisplay
│   ├── overflow.ts     detectOverflow() — はみ出し検出（純関数）
│   └── validate-layout.ts  validateLayout() — Stage 2.5 の ValidationError
```

IconColumns / IconCards / Steps / NumberedList は `plugins/` に移動済みであることを、プラグインツリー側（Step 6）で示す。

- [ ] **Step 6: CLAUDE.md のプラグインツリーを実態（10プラグイン）に直す**

`CLAUDE.md:140-157` のプラグインツリーを置き換える。

```
src/plugins/
├── types.ts              LayoutPlugin インターフェース + TokenMatcher/TokenHandler/LayoutHandler 型
├── registry.ts           registerPlugin() + 派生ルックアップ (getConverters, getLayoutHandlers 等)
├── index.ts              side-effect imports でプラグインをロード（この順序で登録）
├── lean-canvas/          <!--lean-canvas-->            LeanCanvas
├── customer-journey/     <!--カスタマージャーニー:-->  CustomerJourney（4フェーズごとに自動改ページ）
├── steps/                <!--steps-->                  Steps
├── numbered-list/        <!--numbered-list:circle|bar--> NumberedList
├── icon-layout/          <!--icon-cols--> / <!--icon-cards-->  IconColumn / IconCard（1ディレクトリで2登録）
├── text-only/            <!--text-only-->              TextOnly
├── table/                <!--table-->                  Table
├── quote/                <!--quote-->                  Quote
├── agenda/               <!--agenda-->                 Agenda
└── pattern-language/     <!--pattern-language-a-->     PatternLanguageOverview / PatternLanguageDetail

各プラグインの構成は共通: index.ts (自己登録) / schema.ts / handler.ts / converter.ts / layout.ts / constants.ts
```

- [ ] **Step 7: CLAUDE.md のテスト対応表に欠落分を追加する**

`CLAUDE.md:167-181` の表に3行追加する。

```
| `table.test.ts` | table プラグイン |
| `pattern-language.test.ts` | pattern-language プラグイン |
| `inline-formatting.test.ts` | parser/inline-formatter.ts |
| `block-formatter.test.ts` | parser/block-formatter.ts (箇条書き解析) |
| `overflow.test.ts` | renderer/layout/overflow.ts + validate-layout.ts |
```

- [ ] **Step 8: CLAUDE.md のエントリポイントと parser ツリーに欠落分を追加する**

`CLAUDE.md:27-31` の Entry Points に1行追加する。

```
src/batch-html.ts   drafts/ を一括 HTML 化 + index 生成
```

`CLAUDE.md:36-43` の parser ツリーに2行追加する。

```
├── inline-formatter.ts   `code` / **bold** / *italic* の解析
├── block-formatter.ts    行頭リストマーカー → Paragraph[] の解析
```

- [ ] **Step 9: assets/README.md の Architecture 図と TODO を実態に直す**

`assets/README.md:161-179` の Architecture 図を、`CLAUDE.md` の「Code Reading Order」の構成（`src/` 直下 → parser / schema / renderer / plugins / tools）に合わせて書き直す。特に以下の誤りを直す。

- `renderer/layout-engine.ts` → `renderer/layout/`（ディレクトリ）
- `renderer/slide-builder.ts` → `renderer/pptx/slide-builder.ts`
- `presentation.ts   # Effect Schema types` → `presentation.ts   # Plain class types`（`Schema` は使っていない）
- 欠落している `src/plugins/`（10ディレクトリ）、`src/tools/`（4ファイル）、`renderer/html/`（4ファイル）、`src/cli.ts`、`src/index.ts`、`src/batch-html.ts`、`schema/theme.ts` を追加

`assets/README.md:14-22` の TODO から、実装済みの4項目（リーンキャンバス / コード表示 / 表 / カスタマージャーニー）を削除する。残る TODO はグラフ表示・Mermaid 図・Good/Bad/Hat。

`assets/README.md:30-34` の Features のレイアウト一覧を、`SKILL.md` のレイアウト表と同じ16種に揃える。

`assets/README.md:44-56` の CLI オプションに `--html` / `--theme <path>` / `--verify` を追加する（現在は `--compress` のみ）。

- [ ] **Step 10: バックログを更新する**

`BACKLOG.md` を更新する。

1. B-01 / B-02 / B-08 の行に完了マークを付ける（一覧表と各セクション）
2. `BACKLOG.md:7` の「md2pptx が既に優位な点」から、実測で確認できた内容に修正する。3者比較検証は Task 3 で初めて機能するようになったので、それを前提とした記述に直す
3. 新規項目として以下を追加する（優先度 P1）

```markdown
<a id="b-22"></a>
### B-22: PatternLanguageDetail が registerPlugin に未登録

**背景**: `assets/src/plugins/pattern-language/converter.ts:65` が `PatternLanguageDetail` レイアウトを生成するが、`registerPlugin` の `layoutTag` は `PatternLanguageOverview` のみ（`index.ts:42`）。結果:

- `getValidationConfig("PatternLanguageDetail")` が `undefined` を返し、文字数上限が 1024 ではなく `MAX_CHARS_PER_SLIDE`（1000）になる
- `countChars` が呼ばれないため Detail スライドはタイトルのみカウントされる（`index.ts:23-36` の Detail 分岐は到達不能コード）
- `getTitleFontSize("PatternLanguageDetail")` も `undefined` となり `titleFontSize: 1` が適用されない

**受け入れ基準**: Detail レイアウトも登録され、上限・カウント・タイトルフォントサイズが Overview と同じ扱いになる。
```

4. Task 3 の Step 11 で `--verify` を手動実行した際にプラグイン固有のミスマッチが見つかっていれば、それも新規項目として追加する

- [ ] **Step 11: ドキュメントの記述が実装と一致することを機械的に確認する**

Run: `cd /Users/eiji/.claude/skills/md2pptx && grep -rn "240" SKILL.md CLAUDE.md assets/README.md assets/src/schema/validation.ts assets/__tests__/validation.test.ts`
Expected: 出力なし。残っていたら見落とし。着手前の実測では SKILL.md:46 / CLAUDE.md:53,131,171 / README:29,153,158,174 / validation.test.ts:8 の9箇所（validation.ts:73 は 240 と 800 の両方を含む）。

Run: `cd /Users/eiji/.claude/skills/md2pptx && grep -rn "800\|visual\.ts" CLAUDE.md assets/README.md assets/src/schema/validation.ts`
Expected: 出力なし。

Run: `cd /Users/eiji/.claude/skills/md2pptx && grep -c "^| " SKILL.md`
Expected: レイアウト表の行数がプラグイン登録数（11）+ コアレイアウト（6: TitleSlide 除くと Default/LeftRight/TopBottom/Grid/CodeDisplay）+ ヘッダ行と整合すること。`assets/src/plugins/index.ts` の import 数と `SKILL.md` のディレクティブ列を目で突き合わせる。

- [ ] **Step 12: SKILL.md の記法サンプルが実際に動くことを確認する**

Run:
```bash
cd /Users/eiji/.claude/skills/md2pptx/assets && npx tsx src/cli.ts doc/Spec.md /tmp/spec-final.html --html --verify && npx tsx src/cli.ts doc/Spec.md /tmp/spec-final.pptx
```
Expected: 両方成功。3者比較でミスマッチがないこと。

- [ ] **Step 13: 全テストを最終確認する**

Run: `cd assets && npm test`
Expected: 全緑。

- [ ] **Step 14: コミット**

```bash
git add SKILL.md CLAUDE.md BACKLOG.md assets/README.md assets/src/schema/validation.ts
git commit -m "docs: align SKILL.md, CLAUDE.md and README with the implementation

The per-slide limit is 1000 characters, not 240 (SKILL.md) or 800 (a stale
comment in validation.ts). SKILL.md is what Claude reads to use this tool, so
the wrong number was producing under-filled slides.

Also: documents bullet-list syntax and overflow behavior, adds the missing
pattern-language layout, replaces the layout tree entry for the deleted
visual.ts, lists all 10 plugins instead of 2, and completes the test table."
```

---

## Self-Review

**1. スペックのカバレッジ**

| 項目 | 対応タスク |
|---|---|
| C-1 3者比較検証の修復（両面） | Task 3（`inventory.ts` + `html-inspector.ts` + `pptx-inspector.ts` + インライン整形テストケース） |
| C-2 PPTX の太字欠落 | Task 2 |
| C-3 レイアウトの非決定論 | Task 1 |
| B-02 箇条書き（1階層） | Task 4（解析）→ Task 5（レイアウト）→ Task 6（描画・検証・カウント） |
| B-08 オーバーフロー | Task 7（見積もり精度）→ Task 8（検出 + 縮小）→ Task 9（失敗） |
| B-01 ドキュメント乖離 | Task 10 |

B-02 の受け入れ基準「pattern-language プラグインのローカル解釈と衝突しない」は、パーサに触らない設計により構造的に満たされる（Task 5 の設計判断に根拠を記載）。

B-08 の受け入れ基準「全コアレイアウトで縮小されるか失敗する」は、Phase 2 冒頭のスコープ明示のとおり「テーマ読み取りレイアウト = 縮小、それ以外 = 失敗」に分割して達成する。

**2. 未確定事項として意図的に残したもの（推測で埋めていない箇所）**

- Task 6 Step 5: pptxgenjs が `bullet.startAt` をどう XML に落とすかは probe で実測してから判断する。フォールバック（`startAt` を諦める）まで手順に含めた
- Task 9 Step 7: 既存ゴールデン入力が新しい検出を通るかは実行するまで分からない。誤検出と真の検出を切り分ける判断手順と、それぞれの対処を手順に含めた
- Task 3 Step 9 / Task 9 Step 7: 既存テストが落ちた場合の判断基準を明記した

**3. 型と名前の整合**

- `inlineTextRunsToPptxRuns` は Task 2 で6引数になり、Task 6 の `paragraphs` 分岐も同じ6引数で呼ぶ
- `boxToParagraphTexts` は Task 3 で `string[]` を返す形で導入し、Task 6 で `paragraphs` の分岐を1本足すだけ（シグネチャ不変）
- `Paragraph.bullet` は `{ type: "bullet" } | { type: "number"; startAt?: number }` で Task 4 / 6 / 8 を通して一貫
- `detectOverflow(result: LayoutResult): Overflow[]` は Task 8 で定義し Task 9 でそのまま使う
- `estimateTextHeight(text, fontSize, containerWidth)` は Task 7 で挙動が変わるがシグネチャは不変

**4. フェーズ間の依存**

Task 1 → 2 → 3 は順序が意味を持つ（Task 2 が先でないと Task 3 で `bold` の不一致が残る）。Task 4 → 5 → 6 も順序依存。Task 7 は Task 8 の前提（見積もり精度なしに硬いエラーを載せられない）。Task 10 は Phase 1・2 の確定後。
