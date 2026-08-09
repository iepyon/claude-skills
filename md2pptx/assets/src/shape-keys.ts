// 3者比較（AST / HTML / PPTX）で1つの図形を指す名前。
//
// キーを「描画順に数える」のをやめて、レンダラが自分で宣言する。
// 数える方式だと、インベントリ側がレンダラの展開（アクセントバー・コード背景・
// テキストオーバーレイという「1ボックス → 複数図形」）を写経することになり、
// 写経は必ずドリフトする。実際、それが B-24 の中身だった。
//
// PPTX は pptxgenjs の objectName（→ <p:cNvPr name="…">）で、
// HTML は data-shape-id で、同じ名前を書き出す。

export const textKey = (index: number): string => `shape-${index}`
export const iconKey = (index: number): string => `icon-${index}`
export const codeKey = (index: number): string => `code-${index}`
export const shapeBoxKey = (index: number): string => `shape-box-${index}`

// 比較の対象は「テキストを運ぶ図形」。境界ボックス・塗り・コード背景・SVG は
// テキストを持たないので、この接頭辞を付けて明示的に除外する。
// 暗黙に落とすのではなく生成物の中に書いておくことで、除外が読んで分かる。
export const DECO_PREFIX = "deco:"

export const deco = (key: string): string => `${DECO_PREFIX}${key}`

export const isDecoKey = (key: string): boolean => key.startsWith(DECO_PREFIX)
