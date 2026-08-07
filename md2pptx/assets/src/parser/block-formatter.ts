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
