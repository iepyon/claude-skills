/**
 * ontology.yaml の宣言に対応する型。
 *
 * YAML のキーは kebab-case のまま扱う（スネーク変換を挟むと、宣言を読むときに
 * 「YAML では何と書くのか」を思い出せなくなる）。読み取り側は必ずこの型を通す。
 */

/** 語彙の1項目。`canonical` か `pattern` のどちらかで見出しを受理する。 */
export interface VocabTerm {
  readonly key: string
  /** 正書。表示にも使う。`pattern` を持つ項目では書式の説明を兼ねる */
  readonly canonical: string
  /** 受理する別表記（照合は小文字化・トリムしてから） */
  readonly aliases?: readonly string[]
  /** 固定名でなく正規表現で受理する項目（具体例N：… のような連番節） */
  readonly pattern?: string
  readonly description?: string
  /** その節の中で意味を持つ `**ラベル:**` */
  readonly "sub-labels"?: SubLabels
}

export interface SubLabels {
  readonly match: "exact" | "contains-any"
  readonly terms: readonly SubLabelTerm[]
}

export interface SubLabelTerm {
  readonly key: string
  /** match: exact のとき */
  readonly canonical?: string
  /** match: contains-any のとき、いずれかを含めば一致 */
  readonly contains?: readonly string[]
  /** match: contains-any のとき、すべて含めば一致 */
  readonly "contains-all"?: readonly string[]
}

export interface Vocabulary {
  readonly label: string
  /** 語彙外の見出しの扱い */
  readonly unknown: "warning" | "error" | "ignore"
  /** 語彙外だと実際に何が起きるか（lint のメッセージに載せる） */
  readonly "unknown-effect"?: string
  readonly guidance?: string
  readonly terms: readonly VocabTerm[]
}

export interface Slot {
  readonly name: string
  /**
   * その枠を認識する行頭記号。`###` / `####` のほか、行そのものが1枠になるスロットが
   * 2種類ある: コードフェンスは ```` ```<lang> ````（例 ```` ```pattern-diagram ````）、
   * 画像参照は `![…](….svg)` を名乗り、末尾の拡張子が受理する種類になる。
   *
   * リテラル union にせず string にしてあるのは、許される形の判定を selfcheck.ts に
   * 一本化するため。型と検査の両方に同じ集合を書くと、増やすときに片方だけ直る。
   */
  readonly marker: string
  /** "1..n" / "3" / "3..n" / "0..1" / "1..9" / "rows*cols" */
  readonly cardinality: string
  readonly heading: "free" | "vocabulary"
  readonly vocabulary?: string
  readonly body?: "free" | "lines" | "bullets-only" | "none"
  readonly description?: string
}

export interface LayoutDirective {
  readonly syntax: string
  /** 正規表現で認識するものだけ持つ。無ければ syntax の完全一致 */
  readonly pattern?: string
  /** コメントではない記法（コードフェンス）はトークナイザが特別扱いする */
  readonly kind?: "code-fence"
}

export interface Layout {
  /** SlideLayout の _tag（プラグインの layoutTag）。実装との結合キー */
  readonly name: string
  /** ドキュメントの表に出す表示名 */
  readonly label: string
  /** 対応するプラグイン id。コアレイアウトは null */
  readonly plugin: string | null
  readonly directives: readonly LayoutDirective[]
  readonly description: string
  readonly guidance?: string
  /** このレイアウトで効く注釈の name */
  readonly annotations: readonly string[]
  /** 文字数上限の上書き。省略時は limits.max-chars-per-slide */
  readonly "max-chars"?: number
  /** ディレクティブと最初の `###` の間に置く本文の意味 */
  readonly "leading-body"?: string
  readonly slots: readonly Slot[]
  /** 1ブロックから複数スライドを作るレイアウトの、生成される _tag の並び */
  readonly produces?: readonly string[]
  readonly "field-set"?: string
  readonly example?: string
}

export interface Annotation {
  readonly name: string
  readonly syntax: string
  readonly pattern: string
  readonly "applies-to": readonly string[]
  readonly cardinality: string
  readonly position?: string
  readonly description: string
  readonly guidance?: string
  readonly example?: string
}

