// Dashboard layout constants (inches unless noted)

// セル共通
export const DASH_CELL_PADDING = 0.08

// セル上端の見出し帯。中の見出しテキストは帯の中で縦中央に置く
export const HEADING_BAND_HEIGHT = 0.28
export const HEADING_BAND_TEXT_HEIGHT = 0.22

// 前期比のピル（薄い下地 + 記号つき数値）と、その隣の比較基準の脚注
export const DELTA_PILL_HEIGHT = 0.2
export const DELTA_PILL_PADDING = 0.18 // 文字幅の見積もりに足す左右余白（インチ）
export const DELTA_PILL_GAP = 0.06

// KPI タイルの箱割。値 32pt の必要高は 32/72 ≈ 0.44in で、
// overflow.ts の判定（箱高 × 1.2 まで）に対し 0.5in の箱で収まる
export const KPI_VALUE_HEIGHT = 0.5
export const KPI_INNER_GAP = 0.04
// スパークラインは余った高さに敷く。これ未満しか残らないタイルでは描かない
// （潰れた線は情報ではなくノイズになる）
export const KPI_SPARK_MIN_HEIGHT = 0.15
export const KPI_SPARK_MAX_HEIGHT = 0.5

// チャートセル: 見出し帯と SVG の間
export const CHART_HEADING_GAP = 0.05
