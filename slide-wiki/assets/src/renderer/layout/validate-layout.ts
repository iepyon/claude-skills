import { Effect, pipe } from "effect"
import { ValidationError } from "../../errors.js"
import type { Presentation } from "../../schema/index.js"
import type { Theme } from "../../schema/theme.js"
import { layoutSlide } from "./index.js"
import { detectOverflow, type Overflow } from "./overflow.js"

function describeOverflow(overflow: Overflow): string {
  const at = `(${overflow.box.x.toFixed(2)}, ${overflow.box.y.toFixed(2)})`
  if (overflow.kind === "outOfBounds") {
    return `a box at ${at} sized ${overflow.box.w.toFixed(2)}x${overflow.box.h.toFixed(2)}in extends outside the slide's safe area`
  }
  return `text in the box at ${at} needs about ${overflow.needed!.toFixed(2)}in but the box is only ${overflow.box.h.toFixed(2)}in tall`
}

/**
 * Fail the pipeline when a slide still overflows after dispatchLayout has
 * exhausted its font-shrinking steps.
 *
 * This is what makes "silently overflowing output" impossible: content either
 * shrinks to fit or the build stops with the slide number and the reason.
 */
export function validateLayout(
  pres: Presentation,
  theme: Theme
): Effect.Effect<Presentation, ValidationError> {
  return pipe(
    Effect.sync(() => {
      for (let i = 0; i < pres.slides.length; i++) {
        const overflows = detectOverflow(layoutSlide(pres.slides[i], theme))
        if (overflows.length > 0) {
          const detail = overflows.slice(0, 3).map(describeOverflow).join("; ")
          const more = overflows.length > 3 ? ` (and ${overflows.length - 3} more)` : ""
          return Effect.fail(
            new ValidationError({
              message:
                `Slide ${i + 1} overflows even at the smallest font size: ${detail}${more}. ` +
                `Shorten the content or split it across slides.`,
              slideIndex: i,
            })
          )
        }
      }
      return Effect.succeed(pres)
    }),
    Effect.flatten
  )
}
