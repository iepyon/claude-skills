/**
 * ダッシュボードのチャート SVG を文字列として生成する純関数群。
 *
 * 座標系は「1インチ = 100 単位」。viewBox を置き先のボックスと同じ縦横比で
 * 名乗るのが要 — PPTX の addImage は枠いっぱいに引き伸ばすので、比が違うと
 * 歪み、HTML は preserveAspectRatio が余白を作る（同じ原因で別々に崩れる）。
 *
 * 禁止要素: `id=` / `<defs>` / `<style>` / `<div>` / `<foreignObject>`。
 * Wiki のホバープレビューが cloneNode でスライドを複製するので、文書全体で
 * 一意であるべき id を持ち込めない。スタイルはすべて presentation attribute で書く。
 */
import type { Theme } from "../../schema/theme.js"
import type { ChartDatum } from "./schema.js"

/** 1インチあたりの viewBox 単位 */
const UNITS_PER_INCH = 100

/** pt → viewBox 単位（1pt = 1/72in） */
const pt = (size: number): number => (size * UNITS_PER_INCH) / 72

/** 座標の丸め。浮動小数の雑音をスナップショットと生成物に持ち込まない */
const n = (value: number): number => Math.round(value * 100) / 100

const esc = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

const openSvg = (w: number, h: number): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${n(w)} ${n(h)}">`

const text = (
  x: number,
  y: number,
  content: string,
  size: number,
  color: string,
  anchor: "start" | "middle" | "end" = "middle"
): string =>
  `<text x="${n(x)}" y="${n(y)}" font-family="Arial, sans-serif" font-size="${n(size)}"` +
  ` fill="#${color}" text-anchor="${anchor}">${esc(content)}</text>`

const formatValue = (value: number): string =>
  value.toLocaleString("en-US", { maximumFractionDigits: 2 })

/** 折れ線・棒が共有する描画領域。上に値ラベル、下にカテゴリラベルの帯を取る */
interface PlotArea {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
  readonly labelY: number // カテゴリラベルのベースライン
}

function plotArea(w: number, h: number, labelSize: number): PlotArea {
  const padX = 6
  const top = labelSize + 6 // 値ラベルの帯
  const bottom = labelSize + 8 // カテゴリラベルの帯
  return {
    left: padX,
    top,
    width: w - 2 * padX,
    height: Math.max(1, h - top - bottom),
    labelY: h - 4,
  }
}

export function renderBarChart(
  data: readonly ChartDatum[],
  wIn: number,
  hIn: number,
  theme: Theme
): string {
  const w = wIn * UNITS_PER_INCH
  const h = hIn * UNITS_PER_INCH
  const labelSize = pt(theme.dashboard.chartLabelSize)
  const area = plotArea(w, h, labelSize)
  const max = Math.max(...data.map((d) => d.value), 1)
  const color = theme.dashboard.chartPalette[0]
  const textColor = theme.contentSlide.textColor

  const slot = area.width / data.length
  const parts = data.map((d, i) => {
    const barW = slot * 0.6
    const barH = (Math.max(0, d.value) / max) * area.height
    const x = area.left + i * slot + slot * 0.2
    const y = area.top + area.height - barH
    const center = area.left + i * slot + slot / 2
    return (
      `<rect x="${n(x)}" y="${n(y)}" width="${n(barW)}" height="${n(barH)}" rx="2" fill="#${color}"/>` +
      text(center, y - 4, formatValue(d.value), labelSize, textColor) +
      text(center, area.labelY, d.label, labelSize, textColor)
    )
  })

  return `${openSvg(w, h)}${parts.join("")}</svg>`
}

