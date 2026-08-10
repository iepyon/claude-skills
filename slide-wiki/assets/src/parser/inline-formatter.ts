import type { InlineTextRun } from "../renderer/layout/types.js"

/**
 * インライン書式の一括マッチャ。
 *
 * 名前付きキャプチャを使う理由: 交替を1本増やすたびに番号がずれて
 * 別の分岐に落ちる事故を構造的に防ぐため（記法を足すときは分岐を1つ書くだけ）。
 *
 * 交替の順序には意味がある:
 *   code → wikilink → mdlink → bold → italic
 * - `code` が先頭 … バッククォート内の記号を書式として解釈しない
 * - `wikilink` が `mdlink` より前 … `[[a]]` を `[…](…)` 側に食わせない
 * - `bold` が `italic` より前 … `**x**` を `*` 2連発と読まない
 */
const INLINE_PATTERN = new RegExp(
  [
    "(?<code>`(?<codeText>[^`]+?)`)",
    "(?<wiki>\\[\\[(?<wikiTarget>[^\\[\\]|]+?)(?:\\|(?<wikiLabel>[^\\[\\]]+?))?\\]\\])",
    "(?<md>\\[(?<mdLabel>[^\\[\\]]+?)\\]\\((?<mdHref>[^()\\s]+)\\))",
    "(?<bold>\\*\\*(?<boldText>.+?)\\*\\*)",
    "(?<italic>\\*(?<italicText>.+?)\\*)",
  ].join("|"),
  "g"
)

/**
 * マッチ1件を InlineTextRun に変換する。
 * 装飾は入れ子にならない（1パス設計）ため、リンクラベル中の `**bold**` は
 * そのままリテラルとして残る。必要になったら再帰させる。
 */
function matchToRun(groups: Record<string, string | undefined>): InlineTextRun {
  if (groups.code !== undefined) {
    return { text: groups.codeText!, code: true }
  }
  if (groups.wiki !== undefined) {
    const target = groups.wikiTarget!.trim()
    // ラベル省略時は ID をそのまま表示する（Obsidian の [[Note Name]] と同じ）。
    // 実行時にタイトルへ差し替えないのは、レイアウトが見積もった文字幅と
    // 実際の描画幅がずれるのを避けるため。別の文言にしたいなら [[id|表示]] と書く。
    return { text: (groups.wikiLabel ?? groups.wikiTarget)!.trim(), link: { kind: "internal", target } }
  }
  if (groups.md !== undefined) {
    return { text: groups.mdLabel!, link: { kind: "external", href: groups.mdHref! } }
  }
  if (groups.bold !== undefined) {
    return { text: groups.boldText!, bold: true }
  }
  return { text: groups.italicText!, italic: true }
}

/**
 * Markdownテキストからインライン書式を解析
 *
 * 対応: `code`、**bold**、*italic*、[label](url)、[[slide-id]]、[[slide-id|表示テキスト]]
 *
 * @example
 * parseInlineFormatting("Hello **world**, see [[intro]] and [docs](https://example.com)")
 * // → [{ text: "Hello " }, { text: "world", bold: true }, { text: ", see " },
 * //    { text: "intro", link: { kind: "internal", target: "intro" } }, { text: " and " },
 * //    { text: "docs", link: { kind: "external", href: "https://example.com" } }]
 */
export function parseInlineFormatting(text: string): InlineTextRun[] {
  const runs: InlineTextRun[] = []
  let currentIndex = 0

  const formatRegex = new RegExp(INLINE_PATTERN.source, "g")
  let match: RegExpExecArray | null
  while ((match = formatRegex.exec(text)) !== null) {
    // マッチ前のプレーンテキスト
    if (match.index > currentIndex) {
      runs.push({ text: text.slice(currentIndex, match.index) })
    }

    runs.push(matchToRun(match.groups ?? {}))

    currentIndex = formatRegex.lastIndex
  }

  // 残りのテキスト
  if (currentIndex < text.length) {
    runs.push({ text: text.slice(currentIndex) })
  }

  return runs.length > 0 ? runs : [{ text }]
}

/**
 * バリデーション・高さ見積り用：Markdown記法を除去して表示テキストだけを返す
 *
 * リンクは **表示ラベルだけ** を残す。URL や slide-id は画面に出ないので、
 * 文字数制限にも折返し計算にも数えてはいけない。
 */
export function stripInlineFormatting(text: string): string {
  return text
    .replace(/`([^`]+?)`/g, "$1")                                  // `code` → code
    .replace(/\[\[[^\[\]|]+?\|([^\[\]]+?)\]\]/g, "$1")             // [[id|表示]] → 表示
    .replace(/\[\[([^\[\]|]+?)\]\]/g, "$1")                        // [[id]] → id
    .replace(/\[([^\[\]]+?)\]\([^()\s]+\)/g, "$1")                 // [label](url) → label
    .replace(/\*\*(.+?)\*\*/g, "$1")                               // **bold** → bold
    .replace(/\*(.+?)\*/g, "$1")                                   // *italic* → italic
}
