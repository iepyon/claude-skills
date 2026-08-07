/**
 * Slide inventory comparison tool with configurable tolerance
 */

// Type definitions
export interface Paragraph {
  readonly text: string
  readonly alignment?: string
  readonly font_name: string
  readonly font_size: number
  readonly bold?: boolean
  readonly color: string
}

export interface Shape {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
  readonly paragraphs: ReadonlyArray<Paragraph>
}

export type SlideShapes = Record<string, Shape>
export type SlideInventory = Record<string, SlideShapes>

export interface ToleranceOptions {
  readonly position: number // inches
  readonly fontSize: number // points
}

export interface Mismatch {
  readonly slide: string
  readonly shape: string
  readonly property: string
  readonly expected: number | string | boolean | undefined
  readonly actual: number | string | boolean | undefined
  readonly delta?: number
}

export interface DiffResult {
  readonly matches: number
  readonly mismatches: ReadonlyArray<Mismatch>
}

// Default tolerance values
const DEFAULT_TOLERANCE: ToleranceOptions = {
  position: 0.02, // ±0.02 inches
  fontSize: 0.5,  // ±0.5 points
}

/**
 * Compare two numeric values with tolerance
 */
function isWithinTolerance(
  expected: number,
  actual: number,
  tolerance: number
): boolean {
  return Math.abs(expected - actual) <= tolerance
}

/**
 * Compare two paragraphs and return mismatches
 */
function compareParagraphs(
  slideId: string,
  shapeId: string,
  paragraphIndex: number,
  expected: Paragraph,
  actual: Paragraph,
  tolerance: ToleranceOptions
): ReadonlyArray<Mismatch> {
  const mismatches: Mismatch[] = []
  const prefix = `${slideId}.${shapeId}.paragraph-${paragraphIndex}`

  // Text comparison (exact match)
  if (expected.text !== actual.text) {
    mismatches.push({
      slide: slideId,
      shape: shapeId,
      property: `${prefix}.text`,
      expected: expected.text,
      actual: actual.text,
    })
  }

  // Alignment comparison (exact match)
  if (expected.alignment !== actual.alignment) {
    mismatches.push({
      slide: slideId,
      shape: shapeId,
      property: `${prefix}.alignment`,
      expected: expected.alignment,
      actual: actual.alignment,
    })
  }

  // Font name comparison (exact match)
  if (expected.font_name !== actual.font_name) {
    mismatches.push({
      slide: slideId,
      shape: shapeId,
      property: `${prefix}.font_name`,
      expected: expected.font_name,
      actual: actual.font_name,
    })
  }

  // Font size comparison (with tolerance)
  if (!isWithinTolerance(expected.font_size, actual.font_size, tolerance.fontSize)) {
    mismatches.push({
      slide: slideId,
      shape: shapeId,
      property: `${prefix}.font_size`,
      expected: expected.font_size,
      actual: actual.font_size,
      delta: Math.abs(expected.font_size - actual.font_size),
    })
  }

  // Bold comparison (exact match)
  if (expected.bold !== actual.bold) {
    mismatches.push({
      slide: slideId,
      shape: shapeId,
      property: `${prefix}.bold`,
      expected: expected.bold,
      actual: actual.bold,
    })
  }

  // Color comparison (exact match)
  if (expected.color !== actual.color) {
    mismatches.push({
      slide: slideId,
      shape: shapeId,
      property: `${prefix}.color`,
      expected: expected.color,
      actual: actual.color,
    })
  }

  return mismatches
}

/**
 * Compare two shapes and return mismatches
 */
