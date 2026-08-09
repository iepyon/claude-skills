import { Option as O } from "effect"
import {
  SLIDE_WIDTH,
  SLIDE_HEIGHT,
  MARGIN_X,
  MARGIN_Y,
  TAKEAWAY_HEIGHT,
} from "../../constants.js"
import {
  STEPS_ARROW_GAP,
  STEPS_LABEL_HEIGHT,
  STEPS_LABEL_ICON_GAP,
  STEPS_ICON_HEIGHT,
  STEPS_ICON_GAP,
  STEPS_DESC_HEIGHT,
  STEPS_DESC_HEIGHT_TAKEAWAY,
  STEPS_DESC_GAP,
  STEPS_MIN_BOX_RATIO,
  STEPS_LEVEL_HEIGHT,
  STEPS_NAME_HEIGHT,
  STEPS_BOX_PADDING,
  STEPS_INNER_GAP,
} from "./constants.js"
import type { SlideLayout, Theme } from "../../schema/index.js"
import type {
  TextBox,
  BorderBox,
  IconBox,
  LayoutResult,
} from "../../renderer/layout/types.js"
import {
  reservedForTakeaway,
} from "../../renderer/layout/helpers.js"
import { StepsLayout } from "./schema.js"

/**
 * StepsLayoutのレイアウト（階段状ダイアグラム）
 *
 * Algorithm (staircase height via linear interpolation):
 * 1. Calculate available height after reserving space for labels, icons, descriptions, and takeaway.
 * 2. For N steps, compute box heights using linear interpolation:
 *    - minH = availableHeight * STEPS_MIN_BOX_RATIO (shortest step)
 *    - maxH = availableHeight (tallest step)
 *    - height[i] = minH + (maxH - minH) * (i / (N-1))
 *    This creates the ascending staircase effect from left to right.
 * 3. All boxes are bottom-aligned at the same Y coordinate.
 * 4. Labels and icons float above each box, positioned relative to the box top.
 */
