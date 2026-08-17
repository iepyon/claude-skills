import { pipe, Option as O, Array as A } from "effect"
import { getTokenMatchers } from "../plugins/registry.js"

export type Token =
  | { type: "HorizontalRule"; line: number }
  | { type: "H1"; text: string; line: number }
  | { type: "H2"; text: string; line: number }
  | { type: "H3"; text: string; line: number }
  | { type: "H4"; text: string; line: number }
  | { type: "BodyText"; text: string; line: number }
  | { type: "LeftDirective"; ratio: number; line: number }
  | { type: "RightDirective"; ratio: number; line: number }
  | { type: "TopDirective"; ratio: number; line: number }
  | { type: "BottomDirective"; ratio: number; line: number }
  | { type: "GridDirective"; rows: number; cols: number; line: number }
  | { type: "IconDirective"; icon: string; line: number }
  | { type: "IdDirective"; id: string; line: number }
  | { type: "TakeawayMarker"; line: number }
  | { type: "SourceMarker"; line: number }
  | { type: "KpiMarker"; line: number }
  | { type: "ChartDirective"; chartType: "bar" | "line" | "donut"; line: number }
  | { type: "PluginDirective"; pluginId: string; line: number }
  | { type: "Image"; alt: string; src: string; line: number }
  | { type: "CodeFenceOpen"; language: string; line: number }
  | { type: "CodeFenceLine"; text: string; line: number }
  | { type: "CodeFenceClose"; line: number }
  | { type: "BlankLine"; line: number }

type TokenMatcher = (line: string, lineNum: number) => O.Option<Token>

// 空行
const matchBlankLine: TokenMatcher = (line, lineNum) =>
  line.trim() === ""
    ? O.some({ type: "BlankLine", line: lineNum })
    : O.none()

// HorizontalRule: ---
const matchHorizontalRule: TokenMatcher = (line, lineNum) =>
  line.trim() === "---"
    ? O.some({ type: "HorizontalRule", line: lineNum })
    : O.none()

// LeftDirective: <!--left:2-->
const matchLeftDirective: TokenMatcher = (line, lineNum) =>
  pipe(
    line.match(/^<!--left:(\d+)-->$/),
    O.fromNullable,
    O.map(m => ({
      type: "LeftDirective" as const,
      ratio: parseInt(m[1], 10),
      line: lineNum
    }))
  )

// RightDirective: <!--right:1-->
const matchRightDirective: TokenMatcher = (line, lineNum) =>
  pipe(
    line.match(/^<!--right:(\d+)-->$/),
    O.fromNullable,
    O.map(m => ({
      type: "RightDirective" as const,
      ratio: parseInt(m[1], 10),
      line: lineNum
    }))
  )

// TopDirective: <!--top:2-->
const matchTopDirective: TokenMatcher = (line, lineNum) =>
  pipe(
    line.match(/^<!--top:(\d+)-->$/),
    O.fromNullable,
    O.map(m => ({
      type: "TopDirective" as const,
      ratio: parseInt(m[1], 10),
      line: lineNum
    }))
  )

// BottomDirective: <!--bottom:1-->
const matchBottomDirective: TokenMatcher = (line, lineNum) =>
  pipe(
    line.match(/^<!--bottom:(\d+)-->$/),
    O.fromNullable,
    O.map(m => ({
      type: "BottomDirective" as const,
      ratio: parseInt(m[1], 10),
      line: lineNum
    }))
  )

// GridDirective: <!--grid:2x3-->
const matchGridDirective: TokenMatcher = (line, lineNum) =>
  pipe(
    line.match(/^<!--grid:(\d+)x(\d+)-->$/),
    O.fromNullable,
    O.map(m => ({
      type: "GridDirective" as const,
      rows: parseInt(m[1], 10),
      cols: parseInt(m[2], 10),
      line: lineNum,
    }))
  )

// IconDirective: <!--icon:👁️-->
const matchIconDirective: TokenMatcher = (line, lineNum) =>
  pipe(
    line.match(/^<!--icon:(.+)-->$/),
    O.fromNullable,
    O.map(m => ({
      type: "IconDirective" as const,
      icon: m[1].trim(),
      line: lineNum
    }))
  )

// IdDirective: <!--id:intro--> — スライドに安定した ID を与える。
// マッチャが無いと未知の HTML コメントは BodyText に落ちて本文として
// 表示されてしまうので、no-op では済まず必ずトークン化する必要がある。
const matchIdDirective: TokenMatcher = (line, lineNum) =>
  pipe(
    line.match(/^<!--id:(.+?)-->$/),
    O.fromNullable,
    O.map(m => ({
      type: "IdDirective" as const,
      id: m[1].trim(),
      line: lineNum
    }))
  )

// TakeawayMarker: <!--takeaway--> (text on following lines)
const matchTakeawayMarker: TokenMatcher = (line, lineNum) =>
  pipe(
    line.match(/^<!--takeaway-->$/),
    O.fromNullable,
    O.map(() => ({
      type: "TakeawayMarker" as const,
      line: lineNum
    }))
  )

