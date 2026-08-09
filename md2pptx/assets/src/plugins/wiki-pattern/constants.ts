import { SLIDE_WIDTH, MARGIN_X, CELL_GAP } from "../../constants.js"

/**
 * 左（本文）と右（図解）の幅の比。
 *
 * 3:2 は「本文が読める最小幅」から決めた。全幅 9.2in を半々にすると本文の行数が
 * ほぼ倍になり、既存のパターン本文が overflow.ts の判定に触れる。
 */
export const WP_LEFT_RATIO = 3
export const WP_RIGHT_RATIO = 2

/** 図解を載せる下敷きの角丸と塗り。線画の SVG が浮かないだけの淡さに留める */
export const WP_PANEL_RADIUS = 0.06
export const WP_PANEL_FILL = "F8FAFC"
export const WP_PANEL_BORDER = "E2E8F0"
export const WP_PANEL_BORDER_WIDTH = 0.75

/** 下敷きと SVG の間の余白（インチ）。図が枠に貼り付いて見えるのを防ぐ */
export const WP_PANEL_PADDING = 0.12

/**
 * 図解の作画領域の目安。SVG の viewBox をこの比率に合わせて描く
 * （`0 0 360 340` が右パネルのおおよその形）。
 */
export const WP_CONTENT_WIDTH = SLIDE_WIDTH - 2 * MARGIN_X - CELL_GAP
