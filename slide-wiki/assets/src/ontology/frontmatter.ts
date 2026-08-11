/**
 * デッキ md の冒頭に置く YAML frontmatter の分割と読み取り。
 *
 * トークナイザは行 `---` を**無条件にスライド区切り**として読む（`tokenizer.ts` の
 * `matchHorizontalRule`）。frontmatter を認めるには、その手前で剥がすしかない。
 * ただし剥がす条件を緩くすると、1行目が `---` の既存ファイル（`__tests__/markdown-spec/`
 * の8本はすべてそう）が巻き添えで壊れる。**認識は2条件の連言で、どちらか一方だけでも
 * 既存ファイルは全部安全側に落ちる**（二重の安全網）。
 *
 * 依存は `yaml` だけ。`parser/` からも `pipeline` からも import されるので、
 * ここから他のモジュールを触ってはいけない（循環する）。
 */
import { LineCounter, parseDocument, isMap, isScalar } from "yaml"

/** frontmatter の中身は必ずこの行から始まる（1行目が `---` なので） */
const BLOCK_START_LINE = 2

/**
 * 2行目に要求する形。`key:` または `key: value`。
 *
 * これが効くのは、既存フィクスチャの1行目 `---` の次の行が例外なく `#` / `##` の
 * 見出しだから。ASCII のキーに限っているのは、日本語の見出しを誤って
 * 「キーらしい行」と読まないため（`概要:` のような行は frontmatter ではない）。
 */
const KEY_LINE = /^[A-Za-z_][A-Za-z0-9_.-]*[ \t]*:([ \t]|$)/

/** 行末の CR を落として比べる（CRLF の md でも区切りを見失わない） */
const isFence = (line: string | undefined): boolean => line?.replace(/\r$/, "") === "---"

export interface FrontmatterSplit {
  /**
   * frontmatter を**同じ行数の空行に置き換えた**本文。
   *
   * 切り落とすと以降のトークンの行番号が実ファイルとずれ、lint の指摘が数行手前を
   * 指すようになる。空行は AST ビルダーが無視する（`handlers/structural.ts`）ので、
   * 新しいトークン型もマッチャの変更も要らない。
   */
  readonly body: string
  /** frontmatter の中身（囲みの `---` は含まない）。無ければ undefined */
  readonly block?: string
  /**
   * **frontmatter を書こうとして失敗している**と見なせるか。
   *
   * 立つのは「2行目がキー行なのに閉じの `---` が無い」ときだけ。
   * 1行目 `---` の直後が見出しの md は、frontmatter の書き損じではなく
   * **区切りから書き始める普通のデッキ**なので立てない（`__tests__/markdown-spec/`
   * の8本がその形で、ここを広く取ると全部が warning になる）。
   */
  readonly nearMiss: boolean
}

/**
 * 冒頭の frontmatter を本文から切り離す。**認識規則の正本はここだけ。**
 *
 * 1. 1行目がちょうど `---`（先頭に空行があってはいけない）
 * 2. 2行目が `key:` の形
 * 3. 以降に閉じの `---` がある
 *
 * どれかを満たさなければ frontmatter ではないものとして、markdown をそのまま返す。
 * YAML として壊れていても**ここでは throw しない** — 報告は lint に任せる
 * （パースの失敗でビルドが止まると、直し方が分からないまま何も出なくなる）。
 */
