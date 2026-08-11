import PptxGenJS from "pptxgenjs"
import { Effect } from "effect"
import { RenderError } from "../../errors.js"
import { PARA_SPACE_AFTER } from "../../constants.js"
import { textKey, iconKey, codeKey, shapeBoxKey, borderKey, deco } from "../../shape-keys.js"
import { splitTextIntoLines } from "../../text-lines.js"
import { isCentered, runFontFace } from "../../text-style.js"
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
 * 行を pptxgenjs の TextRun[] にする。最後の行以外に breakLine を立てる。
 *
 * 素の文字列を渡してはならない。pptxgenjs の STEP 4-C
 * (dist/pptxgen.cjs.js:6165) は **共有の options オブジェクト** に
 * breakLine=true を立ててから全断片を push するため、
 * (1) 最後の断片にも改行が付いて続く run が1行余計に下がり、
 * (2) 末尾が改行の文字列は `match(/\n$/g) === null` ガードでそもそも分割されない。
 */
export function withBreakLines(
  texts: readonly string[],
  options: PptxGenJS.TextPropsOptions
): Array<{ text: string; options: PptxGenJS.TextPropsOptions }> {
  // 断片ごとに options を複製する。pptxgenjs が共有オブジェクトを書き換える
  // のが上の問題の原因なので、「どの断片も自分の options を持つ」を保つ
  return texts.map((text, i) => ({
    text,
    options: i < texts.length - 1 ? { ...options, breakLine: true } : { ...options },
  }))
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
  baseItalic: boolean,
  slideNumberById?: ReadonlyMap<string, number>
): Array<{ text: string; options: any }> {
  return runs.flatMap(run => {
    const options: any = {
      fontSize: baseFontSize,
      color: baseColor,
      // 等幅に落とす規則は text-style.ts が持つ。baseFontFace は呼び出し側で
      // box.fontFace || theme.fonts.body に解決済みなので、fallback に渡せば足りる
      fontFace: runFontFace({ fontFace: undefined }, run, baseFontFace),
      bold: run.bold || baseBold,
      italic: run.italic || baseItalic,
    }

    // インラインコードには灰色のハイライト（背景色）を追加
    if (run.code) {
      options.highlight = "E8E8E8" // 明るい灰色（#E8E8E8 ≈ HTML の #f0f0f0 に近い）
    }

    // 外部リンクは URL、内部リンクは同一 PPTX 内のスライド番号（1始まり）へ。
    // 解決できない内部リンクは *リンクを付けない* — 存在しないスライドを指す
    // ハイパーリンクは PowerPoint がファイル破損として扱うことがある。
    if (run.link) {
      if (run.link.kind === "external") {
        options.hyperlink = { url: run.link.href }
      } else if (run.link.slide !== undefined) {
        // 索引はローカルの ID で作られている（PPTX は1デッキしか知らない）ので、
        // サイト全体の参照（deck/slide）ではなく slide のほうを引く。
        const slideNumber = slideNumberById?.get(run.link.slide)
        if (slideNumber !== undefined) options.hyperlink = { slide: slideNumber }
      }
    }

    // 改行を含む run は自分で分割する（理由は withBreakLines の説明）
    return withBreakLines(run.text.split("\n"), options)
  })
}

