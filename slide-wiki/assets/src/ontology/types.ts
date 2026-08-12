/**
 * ontology.yaml の宣言に対応する型。
 *
 * YAML のキーは kebab-case のまま扱う（スネーク変換を挟むと、宣言を読むときに
 * 「YAML では何と書くのか」を思い出せなくなる）。読み取り側は必ずこの型を通す。
 */

/** 語彙の1項目。見出しは `canonical` か `aliases` のどれかに一致すれば受理される。 */
export interface VocabTerm {
  readonly key: string
  /** 正書。表示にも使う */
  readonly canonical: string
  /** 受理する別表記（照合は小文字化・トリムしてから） */
  readonly aliases?: readonly string[]
  readonly description?: string
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
  | "timestamp"
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
  /** Wiki が読み手の画面に描く（スライド右上のバッジと、またぐリンクの補足） */
  | "display"
  /** 置き場所として宣言しただけで、まだ何も読まない */
  | "declared-only"
  /** lint とバンドルを読む側（OKF の消費者・GitHub の表）だけが読む */
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
  /**
   * `required` は**名乗ったデッキにだけ**効く。frontmatter そのものは optional
   * （`require: ignore`）なので、名乗っていない md を巻き込むことはない。
   * OKF が必須とするのは `type` ひとつだけ（SPEC.md §11）。
   */
  readonly level: "required" | "recommended" | "optional"
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
  /**
   * 宣言に無いキーの扱い。OKF 同様、未知のキーは保存して拒まない
   * （SPEC.md §11「Consumers MUST NOT reject a bundle because of … unknown
   * additional frontmatter keys」— これが `category` などの拡張が許される根拠）
   */
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
  /** 表に収まらない補足。`inlineTable()` が表の下に節として出す */
  readonly guidance?: string
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

/** バンドルが予約している1ファイル。デッキとしては読まない */
export interface OkfReservedFile {
  readonly name: string
  readonly role: string
  readonly description: string
}

/** デッキ集合の定め方と、その並びの宣言の在り処 */
export interface OkfDeckSet {
  readonly source: string
  /** 並び順の宣言のファイル名。`src/deck-order.ts` の DECK_ORDER_FILE と一致する */
  readonly "order-file": string
  readonly "order-shape": string
  readonly note?: string
}

/**
 * デッキ slug の作り方。
 *
 * **正規化の規則そのものはここに無い**（`rule` は在り処を指すだけ）。綴りが1箇所である
 * ことが「リンクの両側が同じ規則で作られる」保証なので、写すとその保証が消える。
 */
/** デッキ名 → slug の実例。規則の写しの代わりに置く（selfcheck が実装に通す） */
export interface OkfDeckSlugExample {
  readonly name: string
  readonly slug: string
}

export interface OkfDeckSlug {
  readonly from: string
  readonly rule: string
  /** 宣言が「見せる」規則。`src/okf.ts` の `deckSlug` に通して一致することを selfcheck が見る */
  readonly examples: readonly OkfDeckSlugExample[]
  /**
   * slug が衝突したときの扱い。
   *
   * **`"error"` の1値しか取らない** — 兄弟の `unknown` / `require` と違い、これは
   * lint が読む設定ではなく、実装が常に止めるという事実の宣言である。union にすると
   * `ignore` と書いても全部緑のまま実装は止め続ける、という嘘をつける宣言になる。
   */
  readonly collision: "error"
  readonly note?: string
}

/** スライド ID がどこまで一意か */
export interface OkfSlideIdScope {
  readonly "unique-in": string
  readonly "namespaced-as": string
  readonly note?: string
}

/**
 * バンドル（サイトの階層）。他の節と違い、ここだけが1つの md ファイルの外側を宣言する。
 * 予約ファイル名と版の綴りは `src/okf.ts` が持ち、ontology.test.ts が両者を照合する。
 */
export interface Okf {
  readonly label: string
  readonly description: string
  readonly spec: string
  /** `src/okf.ts` の OKF_VERSION と一致する */
  readonly "okf-version": string
  readonly guidance?: string
  readonly "reserved-files": readonly OkfReservedFile[]
  readonly "reserved-files-note"?: string
  readonly "deck-set": OkfDeckSet
  readonly "deck-slug": OkfDeckSlug
  readonly "slide-id-scope": OkfSlideIdScope
}

export interface Ontology {
  readonly version: number
  readonly elements: Readonly<Record<string, Element>>
  readonly frontmatter: Frontmatter
  readonly annotations: readonly Annotation[]
  readonly layouts: readonly Layout[]
  readonly vocabularies: Readonly<Record<string, Vocabulary>>
  readonly okf: Okf
  readonly inline: Inline
  readonly limits: Limits
}
