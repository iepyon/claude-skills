/**
 * 左（本文）と右（図解）の幅の比。
 *
 * 3:2 は「本文が読める最小幅」から決めた。全幅 9.2in を半々にすると本文の行数が
 * ほぼ倍になり、既存のパターン本文が overflow.ts の判定に触れる。
 */
export const WP_LEFT_RATIO = 3
export const WP_RIGHT_RATIO = 2

/** 図解を載せる下敷きの角丸と枠線。塗りはテーマの iconCardBackground を使う */
export const WP_PANEL_RADIUS = 0.06
export const WP_PANEL_BORDER = "E2E8F0"
export const WP_PANEL_BORDER_WIDTH = 0.75

/** 下敷きと SVG の間の余白（インチ）。図が枠に貼り付いて見えるのを防ぐ */
export const WP_PANEL_PADDING = 0.12
