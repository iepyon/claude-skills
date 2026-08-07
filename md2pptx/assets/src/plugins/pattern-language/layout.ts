import { Option as O } from "effect"
import { SLIDE_WIDTH, SLIDE_HEIGHT } from "../../constants.js"
import type { SlideLayout, Theme } from "../../schema/index.js"
import type {
  TextBox,
  BorderBox,
  ShapeBox,
  LayoutResult,
} from "../../renderer/layout/types.js"
import { PatternLanguageOverviewLayout, PatternLanguageDetailLayout } from "./schema.js"
import type { PatternMeta, PatternSuccessExample, PatternFailureExample, ConcreteExample, ConcreteExampleItem } from "./schema.js"
import {
  PL_DARK_GREEN,
  PL_LIGHT_GREEN,
  PL_SUCCESS_GREEN,
  PL_FAILURE_RED,
  PL_GRAY,
  PL_LIGHT_GRAY,
  PL_WHITE,
  PL_DARK_TEXT,
  P1_LEFT_PANEL_W,
  P1_RIGHT_PANEL_X,
  P1_RIGHT_PANEL_W,
  P1_LEFT_PADDING,
  P1_LEFT_CONTENT_W,
  P1_RIGHT_PADDING,
  P1_HEADING_FONT_SIZE,
  P1_BODY_FONT_SIZE,
  P1_HEADING_HEIGHT,
  P1_HEADING_BODY_GAP,
  P1_REFERENCE_FONT_SIZE,
  P1_ICON_SIZE,
  P1_ICON_GAP,
  P1_ICON_BG_DEFAULT,
  P1_ICON_BG_WARN,
  P1_HEADING_COLOR,
  P1_SECTION_GAP,
  P1_DIAGRAM_BG,
  P2_HEADER_H,
  P2_BADGE_X,
  P2_BADGE_Y,
  P2_BADGE_SIZE,
  P2_TITLE_X,
  P2_TITLE_FONT_SIZE,
  P2_CONTENT_START_Y,
  P2_LEFT_COL_X,
  P2_LEFT_COL_W,
  P2_RIGHT_COL_X,
  P2_RIGHT_COL_W,
  P2_INNER_PADDING,
  P2_LABEL_FONT_SIZE,
  P2_BODY_FONT_SIZE,
  P2_SUB_LABEL_FONT_SIZE,
  PAGE_NUM_X,
  PAGE_NUM_Y,
  PAGE_NUM_W,
  PAGE_NUM_H,
  P2_BORDER_WIDTH,
  P2_BORDER_COLOR,
} from "./constants.js"

// --- Helper: difficulty/frequency dots ---
function dotsText(filled: number, total: number): string {
  return "●".repeat(filled) + "○".repeat(total - filled)
}

// --- Helper: add page number ---
function addPageNumber(textBoxes: TextBox[], page: number, total: number): void {
  textBoxes.push({
    x: PAGE_NUM_X,
    y: PAGE_NUM_Y,
    w: PAGE_NUM_W,
    h: PAGE_NUM_H,
    text: `${page} / ${total}`,
    fontSize: 7,
    color: PL_GRAY,
    align: "center",
    valign: "middle",
  })
}

// --- Section icon mapping ---
const SECTION_ICONS: Array<{ emoji: string; bg: string }> = [
  { emoji: "🕐", bg: P1_ICON_BG_DEFAULT },  // 状況・いつ使うか
  { emoji: "❓", bg: P1_ICON_BG_DEFAULT },  // 問題・なぜ必要か
  { emoji: "🎯", bg: P1_ICON_BG_DEFAULT },  // 何をするのか
  { emoji: "✅", bg: P1_ICON_BG_DEFAULT },  // 結果どうなるか
  { emoji: "⚠️", bg: P1_ICON_BG_WARN },    // 注意することは
]