export function buildSlide(
  pptx: PptxGenJS,
  slide: Slide,
  theme: Theme,
  // スライド ID → PPTX のスライド番号（1始まり）。内部リンクの解決に使う。
  // 省略時は内部リンクを素のテキストとして描く。
  slideNumberById?: ReadonlyMap<string, number>
): Effect.Effect<void, RenderError> {
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
    // コードボックスがある場合はスキップ（背景はcodeBox側で描画）。
    // これは HTML 側との実在の乖離 — HTML は常に境界ボックスを描く。
    // 装飾（deco:）なので3者比較には出てこない。BACKLOG B-33 で追う。
    if (borderBoxes && !codeBoxes) {
      borderBoxes.forEach((border, index) => {
        pptxSlide.addShape(pptx.ShapeType.roundRect, {
          objectName: deco(borderKey(index)),
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
            objectName: deco(borderKey(index), "accent"),
            x: border.x,
            y: border.y,
            w: border.w,
            h: 0.06,
            fill: { color: border.accentColor },
            line: { type: "none" },
          })
        }
      })
    }

    // アイコンボックスを描画
    if (iconBoxes) {
      iconBoxes.forEach((iconBox, index) => {
        const hexColor = iconBox.color || "000000"
        const resolved = resolveIconOrFallback(iconBox.icon, hexColor)
        const fontSize = iconBox.fontSize || 48

        if (resolved._tag === "emoji") {
          // Emoji: render as text
          pptxSlide.addText(resolved.text, {
            objectName: iconKey(index),
            x: iconBox.x,
            y: iconBox.y,
            w: iconBox.w,
            h: iconBox.h,
            fontSize,
            color: hexColor,
            // 明示しないと pptxgenjs のテーマ既定（Calibri Light）になり、
            // 絵文字だけデッキの他の文字と違うフォントで描かれる
            fontFace: theme.fonts.body,
            align: "center",
            valign: "middle",
          })
        } else {
          // Material Icon: SVG を画像として埋め込む（アスペクト比維持）
          // テキストを運ばないので比較対象外（HTML 側も inline SVG でテキストが無い）
          const size = Math.min(iconBox.w, iconBox.h)
          pptxSlide.addImage({
            objectName: deco(iconKey(index)),
            data: resolved.base64Data.replace(/^data:/, ""),
            x: iconBox.x + (iconBox.w - size) / 2,
            y: iconBox.y + (iconBox.h - size) / 2,
            w: size,
            h: size,
          })
        }
      })
    }

    // コードボックスを描画（シンプル版：ダーク背景 + プレーンテキスト）
    if (codeBoxes) {
      codeBoxes.forEach((codeBox, index) => {
        // 1. ダーク背景を描画
        pptxSlide.addShape(pptx.ShapeType.roundRect, {
          objectName: deco(codeKey(index), "bg"),
          x: codeBox.x,
          y: codeBox.y,
          w: codeBox.w,
          h: codeBox.h,
          fill: { color: codeBox.backgroundColor },
          line: { type: "none" }, // 枠線なし
          rectRadius: theme.codeDisplay.borderRadius,
        })

        // 2. シンタックスハイライト付きリッチテキストとして描画。
        //    余白は座標から引かずに margin（pt）で入れる。座標を内側にずらすと
        //    HTML（外枠 + CSS padding）と報告する矩形が食い違い、3者比較が
        //    「見た目は同じなのに座標が違う」で落ちる
        const pptxRuns = codeTextRunsToPptxRuns(codeBox.textRuns, codeBox.fontFace, codeBox.fontSize)
        pptxSlide.addText(pptxRuns, {
          objectName: codeKey(index),
          x: codeBox.x,
          y: codeBox.y,
          w: codeBox.w,
          h: codeBox.h,
          margin: theme.codeDisplay.padding * 72, // インチ → ポイント
          align: "left",
          valign: "top",
          lineSpacing: codeBox.lineHeight * codeBox.fontSize,
          paraSpaceBefore: 0,
          paraSpaceAfter: 0,
        })
      })
    }

    // シェイプボックスを描画（NumberedList用）
    if (shapeBoxes) {
      shapeBoxes.forEach((shape, index) => {
        if (shape.shapeType === "line") {
          pptxSlide.addShape(pptx.ShapeType.line, {
            objectName: deco(shapeBoxKey(index)),
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
            objectName: deco(shapeBoxKey(index)),
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

          // キーを取るのはテキストを運ぶオーバーレイのほう。HTML はこの2つを
          // 1つの div で描くので、テキスト側が対応物になる。塗りは常に "fill"
          // ——テキストの有無で名前を変えると、同じ役割の図形が2つの名前を持つ
          pptxSlide.addShape(shapeType, {
            objectName: deco(shapeBoxKey(index), "fill"),
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

          if (shape.text) {
            pptxSlide.addText(shape.text, {
              objectName: shapeBoxKey(index),
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
      })
    }

    // テキストボックスを描画
    textBoxes.forEach((box, boxIndex) => {
      const centered = isCentered(box, slide._tag === "TitleSlide")
      // リテラル型を保つ。object literal に入れると string に広がり、
      // pptxgenjs の TextPropsOptions が受け付けなくなる
      const align: "center" | "left" = centered ? "center" : "left"
      const valign = box.valign || (centered ? "middle" : "top")

      // 3分岐が共有する箱の指定。ここに1つ足すと3箇所に散るのを防ぐ
      const boxOpts = {
        objectName: textKey(boxIndex),
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
        align,
        valign,
        ...(box.lineHeight ? { lineSpacing: box.lineHeight * (box.fontSize || 14) } : {}),
      }

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
            box.isItalic || false,
            slideNumberById
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
        pptxSlide.addText(pptxRuns, { ...boxOpts, paraSpaceAfter: PARA_SPACE_AFTER })
      } else if (box.richText) {
        const pptxRuns = inlineTextRunsToPptxRuns(
          box.richText,
          box.fontSize || 14,
          box.color || "000000",
          box.fontFace || theme.fonts.body,
          box.isBold || false,
          box.isItalic || false,
          slideNumberById
        )
        pptxSlide.addText(pptxRuns, boxOpts)
      } else {
        // 既存のシンプルテキストパス（後方互換性）
        const runOptions = {
          fontSize: box.fontSize || 14,
          bold: box.isBold || false,
          italic: box.isItalic || false,
          color: box.color,
          fontFace: box.fontFace || theme.fonts.body,
        }
        pptxSlide.addText(withBreakLines(splitTextIntoLines(box.text ?? ""), runOptions), {
          ...boxOpts,
          ...runOptions,
        })
      }
    })
  })
}
