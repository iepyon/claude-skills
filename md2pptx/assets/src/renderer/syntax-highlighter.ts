import hljs from "highlight.js"
import { decodeEntities } from "../entities.js"

// CodeTextRun: テキストラン（色付き）
export interface CodeTextRun {
  text: string
  color: string
}

// TOKEN_COLORS: hljs クラス名 → 6桁hex色（VS Code Dark+ テーマ）
const TOKEN_COLORS: Record<string, string> = {
  "hljs-keyword": "569CD6", // if, for, function, const, let
  "hljs-built_in": "4EC9B0", // console, Array, Object
  "hljs-string": "CE9178", // "string"
  "hljs-number": "B5CEA8", // 123, 0.5
  "hljs-literal": "569CD6", // true, false, null
  "hljs-comment": "6A9955", // // comment
  "hljs-function": "DCDCAA", // function name
  "hljs-class": "4EC9B0", // class name
  "hljs-variable": "9CDCFE", // variable name
  "hljs-params": "9CDCFE", // function parameters
  "hljs-type": "4EC9B0", // type annotations
  "hljs-title": "DCDCAA", // function/class title
  "hljs-attr": "9CDCFE", // object attributes
  "hljs-property": "9CDCFE", // object properties
  "hljs-operator": "D4D4D4", // +, -, =, ===
  "hljs-punctuation": "D4D4D4", // {}, (), []
  "hljs-regexp": "D16969", // /regex/
  "hljs-tag": "569CD6", // HTML tags
  "hljs-name": "4EC9B0", // HTML tag name
}

// クラス名からトークン色を解決（マルチクラス対応）
function resolveTokenColor(className: string, defaultColor: string): string {
  if (TOKEN_COLORS[className]) return TOKEN_COLORS[className]
  const firstClass = className.split(" ")[0]
  return TOKEN_COLORS[firstClass] || defaultColor
}

// hljs出力HTMLをパースしてCodeTextRun[]に変換（ネストspan・マルチクラス対応）
export function parseHljsHtml(html: string, defaultColor: string): CodeTextRun[] {
  const runs: CodeTextRun[] = []
  const colorStack: string[] = [defaultColor]
  let currentText = ""
  let i = 0

  while (i < html.length) {
    if (html[i] === "<") {
      if (currentText) {
        runs.push({ text: decodeEntities(currentText), color: colorStack[colorStack.length - 1] })
        currentText = ""
      }
      if (html.startsWith("</span>", i)) {
        colorStack.pop()
        i += 7
      } else if (html.startsWith("<span ", i)) {
        const closeAngle = html.indexOf(">", i)
        if (closeAngle === -1) break
        const classMatch = html.slice(i, closeAngle + 1).match(/class="([^"]+)"/)
        colorStack.push(classMatch ? resolveTokenColor(classMatch[1], defaultColor) : colorStack[colorStack.length - 1])
        i = closeAngle + 1
      } else {
        const closeAngle = html.indexOf(">", i)
        i = closeAngle === -1 ? html.length : closeAngle + 1
      }
    } else {
      currentText += html[i]
      i++
    }
  }
  if (currentText) {
    runs.push({ text: decodeEntities(currentText), color: colorStack[colorStack.length - 1] })
  }
  return runs
}

// PPTX用: コードをハイライトしてテキストラン配列に変換
export function highlightForPptx(code: string, language: string, defaultColor: string = "D4D4D4"): CodeTextRun[] {
  try {
    const result = hljs.highlight(code, { language, ignoreIllegals: true })
    return parseHljsHtml(result.value, defaultColor)
  } catch {
    return [{ text: code, color: defaultColor }]
  }
}

// PptxCodeRun: pptxgenjs TextProps互換のラン
export interface PptxCodeRun {
  text: string
  options: { color: string; fontFace: string; fontSize: number; breakLine?: boolean }
}

// CodeTextRun[] → pptxgenjs TextProps[] 変換（改行で分割し breakLine を設定）
export function codeTextRunsToPptxRuns(textRuns: CodeTextRun[], fontFace: string, fontSize: number): PptxCodeRun[] {
  const pptxRuns: PptxCodeRun[] = []
  for (const run of textRuns) {
    if (!run.text.includes("\n")) {
      pptxRuns.push({ text: run.text, options: { color: run.color, fontFace, fontSize } })
    } else {
      const parts = run.text.split("\n")
      parts.forEach((part, idx) => {
        const isLast = idx === parts.length - 1
        if (part === "" && isLast) return
        pptxRuns.push({
          text: part,
          options: { color: run.color, fontFace, fontSize, ...(isLast ? {} : { breakLine: true }) },
        })
      })
    }
  }
  return pptxRuns
}

// HTML用: シンタックスハイライトCSS
export const SYNTAX_HIGHLIGHT_CSS = `
/* Syntax Highlighting (VS Code Dark+ Theme) */
.hljs-keyword { color: #569CD6; }
.hljs-built_in { color: #4EC9B0; }
.hljs-string { color: #CE9178; }
.hljs-number { color: #B5CEA8; }
.hljs-literal { color: #569CD6; }
.hljs-comment { color: #6A9955; }
.hljs-function { color: #DCDCAA; }
.hljs-class { color: #4EC9B0; }
.hljs-variable { color: #9CDCFE; }
.hljs-params { color: #9CDCFE; }
.hljs-type { color: #4EC9B0; }
.hljs-title { color: #DCDCAA; }
.hljs-attr { color: #9CDCFE; }
.hljs-property { color: #9CDCFE; }
.hljs-operator { color: #D4D4D4; }
.hljs-punctuation { color: #D4D4D4; }
.hljs-regexp { color: #D16969; }
.hljs-tag { color: #569CD6; }
.hljs-name { color: #4EC9B0; }
`
