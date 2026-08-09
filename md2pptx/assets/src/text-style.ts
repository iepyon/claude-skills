import type { TextBox, InlineTextRun } from "./renderer/layout/types.js"

// 3脚（AST インベントリ / HTML / PPTX）が書式を決めるときの規則。
//
// text-lines.ts が「1行をどう数えるか」を1箇所に置いているのと同じ理由で、
// 「その行をどう描くか」もここに置く。以前はこの2つの式が3ファイルに
// 独立して書かれていて、インベントリ側のコメントが「両レンダラと同じ式にする」と
// 写経を自認していた。写経は必ずドリフトする。

// 中央寄せか。タイトルスライドは全体が中央、それ以外はボックスの指定に従う。
export const isCentered = (box: Pick<TextBox, "align">, isTitleSlide: boolean): boolean =>
  box.align === "center" || isTitleSlide

// この行に使うフォント。インラインコードだけ等幅に落ちる。
// 判定材料が行の **先頭 run** なのは、PPTX が段落の最初の <a:rPr> しか
// 持ち出せない（pptx-inspector）ため — 3脚が読める範囲に規則を合わせている。
export const runFontFace = (
  box: Pick<TextBox, "fontFace">,
  firstRun: Pick<InlineTextRun, "code"> | undefined,
  fallback: string
): string => (firstRun?.code ? "Courier New" : (box.fontFace ?? fallback))
