import { Option as O } from "effect"
import { Slide, Theme } from "../../schema/index.js"
import { layoutSlide } from "../layout/index.js"
import { textBoxToHtml, borderBoxToHtml, iconBoxToHtml, codeBoxToHtml, shapeBoxToHtml, hexToColor } from "./element-renderers.js"

// Slide renderer type - returns Some(html) if it handles this slide tag
export type SlideRenderer = (slide: Slide, theme: Theme, slideIndex: number) => O.Option<string>

// Render TitleSlide
const renderTitleSlide: SlideRenderer = (slide, theme, slideIndex) => {
  if (slide._tag !== "TitleSlide") return O.none()

  const layout = layoutSlide(slide, theme)
  const backgroundColor = hexToColor(theme.titleSlide.background)

  const textBoxesHtml = layout.textBoxes
    .map((box, index) => textBoxToHtml(box, `shape-${index}`, true))
    .join("\n    ")

  const slideHtml = `
  <div class="slide title-slide" data-slide-id="slide-${slideIndex}" style="background-color: ${backgroundColor}">
    ${textBoxesHtml}
  </div>`

  return O.some(slideHtml)
}

// Render ContentSlide
const renderContentSlide: SlideRenderer = (slide, theme, slideIndex) => {
  if (slide._tag !== "ContentSlide") return O.none()

  const layout = layoutSlide(slide, theme)
  const backgroundColor = hexToColor(theme.contentSlide.background || "FFFFFF")

  const borderBoxesHtml = layout.borderBoxes
    ? layout.borderBoxes.map((box) => borderBoxToHtml(box, theme)).join("\n    ")
    : ""

  const iconBoxesHtml = layout.iconBoxes
    ? layout.iconBoxes.map((box, index) => iconBoxToHtml(box, `icon-${index}`)).join("\n    ")
    : ""

  const codeBoxesHtml = layout.codeBoxes
    ? layout.codeBoxes.map((box, index) => codeBoxToHtml(box, theme, `code-${index}`)).join("\n    ")
    : ""

  const shapeBoxesHtml = layout.shapeBoxes
    ? layout.shapeBoxes.map((box, index) => shapeBoxToHtml(box, `shape-box-${index}`)).join("\n    ")
    : ""

  const textBoxesHtml = layout.textBoxes
    .map((box, index) => textBoxToHtml(box, `shape-${index}`))
    .join("\n    ")

  const slideHtml = `
  <div class="slide content-slide" data-slide-id="slide-${slideIndex}" style="background-color: ${backgroundColor}">
    ${borderBoxesHtml}
    ${shapeBoxesHtml}
    ${iconBoxesHtml}
    ${codeBoxesHtml}
    ${textBoxesHtml}
  </div>`

  return O.some(slideHtml)
}

// All slide renderers in priority order
export const slideRenderers: ReadonlyArray<SlideRenderer> = [renderTitleSlide, renderContentSlide]
