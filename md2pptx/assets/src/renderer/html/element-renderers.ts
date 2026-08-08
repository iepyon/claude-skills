import { Theme } from "../../schema/index.js"
import { TextBox, BorderBox, IconBox, CodeBox, ShapeBox, InlineTextRun } from "../layout/index.js"
import { resolveIconOrFallback } from "../icon-resolver.js"
import { highlightForHtml } from "../syntax-highlighter.js"

// Convert inches to pixels for CSS (96 DPI standard)
const inchesToPx = (inches: number): number => inches * 96

// Convert hex color to CSS format
const hexToColor = (hex: string): string => (hex ? `#${hex}` : "transparent")

export { inchesToPx, hexToColor }

// 属性値のエスケープ。run.text 用のエスケープとは別に必要
// （href は本文ではないので、シングルクォートまで潰しておく）。
const escapeAttr = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

/**
 * InlineTextRun[] を HTML に変換
 */
function richTextToHtml(runs: InlineTextRun[]): string {
  return runs.map(run => {
    let html = run.text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")

    if (run.code) {
      html = `<code style="background: #f0f0f0; padding: 2px 4px; border-radius: 3px; font-family: Courier New, monospace;">${html}</code>`
    }
    if (run.bold) {
      html = `<strong>${html}</strong>`
    }
    if (run.italic) {
      html = `<em>${html}</em>`
    }
    // リンクは最も外側で包む（装飾ごとクリック可能にする）。
    // internal は #<target> のアンカーなので、Wiki ビューアが無い単体 HTML でも
    // ただのページ内リンクとして無害に落ちる。
    if (run.link) {
      html = run.link.kind === "external"
        ? `<a class="ext-link" href="${escapeAttr(run.link.href)}" target="_blank" rel="noopener noreferrer">${html}</a>`
        : `<a class="wikilink" href="#${escapeAttr(run.link.target)}" data-wikilink="${escapeAttr(run.link.target)}">${html}</a>`
    }

    return html
  }).join('')
}

// Generate CSS for a TextBox
export function textBoxToHtml(box: TextBox, shapeId?: string, isTitleSlide: boolean = false): string {
  const textAlign = box.align === "center" ? "center" : "left"
  const justifyContent = box.align === "center" ? "center" : "flex-start"

  // Determine vertical alignment based on valign or fallback to default
  const alignItems = box.valign === "top" ? "flex-start"
    : box.valign === "middle" ? "center"
    : box.valign === "bottom" ? "flex-end"
    : "flex-start"

  const style = [
    `position: absolute`,
    `left: ${box.x}in`,
    `top: ${box.y}in`,
    `width: ${box.w}in`,
    `height: ${box.h}in`,
    `font-size: ${box.fontSize || 16}pt`,
    `color: ${box.color ? hexToColor(box.color) : "#000000"}`,
    `font-weight: ${box.isBold ? "bold" : "normal"}`,
    `font-style: ${box.isItalic ? "italic" : "normal"}`,
    `display: flex`,
    `align-items: ${alignItems}`,
    `justify-content: ${justifyContent}`,
    `text-align: ${textAlign}`,
    `white-space: pre-wrap`,
    `word-wrap: break-word`,
    `overflow: hidden`,
    box.lineHeight ? `line-height: ${box.lineHeight}` : "",
    box.fontFace ? `font-family: ${box.fontFace}, monospace` : "",
  ].filter(Boolean).join("; ")

  const dataAttrs = [
    shapeId ? `data-shape-id="${shapeId}"` : "",
    `data-inches-x="${box.x}"`,
    `data-inches-y="${box.y}"`,
    `data-inches-w="${box.w}"`,
    `data-inches-h="${box.h}"`,
    box.fontSize ? `data-font-size="${box.fontSize}"` : "",
    box.color ? `data-color="${box.color}"` : "",
    box.isBold ? `data-bold="true"` : "",
    isTitleSlide || box.align === "center" ? `data-alignment="CENTER"` : "",
    box.valign ? `data-valign="${box.valign.toUpperCase()}"` : "",
  ]
    .filter(Boolean)
    .join(" ")

  // paragraphs がある場合は段落ごとに <p> を出す。
  // バレット記号は CSS の ::before で描画するため DOM テキストには含まれない
  // （PPTX のネイティブバレットと抽出結果を一致させるため）。
  if (box.paragraphs) {
    // 段落には html-inspector の parseParagraphStyle が読む属性だけを付ける。
    // data-shape-id / data-inches-* を付けてはならない: extractElements は
    // 開始タグの直後から走査を再開するため、内側の <p> も同じ shape id で
    // マッチしてシェイプを上書きし、段落数が N ではなく 1 になる。
    const paraDataAttrs = [
      box.fontSize ? `data-font-size="${box.fontSize}"` : "",
      box.color ? `data-color="${box.color}"` : "",
      box.isBold ? `data-bold="true"` : "",
      isTitleSlide || box.align === "center" ? `data-alignment="CENTER"` : "",
    ]
      .filter(Boolean)
      .join(" ")

    const items = box.paragraphs
      .map(para => {
        if (!para.bullet) {
          return `<p class="para-plain" ${paraDataAttrs}>${richTextToHtml(para.runs)}</p>`
        }
        if (para.bullet.type === "bullet") {
          return `<p class="para-bullet" ${paraDataAttrs}>${richTextToHtml(para.runs)}</p>`
        }
        // 番号付き: この項目自身の番号を counter-reset で宣言し、
        // .para-number の counter-increment がそれを +1 して確定させる。
        const startAt = para.bullet.startAt ?? 1
        return `<p class="para-number" style="counter-reset: para-num ${startAt - 1}" ${paraDataAttrs}>${richTextToHtml(para.runs)}</p>`
      })
      .join("")

    // display: flex の子は1つに保つ。段落は stack 側で縦に積む。
    // 段落が個別の <p> になったので改行の保持は不要（<p> 間の余白の可視化も防ぐ）。
    const listStyle = style.replace("white-space: pre-wrap", "white-space: normal")
    return `<div class="text-box" style="${listStyle}" ${dataAttrs}><div class="para-stack">${items}</div></div>`
  }

  // richText がある場合は HTML タグでレンダリング
  const content = box.richText
    ? richTextToHtml(box.richText)
    : box.text
      ? box.text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
      : ""

  return `<div class="text-box" style="${style}" ${dataAttrs}>${content}</div>`
}

