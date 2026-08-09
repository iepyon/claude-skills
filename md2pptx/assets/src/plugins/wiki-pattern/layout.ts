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
  WP_PANEL_RADIUS,
  WP_PANEL_BORDER,
  WP_PANEL_BORDER_WIDTH,
  WP_PANEL_PADDING,
} from "./constants.js"

export function layoutWikiPattern(
  layout: WikiPatternLayout,
  titleY: number,
  theme: Theme
): LayoutResult {
  const reserved = reservedForTakeaway(layout.takeaway)
  const dims = calculateColumnDimensions(WP_LEFT_RATIO, WP_RIGHT_RATIO, titleY, reserved)

  // 左段: 状況/問題/解決。**必ず buildSectionBoxes を通す。**
  // `[[…]]` を拾うのは link-graph.ts の collectRefs で、それが見るのは
  // textBoxes の richText / paragraphs だけ。自前で TextBox を組むと
  // 描画は同じに見えたまま Wiki のリンクだけが静かに消える。
  const leftContext: SectionContext = {
    baseX: MARGIN_X,
    baseY: titleY,
    contentWidth: dims.leftWidth,
    padding: 0.1,
    theme,
    availableHeight: dims.availableHeight,
  }
  const { textBoxes } = buildSectionBoxes(layout.sections, leftContext)

  // 右段: 下敷き + SVG。どちらもテキストを持たないので、レンダラは deco: を
  // 付けて書き出し、3者比較は両方とも見ない（shape-keys.ts）。
  // **SVG の ShapeBox に text を付けてはいけない** — 比較対象になった瞬間、
  // PPTX 側は addImage でテキストを持たないため必ず食い違う。
  const shapeBoxes: ShapeBox[] = [
    {
      x: dims.rightX,
      y: titleY,
      w: dims.rightWidth,
      h: dims.availableHeight,
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
      y: titleY + WP_PANEL_PADDING,
      w: dims.rightWidth - 2 * WP_PANEL_PADDING,
      h: dims.availableHeight - 2 * WP_PANEL_PADDING,
      shapeType: "svg",
      svgContent: layout.diagram,
    },
  ]

  return withTakeaway({ textBoxes, shapeBoxes }, layout.takeaway, theme)
}

export const handleWikiPatternLayout = (
  layout: SlideLayout,
  titleY: number,
  theme: Theme
): O.Option<LayoutResult> => {
  if (layout._tag !== "WikiPattern") return O.none()
  return O.some(layoutWikiPattern(layout as WikiPatternLayout, titleY, theme))
}
