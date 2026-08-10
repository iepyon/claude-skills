/**
 * layout/index.ts — Dispatcher + barrel re-export
 *
 * This file re-exports all layout types and functions from the split modules,
 * and contains the Option-based dispatch logic that routes slides/layouts
 * to the appropriate layout function.
 *
 * Consumers can import everything from "./layout/index.js".
 */
import { pipe, Option as O, Array as A } from "effect"
import {
  SLIDE_WIDTH,
  MARGIN_X,
  MARGIN_Y,
  CONTENT_START_Y,
  TITLE_HEIGHT,
} from "../../constants.js"
import { Slide, SlideLayout, Theme, DefaultLayout, LeftRightLayout, TopBottomLayout, GridLayout, CodeDisplayLayout } from "../../schema/index.js"
import { getLayoutHandlers, getTitleFontSize } from "../../plugins/registry.js"
import { detectOverflow } from "./overflow.js"

// --- Barrel re-exports (preserves all existing import paths) ---

export type {
  TextBox,
  Paragraph,
  InlineTextRun,
  InlineLink,
  BorderBox,
  IconBox,
  CodeBox,
  ShapeBox,
  LayoutResult,
  SectionContext,
  SectionBoxResult,
  GridDimensions,
  GridSpacing,
  ColumnDimensions,
  RowDimensions,
  LeanCanvasCellSpec,
  LeanCanvasDimensions,
} from "./types.js"

export {
  calculateGridDimensions,
  calculateGridSpacing,
  calculateColumnDimensions,
  calculateRowDimensions,
  estimateTextHeight,
  buildSectionBoxes,
  buildTakeawayBox,
  withTakeaway,
  reservedForTakeaway,
} from "./helpers.js"

export { detectOverflow, boxPlainText } from "./overflow.js"
export type { Overflow } from "./overflow.js"
export { validateLayout } from "./validate-layout.js"

export {
  layoutTitleSlide,
  layoutDefault,
  layoutLeftRight,
  layoutTopBottom,
  layoutGrid,
} from "./basic.js"

export {
  layoutIconColumns,
  layoutIconCards,
} from "../../plugins/icon-layout/layout.js"

export {
  layoutNumberedListCircle,
  layoutNumberedListBar,
  layoutNumberedList,
} from "../../plugins/numbered-list/layout.js"

export { layoutSteps } from "../../plugins/steps/layout.js"

export {
  layoutCodeDisplay,
} from "./special.js"

export { layoutLeanCanvas } from "../../plugins/lean-canvas/layout.js"
export { layoutCustomerJourney } from "../../plugins/customer-journey/layout.js"
export { layoutAgenda } from "../../plugins/agenda/layout.js"

// --- Import layout functions for dispatcher ---

import type { LayoutResult } from "./types.js"
import { layoutTitleSlide } from "./basic.js"
import { layoutDefault, layoutLeftRight, layoutTopBottom, layoutGrid } from "./basic.js"
import { layoutCodeDisplay } from "./special.js"
import { TextBox } from "./types.js"

// --- Layout dispatch (Option-based handler pattern) ---

// Layout handler type - returns Some(result) if it handles this layout tag
type LayoutHandler = (
  layout: SlideLayout,
  titleY: number,
  theme: Theme
) => O.Option<LayoutResult>

const handleDefaultLayout: LayoutHandler = (layout, titleY, theme) => {
  if (layout._tag !== "Default") return O.none()
  const l = layout as DefaultLayout
  return O.some(layoutDefault(l.sections, titleY, theme, l.takeaway))
}

const handleLeftRightLayout: LayoutHandler = (layout, titleY, theme) => {
  if (layout._tag !== "LeftRight") return O.none()
  const l = layout as LeftRightLayout
  return O.some(layoutLeftRight(l.leftRatio, l.rightRatio, l.leftSections, l.rightSections, titleY, theme, l.takeaway))
}

const handleTopBottomLayout: LayoutHandler = (layout, titleY, theme) => {
  if (layout._tag !== "TopBottom") return O.none()
  const l = layout as TopBottomLayout
  return O.some(layoutTopBottom(l.topRatio, l.bottomRatio, l.topSections, l.bottomSections, titleY, theme, l.takeaway))
}

const handleGridLayout: LayoutHandler = (layout, titleY, theme) => {
  if (layout._tag !== "Grid") return O.none()
  const l = layout as GridLayout
  return O.some(layoutGrid(l.rows, l.cols, l.cells, titleY, theme, l.takeaway))
}

const handleCodeDisplayLayout: LayoutHandler = (layout, titleY, theme) => {
  if (layout._tag !== "CodeDisplay") return O.none()
  const l = layout as CodeDisplayLayout
  return O.some(layoutCodeDisplay(l.language, l.code, l.caption, titleY, theme))
}

// All layout handlers in priority order (core + plugins)
function buildLayoutHandlers(): ReadonlyArray<LayoutHandler> {
  return [
    handleDefaultLayout,
    handleLeftRightLayout,
    handleTopBottomLayout,
    handleGridLayout,
    handleCodeDisplayLayout,
    ...getLayoutHandlers(),
  ]
}