// Generate CSS for a BorderBox
export function borderBoxToHtml(box: BorderBox, theme: Theme): string {
  const style = [
    `position: absolute`,
    `left: ${box.x}in`,
    `top: ${box.y}in`,
    `width: ${box.w}in`,
    `height: ${box.h}in`,
    box.fillColor ? `background-color: ${hexToColor(box.fillColor)}` : "",
    `border: ${box.borderWidth ?? theme.border.width}px solid ${hexToColor(box.borderColor ?? theme.border.color)}`,
    box.accentColor ? `border-top: 5px solid ${hexToColor(box.accentColor)}` : "",
    `border-radius: ${box.borderRadius ?? 0.05}in`,
    `box-sizing: border-box`,
  ]
    .filter(Boolean)
    .join("; ")

  const dataAttrs = [
    `data-inches-x="${box.x}"`,
    `data-inches-y="${box.y}"`,
    `data-inches-w="${box.w}"`,
    `data-inches-h="${box.h}"`,
    box.fillColor ? `data-fill-color="${box.fillColor}"` : "",
    box.accentColor ? `data-accent-color="${box.accentColor}"` : "",
  ]
    .filter(Boolean)
    .join(" ")

  return `<div class="border-box" style="${style}" ${dataAttrs}></div>`
}

// Generate HTML for an IconBox
export function iconBoxToHtml(box: IconBox, shapeId?: string): string {
  const hexColor = box.color || "000000"
  const resolved = resolveIconOrFallback(box.icon, hexColor)
  const fontSize = box.fontSize || 48

  if (resolved._tag === "emoji") {
    // Emoji: render as span with text
    const style = [
      `position: absolute`,
      `left: ${box.x}in`,
      `top: ${box.y}in`,
      `width: ${box.w}in`,
      `height: ${box.h}in`,
      `font-size: ${fontSize}pt`,
      `color: ${hexToColor(hexColor)}`,
      `display: flex`,
      `align-items: center`,
      `justify-content: center`,
      `text-align: center`,
    ].join("; ")

    const dataAttrs = [
      shapeId ? `data-shape-id="${shapeId}"` : "",
      `data-icon-type="emoji"`,
      `data-inches-x="${box.x}"`,
      `data-inches-y="${box.y}"`,
      `data-inches-w="${box.w}"`,
      `data-inches-h="${box.h}"`,
    ]
      .filter(Boolean)
      .join(" ")

    return `<span class="icon-box" style="${style}" ${dataAttrs}>${resolved.text}</span>`
  } else {
    // SVG: embed inline (centered square)
    const size = Math.min(box.w, box.h)
    const centerX = box.x + (box.w - size) / 2
    const centerY = box.y + (box.h - size) / 2

    const style = [
      `position: absolute`,
      `left: ${centerX}in`,
      `top: ${centerY}in`,
      `width: ${size}in`,
      `height: ${size}in`,
      `display: flex`,
      `align-items: center`,
      `justify-content: center`,
    ].join("; ")

    const dataAttrs = [
      shapeId ? `data-shape-id="${shapeId}"` : "",
      `data-icon-type="svg"`,
      `data-inches-x="${box.x}"`,
      `data-inches-y="${box.y}"`,
      `data-inches-w="${box.w}"`,
      `data-inches-h="${box.h}"`,
    ]
      .filter(Boolean)
      .join(" ")

    // Add inline style to SVG to make it fill the container
    const svgWithStyle = resolved.svgContent.replace(
      /<svg([^>]*)>/,
      `<svg$1 style="width: 100%; height: 100%; display: block;">`
    )

    return `<div class="icon-box" style="${style}" ${dataAttrs}>${svgWithStyle}</div>`
  }
}