// SourceMarker: <!--source--> (text on following lines)
//
// takeaway と別のトークンにしてあるのは、行き先が別だから。takeaway は
// 「まとめ・関連」で richText になりリンクを作るが、source は典拠で、
// リンクを作らず本文の1/3以下の大きさで下端に伏せる。同じトークンで
// 受けて後段で仕分けると、仕分けの根拠が md から消える。
const matchSourceMarker: TokenMatcher = (line, lineNum) =>
  pipe(
    line.match(/^<!--source-->$/),
    O.fromNullable,
    O.map(() => ({
      type: "SourceMarker" as const,
      line: lineNum
    }))
  )

// KpiMarker: <!--kpi--> — Dashboard のセルを KPI タイルにする注釈。
// 効くのは dashboard モードだけだが、トークンはコアで持つ（IdDirective と同じ理由 —
// マッチャが無いと未知のコメントとして BodyText に落ち、本文として描かれる）。
const matchKpiMarker: TokenMatcher = (line, lineNum) =>
  pipe(
    line.match(/^<!--kpi-->$/),
    O.fromNullable,
    O.map(() => ({
      type: "KpiMarker" as const,
      line: lineNum
    }))
  )

// ChartDirective: <!--chart:bar--> — Dashboard のセルをグラフにする注釈。
// 受ける種類は ontology.yaml の annotations（chart）の宣言と揃える。
const matchChartDirective: TokenMatcher = (line, lineNum) =>
  pipe(
    line.match(/^<!--chart:(bar|line|donut)-->$/),
    O.fromNullable,
    O.map(m => ({
      type: "ChartDirective" as const,
      chartType: m[1] as "bar" | "line" | "donut",
      line: lineNum
    }))
  )

// Image: ![alt](src) — 行まるごとが画像参照のときだけ。
// 行の一部に混ざった `![…](…)` は本文のまま（インライン画像は持たない）。
const matchImage: TokenMatcher = (line, lineNum) =>
  pipe(
    line.trim().match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/),
    O.fromNullable,
    O.map(m => ({
      type: "Image" as const,
      alt: m[1].trim(),
      src: m[2].trim(),
      line: lineNum
    }))
  )

// H1: # Title
const matchH1: TokenMatcher = (line, lineNum) =>
  line.startsWith("# ")
    ? O.some({ type: "H1", text: line.slice(2).trim(), line: lineNum })
    : O.none()

// H2: ## Title
const matchH2: TokenMatcher = (line, lineNum) =>
  line.startsWith("## ")
    ? O.some({ type: "H2", text: line.slice(3).trim(), line: lineNum })
    : O.none()

// H3: ### Title
const matchH3: TokenMatcher = (line, lineNum) =>
  line.startsWith("### ")
    ? O.some({ type: "H3", text: line.slice(4).trim(), line: lineNum })
    : O.none()

// H4: #### Title
const matchH4: TokenMatcher = (line, lineNum) =>
  line.startsWith("#### ")
    ? O.some({ type: "H4", text: line.slice(5).trim(), line: lineNum })
    : O.none()

const coreMatchers: ReadonlyArray<TokenMatcher> = [
  matchBlankLine,
  matchHorizontalRule,
  matchLeftDirective,
  matchRightDirective,
  matchTopDirective,
  matchBottomDirective,
  matchGridDirective,
  matchIconDirective,
  matchIdDirective,
  matchTakeawayMarker,
  matchSourceMarker,
  matchKpiMarker,
  matchChartDirective,
  matchImage,
]

function buildMatchers(): ReadonlyArray<TokenMatcher> {
  return [
    ...coreMatchers,
    ...getTokenMatchers(),
    matchH1,
    matchH2,
    matchH3,
    matchH4,
  ]
}

const tokenizeLine = (line: string, lineNum: number): Token => {
  const matchers = buildMatchers()
  return pipe(
    matchers.map(matcher => matcher(line, lineNum)),
    A.findFirst(O.isSome),
    O.flatten,
    O.getOrElse(() => ({ type: "BodyText" as const, text: line.trim(), line: lineNum }))
  )
}

export function tokenize(markdown: string): Token[] {
  const lines = markdown.split("\n")
  const result: Token[] = []
  let inCodeBlock = false

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx]
    const trimmed = line.trim()
    const lineNum = idx + 1

    if (!inCodeBlock && trimmed.startsWith("```")) {
      inCodeBlock = true
      const language = trimmed.slice(3).trim() || "plaintext"
      result.push({ type: "CodeFenceOpen", language, line: lineNum })
    } else if (inCodeBlock && trimmed === "```") {
      inCodeBlock = false
      result.push({ type: "CodeFenceClose", line: lineNum })
    } else if (inCodeBlock) {
      result.push({ type: "CodeFenceLine", text: line, line: lineNum })
    } else {
      result.push(tokenizeLine(line, lineNum))
    }
  }

  return result
}
