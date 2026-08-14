import { Option as O } from "effect"
import { MARGIN_X, MARGIN_Y, SLIDE_HEIGHT } from "../../constants.js"
import type { SlideLayout, Theme } from "../../schema/index.js"
import type {
  ShapeBox,
  TextBox,
  LayoutResult,
  SectionContext,
} from "../../renderer/layout/types.js"
import { calculateColumnDimensions, buildSectionBoxes } from "../../renderer/layout/helpers.js"
import { WikiPatternLayout } from "./schema.js"
import {
  WP_LEFT_RATIO,
  WP_RIGHT_RATIO,
  WP_PADDING,
  WP_SECTION_GAP,
  WP_HEADING_HEIGHT,
  WP_HEADING_BODY_GAP,
  WP_SOURCE_HEIGHT,
  WP_PANEL_RADIUS,
  WP_PANEL_BORDER,
  WP_PANEL_BORDER_WIDTH,
  WP_PANEL_PADDING,
  WP_PANEL_SHIFT_X,
} from "./constants.js"

/**
 * 下敷きの寸法を図の縦横比に合わせる。**幅と高さの両方で列に収める。**
 *
 * 横長の図は列の幅で決まって高さが余り、縦長の図は列の高さで決まって幅が余る。
 * 余ったほうの向きに寄せる（置き場所は呼び出し側が中央に取る）。
 *
 * 高さだけを合わせて幅は列いっぱい、としないのは、縦長の図で下敷きが図より
 * 横長になるため — その食い違いは HTML では左右の帯、PPTX では引き伸ばしとして
 * 別々の壊れ方で出る（生成物を見比べても気づきにくい）。今の図は 340x320 の
 * 横長ばかりで幅のほうが先に尽きるので、この分岐は将来の縦長の図のために効く。
 *
 * `viewBox` を名乗っていない図（`aspect` が undefined）は形が分からないので、
 * 従来どおり列いっぱいに敷く。
 */
function panelSize(
  columnWidth: number,
  availableHeight: number,
  aspect: number | undefined
): { w: number; h: number } {
  if (aspect === undefined || aspect <= 0) return { w: columnWidth, h: availableHeight }
  const innerW = columnWidth - 2 * WP_PANEL_PADDING
  const innerH = availableHeight - 2 * WP_PANEL_PADDING
  const w = Math.min(innerW, innerH * aspect)
  return { w: w + 2 * WP_PANEL_PADDING, h: w / aspect + 2 * WP_PANEL_PADDING }
}

/**
 * 出典の箱。左段の幅で、スライドの下端に敷く。
 *
 * **全幅にしない。** 出典は左段の主張の典拠なので、左端と幅が本文と揃っていないと
 * 図解にも掛かる注記に見える。図の下敷きは列の中で縦中央にあるので下に余地はあるが、
 * そこまで伸ばすと「このスライド全体の脚注」に読み替わる。
 *
 * 幅は下敷きの左端で止める（`WP_PANEL_SHIFT_X` ぶん図が左へ寄ると、列の幅のままでは
 * 下敷きの下へ 0.07in はみ出す）。列いっぱいに敷かれる図——`viewBox` を名乗らない
 * 図がそれ——は下端まで届くので、はみ出しは重なりとして実際に見える。
 *
 * `richText` を使わず `text` で置くのが、リンクにならない仕組み
 * （schema.ts の source の説明を見よ）。
 */
function buildSourceBox(source: string, width: number, theme: Theme): TextBox {
  return {
    x: MARGIN_X,
    y: SLIDE_HEIGHT - MARGIN_Y - WP_SOURCE_HEIGHT,
    w: width,
    h: WP_SOURCE_HEIGHT,
    text: source,
    fontSize: theme.wikiPattern.sourceSize,
    color: theme.wikiPattern.sourceColor,
    align: "left",
    valign: "bottom",
  }
}

function layoutWikiPattern(
  layout: WikiPatternLayout,
  titleY: number,
  theme: Theme
): LayoutResult {
  // 下端に積むのは出典だけ（パターンは takeaway を受けない）
  const reserved = layout.source ? WP_SOURCE_HEIGHT : 0
  const dims = calculateColumnDimensions(WP_LEFT_RATIO, WP_RIGHT_RATIO, titleY, reserved)

  // 左段: いつ・なにが困るか／そこで（と、その中の段落）。**必ず buildSectionBoxes を通す。**
  // リンクを拾うのは link-graph.ts の collectRefs で、それが見るのは
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
  // 下敷きは列いっぱいには伸ばさず、図の縦横比で組んで置く。
  // 伸ばすと HTML は図を縮めて帯を作り（preserveAspectRatio）、
  // PPTX は addImage が枠に引き伸ばして図を歪ませる — 同じ原因で別々に崩れる。
  const panel = panelSize(dims.rightWidth, dims.availableHeight, layout.diagramAspect)
  const panelX = dims.rightX + (dims.rightWidth - panel.w) / 2 - WP_PANEL_SHIFT_X
  // 上は左段の最初の見出し（`いつ・なにが困るか`）にそろえる。見出しの箱は
  // buildSectionBoxes が titleY + WP_PADDING から積み始めるので、同じ線から始める。
  // 縦中央に置いていた頃は、図の高さがページごとに違うと上の線もページごとに動いた。
  // 列の下端を割るときだけ持ち上げる（縦長の図と、比の分からない図がそれ）
  const panelY = Math.min(titleY + WP_PADDING, titleY + dims.availableHeight - panel.h)
  const shapeBoxes: ShapeBox[] = [
    {
      x: panelX,
      y: panelY,
      w: panel.w,
      h: panel.h,
      shapeType: "rect",
      // 同じ役割（内容の後ろに敷く淡いカード）の色がテーマにあるので、そこから採る。
      // ここに hex を書くと --theme でアイコンカードだけ色が変わって並びがずれる
      fillColor: theme.contentSlide.iconCardBackground,
      rectRadius: WP_PANEL_RADIUS,
      borderColor: WP_PANEL_BORDER,
      borderWidth: WP_PANEL_BORDER_WIDTH,
    },
    {
      x: panelX + WP_PANEL_PADDING,
      y: panelY + WP_PANEL_PADDING,
      w: panel.w - 2 * WP_PANEL_PADDING,
      h: panel.h - 2 * WP_PANEL_PADDING,
      shapeType: "svg",
      svgContent: layout.diagram,
    },
  ]

  // 出典は下端に接する（上に積まれるものは無い）
  const withSource = layout.source
    ? [...textBoxes, buildSourceBox(layout.source, Math.min(dims.leftWidth, panelX - MARGIN_X), theme)]
    : textBoxes

  return { textBoxes: withSource, shapeBoxes }
}

export const handleWikiPatternLayout = (
  layout: SlideLayout,
  titleY: number,
  theme: Theme
): O.Option<LayoutResult> => {
  if (layout._tag !== "WikiPattern") return O.none()
  return O.some(layoutWikiPattern(layout as WikiPatternLayout, titleY, theme))
}