// Generate HTML for a CodeBox
export function codeBoxToHtml(box: CodeBox, theme: Theme, shapeId?: string): string {
  const highlightedHtml = highlightForHtml(box.code, box.language)

  const containerStyle = [
    `position: absolute`,
    `left: ${box.x}in`,
    `top: ${box.y}in`,
    `width: ${box.w}in`,
    `height: ${box.h}in`,
    `background-color: ${hexToColor(box.backgroundColor)}`,
    `border-radius: ${theme.codeDisplay.borderRadius}in`,
    `padding: ${theme.codeDisplay.padding}in`,
    `overflow: auto`,
    `box-sizing: border-box`,
  ].join("; ")

  const codeStyle = [
    `font-family: ${box.fontFace}, monospace`,
    `font-size: ${box.fontSize}pt`,
    `color: ${hexToColor(theme.codeDisplay.textColor)}`,
    `line-height: ${box.lineHeight}`,
    `white-space: pre`,
    `margin: 0`,
  ].join("; ")

  const dataAttrs = [
    shapeId ? `data-shape-id="${shapeId}"` : "",
    `data-code-language="${box.language}"`,
    `data-inches-x="${box.x}"`,
    `data-inches-y="${box.y}"`,
    `data-inches-w="${box.w}"`,
    `data-inches-h="${box.h}"`,
  ]
    .filter(Boolean)
    .join(" ")

  return `<div class="code-box" style="${containerStyle}" ${dataAttrs}><pre style="${codeStyle}"><code class="language-${box.language}">${highlightedHtml}</code></pre></div>`
}

// Generate HTML for a ShapeBox
export function shapeBoxToHtml(box: ShapeBox, shapeId?: string): string {
  if (box.shapeType === "svg" && box.svgContent) {
    const style = [
      `position: absolute`,
      `left: ${box.x}in`,
      `top: ${box.y}in`,
      `width: ${box.w}in`,
      `height: ${box.h}in`,
    ].join("; ")

    const dataAttrs = [
      shapeId ? `data-shape-id="${shapeId}"` : "",
      `data-shape-type="svg"`,
      `data-inches-x="${box.x}"`,
      `data-inches-y="${box.y}"`,
      `data-inches-w="${box.w}"`,
      `data-inches-h="${box.h}"`,
    ]
      .filter(Boolean)
      .join(" ")

    return `<div class="shape-box" style="${style}" ${dataAttrs}>${box.svgContent}</div>`
  }

  if (box.shapeType === "line") {
    const widthPt = box.lineWidth || 0.25
    const heightPx = widthPt * (96 / 72) // pt → px conversion

    const style = [
      `position: absolute`,
      `left: ${box.x}in`,
      `top: ${box.y}in`,
      `width: ${box.w}in`,
      `height: 0`,
      `border-top: ${heightPx}px solid #${box.lineColor || "000000"}`,
    ].join("; ")

    const dataAttrs = [
      shapeId ? `data-shape-id="${shapeId}"` : "",
      `data-shape-type="line"`,
      `data-inches-x="${box.x}"`,
      `data-inches-y="${box.y}"`,
      `data-inches-w="${box.w}"`,
      `data-inches-h="0"`,
      `data-line-width="${widthPt}"`,
      box.lineColor ? `data-line-color="${box.lineColor}"` : "",
    ]
      .filter(Boolean)
      .join(" ")

    return `<div class="shape-box" style="${style}" ${dataAttrs}></div>`
  }

  const borderRadius = box.shapeType === "ellipse"
    ? "50%"
    : box.rectRadius ? `${box.rectRadius}in` : "0"

  const style = [
    `position: absolute`,
    `left: ${box.x}in`,
    `top: ${box.y}in`,
    `width: ${box.w}in`,
    `height: ${box.h}in`,
    `background-color: #${box.fillColor}`,
    `border-radius: ${borderRadius}`,
    box.borderColor ? `border: ${box.borderWidth || 1}px solid #${box.borderColor}` : "",
    box.borderColor ? `box-sizing: border-box` : "",
    `display: flex`,
    `align-items: center`,
    `justify-content: center`,
    box.text ? `font-size: ${box.fontSize || 12}pt` : "",
    box.text ? `color: #${box.textColor || "000000"}` : "",
    box.text ? `font-weight: ${box.isBold ? "bold" : "normal"}` : "",
  ]
    .filter(Boolean)
    .join("; ")

  const dataAttrs = [
    shapeId ? `data-shape-id="${shapeId}"` : "",
    `data-shape-type="${box.shapeType}"`,
    `data-inches-x="${box.x}"`,
    `data-inches-y="${box.y}"`,
    `data-inches-w="${box.w}"`,
    `data-inches-h="${box.h}"`,
    `data-fill-color="${box.fillColor}"`,
  ]
    .filter(Boolean)
    .join(" ")

  const content = box.text
    ? box.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    : ""

  return `<div class="shape-box" style="${style}" ${dataAttrs}>${content}</div>`
}
