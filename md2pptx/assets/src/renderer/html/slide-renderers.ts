import { Option as O } from "effect"
import { Slide, Theme } from "../../schema/index.js"
import { layoutSlide } from "../layout/index.js"
import { textBoxToHtml, borderBoxToHtml, iconBoxToHtml, codeBoxToHtml, shapeBoxToHtml, hexToColor, escapeAttr } from "./element-renderers.js"
import { textKey, iconKey, codeKey, shapeBoxKey, borderKey } from "../../shape-keys.js"

// スライド ID を data 属性で持たせる。
// id= を使わないのは、Wiki のホバープレビューがスライド DOM を cloneNode するため
// （id= だとプレビューを開くたびに ID が重複する）。
// data-slide-id="slide-N" は html-inspector が要素を切り出す鍵なので触らない。
// data-default-font-name も同じく html-inspector 用。PPTX が theme1.xml に
// 既定フォントを持っているのと同じで、HTML も自分で名乗る — 読む側が
// 定数を持つと --theme を使ったときにその脚だけ食い違う。
const slideKeyAttr = (slide: Slide): string =>
  slide.id ? ` data-slide-key="${escapeAttr(slide.id)}"` : ""

// Slide renderer type - returns Some(html) if it handles this slide tag
export type SlideRenderer = (slide: Slide, theme: Theme, slideIndex: number) => O.Option<string>

// Render TitleSlide
const renderTitleSlide: SlideRenderer = (slide, theme, slideIndex) => {
  if (slide._tag !== "TitleSlide") return O.none()

  const layout = layoutSlide(slide, theme)
  const backgroundColor = hexToColor(theme.titleSlide.background)

  const textBoxesHtml = layout.textBoxes
    .map((box, index) => textBoxToHtml(box, textKey(index), true))
    .join("\n    ")

  const slideHtml = `
  <div class="slide title-slide" data-slide-id="slide-${slideIndex}"${slideKeyAttr(slide)} data-default-font-name="${escapeAttr(theme.fonts.body)}" style="background-color: ${backgroundColor}">
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
    ? layout.borderBoxes.map((box, index) => borderBoxToHtml(box, theme, borderKey(index))).join("\n    ")
    : ""

  const iconBoxesHtml = layout.iconBoxes
    ? layout.iconBoxes.map((box, index) => iconBoxToHtml(box, iconKey(index))).join("\n    ")
    : ""

  const codeBoxesHtml = layout.codeBoxes
    ? layout.codeBoxes.map((box, index) => codeBoxToHtml(box, theme, codeKey(index))).join("\n    ")
    : ""

  const shapeBoxesHtml = layout.shapeBoxes
    ? layout.shapeBoxes.map((box, index) => shapeBoxToHtml(box, shapeBoxKey(index))).join("\n    ")
    : ""

  const textBoxesHtml = layout.textBoxes
    .map((box, index) => textBoxToHtml(box, textKey(index)))
    .join("\n    ")

  const slideHtml = `
  <div class="slide content-slide" data-slide-id="slide-${slideIndex}"${slideKeyAttr(slide)} data-default-font-name="${escapeAttr(theme.fonts.body)}" style="background-color: ${backgroundColor}">
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
