import PptxGenJS from "pptxgenjs"
import { Effect } from "effect"
import { RenderError } from "../../errors.js"
import { Presentation, Theme, DEFAULT_THEME } from "../../schema/index.js"
import { buildSlide } from "./slide-builder.js"

export interface RenderOptions {
  compression?: boolean
  theme?: Theme
}

export function renderPresentation(
  pres: Presentation,
  options: RenderOptions = {}
): Effect.Effect<Buffer, RenderError> {
  return Effect.gen(function* () {
    const pptx = new PptxGenJS()
    pptx.layout = "LAYOUT_16x9"

    const theme = options.theme ?? DEFAULT_THEME

    // 各スライドを構築
    for (const slide of pres.slides) {
      yield* buildSlide(pptx, slide, theme)
    }

    // 書き出し（圧縮オプション対応）
    const compression = options.compression ?? false
    const data = yield* Effect.tryPromise({
      try: () => pptx.write({ outputType: "nodebuffer", compression }) as Promise<Buffer>,
      catch: (e) => new RenderError({ message: String(e) }),
    })

    return data
  })
}