// ============================================================
// Page 1: Overview Card
// ============================================================
function layoutOverview(layout: PatternLanguageOverviewLayout, _titleY: number, _theme: Theme): LayoutResult {
  const meta = layout.meta
  const textBoxes: TextBox[] = []
  const shapeBoxes: ShapeBox[] = []

  // --- Left panel background ---
  shapeBoxes.push({
    x: 0,
    y: 0,
    w: P1_LEFT_PANEL_W,
    h: SLIDE_HEIGHT,
    shapeType: "rect",
    fillColor: PL_DARK_GREEN,
  })

  // --- Left panel content ---
  // Category + Stage tag
  textBoxes.push({
    x: P1_LEFT_PADDING,
    y: 0.20,
    w: P1_LEFT_CONTENT_W,
    h: 0.16,
    text: `${meta.category} — ${meta.stage}`,
    fontSize: 7,
    color: PL_LIGHT_GREEN,
    align: "left",
    valign: "middle",
  })

  // PATTERN XX
  textBoxes.push({
    x: P1_LEFT_PADDING,
    y: 0.40,
    w: P1_LEFT_CONTENT_W,
    h: 0.16,
    text: `PATTERN ${meta.number}`,
    isBold: true,
    fontSize: 8,
    color: PL_LIGHT_GREEN,
    align: "left",
    valign: "middle",
  })

  // Title
  textBoxes.push({
    x: P1_LEFT_PADDING,
    y: 0.60,
    w: P1_LEFT_CONTENT_W,
    h: 0.28,
    text: meta.name,
    isBold: true,
    fontSize: 15,
    color: PL_WHITE,
    valign: "top",
    lineHeight: 1.35,
  })

  // Border line below title
  shapeBoxes.push({
    x: P1_LEFT_PADDING,
    y: 0.96,
    w: P1_LEFT_CONTENT_W,
    h: 0,
    shapeType: "line",
    lineColor: "4E7D4E",
    lineWidth: 0.25,
  })

  // Oneliner
  textBoxes.push({
    x: P1_LEFT_PADDING,
    y: 1.02,
    w: P1_LEFT_CONTENT_W,
    h: 0.40,
    text: meta.oneliner,
    fontSize: 9,
    color: PL_LIGHT_GREEN,
    valign: "top",
    lineHeight: 1.35,
  })

  // --- Left panel bottom section (built bottom-up) ---
  // Takeaway (very bottom of left panel)
  const takeawayH = 0.45
  const takeawayY = SLIDE_HEIGHT - takeawayH - 0.14
  textBoxes.push({
    x: P1_LEFT_PADDING,
    y: takeawayY,
    w: P1_LEFT_CONTENT_W,
    h: takeawayH,
    text: meta.takeaway,
    isItalic: true,
    fontSize: 8,
    color: PL_LIGHT_GREEN,
    valign: "bottom",
  })

  // Difficulty + Frequency (just above takeaway)
  const diffH = 0.18
  const diffY = takeawayY - diffH
  textBoxes.push({
    x: P1_LEFT_PADDING,
    y: diffY,
    w: P1_LEFT_CONTENT_W,
    h: diffH,
    text: `難易度 ${dotsText(meta.difficulty, 5)}　　使用頻度 ${dotsText(meta.frequency, 5)}`,
    fontSize: 8,
    color: PL_LIGHT_GREEN,
    align: "left",
    valign: "middle",
  })

  // Related patterns (above difficulty)
  let bottomSectionTopY = diffY
  if (meta.relatedPatterns.length > 0) {
    const tagH = 0.15
    const tagGap = 0.04
    const tagPaddingX = 0.04
    const charWidth = 7 * 1.1 / 72
    const labelH = 0.13
    const labelGap = 0.02

    // Pre-calculate rows needed for tags
    let rowCount = 1
    let simX = 0
    meta.relatedPatterns.forEach((pat) => {
      const tagW = pat.length * charWidth + tagPaddingX * 2
      if (simX + tagW > P1_LEFT_CONTENT_W && simX > 0) {
        rowCount++
        simX = 0
      }
      simX += tagW + tagGap
    })

    const tagsAreaH = rowCount * tagH + Math.max(0, rowCount - 1) * tagGap
    const relatedAreaH = labelH + labelGap + tagsAreaH
    const relatedStartY = diffY - 0.01 - relatedAreaH
    bottomSectionTopY = relatedStartY

    // Bottom section background (slightly lighter than panel, drawn before tags)
    const bgPad = 0.08
    shapeBoxes.push({
      x: P1_LEFT_PADDING - bgPad,
      y: bottomSectionTopY - bgPad,
      w: P1_LEFT_CONTENT_W + bgPad * 2,
      h: (takeawayY + takeawayH) - bottomSectionTopY + bgPad * 2,
      shapeType: "rect",
      fillColor: "256B2A",
      rectRadius: 0.06,
    })

    // Label
    textBoxes.push({
      x: P1_LEFT_PADDING,
      y: relatedStartY,
      w: P1_LEFT_CONTENT_W,
      h: labelH,
      text: "関連パターン",
      fontSize: 7,
      color: PL_LIGHT_GREEN,
      align: "left",
      valign: "middle",
    })

    // Tags (top-down within calculated area)
    let tagX = P1_LEFT_PADDING
    let tagRowY = relatedStartY + labelH + labelGap
    meta.relatedPatterns.forEach((pat) => {
      const textW = pat.length * charWidth
      const tagW = textW + tagPaddingX * 2
      if (tagX + tagW > P1_LEFT_PADDING + P1_LEFT_CONTENT_W && tagX > P1_LEFT_PADDING) {
        tagX = P1_LEFT_PADDING
        tagRowY += tagH + tagGap
      }
      shapeBoxes.push({
        x: tagX,
        y: tagRowY,
        w: tagW,
        h: tagH,
        shapeType: "rect",
        fillColor: PL_DARK_GREEN,
        rectRadius: 0.03,
        text: pat,
        textColor: PL_LIGHT_GREEN,
        fontSize: 7,
        borderColor: "4E7D4E",
        borderWidth: 0.5,
      })
      tagX += tagW + tagGap
    })
  }

  // Communication diagram (fills space between top content and bottom meta)
  const bgPadForDiagram = 0.08
  const diagramStartY = 1.55
  const diagramEndY = bottomSectionTopY - bgPadForDiagram - 0.06
  const diagramH = Math.max(0.5, diagramEndY - diagramStartY)

  if (layout.diagram) {
    // Background for diagram (same as related patterns)
    shapeBoxes.push({
      x: P1_LEFT_PADDING,
      y: diagramStartY,
      w: P1_LEFT_CONTENT_W,
      h: diagramH,
      shapeType: "rect",
      fillColor: "256B2A",  // 関連パターンと同じ
      rectRadius: 0.06,
    })
    // Render SVG diagram on top of background
    shapeBoxes.push({
      x: P1_LEFT_PADDING,
      y: diagramStartY,
      w: P1_LEFT_CONTENT_W,
      h: diagramH,
      shapeType: "svg",
      svgContent: layout.diagram,
    })
  } else {
    // Placeholder background when no diagram
    shapeBoxes.push({
      x: P1_LEFT_PADDING,
      y: diagramStartY,
      w: P1_LEFT_CONTENT_W,
      h: diagramH,
      shapeType: "rect",
      fillColor: "256B2A",
      rectRadius: 0.06,
    })
  }

  // --- Right panel sections ---
  const rightX = P1_RIGHT_PANEL_X + P1_RIGHT_PADDING
  const rightW = P1_RIGHT_PANEL_W - 2 * P1_RIGHT_PADDING
  const iconTextX = rightX + P1_ICON_SIZE + P1_ICON_GAP  // text starts after icon
  const iconTextW = rightW - P1_ICON_SIZE - P1_ICON_GAP  // narrower text width
  let currentY = 0.2

  const rightSections: Array<{ heading: string; body: string }> = [
    { heading: "状況・いつ使うか", body: layout.situation },
    { heading: "問題・なぜ必要か", body: layout.problem },
    { heading: "何をするのか", body: layout.solution },
    { heading: "結果どうなるか", body: layout.result },
    { heading: "注意することは", body: layout.caution },
  ]

  // Add principles to solution body if present
  if (layout.principles.length > 0) {
    const solutionIdx = rightSections.findIndex((s) => s.heading === "何をするのか")
    if (solutionIdx >= 0) {
      const principleText = layout.principles.map((p) => `• ${p}`).join("\n")
      const existingBody = rightSections[solutionIdx].body
      rightSections[solutionIdx] = {
        ...rightSections[solutionIdx],
        body: existingBody ? `${existingBody}\n${principleText}` : principleText,
      }
    }
  }

  // Reserve space for reference at bottom
  const referenceH = meta.reference ? 0.35 : 0

  // Content-proportional distribution: estimate content lines, allocate body space
  // proportionally, and use a fixed gap (P1_SECTION_GAP) between sections for
  // uniform visual spacing regardless of text length differences.
  const activeSections = rightSections
    .map((s, i) => ({ section: s, originalIndex: i }))
    .filter(({ section }) => section.body || section.heading === "何をするのか")

  const CJK_CHARS_PER_LINE = 40
  const LINE_H = P1_BODY_FONT_SIZE * 1.45 / 72
  const estimateLines = (text: string): number => {
    if (!text) return 1
    return text.split("\n").reduce(
      (sum, line) => sum + Math.max(1, Math.ceil(line.length / CJK_CHARS_PER_LINE)),
      0,
    )
  }
  const sectionLineEstimates = activeSections.map(({ section }) => estimateLines(section.body))

  const headerRowH = P1_HEADING_HEIGHT + P1_HEADING_BODY_GAP
  const totalAvailableH = SLIDE_HEIGHT - currentY - 0.10 - referenceH
  const totalHeaderH = activeSections.length * headerRowH
  const totalGapH = Math.max(0, activeSections.length - 1) * P1_SECTION_GAP

  // Estimate actual body heights from line counts; if content fits, use
  // estimated heights (excess goes to bottom). Otherwise scale down.
  const estimatedBodyHeights = sectionLineEstimates.map((lines) => lines * LINE_H)
  const totalEstimatedBody = estimatedBodyHeights.reduce((a, b) => a + b, 0)
  const totalBodyBudget = Math.max(0, totalAvailableH - totalHeaderH - totalGapH)

  const bodyHeights = totalEstimatedBody <= totalBodyBudget
    ? estimatedBodyHeights
    : estimatedBodyHeights.map((h) => (h / totalEstimatedBody) * totalBodyBudget)

  let yPos = currentY
  activeSections.forEach(({ section, originalIndex }, activeIdx) => {
    const icon = SECTION_ICONS[originalIndex] || SECTION_ICONS[0]

    // Icon background (rounded rect)
    shapeBoxes.push({
      x: rightX,
      y: yPos,
      w: P1_ICON_SIZE,
      h: P1_ICON_SIZE,
      shapeType: "rect",
      fillColor: icon.bg,
      rectRadius: 0.04,
    })

    // Icon emoji
    textBoxes.push({
      x: rightX,
      y: yPos,
      w: P1_ICON_SIZE,
      h: P1_ICON_SIZE,
      text: icon.emoji,
      fontSize: 8,
      align: "center",
      valign: "middle",
    })

    // Heading (offset by icon)
    textBoxes.push({
      x: iconTextX,
      y: yPos,
      w: iconTextW,
      h: P1_HEADING_HEIGHT,
      text: section.heading,
      isBold: true,
      fontSize: P1_HEADING_FONT_SIZE,
      color: P1_HEADING_COLOR,
      valign: "top",
    })

    // Body (height proportional to content)
    const bodyY = yPos + headerRowH
    textBoxes.push({
      x: iconTextX,
      y: bodyY,
      w: iconTextW,
      h: bodyHeights[activeIdx],
      text: section.body,
      fontSize: P1_BODY_FONT_SIZE,
      color: PL_DARK_TEXT,
      valign: "top",
      lineHeight: 1.45,
    })

    yPos += headerRowH + bodyHeights[activeIdx]
    if (activeIdx < activeSections.length - 1) {
      yPos += P1_SECTION_GAP
    }
  })

  // Reference (bottom of right panel, as "出典" with light text)
  if (meta.reference) {
    textBoxes.push({
      x: rightX,
      y: SLIDE_HEIGHT - 0.40,
      w: rightW,
      h: referenceH,
      text: `出典: ${meta.reference}`,
      fontSize: P1_REFERENCE_FONT_SIZE,
      color: PL_GRAY,
      valign: "top",
    })
  }

  // Page number
  addPageNumber(textBoxes, 1, layout.totalPages)

  return { textBoxes, shapeBoxes }
}

