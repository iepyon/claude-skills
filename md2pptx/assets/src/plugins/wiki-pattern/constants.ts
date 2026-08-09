/**
 * 左（本文）と右（図解）の幅の比。
 *
 * 5:3 は「配布中の22パターンが1枚も縮まずに 16/14pt で収まる最小の左幅」から決めた。
 * これ以上左を広げても余裕は増えない — 逼迫しているパターン（仮の目的・物差しは先に）は
 * 幅ではなく**高さ**で詰まっていて、行数が減らないところまで来ている。
 * 右を細くすれば図が小さくなるだけなので、ここで止める。
 */
export const WP_LEFT_RATIO = 5
export const WP_RIGHT_RATIO = 3

/**
 * 左カラムの余白。**コアの SECTION_GAP / HEADING_BODY_GAP より詰めてある。**
 *
 * このレイアウトは1枚に3節が必ず入る。既定の余白のままだと左カラムの高さ 3.9in のうち
 * 2.0in が余白で消え、本文3つに 1.4in しか残らない。そうなると全ページが
 * `dispatchLayout` の縮小に入り、**本文の長さに応じてページごとに文字が小さくなる**
 * ＝ Wiki として並べたときに揃わない。余白を詰めて縮小そのものを起こさせない。
 *
 * コアの定数を書き換えないのは、9つ以上のレイアウトが共有しているため
 * （触れば既存のデッキが黙って組み変わる）。
 */
export const WP_SECTION_GAP = 0.15
export const WP_HEADING_HEIGHT = 0.26
export const WP_HEADING_BODY_GAP = 0.06

/** 左カラムの内側の余白。PPTX の addText が既定のインセットを持つので 0.1 より下げない */
export const WP_PADDING = 0.1

/**
 * takeaway に確保する高さ。既定の `TAKEAWAY_HEIGHT`(0.9) は 20pt が2〜3行入る想定だが、
 * パターンの takeaway は `関連: [[…]]` の1行（必要高 0.28in）しか置かない。
 *
 * **1行ぶんに決め打っている。** 2行に折り返す takeaway はここでビルドが止まる
 * （0.35 × はみ出し許容 1.2 = 0.42in < 2行の 0.69in）。関連の羅列が1行に収まらないなら、
 * 削るか他のパターンへ渡すほうが、左段の本文を削るより読み手に効く。
 */
export const WP_TAKEAWAY_HEIGHT = 0.35

/** 図解を載せる下敷きの角丸と枠線。塗りはテーマの iconCardBackground を使う */
export const WP_PANEL_RADIUS = 0.06
export const WP_PANEL_BORDER = "E2E8F0"
export const WP_PANEL_BORDER_WIDTH = 0.75

/** 下敷きと SVG の間の余白（インチ）。図が枠に貼り付いて見えるのを防ぐ */
export const WP_PANEL_PADDING = 0.12
