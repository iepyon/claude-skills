import { pipe, Option as O, Array as A, Effect } from "effect"
import { Presentation, Slide, Theme, DEFAULT_THEME } from "../../schema/index.js"
import { RenderError } from "../../errors.js"
import { slideRenderers } from "./slide-renderers.js"
import { generateHtml } from "./template.js"

// Dispatch slide rendering to appropriate handler.
// export しているのは Wiki レンダラが同じスライド DOM を使うため。
// 複製すると PPTX/HTML/Wiki の三者が静かにずれる。
export function renderSlide(slide: Slide, theme: Theme, slideIndex: number): string {
  return pipe(
    slideRenderers.map((renderer) => renderer(slide, theme, slideIndex)),
    A.findFirst(O.isSome),
    O.flatten,
    O.getOrElse(() => `<div class="slide" data-slide-id="slide-${slideIndex}" style="background-color: white"></div>`)
  )
}

// Main renderer function
export function renderToHtml(
  presentation: Presentation,
  theme: Theme = DEFAULT_THEME
): Effect.Effect<string, RenderError> {
  return Effect.gen(function* () {
    const slidesHtml = presentation.slides.map((slide, index) => renderSlide(slide, theme, index))
    return generateHtml(slidesHtml, theme)
  })
}