// ============================================================
// Page 2: Detail Card
// ============================================================
function layoutDetail(layout: PatternLanguageDetailLayout, _titleY: number, _theme: Theme): LayoutResult {
  const meta = layout.meta
  const textBoxes: TextBox[] = []
  const borderBoxes: BorderBox[] = []
  const shapeBoxes: ShapeBox[] = []

  // --- Header bar ---
  shapeBoxes.push({
    x: 0,
    y: 0,
    w: SLIDE_WIDTH,
    h: P2_HEADER_H,
    shapeType: "rect",
    fillColor: PL_DARK_GREEN,
  })

  // Badge (white circle with number)
  shapeBoxes.push({
    x: P2_BADGE_X,
    y: P2_BADGE_Y,
    w: P2_BADGE_SIZE,
    h: P2_BADGE_SIZE,
    shapeType: "ellipse",
    fillColor: PL_WHITE,
    text: meta.number,
    textColor: PL_DARK_GREEN,
    fontSize: 10,
    isBold: true,
  })

  // Title in header
  textBoxes.push({
    x: P2_TITLE_X,
    y: 0,
    w: 7,
    h: P2_HEADER_H,
    text: meta.name,
    isBold: true,
    fontSize: P2_TITLE_FONT_SIZE,
    color: PL_WHITE,
    valign: "middle",
  })

  // --- Left column ---
  const leftContentW = P2_LEFT_COL_W - 2 * P2_INNER_PADDING
  const hasConcreteExamples = layout.concreteExamples.length >= 2

  // Height allocation: 1:1 for concrete examples, 6:4 for legacy success/failure
  const TOTAL_H = 4.9 // successH + failureH
  const bodyH = TOTAL_H - P2_INNER_PADDING
  const topRatio = hasConcreteExamples ? 0.5 : 0.6
  const topH = bodyH * topRatio
  const bottomH = bodyH * (1 - topRatio)
  const P2_BORDER_RADIUS = 0.05

  // Top box: concrete example 1 or legacy success example
  borderBoxes.push({
    x: P2_LEFT_COL_X,
    y: P2_CONTENT_START_Y,
    w: P2_LEFT_COL_W,
    h: topH,
    accentColor: PL_SUCCESS_GREEN,
    borderWidth: P2_BORDER_WIDTH,
    borderColor: P2_BORDER_COLOR,
    borderRadius: P2_BORDER_RADIUS,
  })
  if (hasConcreteExamples) {
    const ex1 = layout.concreteExamples[0]
    layoutConcreteExampleBox(
      textBoxes, shapeBoxes,
      `具体例${ex1.number}：${ex1.title}`,
      PL_SUCCESS_GREEN,
      ex1,
      P2_LEFT_COL_X + P2_INNER_PADDING,
      P2_CONTENT_START_Y + 0.08,
      leftContentW,
      topH - 0.16,
    )
  } else {
    layoutExampleBox(
      textBoxes,
      shapeBoxes,
      `✓ 成功例: ${layout.success.title}`,
      PL_SUCCESS_GREEN,
      [
        { label: "Before", text: layout.success.before, bgColor: "FFF8E1" },
        { label: "ズレ分析", text: layout.success.analysis },
        { label: "After", text: layout.success.after, bgColor: "E8F5E9" },
      ],
      P2_LEFT_COL_X + P2_INNER_PADDING,
      P2_CONTENT_START_Y + 0.08,
      leftContentW,
      topH - 0.16,
    )
  }

  // Bottom box: concrete example 2 or legacy failure example
  const bottomY = P2_CONTENT_START_Y + topH + P2_INNER_PADDING
  borderBoxes.push({
    x: P2_LEFT_COL_X,
    y: bottomY,
    w: P2_LEFT_COL_W,
    h: bottomH,
    accentColor: hasConcreteExamples ? PL_SUCCESS_GREEN : PL_FAILURE_RED,
    borderWidth: P2_BORDER_WIDTH,
    borderColor: P2_BORDER_COLOR,
    borderRadius: P2_BORDER_RADIUS,
  })
  if (hasConcreteExamples) {
    const ex2 = layout.concreteExamples[1]
    layoutConcreteExampleBox(
      textBoxes, shapeBoxes,
      `具体例${ex2.number}：${ex2.title}`,
      PL_SUCCESS_GREEN,
      ex2,
      P2_LEFT_COL_X + P2_INNER_PADDING,
      bottomY + 0.08,
      leftContentW,
      bottomH - 0.16,
    )
  } else {
    layoutExampleBox(
      textBoxes,
      shapeBoxes,
      `✗ 失敗例: ${layout.failure.title}`,
      PL_FAILURE_RED,
      [
        { label: "やったこと", text: layout.failure.attempt },
        { label: "何がダメだったか", text: layout.failure.problem },
        { label: "こうすればよかった", text: layout.failure.improvement },
      ],
      P2_LEFT_COL_X + P2_INNER_PADDING,
      bottomY + 0.08,
      leftContentW,
      bottomH - 0.16,
    )
  }

  // --- Right column ---
  const rightContentW = P2_RIGHT_COL_W - 2 * P2_INNER_PADDING

  // Align right column bottom with left column bottom
  const leftBottomY = P2_CONTENT_START_Y + topH + P2_INNER_PADDING + bottomH

  // Distribute right column: template shrinks, checklist + team expand
  const checklistSectionH = 1.45
  const teamSectionH = 1.0
  const templateChecklistGap = 0.02
  const templateH = leftBottomY - P2_CONTENT_START_Y - checklistSectionH - teamSectionH - 2 * P2_INNER_PADDING - templateChecklistGap
  borderBoxes.push({
    x: P2_RIGHT_COL_X,
    y: P2_CONTENT_START_Y,
    w: P2_RIGHT_COL_W,
    h: templateH,
    fillColor: PL_LIGHT_GRAY,
    borderWidth: P2_BORDER_WIDTH,
    borderColor: P2_BORDER_COLOR,
    borderRadius: P2_BORDER_RADIUS,
  })
  textBoxes.push({
    x: P2_RIGHT_COL_X + P2_INNER_PADDING,
    y: P2_CONTENT_START_Y + 0.08,
    w: rightContentW,
    h: 0.18,
    text: "📝 テンプレート",
    isBold: true,
    fontSize: 6,
    color: PL_DARK_TEXT,
    valign: "top",
  })
  // White inner text area for template content
  const templateTextY = P2_CONTENT_START_Y + 0.24
  const templateTextH = templateH - 0.28
  shapeBoxes.push({
    x: P2_RIGHT_COL_X + P2_INNER_PADDING,
    y: templateTextY,
    w: rightContentW,
    h: templateTextH,
    shapeType: "rect",
    fillColor: PL_WHITE,
    rectRadius: 0.03,
    borderColor: "E2E8F0",
    borderWidth: 1,
  })
  textBoxes.push({
    x: P2_RIGHT_COL_X + P2_INNER_PADDING + 0.04,
    y: templateTextY + 0.03,
    w: rightContentW - 0.08,
    h: templateTextH - 0.06,
    text: layout.template,
    fontSize: P2_BODY_FONT_SIZE,
    color: "2D3748",
    valign: "top",
    fontFace: "SF Mono",
    lineHeight: 1.55,
  })

  // Compact checklist and team sections
  const checklistY = P2_CONTENT_START_Y + templateH + templateChecklistGap
  const checklistH = checklistSectionH
  textBoxes.push({
    x: P2_RIGHT_COL_X + P2_INNER_PADDING,
    y: checklistY + 0.08,
    w: rightContentW,
    h: 0.18,
    text: "✅ セルフチェック",
    isBold: true,
    fontSize: 6,
    color: PL_DARK_TEXT,
    valign: "top",
  })
  // Individual checklist item cards
  const checkItemStartY = checklistY + 0.30
  const checkItemCount = layout.checklist.length
  const checkItemGap = 0.06
  const checkItemTotalH = checklistH - 0.38
  const checkItemH = (checkItemTotalH - (checkItemCount - 1) * checkItemGap) / checkItemCount
  layout.checklist.forEach((item, i) => {
    const itemY = checkItemStartY + i * (checkItemH + checkItemGap)
    shapeBoxes.push({
      x: P2_RIGHT_COL_X + P2_INNER_PADDING,
      y: itemY,
      w: rightContentW,
      h: checkItemH,
      shapeType: "rect",
      fillColor: "FAFAFA",
      rectRadius: 0.03,
      borderColor: "EEEEEE",
      borderWidth: 1,
    })
    // Checkbox (green accent like reference)
    textBoxes.push({
      x: P2_RIGHT_COL_X + P2_INNER_PADDING + 0.06,
      y: itemY,
      w: 0.2,
      h: checkItemH,
      text: "☐",
      fontSize: 11,
      color: "38A169",
      valign: "middle",
    })
    // Item text
    textBoxes.push({
      x: P2_RIGHT_COL_X + P2_INNER_PADDING + 0.28,
      y: itemY,
      w: rightContentW - 0.28,
      h: checkItemH,
      text: item,
      fontSize: P2_BODY_FONT_SIZE,
      color: PL_DARK_TEXT,
      valign: "middle",
    })
  })

  // Team scenarios section (light yellow background with colored number badges)
  const teamY = checklistY + checklistH + P2_INNER_PADDING
  const teamH = leftBottomY - teamY
  borderBoxes.push({
    x: P2_RIGHT_COL_X,
    y: teamY,
    w: P2_RIGHT_COL_W,
    h: teamH,
    fillColor: "FFF8E1",
    borderWidth: P2_BORDER_WIDTH,
    borderColor: P2_BORDER_COLOR,
    borderRadius: P2_BORDER_RADIUS,
  })
  textBoxes.push({
    x: P2_RIGHT_COL_X + P2_INNER_PADDING,
    y: teamY + 0.08,
    w: rightContentW,
    h: 0.18,
    text: "💡 チーム活用シナリオ",
    isBold: true,
    fontSize: 6,
    color: PL_DARK_TEXT,
    valign: "top",
  })
  const teamBadgeColors = ["FFA000"]
  const teamItemStartY = teamY + 0.32
  const teamBadgeSize = 0.16
  const teamItemGap = (teamH - 0.40) / Math.max(layout.teamScenarios.length, 1)
  layout.teamScenarios.forEach((scenario, i) => {
    const itemY = teamItemStartY + i * teamItemGap
    // Colored number badge
    shapeBoxes.push({
      x: P2_RIGHT_COL_X + P2_INNER_PADDING,
      y: itemY,
      w: teamBadgeSize,
      h: teamBadgeSize,
      shapeType: "ellipse",
      fillColor: teamBadgeColors[i % teamBadgeColors.length],
      text: `${i + 1}`,
      textColor: PL_WHITE,
      fontSize: 7,
      isBold: true,
    })
    // Scenario text
    textBoxes.push({
      x: P2_RIGHT_COL_X + P2_INNER_PADDING + teamBadgeSize + 0.06,
      y: itemY,
      w: rightContentW - teamBadgeSize - 0.06,
      h: teamItemGap,
      text: scenario,
      fontSize: P2_BODY_FONT_SIZE,
      color: PL_DARK_TEXT,
      valign: "top",
    })
  })

  // Page number
  addPageNumber(textBoxes, 2, layout.totalPages)

  return { textBoxes, borderBoxes, shapeBoxes }
}