export function layoutSteps(
  steps: ReadonlyArray<{ heading: string; icon?: string; name: string; body?: string }>,
  takeaway: string | undefined,
  titleY: number,
  theme: Theme
): LayoutResult {
  const contentWidth = SLIDE_WIDTH - 2 * MARGIN_X
  const N = steps.length

  // Font size adaptation based on step count
  let nameSize = 14
  let labelSize = 12
  let descSize = 10
  let levelSize = 10

  if (N === 5) {
    nameSize = 12
    labelSize = 11
    descSize = takeaway ? 8 : 9 // Further reduce when takeaway is present
    levelSize = 9
  } else if (N >= 6) {
    nameSize = 11
    labelSize = 10
    descSize = takeaway ? 7 : 8 // Further reduce when takeaway is present
    levelSize = 8
  }

  // Calculate step width
  const stepWidth = (contentWidth - (N - 1) * STEPS_ARROW_GAP) / N

  // Calculate available space for boxes and labels/icons
  // Reserve space for takeaway if present
  const reservedBottom = reservedForTakeaway(takeaway)
  // Dynamic description height: smaller when takeaway is present
  const descHeight = takeaway ? STEPS_DESC_HEIGHT_TAKEAWAY : STEPS_DESC_HEIGHT
  // Total space = available for boxes + label + icon + gaps + description
  const totalAvailableHeight = SLIDE_HEIGHT - titleY - MARGIN_Y - descHeight - STEPS_DESC_GAP - reservedBottom

  // Reserve space for label, icon, and gaps above the tallest box
  // Gap between label and icon + gap between icon and box
  const reservedTopSpace = STEPS_LABEL_HEIGHT + STEPS_LABEL_ICON_GAP + STEPS_ICON_HEIGHT + STEPS_ICON_GAP
  const availableHeight = totalAvailableHeight - reservedTopSpace

  // Box height: linear interpolation from minH to maxH (staircase effect)
  const minH = availableHeight * STEPS_MIN_BOX_RATIO
  const maxH = availableHeight
  const boxHeights = steps.map((_, i) =>
    N === 1 ? maxH : minH + (maxH - minH) * (i / (N - 1))
  )

  // Bottom alignment (all boxes align at the same bottom edge)
  const boxBottom = titleY + reservedTopSpace + availableHeight

  const borderBoxes: BorderBox[] = []
  const allTextBoxes: TextBox[] = []
  const iconBoxes: IconBox[] = []
  const stepsColors = theme.contentSlide.stepsColors

  steps.forEach((step, i) => {
    const stepX = MARGIN_X + i * (stepWidth + STEPS_ARROW_GAP)
    const boxH = boxHeights[i]
    const boxY = boxBottom - boxH
    const stepColor = stepsColors[i % stepsColors.length]

    // Icon (just above the box top).
    // アイコンが無いステップには箱を作らない。空の IconBox は PPTX に
    // addText("") の見えない図形を、HTML に空の span を残す（縦の余白は
    // 上の計算で既に確保済みなので、出さなくても座標は動かない）
    const iconY = boxY - STEPS_ICON_HEIGHT - STEPS_ICON_GAP
    if (step.icon) {
      iconBoxes.push({
        x: stepX,
        y: iconY,
        w: stepWidth,
        h: STEPS_ICON_HEIGHT,
        icon: step.icon,
        color: stepColor,
        fontSize: 24,
      })
    }

    // Label (above icon with gap, accent color)
    const labelY = iconY - STEPS_LABEL_HEIGHT - STEPS_LABEL_ICON_GAP
    allTextBoxes.push({
      x: stepX,
      y: labelY,
      w: stepWidth,
      h: STEPS_LABEL_HEIGHT,
      text: step.heading,
      isBold: true,
      fontSize: labelSize,
      color: stepColor,
      align: "center",
      valign: "middle",
    })

    // Border box (colored rectangle)
    borderBoxes.push({
      x: stepX,
      y: boxY,
      w: stepWidth,
      h: boxH,
      fillColor: stepColor,
    })

    // Level text (Lv.N) inside box at top
    const levelY = boxY + STEPS_BOX_PADDING
    allTextBoxes.push({
      x: stepX + STEPS_BOX_PADDING,
      y: levelY,
      w: stepWidth - 2 * STEPS_BOX_PADDING,
      h: STEPS_LEVEL_HEIGHT,
      text: `Lv.${i + 1}`,
      isBold: true,
      fontSize: levelSize,
      color: "FFFFFF",
      align: "center",
      valign: "middle",
    })

    // Name text (bold, large) inside box below level
    const nameY = levelY + STEPS_LEVEL_HEIGHT + STEPS_INNER_GAP
    allTextBoxes.push({
      x: stepX + STEPS_BOX_PADDING,
      y: nameY,
      w: stepWidth - 2 * STEPS_BOX_PADDING,
      h: STEPS_NAME_HEIGHT,
      text: step.name,
      isBold: true,
      fontSize: nameSize,
      color: "FFFFFF",
      align: "center",
      valign: "middle",
    })

    // Description (below box)
    if (step.body) {
      const descY = boxBottom + STEPS_DESC_GAP
      allTextBoxes.push({
        x: stepX,
        y: descY,
        w: stepWidth,
        h: descHeight,
        text: step.body,
        fontSize: descSize,
        color: theme.contentSlide.textColor,
        align: "left",
        valign: "top",
      })
    }

    // Arrow (→) between steps
    if (i < N - 1) {
      const arrowX = stepX + stepWidth
      const arrowY = boxBottom - boxH / 2
      allTextBoxes.push({
        x: arrowX,
        y: arrowY - 0.15,
        w: STEPS_ARROW_GAP,
        h: 0.3,
        text: "→",
        fontSize: 24,
        color: theme.contentSlide.textColor,
        align: "center",
        valign: "middle",
      })
    }
  })

  // Takeaway (steps uses standard bottom-of-slide positioning)
  if (takeaway) {
    const takeawayY = SLIDE_HEIGHT - MARGIN_Y - TAKEAWAY_HEIGHT
    allTextBoxes.push({
      x: MARGIN_X,
      y: takeawayY,
      w: SLIDE_WIDTH - 2 * MARGIN_X,
      h: TAKEAWAY_HEIGHT,
      text: takeaway,
      isBold: true,
      fontSize: theme.contentSlide.takeawaySize,
      color: theme.contentSlide.takeawayColor,
      align: "center",
      valign: "middle",
    })
  }

  return { textBoxes: allTextBoxes, borderBoxes, iconBoxes }
}

// Layout handler for plugin dispatch
export const handleStepsLayout = (
  layout: SlideLayout,
  titleY: number,
  theme: Theme
): O.Option<LayoutResult> => {
  if (layout._tag !== "Steps") return O.none()
  const l = layout as StepsLayout
  return O.some(layoutSteps(l.steps, l.takeaway, titleY, theme))
}
