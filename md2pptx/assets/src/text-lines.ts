// 描画される「行」の切り出し。
//
// PPTX は改行ごとに <a:p> を1つ出す（pptxgenjs の breakLine）。3者比較で
// 段落数を突き合わせるには、HTML と AST インベントリも同じ数え方をしなければ
// ならない。数え方をここ1箇所に置いて、3脚が別々の規則を持たないようにする。
//
// 空行は落とす。pptxgenjs は空行に run の無い <a:p> を出すが、HTML には
// 対応する要素が無く、インスペクタも拾えない。

export const splitTextIntoLines = (text: string): string[] =>
  text.split("\n").map((line) => line.trim()).filter((line) => line !== "")

// run の途中に改行が入りうるので、run 列を行単位に組み直す。
// InlineTextRun でも CodeTextRun でも使えるよう、`text` を持つことだけを要求する。
export function splitRunsIntoLines<T extends { text: string }>(
  runs: readonly T[],
  // 空行も残す。コードブロックの空行は「見た目に要るが、比較には出ない」
  // ——描画では1行ぶんの高さを取り、インスペクタは文字が無いので拾わない。
  options: { keepBlank?: boolean } = {}
): T[][] {
  const lines: T[][] = []
  let current: T[] = []

  for (const run of runs) {
    const fragments = run.text.split("\n")
    fragments.forEach((text, index) => {
      if (index > 0) {
        lines.push(current)
        current = []
      }
      if (text !== "") current.push({ ...run, text })
    })
  }
  lines.push(current)

  // 末尾の空行は落とす（"a\n" は1行であって2行ではない）。
  // これは両モード共通 — keepBlank でも末尾だけは行として数えない
  while (lines.length > 0 && lines[lines.length - 1].length === 0) lines.pop()

  return options.keepBlank
    ? lines
    : lines.filter((line) => line.some((run) => run.text.trim() !== ""))
}

export const runsToText = (runs: readonly { text: string }[]): string =>
  runs.map((run) => run.text).join("").trim()