// --- Helper: layout example sub-sections (success/failure) ---
function layoutExampleBox(
  textBoxes: TextBox[],
  shapeBoxes: ShapeBox[],
  title: string,
  titleColor: string,
  items: Array<{ label: string; text: string; bgColor?: string }>,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  let currentY = y

  // Title
  textBoxes.push({
    x,
    y: currentY,
    w,
    h: 0.16,
    text: title,
    isBold: true,
    fontSize: 6,
    color: titleColor,
    valign: "top",
  })
  currentY += 0.18

  // Distribute remaining height among items proportionally to content
  const activeItems = items.filter((it) => it.text)
  const itemCount = activeItems.length
  if (itemCount === 0) return
  const remainingH = h - 0.18
  const labelH = 0.12
  const labelGap = 0.02
  const ITEM_GAP = 0.08
  const gapSlots = Math.max(0, itemCount - 1)

  // Estimate actual body heights from line counts; if content fits, use
  // estimated heights (excess goes to bottom). Otherwise scale down.
  const CJK_CHARS_PER_LINE = 38
  const estimateLines = (text: string): number => {
    if (!text) return 1
    return text.split("\n").reduce(
      (sum, line) => sum + Math.max(1, Math.ceil(line.length / CJK_CHARS_PER_LINE)),
      0,
    )
  }
  const LINE_H = P2_BODY_FONT_SIZE * 1.45 / 72
  const lineEstimates = activeItems.map((item) => Math.max(1, estimateLines(item.text)))
  const estimatedBodyHeights = lineEstimates.map((lines) => lines * LINE_H)
  const totalEstimatedBody = estimatedBodyHeights.reduce((a, b) => a + b, 0)
  const bodyBudget = remainingH - itemCount * (labelH + labelGap) - gapSlots * ITEM_GAP
  const bodyHeights = totalEstimatedBody <= bodyBudget
    ? estimatedBodyHeights
    : estimatedBodyHeights.map((h) => (h / totalEstimatedBody) * bodyBudget)

  activeItems.forEach((item, i) => {
    if (i > 0) currentY += ITEM_GAP

    const sectionBodyH = bodyHeights[i]

    // Background shape for colored sections
    if (item.bgColor) {
      const bgPad = 0.03
      const isLast = i === activeItems.length - 1
      // Last item: extend background to fill remaining box space
      const bgH = isLast
        ? (y + h) - currentY + bgPad
        : labelH + labelGap + sectionBodyH + 2 * bgPad
      shapeBoxes.push({
        x: x - bgPad,
        y: currentY - bgPad,
        w: w + 2 * bgPad,
        h: bgH,
        shapeType: "rect",
        fillColor: item.bgColor,
        rectRadius: 0.04,
      })
    }

    // Sub-label
    textBoxes.push({
      x,
      y: currentY,
      w,
      h: labelH,
      text: item.label,
      isBold: true,
      fontSize: P1_HEADING_FONT_SIZE,
      color: PL_GRAY,
      valign: "top",
    })
    currentY += labelH + labelGap

    // Body text — last item gets remaining height so text is not clipped
    const isLastItem = i === activeItems.length - 1
    const bodyH = isLastItem ? (y + h) - currentY : sectionBodyH
    textBoxes.push({
      x,
      y: currentY,
      w,
      h: bodyH,
      text: item.text,
      fontSize: P2_BODY_FONT_SIZE,
      color: PL_DARK_TEXT,
      valign: "top",
    })
    currentY += sectionBodyH
  })
}

