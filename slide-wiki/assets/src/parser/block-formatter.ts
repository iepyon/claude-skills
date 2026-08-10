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
 * 番号付き項目の `startAt` には**その項目自身の番号**を必ず入れる（Markdown に
 * 書かれた数値をそのまま使う）。実測（pptxgenjs 3.x）で確認した理由:
 *
 * - `bullet: { type: "number" }` を startAt 抜きで渡すと、pptxgenjs は
 *   `<a:buAutoNum startAt="1"/>` を出す。つまり「省略」は継続ではなく 1 への
 *   リセットとして出力される。
 * - 全項目に自身の番号を入れておけば、PowerPoint が per-paragraph の startAt を
 *   「その項目からの振り直し」と解釈しても、同レベル連続段落を1つのリストとして
 *   「継続」と解釈しても、どちらでも同じ番号が出る。
 */
export function parseBlockToParagraphs(body: string): Paragraph[] {
  const paragraphs: Paragraph[] = []

  for (const line of body.split("\n")) {
    const ordered = line.match(ORDERED)
    if (ordered) {
      paragraphs.push({
        runs: parseInlineFormatting(ordered[2]),
        bullet: { type: "number", startAt: parseInt(ordered[1], 10) },
      })
      continue
    }

    const unordered = line.match(UNORDERED)
    if (unordered) {
      paragraphs.push({
        runs: parseInlineFormatting(unordered[1]),
        bullet: { type: "bullet" },
      })
      continue
    }

    paragraphs.push({ runs: parseInlineFormatting(line) })
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
