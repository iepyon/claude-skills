import PptxGenJS from "pptxgenjs"
import { Effect } from "effect"
import { RenderError } from "../../errors.js"
import { PARA_SPACE_AFTER } from "../../constants.js"
import { Slide, Theme } from "../../schema/index.js"
import { layoutSlide } from "../layout/index.js"
import { resolveIconOrFallback } from "../icon-resolver.js"
import { codeTextRunsToPptxRuns } from "../syntax-highlighter.js"
import type { InlineTextRun, Paragraph } from "../layout/types.js"

/**
 * Paragraph.bullet → pptxgenjs の bullet オプション。
 *
 * 実測で確認した2点（pptxgenjs 3.x、`types/index.d.ts` の記述とは異なる）:
 * - `{ type: "bullet" }` は **無視される**（buChar が一切出ない）。素の箇条書きは
 *   `true` を渡さなければならない。型定義は 'bullet' を受け付けると書いているが
 *   ランタイムは見ていない。
 * - 番号の開始値は `numberStartAt`。`startAt` は v3.3.0 で deprecated。
 */
function bulletToPptxOption(bullet: NonNullable<Paragraph["bullet"]>): unknown {
  if (bullet.type === "bullet") return true
  return {
    type: "number",
    ...(bullet.startAt !== undefined ? { numberStartAt: bullet.startAt } : {}),
  }
}

/**
 * InlineTextRun[] → pptxgenjs TextRun[] への変換
 * codeTextRunsToPptxRuns() のパターンを再利用
 */
function inlineTextRunsToPptxRuns(
  runs: InlineTextRun[],
  baseFontSize: number,
  baseColor: string,
  baseFontFace: string,
  baseBold: boolean,
  baseItalic: boolean
): Array<{ text: string; options: any }> {
  return runs.map(run => {
    const options: any = {
      fontSize: baseFontSize,
      color: baseColor,
      fontFace: run.code ? "Courier New" : baseFontFace,
      bold: run.bold || baseBold,
      italic: run.italic || baseItalic,
    }

    // インラインコードには灰色のハイライト（背景色）を追加
    if (run.code) {
      options.highlight = "E8E8E8" // 明るい灰色（#E8E8E8 ≈ HTML の #f0f0f0 に近い）
    }

    return { text: run.text, options }
  })
}