// --- Helper: background color for known item labels ---
const ITEM_BG_MAP: Record<string, string> = {
  "Before": "FFF8E1",
  "After": "E8F5E9",
  "こうすればよかった": "E8F5E9",
}

// --- Helper: layout items-based concrete example (H4-style) ---
function layoutConcreteExampleItems(
  textBoxes: TextBox[],
  shapeBoxes: ShapeBox[],
  title: string,
  titleColor: string,
  items: readonly ConcreteExampleItem[],
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  let currentY = y

  // Title
  textBoxes.push({
    x,
    y: currentY,
    w,
    h: 0.22,
    text: `✓ ${title}`,
    isBold: true,
    fontSize: 6,
    color: titleColor,
    valign: "top",
  })
  currentY += 0.26

  // Distribute remaining height among items proportionally to content
  const activeItems = items.filter((it) => it.text)
  const itemCount = activeItems.length
  if (itemCount === 0) return

  const remainingH = h - 0.26
  const labelH = 0.12
  const labelGap = 0.02
  const ITEM_GAP = 0.08
  const gapSlots = Math.max(0, itemCount - 1)

  const CJK_CHARS_PER_LINE = 38
  const estimateLines = (text: string): number => {
    if (!text) return 1
    return text.split("\n").reduce(
      (sum, line) => sum + Math.max(1, Math.ceil(line.length / CJK_CHARS_PER_LINE)),
      0,
    )
  }
  const LINE_H = P2_BODY_FONT_SIZE * 1.45 / 72
  const lineEstimates = activeItems.map((it) => Math.max(1, estimateLines(it.text)))
  const estimatedBodyHeights = lineEstimates.map((lines) => lines * LINE_H)
  const totalEstimatedBody = estimatedBodyHeights.reduce((a, b) => a + b, 0)
  const bodyBudget = remainingH - itemCount * (labelH + labelGap) - gapSlots * ITEM_GAP
  const bodyHeights = totalEstimatedBody <= bodyBudget
    ? estimatedBodyHeights
    : estimatedBodyHeights.map((h) => (h / totalEstimatedBody) * bodyBudget)

  activeItems.forEach((item, i) => {
    if (i > 0) currentY += ITEM_GAP

    const sectionBodyH = bodyHeights[i]
    const bgColor = ITEM_BG_MAP[item.label]

    // Background shape for colored sections
    if (bgColor) {
      const bgPad = 0.03
      shapeBoxes.push({
        x: x - bgPad,
        y: currentY - bgPad,
        w: w + 2 * bgPad,
        h: labelH + labelGap + sectionBodyH + 2 * bgPad,
        shapeType: "rect",
        fillColor: bgColor,
        rectRadius: 0.04,
      })
    }

    // Sub-label
    textBoxes.push({
      x,
      y: currentY,
      w,
      h: labelH,
      text: item.label,
      isBold: true,
      fontSize: P1_HEADING_FONT_SIZE,
      color: PL_GRAY,
      valign: "top",
    })
    currentY += labelH + labelGap

    // Body text
    textBoxes.push({
      x,
      y: currentY,
      w,
      h: sectionBodyH,
      text: item.text,
      fontSize: P2_BODY_FONT_SIZE,
      color: PL_DARK_TEXT,
      valign: "top",
    })
    currentY += sectionBodyH
  })
}

