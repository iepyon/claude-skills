import { Theme } from "../../schema/index.js"
import { TextBox, BorderBox, IconBox, CodeBox, ShapeBox, InlineTextRun, Paragraph } from "../layout/index.js"
import { resolveIconOrFallback } from "../icon-resolver.js"
import { splitRunsIntoLines, splitTextIntoLines } from "../../text-lines.js"
import { isCentered, runFontFace } from "../../text-style.js"
import { deco } from "../../shape-keys.js"

// Convert inches to pixels for CSS (96 DPI standard)
const inchesToPx = (inches: number): number => inches * 96

// Convert hex color to CSS format
const hexToColor = (hex: string): string => (hex ? `#${hex}` : "transparent")

export { inchesToPx, hexToColor }

// 本文のエスケープ。テキストを DOM に出す箇所はすべてここを通す。
const escapeText = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

// 属性値のエスケープ。本文用とは別に必要
// （href は本文ではないので、シングルクォートまで潰しておく）。
export const escapeAttr = (value: string): string => escapeText(value).replace(/'/g, "&#39;")

/**
 * InlineTextRun[] を HTML に変換
 */
function richTextToHtml(runs: InlineTextRun[]): string {
  return runs.map(run => {
    let html = escapeText(run.text)

    if (run.code) {
      html = `<code style="background: #f0f0f0; padding: 2px 4px; border-radius: 3px; font-family: Courier New, monospace;">${html}</code>`
    }
    if (run.bold) {
      html = `<strong>${html}</strong>`
    }
    if (run.italic) {
      html = `<em>${html}</em>`
    }
    // run 単位のフォントサイズ（PPTX の run オプションと同じ粒度）
    if (run.fontSize !== undefined) {
      html = `<span style="font-size: ${run.fontSize}pt">${html}</span>`
    }
    // リンクは最も外側で包む（装飾ごとクリック可能にする）。
    // internal は #<slide> のアンカーなので、Wiki ビューアが無い単体 HTML でも
    // ただのページ内リンクとして無害に落ちる。
    //
    // 属性が2つあるのは、読む側の索引の粒度が違うため（InlineLink の説明を見よ）:
    //   data-wikilink  … サイト全体の参照。Wiki ビューアが解決表を引く鍵
    //   data-slide-ref … デッキ内のスライド ID。単体 HTML がスライド番号を引く鍵
    if (run.link) {
      if (run.link.kind === "external") {
        html = `<a class="ext-link" href="${escapeAttr(run.link.href)}" target="_blank" rel="noopener noreferrer">${html}</a>`
      } else {
        const { ref, slide } = run.link
        const slideRef = slide === undefined ? "" : ` data-slide-ref="${escapeAttr(slide)}"`
        html = `<a class="wikilink" href="#${escapeAttr(slide ?? ref)}" data-wikilink="${escapeAttr(ref)}"${slideRef}>${html}</a>`
      }
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
    // 本文は必ず <p> に入るので、改行の保持は要らない（<p> 間の余白の
    // 可視化も防ぐ）。以前はここで pre-wrap を書いて後段で normal に
    // 置換していたが、置換元の文字列に依存する脆い作りだった
    `white-space: normal`,
    `word-wrap: break-word`,
    // 文字は絶対に切らない。
    // 箱の高さはフォント metrics を知らない見積り（estimateTextHeight）と
    // 固定値（TITLE_HEIGHT 等）で決まるが、ブラウザの line-height: normal は
    // 実際のフォント依存で 1.33〜1.38 倍になる。閲覧者の環境に Noto Sans JP が
    // 無ければ比率はさらに変わるので、どんな値に詰めてもどこかで溢れる。
    // 溢れた数 px がはみ出すのは無害だが、字が切れるのは明確な不具合。
    // 本当に入り切らない量は validateLayout がビルド時に弾いている。
    `overflow: visible`,
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
    isCentered(box, isTitleSlide) ? `data-alignment="CENTER"` : "",
    box.valign ? `data-valign="${box.valign.toUpperCase()}"` : "",
  ]
    .filter(Boolean)
    .join(" ")

  // paragraphs がある場合は段落ごとに <p> を出す。
  // バレット記号は CSS の ::before で描画するため DOM テキストには含まれない
  // （PPTX のネイティブバレットと抽出結果を一致させるため）。
  // 段落には html-inspector の parseParagraphStyle が読む属性だけを付ける。
  // data-shape-id / data-inches-* を付けてはならない: extractElements は
  // 開始タグの直後から走査を再開するため、内側の <p> も同じ shape id で
  // マッチしてシェイプを上書きし、段落数が N ではなく 1 になる。
  //
  // 太字とフォントは行の **先頭 run** から取る。PPTX は段落の最初の <a:rPr>
  // しか持ち出せず（pptx-inspector）、AST インベントリも同じ規則で数える。
  const paraDataAttrs = (firstRun?: InlineTextRun): string => {
    const fontName = runFontFace(box, firstRun, "")
    // フォントサイズも先頭 run 規則（InlineTextRun.fontSize の説明を見よ）
    const fontSize = firstRun?.fontSize ?? box.fontSize
    return [
      fontSize ? `data-font-size="${fontSize}"` : "",
      box.color ? `data-color="${box.color}"` : "",
      firstRun?.bold || box.isBold ? `data-bold="true"` : "",
      isCentered(box, isTitleSlide) ? `data-alignment="CENTER"` : "",
      // 分かるときだけ出す。無ければ html-inspector が生成物の既定フォントに落とす。
      // 「分かるか」は runFontFace が空を返すかで決まる — 条件を書き写さない
      fontName ? `data-font-name="${escapeAttr(fontName)}"` : "",
    ]
      .filter(Boolean)
      .join(" ")
  }

  const renderParagraph = (para: Paragraph, runs: InlineTextRun[]): string => {
    const attrs = paraDataAttrs(runs[0])
    if (!para.bullet) {
      return `<p class="para-plain" ${attrs}>${richTextToHtml(runs)}</p>`
    }
    if (para.bullet.type === "bullet") {
      return `<p class="para-bullet" ${attrs}>${richTextToHtml(runs)}</p>`
    }
    // 番号付き: この項目自身の番号を counter-reset で宣言し、
    // .para-number の counter-increment がそれを +1 して確定させる。
    const startAt = para.bullet.startAt ?? 1
    return `<p class="para-number" style="counter-reset: para-num ${startAt - 1}" ${attrs}>${richTextToHtml(runs)}</p>`
  }

  // 3つの表現（paragraphs / richText / 素のテキスト）を Paragraph[] に正規化して
  // から1経路で描く。分岐ごとに書くと、html-inspector が読む data-* の契約が
  // 3箇所に散る。
  const paragraphs: Paragraph[] =
    box.paragraphs ??
    (box.richText
      ? [{ runs: box.richText }]
      : splitTextIntoLines(box.text ?? "").map((text) => ({ runs: [{ text }] })))

  const items = paragraphs
    // run の途中の改行も1行 = 1段落として割る（PPTX の breakLine と同じ）
    .flatMap((para) => splitRunsIntoLines(para.runs).map((runs) => renderParagraph(para, runs)))
    .join("")

  // display: flex の子は1つに保つ。段落は .para-stack が縦に積む
  return `<div class="text-box" style="${style}" ${dataAttrs}><div class="para-stack">${items}</div></div>`
}

// Generate CSS for a BorderBox
export function borderBoxToHtml(box: BorderBox, theme: Theme, shapeId?: string): string {
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
    // 境界ボックスはテキストを持たない装飾。PPTX が deco:border-N を出すので
    // HTML も同じ名前を出す — 「描いた図形はすべて名前を名乗る」を全体で保つ
    shapeId ? `data-shape-id="${deco(shapeId)}"` : "",
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
      // 3者比較が読む書式。style 属性の中身は html-inspector が見ない
      `data-font-size="${fontSize}"`,
      `data-color="${hexColor}"`,
      `data-alignment="CENTER"`,
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
      // PPTX は addImage で描くのでテキストが無い。HTML も同じく無いので、
      // 両方とも deco: を付けて「同じ要素に同じ名前」を保つ
      shapeId ? `data-shape-id="${deco(shapeId)}"` : "",
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

  // 1行 = 1つの <p>。PPTX が改行ごとに <a:p> を出すので、HTML も同じ数え方に
  // する（3者比較が段落数を突き合わせる）。色は PPTX に渡すのと同じ textRuns
  // から引く — ハイライトの正本を2つ持たない。
  const lines = splitRunsIntoLines(box.textRuns, { keepBlank: true })
    .map((runs) => {
      // 空行は高さだけ取る。文字が無いので html-inspector は段落として拾わず、
      // PPTX 側の空 <a:p> と AST の空行スキップに揃う
      if (runs.length === 0) return `<p class="code-line"></p>`

      const lineDataAttrs = [
        `data-font-size="${box.fontSize}"`,
        `data-color="${runs[0].color}"`,
        `data-font-name="${box.fontFace}"`,
      ].join(" ")
      const spans = runs
        .map((run) => `<span style="color: ${hexToColor(run.color)}">${escapeText(run.text)}</span>`)
        .join("")
      return `<p class="code-line" ${lineDataAttrs}>${spans}</p>`
    })
    .join("")

  return `<div class="code-box" style="${containerStyle}" ${dataAttrs}><pre style="${codeStyle}">${lines}</pre></div>`
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
      shapeId ? `data-shape-id="${deco(shapeId)}"` : "",
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
      shapeId ? `data-shape-id="${deco(shapeId)}"` : "",
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

  // テキストがあれば PPTX のテキストオーバーレイと同じキー、無ければ
  // 塗りしか無いので PPTX の塗りと同じ deco 名になる
  const key = shapeId && (box.text ? shapeId : deco(shapeId, "fill"))

  const dataAttrs = [
    key ? `data-shape-id="${key}"` : "",
    `data-shape-type="${box.shapeType}"`,
    `data-inches-x="${box.x}"`,
    `data-inches-y="${box.y}"`,
    `data-inches-w="${box.w}"`,
    `data-inches-h="${box.h}"`,
    `data-fill-color="${box.fillColor}"`,
    // テキストを持つシェイプは3者比較の対象。書式は data 属性で報告する
    // (中央寄せは flex で描いているので data-alignment でしか見えない)
    box.text ? `data-font-size="${box.fontSize || 12}"` : "",
    box.text ? `data-color="${box.textColor || "000000"}"` : "",
    box.text && box.isBold ? `data-bold="true"` : "",
    box.text ? `data-alignment="CENTER"` : "",
  ]
    .filter(Boolean)
    .join(" ")

  const content = box.text ? escapeText(box.text) : ""

  return `<div class="shape-box" style="${style}" ${dataAttrs}>${content}</div>`
}