export interface FieldKey {
  readonly name: string
  readonly required: boolean
  readonly kind: "text" | "int" | "list"
  readonly separator?: string
  readonly description: string
  readonly example?: string
}

export interface FieldSet {
  readonly label: string
  /** このフィールドセットを持つレイアウトの name */
  readonly layout: string
  readonly syntax: string
  readonly guidance?: string
  readonly unknown: "warning" | "error" | "ignore"
  readonly keys: readonly FieldKey[]
}

export interface Element {
  readonly marker?: string
  readonly label: string
  readonly description: string
  readonly guidance?: string
}

/** frontmatter の値に許す形。形が正規表現で決まるものは `value-patterns` にキーを持つ */
export type FieldKind =
  | "text"
  | "list-of-text"
  | "date"
  | "actor"
  | "uri"
  | "object"
  | "list-of-objects"

/**
 * そのキーが**いま何に効くか**。
 *
 * 宣言に持たせているのは、「書いたのに何も起きない」を読み手が事前に知れるようにするため。
 * 生成ドキュメントの表に列として出るので、散文で言い添える必要がない。
 */
export type FieldEffect =
  /** サイドバーの絞り込みに流れる */
  | "search"
  /** 置き場所として宣言しただけで、まだ何も読まない */
  | "declared-only"
  /** lint と外部ツール（Obsidian の Properties・GitHub の表）だけが読む */
  | "metadata"

/** `sources[].resource` のような入れ子のキー */
export interface SubField {
  readonly name: string
  readonly required: boolean
  readonly kind: FieldKind
  readonly description: string
}

export interface FrontmatterField {
  readonly name: string
  /** required は使わない（frontmatter そのものが optional なので、要求すると全部が warning になる） */
  readonly level: "recommended" | "optional"
  readonly kind: FieldKind
  /** 省略時は metadata（lint と外部ツールだけが読む） */
  readonly effect?: FieldEffect
  readonly description: string
  readonly vocabulary?: string
  readonly "allowed-values"?: readonly string[]
  readonly default?: string
  readonly "sub-fields"?: readonly SubField[]
  /** kind: date のとき、過去になったらどう報せるか */
  readonly expired?: "warning" | "error" | "ignore"
  readonly example?: string
}

/** frontmatter を認識する条件。緩めると既存 md が巻き添えになるので宣言に置く */
export interface FrontmatterRecognition {
  readonly "first-line": string
  readonly "second-line-pattern": string
  readonly note?: string
}

export interface Frontmatter {
  readonly label: string
  readonly description: string
  readonly guidance?: string
  readonly recognition: FrontmatterRecognition
  /** frontmatter を持たない md の扱い */
  readonly require: "warning" | "error" | "ignore"
  /** 宣言に無いキーの扱い。OKF 同様、未知のキーは保存して拒まない */
  readonly unknown: "warning" | "error" | "ignore"
  readonly "unknown-near-miss": "warning" | "error" | "ignore"
  readonly "near-miss-distance": number
  /** 1行目が `---` なのに frontmatter と認識されなかったときの扱い */
  readonly "not-recognized": "warning" | "error" | "ignore"
  readonly malformed: "warning" | "error" | "ignore"
  readonly "title-matches-heading": "warning" | "error" | "ignore"
  readonly fields: readonly FrontmatterField[]
  readonly "value-patterns": Readonly<Record<string, string>>
}

export interface InlineSyntax {
  readonly name: string
  readonly syntax: string
  readonly "counts-chars"?: string
  readonly description: string
}

export interface Inline {
  readonly "effective-in": readonly string[]
  readonly "not-effective-in-note": string
  readonly syntaxes: readonly InlineSyntax[]
}

export interface Limits {
  readonly "max-chars-per-slide": number
  readonly "recommended-chars-per-slide": number
  readonly counts: string
  readonly "excluded-layouts": readonly string[]
  readonly guidance?: string
}

export interface Ontology {
  readonly version: number
  readonly elements: Readonly<Record<string, Element>>
  readonly frontmatter: Frontmatter
  readonly annotations: readonly Annotation[]
  readonly layouts: readonly Layout[]
  readonly vocabularies: Readonly<Record<string, Vocabulary>>
  readonly "field-sets": Readonly<Record<string, FieldSet>>
  readonly inline: Inline
  readonly limits: Limits
}