function compareShapes(
  slideId: string,
  shapeId: string,
  expected: Shape,
  actual: Shape,
  tolerance: ToleranceOptions
): ReadonlyArray<Mismatch> {
  const mismatches: Mismatch[] = []

  // Position and dimension comparisons (with position tolerance)
  if (!isWithinTolerance(expected.left, actual.left, tolerance.position)) {
    mismatches.push({
      slide: slideId,
      shape: shapeId,
      property: 'left',
      expected: expected.left,
      actual: actual.left,
      delta: Math.abs(expected.left - actual.left),
    })
  }

  if (!isWithinTolerance(expected.top, actual.top, tolerance.position)) {
    mismatches.push({
      slide: slideId,
      shape: shapeId,
      property: 'top',
      expected: expected.top,
      actual: actual.top,
      delta: Math.abs(expected.top - actual.top),
    })
  }

  if (!isWithinTolerance(expected.width, actual.width, tolerance.position)) {
    mismatches.push({
      slide: slideId,
      shape: shapeId,
      property: 'width',
      expected: expected.width,
      actual: actual.width,
      delta: Math.abs(expected.width - actual.width),
    })
  }

  if (!isWithinTolerance(expected.height, actual.height, tolerance.position)) {
    mismatches.push({
      slide: slideId,
      shape: shapeId,
      property: 'height',
      expected: expected.height,
      actual: actual.height,
      delta: Math.abs(expected.height - actual.height),
    })
  }

  // Paragraph count comparison
  if (expected.paragraphs.length !== actual.paragraphs.length) {
    mismatches.push({
      slide: slideId,
      shape: shapeId,
      property: 'paragraphs.length',
      expected: expected.paragraphs.length,
      actual: actual.paragraphs.length,
      delta: Math.abs(expected.paragraphs.length - actual.paragraphs.length),
    })
  }

  // Compare each paragraph
  const minLength = Math.min(expected.paragraphs.length, actual.paragraphs.length)
  for (let i = 0; i < minLength; i++) {
    const paragraphMismatches = compareParagraphs(
      slideId,
      shapeId,
      i,
      expected.paragraphs[i],
      actual.paragraphs[i],
      tolerance
    )
    mismatches.push(...paragraphMismatches)
  }

  return mismatches
}

/**
 * Compare two slide inventories and return a diff result
 *
 * @param expected - The expected inventory (baseline)
 * @param actual - The actual inventory to compare
 * @param tolerance - Optional tolerance settings (defaults: position ±0.02in, fontSize ±0.5pt)
 * @returns DiffResult with match count and array of mismatches
 */
export function diffInventory(
  expected: SlideInventory,
  actual: SlideInventory,
  tolerance: Partial<ToleranceOptions> = {}
): DiffResult {
  const finalTolerance: ToleranceOptions = {
    ...DEFAULT_TOLERANCE,
    ...tolerance,
  }

  const allMismatches: Mismatch[] = []
  let matchCount = 0

  // Get all unique slide IDs from both inventories
  const expectedSlideIds = new Set(Object.keys(expected))
  const actualSlideIds = new Set(Object.keys(actual))
  const allSlideIds = new Set([...expectedSlideIds, ...actualSlideIds])

  for (const slideId of allSlideIds) {
    const expectedSlide = expected[slideId]
    const actualSlide = actual[slideId]

    // Check if slide exists in both
    if (!expectedSlide) {
      allMismatches.push({
        slide: slideId,
        shape: '*',
        property: 'slide.exists',
        expected: false,
        actual: true,
      })
      continue
    }

    if (!actualSlide) {
      allMismatches.push({
        slide: slideId,
        shape: '*',
        property: 'slide.exists',
        expected: true,
        actual: false,
      })
      continue
    }

    // Get all unique shape IDs from both slides
    const expectedShapeIds = new Set(Object.keys(expectedSlide))
    const actualShapeIds = new Set(Object.keys(actualSlide))
    const allShapeIds = new Set([...expectedShapeIds, ...actualShapeIds])

    for (const shapeId of allShapeIds) {
      const expectedShape = expectedSlide[shapeId]
      const actualShape = actualSlide[shapeId]

      // Check if shape exists in both
      if (!expectedShape) {
        allMismatches.push({
          slide: slideId,
          shape: shapeId,
          property: 'shape.exists',
          expected: false,
          actual: true,
        })
        continue
      }

      if (!actualShape) {
        allMismatches.push({
          slide: slideId,
          shape: shapeId,
          property: 'shape.exists',
          expected: true,
          actual: false,
        })
        continue
      }

      // Compare shapes
      const shapeMismatches = compareShapes(
        slideId,
        shapeId,
        expectedShape,
        actualShape,
        finalTolerance
      )

      if (shapeMismatches.length === 0) {
        matchCount++
      } else {
        allMismatches.push(...shapeMismatches)
      }
    }
  }

  return {
    matches: matchCount,
    mismatches: allMismatches,
  }
}
