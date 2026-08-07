import type { SlideLayout } from "../../schema/presentation.js"

// Pattern metadata from frontmatter
export class PatternMeta {
  readonly number: string
  readonly name: string
  readonly category: string
  readonly stage: string
  readonly oneliner: string
  readonly difficulty: number
  readonly frequency: number
  readonly relatedPatterns: readonly string[]
  readonly takeaway: string
  readonly reference: string
  constructor(props: {
    number: string
    name: string
    category: string
    stage: string
    oneliner: string
    difficulty: number
    frequency: number
    relatedPatterns: readonly string[]
    takeaway: string
    reference: string
  }) {
    this.number = props.number
    this.name = props.name
    this.category = props.category
    this.stage = props.stage
    this.oneliner = props.oneliner
    this.difficulty = props.difficulty
    this.frequency = props.frequency
    this.relatedPatterns = props.relatedPatterns
    this.takeaway = props.takeaway
    this.reference = props.reference
  }
}

// Success example
export class PatternSuccessExample {
  readonly title: string
  readonly before: string
  readonly analysis: string
  readonly after: string
  constructor(props: { title: string; before: string; analysis: string; after: string }) {
    this.title = props.title
    this.before = props.before
    this.analysis = props.analysis
    this.after = props.after
  }
}

// Failure example
export class PatternFailureExample {
  readonly title: string
  readonly attempt: string
  readonly problem: string
  readonly improvement: string
  constructor(props: { title: string; attempt: string; problem: string; improvement: string }) {
    this.title = props.title
    this.attempt = props.attempt
    this.problem = props.problem
    this.improvement = props.improvement
  }
}

// Concrete example item (H4-based label/text pair)
export class ConcreteExampleItem {
  readonly label: string
  readonly text: string
  constructor(props: { label: string; text: string }) {
    this.label = props.label
    this.text = props.text
  }
}

// Concrete example (具体例)
export class ConcreteExample {
  readonly number: number
  readonly title: string
  readonly goodExample: string
  readonly goodPoints: string
  readonly badExample: string
  readonly badReason: string
  readonly items: readonly ConcreteExampleItem[]
  constructor(props: {
    number: number
    title: string
    goodExample: string
    goodPoints: string
    badExample: string
    badReason: string
    items?: readonly ConcreteExampleItem[]
  }) {
    this.number = props.number
    this.title = props.title
    this.goodExample = props.goodExample
    this.goodPoints = props.goodPoints
    this.badExample = props.badExample
    this.badReason = props.badReason
    this.items = props.items ?? []
  }
}

// Page 1: Overview Card
export class PatternLanguageOverviewLayout implements SlideLayout {
  readonly _tag = "PatternLanguageOverview" as const
  readonly meta: PatternMeta
  readonly situation: string
  readonly problem: string
  readonly solution: string
  readonly principles: readonly string[]
  readonly result: string
  readonly caution: string
  readonly diagram: string
  readonly totalPages: number
  constructor(props: {
    meta: PatternMeta
    situation: string
    problem: string
    solution: string
    principles: readonly string[]
    result: string
    caution: string
    diagram?: string
    totalPages?: number
  }) {
    this.meta = props.meta
    this.situation = props.situation
    this.problem = props.problem
    this.solution = props.solution
    this.principles = props.principles
    this.result = props.result
    this.caution = props.caution
    this.diagram = props.diagram ?? ""
    this.totalPages = props.totalPages ?? 2
  }
}

// Page 2: Detail Card
export class PatternLanguageDetailLayout implements SlideLayout {
  readonly _tag = "PatternLanguageDetail" as const
  readonly meta: PatternMeta
  readonly success: PatternSuccessExample
  readonly failure: PatternFailureExample
  readonly concreteExamples: readonly ConcreteExample[]
  readonly template: string
  readonly checklist: readonly string[]
  readonly teamScenarios: readonly string[]
  readonly totalPages: number
  constructor(props: {
    meta: PatternMeta
    success: PatternSuccessExample
    failure: PatternFailureExample
    concreteExamples?: readonly ConcreteExample[]
    template: string
    checklist: readonly string[]
    teamScenarios: readonly string[]
    totalPages?: number
  }) {
    this.meta = props.meta
    this.success = props.success
    this.failure = props.failure
    this.concreteExamples = props.concreteExamples ?? []
    this.template = props.template
    this.checklist = props.checklist
    this.teamScenarios = props.teamScenarios
    this.totalPages = props.totalPages ?? 2
  }
}