// --- Helper: layout concrete example in success/failure box position ---
function layoutConcreteExampleBox(
  textBoxes: TextBox[],
  shapeBoxes: ShapeBox[],
  title: string,
  titleColor: string,
  ex: ConcreteExample,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  // If concrete example uses H4-based items, use items layout
  if (ex.items.length > 0) {
    layoutConcreteExampleItems(textBoxes, shapeBoxes, title, titleColor, ex.items, x, y, w, h)
    return
  }

  // Legacy: goodExample / goodPoints / badExample / badReason layout
  let currentY = y

  // Title
  textBoxes.push({
    x,
    y: currentY,
    w,
    h: 0.20,
    text: `✓ ${title}`,
    isBold: true,
    fontSize: 6,
    color: titleColor,
    valign: "top",
  })
  currentY += 0.22

  const remainingH = h - 0.22
  const innerGap = 0.04
  const hasGoodPoints = ex.goodPoints.trim().length > 0

  // Split remaining height: with good points 48/30/22, without good points NG keeps same absolute size
  const badRowH = remainingH * 0.22
  const goodPtsH = hasGoodPoints ? remainingH * 0.30 : 0
  const goodExH = remainingH - goodPtsH - badRowH - (hasGoodPoints ? 2 : 1) * innerGap

  // Good example: code block with tinted background
  shapeBoxes.push({
    x,
    y: currentY,
    w,
    h: goodExH,
    shapeType: "rect",
    fillColor: "F8FFF8",
    rectRadius: 0.03,
    borderColor: "E2E8F0",
    borderWidth: 1,
  })
  textBoxes.push({
    x: x + 0.06,
    y: currentY + 0.02,
    w: w - 0.12,
    h: goodExH - 0.04,
    text: ex.goodExample,
    fontSize: 7,
    color: "2D3748",
    valign: "top",
    fontFace: "SF Mono",
    lineHeight: 1.4,
  })
  currentY += goodExH + innerGap

  // Good points: light green background + bullet text (skip if empty)
  if (hasGoodPoints) {
    shapeBoxes.push({
      x,
      y: currentY,
      w,
      h: goodPtsH,
      shapeType: "rect",
      fillColor: "FFFFFF",
      rectRadius: 0.03,
    })
    textBoxes.push({
      x: x + 0.04,
      y: currentY + 0.01,
      w: w - 0.08,
      h: 0.12,
      text: "💡 良いポイント",
      isBold: true,
      fontSize: 5,
      color: PL_DARK_TEXT,
      valign: "top",
    })
    textBoxes.push({
      x: x + 0.04,
      y: currentY + 0.13,
      w: w - 0.08,
      h: goodPtsH - 0.15,
      text: ex.goodPoints,
      fontSize: 6,
      color: PL_DARK_TEXT,
      valign: "top",
      lineHeight: 1.4,
    })
    currentY += goodPtsH + innerGap
  }

  // Bad row: NG (left half) + Reason (right half)
  const halfW = (w - innerGap) / 2

  // NG box (red tint)
  shapeBoxes.push({
    x,
    y: currentY,
    w: halfW,
    h: badRowH,
    shapeType: "rect",
    fillColor: "FFF5F5",
    rectRadius: 0.03,
    borderColor: "FED7D7",
    borderWidth: 1,
  })
  textBoxes.push({
    x: x + 0.04,
    y: currentY + 0.01,
    w: halfW - 0.08,
    h: 0.12,
    text: "✗ NG例",
    isBold: true,
    fontSize: 5,
    color: PL_FAILURE_RED,
    valign: "top",
  })
  textBoxes.push({
    x: x + 0.04,
    y: currentY + 0.13,
    w: halfW - 0.08,
    h: badRowH - 0.15,
    text: ex.badExample,
    fontSize: 6,
    color: "C53030",
    valign: "top",
    lineHeight: 1.35,
  })

  // Reason box (right half)
  const rightX = x + halfW + innerGap
  textBoxes.push({
    x: rightX + 0.04,
    y: currentY + 0.01,
    w: halfW - 0.08,
    h: 0.12,
    text: "⚠️ 失敗理由",
    isBold: true,
    fontSize: 5,
    color: PL_GRAY,
    valign: "top",
  })
  textBoxes.push({
    x: rightX + 0.04,
    y: currentY + 0.13,
    w: halfW - 0.08,
    h: badRowH - 0.15,
    text: ex.badReason,
    fontSize: 6,
    color: PL_DARK_TEXT,
    valign: "top",
    lineHeight: 1.35,
  })
}

// ============================================================
// Layout handler (dispatches both tags)
// ============================================================
export const handlePatternLanguageLayout = (
  layout: SlideLayout,
  titleY: number,
  theme: Theme,
): O.Option<LayoutResult> => {
  if (layout._tag === "PatternLanguageOverview") {
    return O.some(layoutOverview(layout as PatternLanguageOverviewLayout, titleY, theme))
  }
  if (layout._tag === "PatternLanguageDetail") {
    return O.some(layoutDetail(layout as PatternLanguageDetailLayout, titleY, theme))
  }
  return O.none()
}
