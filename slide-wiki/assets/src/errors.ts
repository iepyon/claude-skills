import { Data } from "effect"

export class ParseError extends Data.TaggedError("ParseError")<{
  message: string
  line?: number
}> {}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  message: string
  slideIndex?: number
  charCount?: number
}> {}

export class RenderError extends Data.TaggedError("RenderError")<{
  message: string
}> {}

export class ThemeError extends Data.TaggedError("ThemeError")<{
  message: string
}> {}

export type Md2PptxError = ParseError | ValidationError | RenderError | ThemeError