export function renderLineChart(
  data: readonly ChartDatum[],
  wIn: number,
  hIn: number,
  theme: Theme
): string {
  const w = wIn * UNITS_PER_INCH
  const h = hIn * UNITS_PER_INCH
  const labelSize = pt(theme.dashboard.chartLabelSize)
  const area = plotArea(w, h, labelSize)
  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const color = theme.dashboard.chartPalette[0]
  const textColor = theme.contentSlide.textColor

  const step = data.length > 1 ? area.width / (data.length - 1) : 0
  const points = data.map((d, i) => ({
    x: area.left + (data.length > 1 ? i * step : area.width / 2),
    y: area.top + area.height - ((d.value - min) / range) * area.height,
  }))

  // 薄い水平グリッド線。軸は持たない（値は点に直接ラベリングする）ので、
  // 線は高さの当たりを付けるためだけの下敷き
  const gridlines = [0, 1 / 3, 2 / 3, 1]
    .map((f) => {
      const y = n(area.top + area.height * f)
      return `<line x1="${n(area.left)}" y1="${y}" x2="${n(area.left + area.width)}" y2="${y}" stroke="#${theme.dashboard.chartGridColor}" stroke-width="1"/>`
    })
    .join("")

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${n(p.x)} ${n(p.y)}`).join(" ")
  // 線の下の面塗り。グラデーションは <defs> が要る（禁止）ので単色 + 不透明度で敷く
  const bottom = n(area.top + area.height)
  const area_ =
    data.length > 1
      ? `<path d="${path} L ${n(points[points.length - 1].x)} ${bottom} L ${n(points[0].x)} ${bottom} Z"` +
        ` fill="#${color}" fill-opacity="0.12" stroke="none"/>`
      : ""

  // 両端の点は描画領域の縁に立つので、中央揃えだとラベルの半分が viewBox の外に出る
  const anchorAt = (i: number): "start" | "middle" | "end" =>
    data.length > 1 && i === 0 ? "start" : data.length > 1 && i === data.length - 1 ? "end" : "middle"
  const marks = data
    .map((d, i) => {
      const p = points[i]
      return (
        `<circle cx="${n(p.x)}" cy="${n(p.y)}" r="3.5" fill="#${color}" stroke="#FFFFFF" stroke-width="1.5"/>` +
        text(p.x, p.y - 7, formatValue(d.value), labelSize, textColor, anchorAt(i)) +
        text(p.x, area.labelY, d.label, labelSize, textColor, anchorAt(i))
      )
    })
    .join("")

  return (
    `${openSvg(w, h)}${gridlines}${area_}<path d="${path}" fill="none" stroke="#${color}"` +
    ` stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${marks}</svg>`
  )
}

export function renderDonutChart(
  data: readonly ChartDatum[],
  wIn: number,
  hIn: number,
  theme: Theme
): string {
  const w = wIn * UNITS_PER_INCH
  const h = hIn * UNITS_PER_INCH
  const labelSize = pt(theme.dashboard.chartLabelSize)
  const palette = theme.dashboard.chartPalette
  const textColor = theme.contentSlide.textColor
  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0) || 1

  // 左にドーナツ、右に凡例
  const size = Math.min(h, w * 0.55)
  const cx = 8 + size / 2
  const cy = h / 2
  const rOuter = size / 2 - 4
  const thickness = rOuter * 0.4
  const r = rOuter - thickness / 2

  const point = (angle: number): [number, number] => [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]

  let angle = -Math.PI / 2
  const arcs = data
    .map((d, i) => {
      const frac = Math.max(0, d.value) / total
      const color = palette[i % palette.length]
      const stroke = `fill="none" stroke="#${color}" stroke-width="${n(thickness)}"`
      if (frac >= 0.999) {
        // 1系列で 100%: 円弧2本で全周を描く（1本の arc は始点=終点だと消える）
        const [x0, y0] = point(-Math.PI / 2)
        const [x1, y1] = point(Math.PI / 2)
        return (
          `<path d="M ${n(x0)} ${n(y0)} A ${n(r)} ${n(r)} 0 0 1 ${n(x1)} ${n(y1)}` +
          ` A ${n(r)} ${n(r)} 0 0 1 ${n(x0)} ${n(y0)}" ${stroke}/>`
        )
      }
      const a0 = angle
      const a1 = angle + frac * 2 * Math.PI
      angle = a1
      const [x0, y0] = point(a0)
      const [x1, y1] = point(a1)
      const largeArc = a1 - a0 > Math.PI ? 1 : 0
      return `<path d="M ${n(x0)} ${n(y0)} A ${n(r)} ${n(r)} 0 ${largeArc} 1 ${n(x1)} ${n(y1)}" ${stroke}/>`
    })
    .join("")

  const legendX = 8 + size + 10
  const lineHeight = labelSize * 1.7
  const legendTop = cy - (data.length * lineHeight) / 2 + lineHeight / 2
  const legend = data
    .map((d, i) => {
      const y = legendTop + i * lineHeight
      const pct = Math.round((Math.max(0, d.value) / total) * 100)
      return (
        `<rect x="${n(legendX)}" y="${n(y - labelSize * 0.8)}" width="${n(labelSize * 0.8)}"` +
        ` height="${n(labelSize * 0.8)}" rx="1.5" fill="#${palette[i % palette.length]}"/>` +
        text(legendX + labelSize * 1.2, y, `${d.label} ${pct}%`, labelSize, textColor, "start")
      )
    })
    .join("")

  // 中央の空洞には最大セグメントを大きく出す（構成比の主役を一目で示す）
  const biggest = data.reduce((a, b) => (b.value > a.value ? b : a), data[0])
  const biggestPct = Math.round((Math.max(0, biggest.value) / total) * 100)
  const center =
    `<text x="${n(cx)}" y="${n(cy)}" font-family="Arial, sans-serif" font-size="${n(labelSize * 1.6)}"` +
    ` font-weight="bold" fill="#${textColor}" text-anchor="middle">${biggestPct}%</text>` +
    text(cx, cy + labelSize * 1.3, biggest.label, labelSize * 0.9, theme.dashboard.basisColor)

  return `${openSvg(w, h)}${arcs}${legend}${center}</svg>`
}

export function renderSparkline(
  values: readonly number[],
  wIn: number,
  hIn: number,
  theme: Theme
): string {
  const w = wIn * UNITS_PER_INCH
  const h = hIn * UNITS_PER_INCH
  const color = theme.dashboard.sparklineColor
  const pad = 4
  const series = values.length === 1 ? [values[0], values[0]] : [...values]
  const min = Math.min(...series)
  const max = Math.max(...series)
  const range = max - min || 1

  const step = (w - 2 * pad) / (series.length - 1)
  const points = series.map((v, i) => ({
    x: pad + i * step,
    y: h - pad - ((v - min) / range) * (h - 2 * pad),
  }))
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${n(p.x)} ${n(p.y)}`).join(" ")
  const last = points[points.length - 1]
  const first = points[0]
  const bottom = n(h - pad)
  // 折れ線チャートと同じ理由で、面塗りは単色 + 不透明度（<defs> は禁止）
  const areaFill =
    `<path d="${path} L ${n(last.x)} ${bottom} L ${n(first.x)} ${bottom} Z"` +
    ` fill="#${color}" fill-opacity="0.15" stroke="none"/>`

  return (
    `${openSvg(w, h)}${areaFill}<path d="${path}" fill="none" stroke="#${color}"` +
    ` stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` +
    `<circle cx="${n(last.x)}" cy="${n(last.y)}" r="2.5" fill="#${color}"/></svg>`
  )
}
