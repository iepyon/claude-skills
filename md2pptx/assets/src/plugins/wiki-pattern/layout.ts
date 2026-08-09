import { Option as O } from "effect"
import { MARGIN_X } from "../../constants.js"
import type { SlideLayout, Theme } from "../../schema/index.js"
import type { ShapeBox, LayoutResult, SectionContext } from "../../renderer/layout/types.js"
import {
  calculateColumnDimensions,
  reservedForTakeaway,
  withTakeaway,
  buildSectionBoxes,
} from "../../renderer/layout/helpers.js"
import { WikiPatternLayout } from "./schema.js"
import {
  WP_LEFT_RATIO,
  WP_RIGHT_RATIO,
  WP_PADDING,
  WP_SECTION_GAP,
  WP_HEADING_HEIGHT,
  WP_HEADING_BODY_GAP,
  WP_TAKEAWAY_HEIGHT,
  WP_PANEL_RADIUS,
  WP_PANEL_BORDER,
  WP_PANEL_BORDER_WIDTH,
  WP_PANEL_PADDING,
} from "./constants.js"

/**
 * 下敷きの高さを図の縦横比に合わせる。列に収まらない比なら列いっぱいのまま。
 *
 * `viewBox` を名乗っていない図（`aspect` が undefined）は形が分からないので、
 * 従来どおり列いっぱいに敷く。
 */
function panelHeight(
  width: number,
  availableHeight: number,
  aspect: number | undefined
): number {
  if (aspect === undefined || aspect <= 0) return availableHeight
  const inner = width - 2 * WP_PANEL_PADDING
  return Math.min(availableHeight, inner / aspect + 2 * WP_PANEL_PADDING)
}

export function layoutWikiPattern(
  layout: WikiPatternLayout,
  titleY: number,
  theme: Theme
): LayoutResult {
  const reserved = reservedForTakeaway(layout.takeaway, WP_TAKEAWAY_HEIGHT)
  const dims = calculateColumnDimensions(WP_LEFT_RATIO, WP_RIGHT_RATIO, titleY, reserved)

  // 左段: いつ・なにが困るか／そこで（と、その中の段落）。**必ず buildSectionBoxes を通す。**
  // `[[…]]` を拾うのは link-graph.ts の collectRefs で、それが見るのは
  // textBoxes の richText / paragraphs だけ。自前で TextBox を組むと
  // 描画は同じに見えたまま Wiki のリンクだけが静かに消える。
  //
  // 文字サイズを theme.wikiPattern から採るのが、ページ間で大きさが揃う理由。
  // contentSlide のサイズは dispatchLayout がはみ出しに応じて縮めるので、
  // そちらを使うと本文の長さでページごとに文字が変わる（theme.ts の説明を見よ）。
  const leftContext: SectionContext = {
    baseX: MARGIN_X,
    baseY: titleY,
    contentWidth: dims.leftWidth,
    padding: WP_PADDING,
    theme,
    headingSize: theme.wikiPattern.headingSize,
    bodySize: theme.wikiPattern.bodySize,
    headingHeight: WP_HEADING_HEIGHT,
    headingBodyGap: WP_HEADING_BODY_GAP,
    sectionGap: WP_SECTION_GAP,
    availableHeight: dims.availableHeight,
  }
  const { textBoxes } = buildSectionBoxes(layout.sections, leftContext)

  // 右段: 下敷き + SVG。どちらもテキストを持たないので、レンダラは deco: を
  // 付けて書き出し、3者比較は両方とも見ない（shape-keys.ts）。
  // **SVG の ShapeBox に text を付けてはいけない** — 比較対象になった瞬間、
  // PPTX 側は addImage でテキストを持たないため必ず食い違う。
  //
  // 下敷きは列いっぱいには伸ばさず、図の縦横比で組んで縦中央に置く。
  // 伸ばすと HTML は図を縮めて上下に帯を作り（preserveAspectRatio）、
  // PPTX は addImage が枠に引き伸ばして図を歪ませる — 同じ原因で別々に崩れる。
  const panelH = panelHeight(dims.rightWidth, dims.availableHeight, layout.diagramAspect)
  const panelY = titleY + (dims.availableHeight - panelH) / 2
  const shapeBoxes: ShapeBox[] = [
    {
      x: dims.rightX,
      y: panelY,
      w: dims.rightWidth,
      h: panelH,
      shapeType: "rect",
      // 同じ役割（内容の後ろに敷く淡いカード）の色がテーマにあるので、そこから採る。
      // ここに hex を書くと --theme でアイコンカードだけ色が変わって並びがずれる
      fillColor: theme.contentSlide.iconCardBackground,
      rectRadius: WP_PANEL_RADIUS,
      borderColor: WP_PANEL_BORDER,
      borderWidth: WP_PANEL_BORDER_WIDTH,
    },
    {
      x: dims.rightX + WP_PANEL_PADDING,
      y: panelY + WP_PANEL_PADDING,
      w: dims.rightWidth - 2 * WP_PANEL_PADDING,
      h: panelH - 2 * WP_PANEL_PADDING,
      shapeType: "svg",
      svgContent: layout.diagram,
    },
  ]

  return withTakeaway({ textBoxes, shapeBoxes }, layout.takeaway, theme, WP_TAKEAWAY_HEIGHT)
}

export const handleWikiPatternLayout = (
  layout: SlideLayout,
  titleY: number,
  theme: Theme
): O.Option<LayoutResult> => {
  if (layout._tag !== "WikiPattern") return O.none()
  return O.some(layoutWikiPattern(layout as WikiPatternLayout, titleY, theme))
}