export function splitFrontmatter(markdown: string): FrontmatterSplit {
  const lines = markdown.split("\n")
  if (!isFence(lines[0])) return { body: markdown, nearMiss: false }

  // 2行目がキー行でなければ、そもそも frontmatter を書こうとしていない。
  // 区切りから書き始めただけの md（`---` の次が `# タイトル`）はここで普通に抜ける
  const secondLine = lines[1]?.replace(/\r$/, "")
  if (secondLine === undefined || !KEY_LINE.test(secondLine)) {
    return { body: markdown, nearMiss: false }
  }

  // ここから先はキー行が続いている＝書こうとしている。閉じが無いのは書き損じ
  const close = lines.findIndex((line, i) => i >= BLOCK_START_LINE && isFence(line))
  if (close === -1) return { body: markdown, nearMiss: true }

  // 囲みを含めた 0..close 行を空行に潰す。行数が変わらないので、
  // 以降のトークンの `line` は実ファイルの行番号のまま
  const blanked = new Array<string>(close + 1).fill("")
  return {
    body: [...blanked, ...lines.slice(close + 1)].join("\n"),
    block: lines.slice(1, close).join("\n"),
    nearMiss: false,
  }
}

export interface FrontmatterError {
  /** 実ファイルの行番号（1 始まり） */
  readonly line: number
  readonly message: string
}

export interface FrontmatterRead {
  /** YAML のマップとして読めたときだけ入る */
  readonly data?: Readonly<Record<string, unknown>>
  /** 読めなかった理由。空でなければ data は undefined */
  readonly errors: readonly FrontmatterError[]
  /** トップレベルのキー → そのキーが書かれた実ファイルの行番号 */
  readonly keyLines: ReadonlyMap<string, number>
}

/**
 * frontmatter の中身を読む。行番号つきで返すので、lint がその行を指せる。
 *
 * 壊れた YAML は `errors` として返し、throw しない（`splitFrontmatter` と同じ理由）。
 * マップでないもの（配列・スカラー）も「読めなかった」に倒す —
 * `- a` から始まる frontmatter は書き間違いであって、拡張ではない。
 */
export function readFrontmatter(block: string): FrontmatterRead {
  const counter = new LineCounter()
  const doc = parseDocument(block, { lineCounter: counter })

  // block の1行目は実ファイルの2行目。LineCounter は 1 始まりで返す
  const toFileLine = (offset: number): number =>
    counter.linePos(offset).line + BLOCK_START_LINE - 1

  if (doc.errors.length > 0) {
    return {
      errors: doc.errors.map((e) => ({ line: toFileLine(e.pos[0]), message: e.message })),
      keyLines: new Map(),
    }
  }

  const contents = doc.contents
  if (!isMap(contents)) {
    return {
      errors: [{ line: BLOCK_START_LINE, message: "YAML のマップになっていない" }],
      keyLines: new Map(),
    }
  }

  const keyLines = new Map<string, number>()
  for (const pair of contents.items) {
    if (!isScalar(pair.key) || typeof pair.key.value !== "string") continue
    const offset = pair.key.range?.[0]
    if (offset !== undefined) keyLines.set(pair.key.value, toFileLine(offset))
  }

  return { data: doc.toJS() as Record<string, unknown>, errors: [], keyLines }
}

/**
 * デッキが名乗るメタのうち、**描画側が使える形に読めたものだけ**。
 *
 * 検査はしない（それは lint の仕事）。型に合わない値は黙って落とす —
 * ここで throw すると、frontmatter の書き間違い1つでサイトが生成できなくなる。
 * 「lint が warning で報せ、レンダラは読めるぶんだけ使う」の分業。
 */
export interface DeckMeta {
  readonly type?: string
  readonly title?: string
  readonly description?: string
  readonly tags?: readonly string[]
  readonly status?: string
}

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value : undefined

const asStrings = (value: unknown): readonly string[] | undefined =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : undefined

/** md 全体から、冒頭の frontmatter をデッキのメタとして読む。無ければ undefined */
export function readDeckMeta(markdown: string): DeckMeta | undefined {
  const { block } = splitFrontmatter(markdown)
  if (block === undefined) return undefined

  const { data } = readFrontmatter(block)
  if (!data) return undefined

  const meta: DeckMeta = {
    type: asString(data.type),
    title: asString(data.title),
    description: asString(data.description),
    tags: asStrings(data.tags),
    status: asString(data.status),
  }
  return Object.values(meta).some((v) => v !== undefined) ? meta : undefined
}
