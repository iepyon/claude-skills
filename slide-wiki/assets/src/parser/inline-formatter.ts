import type { InlineTextRun } from "../renderer/layout/types.js"
import { parseOkfLink } from "../okf.js"

/**
 * インライン書式の一括マッチャ。
 *
 * 名前付きキャプチャを使う理由: 交替を1本増やすたびに番号がずれて
 * 別の分岐に落ちる事故を構造的に防ぐため（記法を足すときは分岐を1つ書くだけ）。
 *
 * 交替の順序には意味がある:
 *   code → mdlink → bold → italic
 * - `code` が先頭 … バッククォート内の記号を書式として解釈しない
 * - `bold` が `italic` より前 … `**x**` を `*` 2連発と読まない
 */
const INLINE_PATTERN = new RegExp(
  [
    "(?<code>`(?<codeText>[^`]+?)`)",
    "(?<md>\\[(?<mdLabel>[^\\[\\]]+?)\\]\\((?<mdHref>[^()\\s]+)\\))",
    "(?<bold>\\*\\*(?<boldText>.+?)\\*\\*)",
    "(?<italic>\\*(?<italicText>.+?)\\*)",
  ].join("|"),
  "g"
)

/**
 * 装飾の中をもう一度走査し、内側で見つかった run に装飾を載せる。
 *
 * `**強調した [リンク](deck.md#id)**` のような書き方は、結論の一行を太字にしてから
 * そこに参照を張る、という自然な順序で出てくる。再帰しないと `bold` の交替が
 * 内側のリンクごと飲むので、**リンクが黙って消える**（`stripInlineFormatting` は
 * 中を剥がすので文字数だけは正しく数えられ、表示と数え方が食い違う）。
 *
 * 終わりは保証される — inner は必ずマッチ全体より短い（`**` のぶん）。
 * 装飾の綴りは重ならないので、入れ子は `{bold: true, italic: true}` のように積み上がる。
 */
const decorate = (inner: string, decoration: Partial<InlineTextRun>): InlineTextRun[] =>
  parseInlineFormatting(inner).map((run) => ({ ...run, ...decoration }))

/**
 * マッチ1件を InlineTextRun に変換する。
 *
 * 装飾（bold / italic）の中だけ再帰する。**リンクのラベルの中は再帰しない** —
 * ラベルは表示テキストなので、`[**強調**](deck.md#id)` の `**` はリテラルとして残る。
 * 必要になったらここも `decorate` を通せばよい。
 */
function matchToRuns(groups: Record<string, string | undefined>): InlineTextRun[] {
  if (groups.code !== undefined) {
    return [{ text: groups.codeText!, code: true }]
  }
  if (groups.md !== undefined) {
    const href = groups.mdHref!
    const internal = parseOkfLink(href)
    return [{
      text: groups.mdLabel!,
      link: internal
        ? { kind: "internal", ref: internal.ref, slide: internal.slide, href }
        : { kind: "external", href },
    }]
  }
  if (groups.bold !== undefined) {
    return decorate(groups.boldText!, { bold: true })
  }
  return decorate(groups.italicText!, { italic: true })
}

/**
 * Markdownテキストからインライン書式を解析
 *
 * 対応: `code`、**bold**、*italic*、[ラベル](url)
 * 装飾の中の記法は効く（`matchToRuns` が再帰する）ので、1つのマッチが複数の run になりうる。
 *
 * リンクは1種類しかない。href の形で内部/外部に分かれる（`okf.ts` の `parseOkfLink` が正本）。
 * かつてあった `[[…]]` は廃止した — OKF v0.2 は通常の markdown リンクだけを規定しており、
 * 独自記法は「md をそのまま他の道具に渡せる」という Wiki の前提そのものを壊す。
 * 旧記法の md は `src/tools/migrate-wikilinks.ts` が書き換える。
 *
 * @example
 * parseInlineFormatting("Hello **world**, see [序](intro.md#序) and [docs](https://example.com)")
 * // → [{ text: "Hello " }, { text: "world", bold: true }, { text: ", see " },
 * //    { text: "序", link: { kind: "internal", ref: "intro/序", slide: "序", href: "/intro.md#序" } },
 * //    { text: " and " },
 * //    { text: "docs", link: { kind: "external", href: "https://example.com" } }]
 *
 * @example
 * parseInlineFormatting("**結論は [種ノート](patterns-wiki.md#種ノート) にある**")
 * // → [{ text: "結論は ", bold: true },
 * //    { text: "種ノート", bold: true, link: { kind: "internal", ref: "patterns-wiki/種ノート", … } },
 * //    { text: " にある", bold: true }]
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

    runs.push(...matchToRuns(match.groups ?? {}))

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
    .replace(/\[([^\[\]]+?)\]\([^()\s]+\)/g, "$1")                 // [ラベル](url) → ラベル
    .replace(/\*\*(.+?)\*\*/g, "$1")                               // **bold** → bold
    .replace(/\*(.+?)\*/g, "$1")                                   // *italic* → italic
}