// テーマのフォントサイズをこの倍率で段階的に下げて再レイアウトを試みる。
// 下限 6pt は calculateGridSpacing の下限と揃えている。
const FONT_SCALE_STEPS = [0.9, 0.8, 0.7, 0.6] as const
const MIN_FONT_SIZE = 6

/**
 * 縮めるのは `contentSlide` のサイズだけ。**他の節を足してはいけない。**
 *
 * `numberedList` / `table` / `agenda` / `wikiPattern` が `contentSlide` の外に
 * 自分のサイズを持っているのは、ここで縮まないことが要るから。特に `wikiPattern` は
 * 隣り合わせで読ませるページなので、本文の長さでページごとに文字が変わってはいけない
 * （`schema/theme.ts` の説明を見よ）。ここに足すと、その保証が黙って外れる。
 */
function scaleThemeFonts(theme: Theme, scale: number): Theme {
  const scaled = (size: number) => Math.max(MIN_FONT_SIZE, Math.round(size * scale))
  return {
    ...theme,
    contentSlide: {
      ...theme.contentSlide,
      headingSize: scaled(theme.contentSlide.headingSize),
      bodySize: scaled(theme.contentSlide.bodySize),
      gridHeadingSize: scaled(theme.contentSlide.gridHeadingSize),
      gridBodySize: scaled(theme.contentSlide.gridBodySize),
    },
  }
}

function dispatchLayoutOnce(
  layout: SlideLayout,
  titleY: number,
  theme: Theme
): LayoutResult {
  const handlers = buildLayoutHandlers()
  return pipe(
    handlers.map(handler => handler(layout, titleY, theme)),
    A.findFirst(O.isSome),
    O.flatten,
    O.getOrElse(() => ({ textBoxes: [] }))
  )
}

/**
 * Dispatch layout, shrinking theme font sizes stepwise if the content overflows.
 *
 * Only layouts that read font sizes from the theme respond to this (Default,
 * LeftRight, TopBottom, Grid, LeanCanvas). Plugins with hardcoded sizes get the
 * same result on every attempt; their overflow is reported by validateLayout
 * instead of being silently shipped.
 */
function dispatchLayout(
  layout: SlideLayout,
  titleY: number,
  theme: Theme
): LayoutResult {
  let result = dispatchLayoutOnce(layout, titleY, theme)
  if (detectOverflow(result).length === 0) return result

  for (const scale of FONT_SCALE_STEPS) {
    const attempt = dispatchLayoutOnce(layout, titleY, scaleThemeFonts(theme, scale))
    if (detectOverflow(attempt).length === 0) return attempt
    result = attempt
  }

  // 最小サイズでも収まらない。validateLayout が ValidationError にする
  return result
}

// --- Slide dispatch ---

// ContentSlideのレイアウト
export function layoutContentSlide(slide: { _tag: "ContentSlide"; title: string; layout: SlideLayout }, theme: Theme): LayoutResult {
  // Check plugin-specific title font size, then default
  const titleFontSize = getTitleFontSize(slide.layout._tag) ?? theme.contentSlide.titleSize

  const titleBox: TextBox = {
    x: MARGIN_X,
    y: MARGIN_Y,
    w: SLIDE_WIDTH - 2 * MARGIN_X,
    h: TITLE_HEIGHT,
    text: slide.title,
    isBold: true,
    fontSize: titleFontSize,
    color: theme.contentSlide.titleColor,
  }

  const layoutResult = dispatchLayout(slide.layout, CONTENT_START_Y, theme)

  return {
    textBoxes: [titleBox, ...layoutResult.textBoxes],
    borderBoxes: layoutResult.borderBoxes,
    iconBoxes: layoutResult.iconBoxes,
    codeBoxes: layoutResult.codeBoxes,
    shapeBoxes: layoutResult.shapeBoxes,
  }
}

// Slide handler type - returns Some(result) if it handles this slide tag
type SlideHandler = (slide: Slide, theme: Theme) => O.Option<LayoutResult>

const handleTitleSlide: SlideHandler = (slide, theme) =>
  slide._tag === "TitleSlide"
    ? O.some(layoutTitleSlide(slide, theme))
    : O.none()

const handleContentSlide: SlideHandler = (slide, theme) =>
  slide._tag === "ContentSlide"
    ? O.some(layoutContentSlide(slide, theme))
    : O.none()

// All slide handlers in priority order
const slideHandlers: ReadonlyArray<SlideHandler> = [
  handleTitleSlide,
  handleContentSlide,
]

// Slideのレイアウト
export function layoutSlide(slide: Slide, theme: Theme): LayoutResult {
  return pipe(
    slideHandlers.map(handler => handler(slide, theme)),
    A.findFirst(O.isSome),
    O.flatten,
    O.getOrElse(() => ({ textBoxes: [] }))
  )
}
