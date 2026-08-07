import type { InlineTextRun } from "../renderer/layout/types.js"

/**
 * Markdownテキストからインライン書式を解析
 *
 * 完全版: `code`、**bold**、*italic* に対応
 *
 * @example
 * parseInlineFormatting("Hello **world**, *italic*, and `code`")
 * // → [{ text: "Hello " }, { text: "world", bold: true }, { text: ", " }, { text: "italic", italic: true }, { text: ", and " }, { text: "code", code: true }]
 */
export function parseInlineFormatting(text: string): InlineTextRun[] {
  const runs: InlineTextRun[] = []
  let currentIndex = 0

  // `code`、**bold**、*italic* を検出（優先順: code > bold > italic）
  const formatRegex = /(`(.+?)`|\*\*(.+?)\*\*|\*(.+?)\*)/g

  let match: RegExpExecArray | null
  while ((match = formatRegex.exec(text)) !== null) {
    // マッチ前のプレーンテキスト
    if (match.index > currentIndex) {
      runs.push({ text: text.slice(currentIndex, match.index) })
    }

    if (match[2]) {
      // `code`
      runs.push({ text: match[2], code: true })
    } else if (match[3]) {
      // **bold**
      runs.push({ text: match[3], bold: true })
    } else if (match[4]) {
      // *italic*
      runs.push({ text: match[4], italic: true })
    }

    currentIndex = formatRegex.lastIndex
  }

  // 残りのテキスト
  if (currentIndex < text.length) {
    runs.push({ text: text.slice(currentIndex) })
  }

  return runs.length > 0 ? runs : [{ text }]
}

/**
 * バリデーション用：Markdown記法を除去してプレーンテキスト長を返す
 *
 * 完全版: `, **, * を除去
 */
export function stripInlineFormatting(text: string): string {
  return text
    .replace(/`(.+?)`/g, "$1")        // `code` → code
    .replace(/\*\*(.+?)\*\*/g, "$1")  // **bold** → bold
    .replace(/\*(.+?)\*/g, "$1")      // *italic* → italic
}
