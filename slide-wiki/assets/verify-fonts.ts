import { readFileSync } from "fs"
import { Effect } from "effect"
import { inspectPptx } from "./src/tools/pptx-inspector.js"

const buffer = readFileSync("doc/Spec.pptx")

const program = Effect.gen(function* () {
  const inventory = yield* inspectPptx(buffer)

  console.log("📝 Inspecting font usage in Spec.pptx...\n")

  const fontUsage = new Map<string, number>()

  for (const [slideKey, slide] of Object.entries(inventory)) {
    for (const [shapeKey, shape] of Object.entries(slide)) {
      for (const paragraph of shape.paragraphs) {
        const count = fontUsage.get(paragraph.font_name) ?? 0
        fontUsage.set(paragraph.font_name, count + 1)
      }
    }
  }

  console.log("Font usage statistics:")
  for (const [fontName, count] of Array.from(fontUsage.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${fontName}: ${count} paragraphs`)
  }

  console.log("\n✅ Font verification complete!")

  if (fontUsage.has("Arial")) {
    console.log(`✅ Arial is being used (${fontUsage.get("Arial")} paragraphs)`)
  } else {
    console.log("⚠️  Arial is NOT found in the presentation")
  }
})

Effect.runPromise(program).catch(console.error)
