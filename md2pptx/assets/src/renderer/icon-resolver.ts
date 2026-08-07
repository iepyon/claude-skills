import { createRequire } from "node:module"
import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"

export type ResolvedIcon =
  | { readonly _tag: "emoji"; readonly text: string }
  | { readonly _tag: "svg"; readonly svgContent: string; readonly base64Data: string }

const MATERIAL_ICON_PREFIX = "mi:"
const FALLBACK_ICON = "?"

// Available Material Design Icon styles
type MaterialIconStyle = "filled" | "outlined" | "round" | "sharp" | "two-tone"

interface ParsedMaterialIcon {
  readonly name: string
  readonly style: MaterialIconStyle
}

// Parse material icon string: "mi:home" or "mi:home:outlined"
function parseMaterialIcon(icon: string): ParsedMaterialIcon | null {
  if (!icon.startsWith(MATERIAL_ICON_PREFIX)) {
    return null
  }

  const parts = icon.slice(MATERIAL_ICON_PREFIX.length).split(":")
  if (parts.length === 0 || parts[0] === "") {
    return null
  }

  const name = parts[0]
  const styleStr = parts[1] || "filled"

  // Validate style
  const validStyles: MaterialIconStyle[] = ["filled", "outlined", "round", "sharp", "two-tone"]
  if (!validStyles.includes(styleStr as MaterialIconStyle)) {
    return null
  }

  const style = styleStr as MaterialIconStyle

  return { name, style }
}

// Load SVG file from @material-design-icons/svg package
function loadMaterialIconSvg(name: string, style: MaterialIconStyle): string | null {
  try {
    // Create CommonJS require for ESM compatibility
    const require = createRequire(import.meta.url)

    // Resolve package root
    const packageJsonPath = require.resolve("@material-design-icons/svg/package.json")
    const packageRoot = dirname(packageJsonPath)

    // Map style to directory name
    const styleDir = style === "two-tone" ? "two-tone" : style

    // Construct SVG file path
    const svgPath = resolve(packageRoot, styleDir, `${name}.svg`)

    // Read SVG file
    return readFileSync(svgPath, "utf-8")
  } catch (error) {
    // File not found or read error
    return null
  }
}

// Inject color into SVG by adding fill attribute to <svg> tag
function injectSvgColor(svgContent: string, hexColor: string): string {
  // Replace opening <svg> tag with fill attribute
  return svgContent.replace(
    /<svg([^>]*)>/,
    `<svg$1 fill="${hexColor}">`
  )
}

// Convert SVG to base64 data URL
function svgToBase64(svgContent: string): string {
  const base64 = Buffer.from(svgContent, "utf-8").toString("base64")
  return `data:image/svg+xml;base64,${base64}`
}

// Resolve icon string to ResolvedIcon
export function resolveIconOrFallback(icon: string, hexColor: string): ResolvedIcon {
  // Check if icon starts with Material Icon prefix
  if (icon.startsWith(MATERIAL_ICON_PREFIX)) {
    // Attempt to parse as Material Icon
    const parsed = parseMaterialIcon(icon)

    if (parsed) {
      // Try to load Material Icon SVG
      const svgContent = loadMaterialIconSvg(parsed.name, parsed.style)

      if (svgContent) {
        // Inject color and convert to base64
        const coloredSvg = injectSvgColor(svgContent, hexColor)
        const base64Data = svgToBase64(coloredSvg)

        return {
          _tag: "svg",
          svgContent: coloredSvg,
          base64Data,
        }
      }
    }

    // Material icon syntax but invalid/not found, fallback to "?"
    return {
      _tag: "emoji",
      text: FALLBACK_ICON,
    }
  }

  // Not a Material Icon, treat as emoji
  return {
    _tag: "emoji",
    text: icon,
  }
}