export function buildSlide(pptx: PptxGenJS, slide: Slide, theme: Theme): Effect.Effect<void, RenderError> {
  return Effect.sync(() => {
    const pptxSlide = pptx.addSlide()

    // TitleSlideは背景設定
    if (slide._tag === "TitleSlide") {
      if (theme.titleSlide.background) {
        pptxSlide.background = { color: theme.titleSlide.background }
      }
    } else {
      // ContentSlideは背景設定（空文字の場合は設定しない）
      if (theme.contentSlide.background) {
        pptxSlide.background = { color: theme.contentSlide.background }
      }
    }

    // レイアウトエンジンからTextBox、BorderBox、IconBox、CodeBox、ShapeBoxを取得
    const { textBoxes, borderBoxes, iconBoxes, codeBoxes, shapeBoxes } = layoutSlide(slide, theme)

    // 境界ボックスを描画（角丸の四角形）
    // コードボックスがある場合はスキップ（背景はcodeBox側で描画）
    if (borderBoxes && !codeBoxes) {
      for (const border of borderBoxes) {
        pptxSlide.addShape(pptx.ShapeType.roundRect, {
          x: border.x,
          y: border.y,
          w: border.w,
          h: border.h,
          fill: border.fillColor
            ? { color: border.fillColor } // 背景色指定
            : { color: "FFFFFF", transparency: 100 }, // 透明(白色ベース)
          line: { color: border.borderColor ?? theme.border.color, width: border.borderWidth ?? theme.border.width },
          rectRadius: border.borderRadius ?? 0.05,
        })

        // アクセントバー描画（IconCardLayout用）
        if (border.accentColor) {
          pptxSlide.addShape(pptx.ShapeType.rect, {
            x: border.x,
            y: border.y,
            w: border.w,
            h: 0.06,
            fill: { color: border.accentColor },
            line: { type: "none" },
          })
        }
      }
    }

    // アイコンボックスを描画
    if (iconBoxes) {
      for (const iconBox of iconBoxes) {
        const hexColor = iconBox.color || "000000"
        const resolved = resolveIconOrFallback(iconBox.icon, hexColor)
        const fontSize = iconBox.fontSize || 48

        if (resolved._tag === "emoji") {
          // Emoji: render as text
          pptxSlide.addText(resolved.text, {
            x: iconBox.x,
            y: iconBox.y,
            w: iconBox.w,
            h: iconBox.h,
            fontSize,
            color: hexColor,
            align: "center",
            valign: "middle",
          })
        } else {
          // Material Icon: SVG を画像として埋め込む（アスペクト比維持）
          const size = Math.min(iconBox.w, iconBox.h)
          pptxSlide.addImage({
            data: resolved.base64Data.replace(/^data:/, ""),
            x: iconBox.x + (iconBox.w - size) / 2,
            y: iconBox.y + (iconBox.h - size) / 2,
            w: size,
            h: size,
          })
        }
      }
    }

    // コードボックスを描画（シンプル版：ダーク背景 + プレーンテキスト）
    if (codeBoxes) {
      for (const codeBox of codeBoxes) {
        // 1. ダーク背景を描画
        pptxSlide.addShape(pptx.ShapeType.roundRect, {
          x: codeBox.x,
          y: codeBox.y,
          w: codeBox.w,
          h: codeBox.h,
          fill: { color: codeBox.backgroundColor },
          line: { type: "none" }, // 枠線なし
          rectRadius: theme.codeDisplay.borderRadius,
        })

        // 2. シンタックスハイライト付きリッチテキストとして描画
        const pptxRuns = codeTextRunsToPptxRuns(codeBox.textRuns, codeBox.fontFace, codeBox.fontSize)
        pptxSlide.addText(pptxRuns, {
          x: codeBox.x + theme.codeDisplay.padding,
          y: codeBox.y + theme.codeDisplay.padding,
          w: codeBox.w - 2 * theme.codeDisplay.padding,
          h: codeBox.h - 2 * theme.codeDisplay.padding,
          align: "left",
          valign: "top",
          lineSpacing: codeBox.lineHeight * codeBox.fontSize,
          paraSpaceBefore: 0,
          paraSpaceAfter: 0,
        })
      }
    }

    // シェイプボックスを描画（NumberedList用）
    if (shapeBoxes) {
      for (const shape of shapeBoxes) {
        if (shape.shapeType === "line") {
          pptxSlide.addShape(pptx.ShapeType.line, {
            x: shape.x,
            y: shape.y,
            w: shape.w,
            h: 0,
            line: { width: shape.lineWidth || 0.25, color: shape.lineColor || "000000" },
          })
        } else if (shape.shapeType === "svg" && shape.svgContent) {
          // SVG を data URI として埋め込み
          const svgDataUri = `data:image/svg+xml;base64,${Buffer.from(shape.svgContent).toString("base64")}`
          pptxSlide.addImage({
            data: svgDataUri,
            x: shape.x,
            y: shape.y,
            w: shape.w,
            h: shape.h,
          })
        } else {
          const shapeType = shape.shapeType === "ellipse"
            ? pptx.ShapeType.ellipse
            : pptx.ShapeType.rect

          pptxSlide.addShape(shapeType, {
            x: shape.x,
            y: shape.y,
            w: shape.w,
            h: shape.h,
            fill: { color: shape.fillColor },
            line: shape.borderColor
              ? { color: shape.borderColor, width: shape.borderWidth || 0.5 }
              : { type: "none" },
            rectRadius: shape.rectRadius || 0,
          })

          // テキストがある場合はオーバーレイ
          if (shape.text) {
            pptxSlide.addText(shape.text, {
              x: shape.x,
              y: shape.y,
              w: shape.w,
              h: shape.h,
              fontSize: shape.fontSize || 12,
              bold: shape.isBold || false,
              color: shape.textColor || "000000",
              fontFace: theme.fonts.body,
              align: "center",
              valign: "middle",
            })
          }
        }
      }
    }

    // テキストボックスを描画
    for (const box of textBoxes) {
      const align = box.align === "center" ? "center" : (slide._tag === "TitleSlide" ? "center" : "left")
      const valign = box.valign || (box.align === "center" ? "middle" : (slide._tag === "TitleSlide" ? "middle" : "top"))

      // paragraphs がある場合は段落ごとに bullet/breakLine を付けて描画
      if (box.paragraphs) {
        const paras = box.paragraphs
        const pptxRuns = paras.flatMap((para, paraIndex) => {
          const runs = inlineTextRunsToPptxRuns(
            para.runs,
            box.fontSize || 14,
            box.color || "000000",
            box.fontFace || theme.fonts.body,
            box.isBold || false,
            box.isItalic || false
          )
          const isLastPara = paraIndex === paras.length - 1
          return runs.map((run, runIndex) => ({
            text: run.text,
            options: {
              ...run.options,
              // bullet は段落プロパティ。同一段落の全 run に付けて取りこぼしを防ぐ
              ...(para.bullet ? { bullet: bulletToPptxOption(para.bullet) } : {}),
              // 最終 run に breakLine を立てると次の段落が始まる
              ...(runIndex === runs.length - 1 && !isLastPara ? { breakLine: true } : {}),
            },
          }))
        })
        pptxSlide.addText(pptxRuns, {
          x: box.x,
          y: box.y,
          w: box.w,
          h: box.h,
          align,
          valign,
          paraSpaceAfter: PARA_SPACE_AFTER,
          ...(box.lineHeight ? { lineSpacing: box.lineHeight * (box.fontSize || 14) } : {}),
        })
      } else if (box.richText) {
        const pptxRuns = inlineTextRunsToPptxRuns(
          box.richText,
          box.fontSize || 14,
          box.color || "000000",
          box.fontFace || theme.fonts.body,
          box.isBold || false,
          box.isItalic || false
        )
        pptxSlide.addText(pptxRuns, {
          x: box.x,
          y: box.y,
          w: box.w,
          h: box.h,
          align,
          valign,
          ...(box.lineHeight ? { lineSpacing: box.lineHeight * (box.fontSize || 14) } : {}),
        })
      } else {
        // 既存のシンプルテキストパス（後方互換性）
        pptxSlide.addText(box.text, {
          x: box.x,
          y: box.y,
          w: box.w,
          h: box.h,
          fontSize: box.fontSize || 14,
          bold: box.isBold || false,
          italic: box.isItalic || false,
          color: box.color,
          fontFace: box.fontFace || theme.fonts.body,
          align,
          valign,
          ...(box.lineHeight ? { lineSpacing: box.lineHeight * (box.fontSize || 14) } : {}),
        })
      }
    }
  })
}
