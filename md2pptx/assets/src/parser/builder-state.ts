import { pipe, Option as O } from "effect"
import { BuilderState } from "./builder-types.js"
import { getSectionRoute } from "../plugins/registry.js"

/**
 * Save the current section to the current slide.
 *
 * Algorithm (mode-based section routing):
 * Depending on the current layout mode, the section is appended to the
 * corresponding array on the slide:
 *   - "left"/"right"  → leftSections/rightSections (LeftRight layout)
 *   - "top"/"bottom"  → topSections/bottomSections (TopBottom layout)
 *   - "grid"          → gridCells (Grid layout)
 *   - "default"       → sections (Default layout)
 *   - plugin modes    → field from getSectionRoute()
 * If no section or slide is active, the state is returned unchanged.
 */
export const saveSection = (state: BuilderState): BuilderState =>
  pipe(
    O.all([state.currentSection, state.currentSlide]),
    O.match({
      onNone: () => state,
      onSome: ([section, slide]) => {
        const updatedSlide = (() => {
          if (state.mode === "left" && slide.leftSections) {
            return { ...slide, leftSections: [...slide.leftSections, section] }
          }
          if (state.mode === "right" && slide.rightSections) {
            return { ...slide, rightSections: [...slide.rightSections, section] }
          }
          if (state.mode === "top" && slide.topSections) {
            return { ...slide, topSections: [...slide.topSections, section] }
          }
          if (state.mode === "bottom" && slide.bottomSections) {
            return { ...slide, bottomSections: [...slide.bottomSections, section] }
          }
          if (state.mode === "grid" && slide.gridCells) {
            return { ...slide, gridCells: [...slide.gridCells, section] }
          }
          if (state.mode === "default" && slide.sections) {
            return { ...slide, sections: [...slide.sections, section] }
          }
          // Plugin section route fallback
          const pluginField = getSectionRoute(state.mode)
          if (pluginField) {
            const existing = slide.pluginData?.[pluginField]
            if (Array.isArray(existing)) {
              return { ...slide, pluginData: { ...slide.pluginData, [pluginField]: [...existing, section] } }
            }
          }
          return slide
        })()

        return {
          ...state,
          currentSlide: O.some(updatedSlide),
          currentSection: O.none(),
        }
      },
    })
  )

/**
 * Save the current slide to the slides array.
 *
 * Algorithm:
 * 1. First saves any pending section via saveSection().
 * 2. If a current slide exists, pushes it to the slides array.
 * 3. Resets currentSlide, currentSection, mode, and pluginState to defaults.
 */
export const saveSlide = (state: BuilderState): BuilderState => {
  const afterSection = saveSection(state)
  return pipe(
    afterSection.currentSlide,
    O.match({
      onNone: () => afterSection,
      // 数え上げずに広げる。スライドを跨いでも変わらない情報（`options` など）を
      // field ごとに書き写す形だと、足すたびにここへ1行足す必要があり、
      // 忘れても黙って通る（2枚目以降だけ壊れる）
      onSome: (slide) => ({
        ...afterSection,
        slides: [...afterSection.slides, slide],
        currentSlide: O.none(),
        currentSection: O.none(),
        mode: "default" as string,
        pluginState: {},
      }),
    })
  )
}
