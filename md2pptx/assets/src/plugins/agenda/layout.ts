import { Option as O } from "effect"
import {
  SLIDE_WIDTH,
  SLIDE_HEIGHT,
  MARGIN_X,
  MARGIN_Y,
} from "../../constants.js"
import {
  AGENDA_LEFT_PANEL_RATIO,
  AGENDA_CIRCLE_DIAMETER,
  AGENDA_CIRCLE_TEXT_GAP,
  AGENDA_ITEM_GAP,
} from "./constants.js"
import type { SlideLayout, Theme } from "../../schema/index.js"
import type { TextBlock } from "../../schema/index.js"
import { parseInlineFormatting } from "../../parser/inline-formatter.js"
import type {
  TextBox,
  ShapeBox,
  LayoutResult,
} from "../../renderer/layout/types.js"
import { AgendaLayout } from "./schema.js"

// Agenda layout: 左パネル(タイトル) + 右パネル(番号付き項目)
export function layoutAgenda(
  title: string,
  subtitle: string | undefined,
  items: readonly TextBlock[],
  _titleY: number,
  theme: Theme,
): LayoutResult {
  const textBoxes: TextBox[] = []
  const shapeBoxes: ShapeBox[] = []

  // --- Left panel ---
  const leftPanelW = SLIDE_WIDTH * AGENDA_LEFT_PANEL_RATIO
  const leftPadding = 0.4

  // Left panel background
  shapeBoxes.push({
    x: 0,
    y: 0,
    w: leftPanelW,
    h: SLIDE_HEIGHT,
    shapeType: "rect",
    fillColor: theme.titleSlide.background,
  })

  // Title in left panel (vertically centered, slightly above center)
  const titleH = 1.0
  const subtitleH = 0.5
  const titleBlockH = titleH + (subtitle ? subtitleH : 0)
  const titleY = (SLIDE_HEIGHT - titleBlockH) / 2

  textBoxes.push({
    x: leftPadding,
    y: titleY,
    w: leftPanelW - 2 * leftPadding,
    h: titleH,
    text: title,
    isBold: true,
    fontSize: theme.agenda.titleSize,
    color: theme.titleSlide.titleColor,
    valign: "bottom",
  })

  // Subtitle in left panel
  if (subtitle) {
    textBoxes.push({
      x: leftPadding,
      y: titleY + titleH,
      w: leftPanelW - 2 * leftPadding,
      h: subtitleH,
      text: subtitle,
      fontSize: theme.agenda.subtitleSize,
      color: theme.titleSlide.subtitleColor,
      valign: "top",
    })
  }

  // --- Right panel ---
  const rightPanelX = leftPanelW
  const rightPanelW = SLIDE_WIDTH - leftPanelW
  const rightPadding = MARGIN_X
  const contentX = rightPanelX + rightPadding
  const contentW = rightPanelW - 2 * rightPadding
  const contentStartY = MARGIN_Y
  const availableHeight = SLIDE_HEIGHT - 2 * MARGIN_Y
  const itemCount = items.length
  const totalGaps = (itemCount - 1) * AGENDA_ITEM_GAP
  const itemHeight = itemCount > 0 ? (availableHeight - totalGaps) / itemCount : availableHeight

  items.forEach((item, i) => {
    const itemY = contentStartY + i * (itemHeight + AGENDA_ITEM_GAP)

    // Badge vertically centered in item
    const badgeY = itemY + (itemHeight - AGENDA_CIRCLE_DIAMETER) / 2
    shapeBoxes.push({
      x: contentX,
      y: badgeY,
      w: AGENDA_CIRCLE_DIAMETER,
      h: AGENDA_CIRCLE_DIAMETER,
      shapeType: "ellipse",
      fillColor: theme.agenda.badgeColor,
      text: String(i + 1),
      textColor: theme.agenda.badgeTextColor,
      fontSize: 14,
      isBold: true,
    })

    // Text area to the right of badge
    const textX = contentX + AGENDA_CIRCLE_DIAMETER + AGENDA_CIRCLE_TEXT_GAP
    const textW = contentW - AGENDA_CIRCLE_DIAMETER - AGENDA_CIRCLE_TEXT_GAP

    if (item.body) {
      // Heading + body: stack vertically, centered on badge
      const headingH = 0.22
      const bodyH = 0.22
      const gap = 0.02
      const blockH = headingH + gap + bodyH
      const blockY = badgeY + (AGENDA_CIRCLE_DIAMETER - blockH) / 2

      textBoxes.push({
        x: textX,
        y: blockY,
        w: textW,
        h: headingH,
        richText: parseInlineFormatting(item.heading || ""),
        isBold: true,
        fontSize: theme.agenda.itemSize,
        color: theme.contentSlide.headingColor,
        valign: "bottom",
      })
      textBoxes.push({
        x: textX,
        y: blockY + headingH + gap,
        w: textW,
        h: bodyH,
        richText: parseInlineFormatting(item.body),
        fontSize: theme.contentSlide.bodySize,
        color: theme.contentSlide.textColor,
        valign: "top",
      })
    } else if (item.heading) {
      // Heading only: vertically centered with badge
      textBoxes.push({
        x: textX,
        y: badgeY,
        w: textW,
        h: AGENDA_CIRCLE_DIAMETER,
        richText: parseInlineFormatting(item.heading),
        isBold: true,
        fontSize: theme.agenda.itemSize,
        color: theme.contentSlide.headingColor,
        valign: "middle",
      })
    }

    // Separator line (except last item)
    if (i < itemCount - 1) {
      const sepY = itemY + itemHeight
      shapeBoxes.push({
        x: contentX,
        y: sepY,
        w: contentW,
        h: 0,
        shapeType: "line",
        fillColor: "",
        lineWidth: 1,
        lineColor: theme.numberedList.separatorColor,
      })
    }
  })

  return { textBoxes, shapeBoxes }
}

// Layout handler for plugin dispatch
export const handleAgendaLayout = (
  layout: SlideLayout,
  titleY: number,
  theme: Theme,
): O.Option<LayoutResult> => {
  if (layout._tag !== "Agenda") return O.none()
  const l = layout as AgendaLayout
  return O.some(layoutAgenda(l.title, l.subtitle, l.items, titleY, theme))
}
