/**
 * 書かれた Markdown を ontology.yaml の宣言に照らして検証する。
 *
 * なぜトークン層で見るか: 語彙外の `###` / `####` や未宣言のメタキーは、AST に変換される
 * 時点でもう失われている（どのマスにも入らなかったブロックは消え、未知のメタキーは
 * 捨てられる）。「黙って消えた」を捕まえるには、消える前＝トークン列を見るしかない。
 *
 * なぜ2つ目のパーサを許容するか: その代償として `splitSlides`・`collectHeadings`・
 * `metaLines` は plugin handler の入れ子モデルを小さく写している。これは承知の上の
 * 借金で、返し方は「ビルダーに診断チャネルを通し、落とす瞬間に報告させる」
 * （BACKLOG B-23）。Effect ベースのビルダーへの改修になるため今回は入れていない。
 *
 * 文字数はここでは見ない。schema/validation.ts が同じ宣言（limits / max-chars）を読んで
 * ValidationError として弾いており、二重に報告しても直し方は増えないため。
 */
import "../plugins/index.js" // side-effect: 登録が済んでいないとプラグインのディレクティブが本文に落ちる
// 自動 ID の綴りは採番と同じ関数で出す。ここに写すと、slug の規則を変えた日に
// lint だけが古い綴りで衝突を判定する（`slide-ids.ts` が正本）
import { slugify } from "../slug.js"
import { parseOkfLink } from "../okf.js"
import { tokenize, type Token } from "../parser/tokenizer.js"
import {
  getFieldSet,
  getFrontmatter,
  getLayouts,
  getVocabulary,
  isDynamicCardinality,
  markerKind,
  matchesDeclaredForm,
  parseCardinality,
  resolveTerm,
  type MarkerKind,
} from "./index.js"
import { readFrontmatter, splitFrontmatter, type FrontmatterSplit } from "./frontmatter.js"
import type { FieldKind, FrontmatterField, Layout, Slot, SubField } from "./types.js"

export interface Diagnostic {
  readonly level: "error" | "warning"
  /** チェック名（kebab-case）。grep できるように短く保つ */
  readonly check: string
  readonly line: number
  readonly message: string
}

/** 1スライドぶんのトークン */
interface SlideTokens {
  readonly tokens: readonly Token[]
  /** スライドの見出し行（メッセージで場所を示すのに使う） */
  readonly line: number
}

const splitSlides = (tokens: readonly Token[]): SlideTokens[] => {
  const slides: SlideTokens[] = []
  let current: Token[] = []
  let line = 1
  for (const token of tokens) {
    if (token.type === "HorizontalRule") {
      if (current.length > 0) slides.push({ tokens: current, line })
      current = []
      line = token.line
      continue
    }
    if (current.length === 0) line = token.line
    current.push(token)
  }
  if (current.length > 0) slides.push({ tokens: current, line })
  return slides
}

/**
 * コアレイアウトの優先順位。**正本は `parser/slide-converter.ts` の `rawSlideToSlide`** で、
 * ここはその順序に追随する。
 *
 * 順序がずれると、描画は CodeDisplay なのに lint は Grid の件数規則で文句を言う、といった
 * 「実際には適用されない規則」を報告してしまう（実際 grid とコードフェンスが同居する
 * スライドでそうなっていた）。
 */
const CORE_PRECEDENCE: ReadonlyArray<readonly [Token["type"][], string]> = [
  [["CodeFenceOpen"], "CodeDisplay"],
  [["LeftDirective", "RightDirective"], "LeftRight"],
  [["TopDirective", "BottomDirective"], "TopBottom"],
  [["GridDirective"], "Grid"],
]

/**
 * このスライドが選んだレイアウト。
 *
 * プラグインのディレクティブは `pluginId` で分かる。numbered-list だけは
 * `numbered-list:circle` のように変種を後ろに付けるので、コロンの前で照合する。
 * プラグインを先に見るのも `rawSlideToSlide` に合わせている。
 */
export function detectLayout(tokens: readonly Token[]): Layout | undefined {
  const layouts = getLayouts()
  const byName = (name: string): Layout | undefined => layouts.find((l) => l.name === name)

  for (const token of tokens) {
    if (token.type === "PluginDirective") {
      const id = token.pluginId
      const found =
        layouts.find((l) => l.plugin === id) ?? layouts.find((l) => l.plugin === id.split(":")[0])
      if (found) return found
    }
  }
  const types = new Set(tokens.map((t) => t.type))
  for (const [triggers, name] of CORE_PRECEDENCE) {
    if (triggers.some((t) => types.has(t))) return byName(name)
  }
  // タイトルスライドはレイアウトを持たない。`##` の無い断片（先頭の空行など）も同じく対象外
  if (!types.has("H2")) return undefined
  return byName("Default")
}

/**
 * その言語で開かれたコードフェンスの数。
 *
 * 図解のように「フェンスそのものが1つの枠」であるスロットを数える。見出しと違って
 * トークン列に痕跡が残るので、`###` と同じ cardinality の検査に載せられる
 * （各プラグインの handler.ts は language を見てフェンスの中身を振り分けている）。
 */
function countCodeFences(tokens: readonly Token[], language: string): number {
  return tokens.filter((t) => t.type === "CodeFenceOpen" && t.language === language).length
}

/**
 * その拡張子を指す画像参照の数。コードフェンスと同じく「行そのものが1つの枠」。
 *
 * 拡張子が違う参照はここで数えない。数えてしまうと「1件ある」と見えたまま
 * 変換で落ちる（読めるのは宣言された種類だけ）ので、欠落として報告させる。
 */
function countImages(tokens: readonly Token[], extension: string): number {
  return tokens.filter((t) => t.type === "Image" && t.src.toLowerCase().endsWith(extension)).length
}

/** グリッドの `###` 件数はディレクティブの引数で決まる */
function gridCellCount(tokens: readonly Token[]): number | undefined {
  const grid = tokens.find((t) => t.type === "GridDirective")
  return grid && grid.type === "GridDirective" ? grid.rows * grid.cols : undefined
}

/** 1スライドぶんの見出しを1回の走査で仕分ける */
interface Headings {
  readonly h3: readonly Token[]
  readonly h4: readonly Token[]
  /** `####` は直前の `###` に属する。件数はその区切りごとに数える */
  readonly h4Groups: readonly (readonly Token[])[]
}

function collectHeadings(tokens: readonly Token[]): Headings {
  const h3: Token[] = []
  const h4: Token[] = []
  // 最初の `###` より前に現れた `####` の受け皿。ここを用意しないと、
  // 親を持たない `####` がどのグループにも入らず件数の検査から漏れる。
  const orphans: Token[] = []
  const groups: Token[][] = [orphans]
  let current = orphans

  for (const token of tokens) {
    if (token.type === "H3") {
      h3.push(token)
      current = []
      groups.push(current)
    } else if (token.type === "H4") {
      h4.push(token)
      current.push(token)
    }
  }
  return { h3, h4, h4Groups: groups.filter((g) => g.length > 0) }
}

/** `resolved` は grid のようにディレクティブの引数で件数が決まる宣言に渡す */
function checkCardinality(
  slot: Slot,
  count: number,
  line: number,
  resolved?: number
): Diagnostic[] {
  const { min, max, label } = parseCardinality(slot.cardinality, resolved)
  const tooMany = max !== undefined && count > max
  if (count >= min && !tooMany) return []

  return [
    {
      level: "warning",
      check: "slot-cardinality",
      line,
      message:
        `${slot.marker} が ${count} 件（${slot.name} は ${label}）` +
        (tooMany ? "。超過分は描かれない" : ""),
    },
  ]
}

function checkVocabulary(slot: Slot, kind: MarkerKind, headings: Headings): Diagnostic[] {
  // フェンス・画像の枠は見出しを持たない。ここで抜けないと `####` の側に落ち、
  // そのスライドの `####` を図解の語彙で照合してしまう（selfcheck が
  // 「行そのものが枠なら heading: free」を強制しているが、lint の正しさが
  // 別ファイルの規則に依存する形になる）
  if (kind.kind !== "heading") return []
  if (slot.heading !== "vocabulary" || !slot.vocabulary) return []
  const vocab = getVocabulary(slot.vocabulary)
  if (!vocab || vocab.unknown === "ignore") return []

  const out: Diagnostic[] = []
  for (const token of slot.marker === "###" ? headings.h3 : headings.h4) {
    const text = "text" in token ? token.text : ""
    if (resolveTerm(vocab, text)) continue
    const accepted = vocab.terms.map((t) => t.canonical).join("・")
    out.push({
      level: vocab.unknown,
      check: "slot-vocabulary",
      line: token.line,
      message:
        `${slot.marker} '${text}' は ${vocab.label} の語彙に無い` +
        (vocab["unknown-effect"] ? `（${vocab["unknown-effect"]}）` : "") +
        `。受理されるのは ${accepted}`,
    })
  }
  return out
}

/** `key: value` のメタ相は、ディレクティブから最初の `###` までの本文行 */
function metaLines(tokens: readonly Token[]): Token[] {
  const out: Token[] = []
  let started = false
  for (const token of tokens) {
    if (token.type === "PluginDirective") {
      started = true
      continue
    }
    if (!started) continue
    if (token.type === "H3") break
    if (token.type === "BodyText") out.push(token)
  }
  return out
}

function checkFieldSet(layout: Layout, tokens: readonly Token[], line: number): Diagnostic[] {
  const name = layout["field-set"]
  if (!name) return []
  const fieldSet = getFieldSet(name)
  if (!fieldSet) return []

  const out: Diagnostic[] = []
  const seen = new Map<string, number>()
  for (const token of metaLines(tokens)) {
    const text = "text" in token ? token.text : ""
    const colon = text.indexOf(":")
    if (colon <= 0) continue // メタ相の非 key:value 行は実装も読み飛ばす
    seen.set(text.slice(0, colon).trim(), token.line)
  }

  const declared = new Set(fieldSet.keys.map((k) => k.name))
  if (fieldSet.unknown !== "ignore") {
    for (const [key, keyLine] of seen) {
      if (declared.has(key)) continue
      out.push({
        level: fieldSet.unknown,
        check: "meta-keys",
        line: keyLine,
        message: `メタキー '${key}' は ${name} に宣言が無い（どこにも描かれない。タイポか宣言漏れ）`,
      })
    }
  }
  for (const key of fieldSet.keys) {
    if (key.required && !seen.has(key.name)) {
      out.push({
        level: "warning",
        check: "meta-keys",
        line,
        message: `必須のメタキー '${key.name}' が無い（${key.description}）`,
      })
    }
  }
  return out
}

function checkAnnotationScope(layout: Layout, tokens: readonly Token[]): Diagnostic[] {
  const allowed = new Set(layout.annotations)
  const used: Array<{ name: string; token: Token }> = []
  for (const token of tokens) {
    if (token.type === "IconDirective") used.push({ name: "icon", token })
    if (token.type === "TakeawayMarker") used.push({ name: "takeaway", token })
    if (token.type === "SourceMarker") used.push({ name: "source", token })
    if (token.type === "IdDirective") used.push({ name: "id", token })
  }
  return used
    .filter((u) => !allowed.has(u.name))
    .map((u) => ({
      level: "warning" as const,
      check: "annotation-scope",
      line: u.token.line,
      message: `${layout.label} では注釈 '${u.name}' は効かない（黙って捨てられる）`,
    }))
}

/**
 * どの宣言にも一致しない `<!--…-->`。
 *
 * トークナイザは知らないコメントを BodyText に落とすので、綴りを間違えたディレクティブは
 * 効かないどころか**本文としてスライドに描かれる**。
 */
function checkUnknownDirectives(tokens: readonly Token[]): Diagnostic[] {
  return tokens
    .filter((t) => t.type === "BodyText" && /^<!--[\s\S]*-->$/.test(t.text))
    .map((t) => ({
      level: "warning" as const,
      check: "unknown-directive",
      line: t.line,
      message: `'${"text" in t ? t.text : ""}' はどのディレクティブ・注釈の宣言にも一致しない（本文として描かれる）`,
    }))
}

/**
 * リンクの書き方。
 *
 * 見るのは2つで、どちらも**黙って通ってしまう**種類の間違いである。
 *
 * 1. 旧 `[[…]]` 記法。パーサが読まなくなったので、書くとただの文字として出る。
 *    表示に出るだけまだましだが、書き手はリンクのつもりでいる
 * 2. 内部リンクにならない md へのリンク（`sub/x.md` `../x.md` `#a`）。
 *    **これがいちばん危ない** — 外部リンクとして `target="_blank"` で描かれるので、
 *    見た目はリンクであり、クリックすると別タブで存在しないパスを開く。
 *    未解決リンクの一覧にも出ない（内部リンクとして解決を試みてすらいない）
 * 3. 先頭に `/` または `./` の付いた md へのリンク。**サイトでは当たるので気づけない** —
 *    折れるのは生の md を github.com で開いたときだけで、そこでは先頭の `/` が
 *    リポジトリのルートと読まれる。1と2が「サイトで折れる」誤りなのに対し、
 *    こちらは「サイトでは当たるが GitHub で折れる」誤りなので、lint しか見つけられない
 *
 * 1と2の判定は `okf.ts` の `parseOkfLink` に任せる。lint がもう1つ正規表現を持つと、
 * 「パーサは内部リンクと読むのに lint は警告する」がいつか起きる。3だけは lint 側の規則で、
 * **パーサはこの形も解決する**（読みを広く、書きを狭く。理由は `parseOkfLink` の頭に書いた）。
 */
function checkLinkForm(tokens: readonly Token[]): Diagnostic[] {
  const out: Diagnostic[] = []
  let inFence = false

  for (const token of tokens) {
    if (token.type === "CodeFenceOpen") inFence = true
    else if (token.type === "CodeFenceClose") inFence = false
    if (inFence) continue
    if (!("text" in token) || token.type === "CodeFenceLine") continue

    // 記法の見本はインラインコードに入れて書く（guide デッキがそうしている）
    const text = token.text.replace(/`[^`]+?`/g, "")

    for (const _ of text.matchAll(/\[\[/g)) {
      out.push({
        level: "error",
        check: "legacy-wikilink",
        line: token.line,
        message: "`[[…]]` は廃止した記法。`[ラベル](デッキ名.md#スライドID)` と書く（`src/tools/migrate-wikilinks.ts` が一括変換する）",
      })
    }

    for (const m of text.matchAll(/\[[^\[\]]+?\]\(([^()\s]+)\)/g)) {
      const href = m[1]
      if (/^[a-z][a-z0-9+.-]*:/i.test(href)) continue // http: や mailto: は外部リンク

      // **`parseOkfLink` より先に見る。** パーサはこの形も解決するので、
      // 後ろに置くと `continue` で通り抜けてしまう（通る形のうち、書いてよいものを絞る検査）
      if (/^(?:\/|\.\/)/.test(href) && parseOkfLink(href)) {
        out.push({
          level: "warning",
          check: "link-form",
          line: token.line,
          message: `'${href}' の先頭の \`/\`・\`./\` は外す（サイトでは当たるので気づけないが、生の md を github.com で開くと先頭の \`/\` はリポジトリのルートと読まれて折れる）`,
        })
        continue
      }

      if (parseOkfLink(href)) continue
      if (!href.includes(".md") && !href.startsWith("#")) continue // 画像やその他の資産
      out.push({
        level: "warning",
        check: "link-form",
        line: token.line,
        message: `'${href}' は内部リンクにならない（デッキ名だけの相対パスで書く。このままでは外部リンクとして別タブで開かれ、未解決リンクの一覧にも出ない）`,
      })
    }
  }

  return out
}

/**
 * スライド ID の衝突。
 *
 * なぜ採番側ではなくここで報告するか: `assignSlideIds` は必ず一意な ID を返す契約である
 * （重複するとサイトのリンクが解決できない）。だから機械は連番で先に進むしかなく、
 * 「どちらかが間違っている」と言えるのは書き手だけ。採番が跡を残し、lint がそれを読む。
 *
 * **折れたリンクより見つけにくい。** `<!--id:seed-->` を2枚に書くと `#seed` へのリンクは
 * 解決する — 常に1枚目へ。2枚目は誰からも指されないスライドとしてサイトに残り、
 * 書き手は繋いだつもりでいる。未解決リンクの一覧にも出ない。
 *
 * デッキ内で閉じるのは ID がデッキ内で採番されるため（`site-index.ts` が `deck-slug/` を
 * 前置する）。lint は1ファイルずつ呼ばれるので、検査の範囲もそのまま合う。
 *
 * **1ブロックが複数スライドを生む場合の派生 ID（`--2`）は見ない。** 何枚生まれるかは
 * 変換しないと分からず、それはトークン層の2段下流にある。取り逃がすのはその衝突だけ。
 */
function checkSlideIds(slides: readonly SlideTokens[]): Diagnostic[] {
  const explicit = new Map<string, number[]>()
  const autoSlugs: Array<{ slug: string; title: string; line: number }> = []

  for (const slide of slides) {
    // `<!--id:-->` は cardinality: one。2つ書けば後ろが勝つので、採番と同じく最後を見る
    const idTokens = slide.tokens.filter((t) => t.type === "IdDirective")
    const last = idTokens[idTokens.length - 1]
    if (last?.type === "IdDirective") {
      const id = last.id.trim()
      if (id) {
        const lines = explicit.get(id)
        if (lines) lines.push(last.line)
        else explicit.set(id, [last.line])
      }
      continue // 明示した時点で見出しの slug は使われない
    }
    const heading = slide.tokens.find((t) => t.type === "H1" || t.type === "H2")
    if (heading?.type !== "H1" && heading?.type !== "H2") continue
    const slug = slugify(heading.text)
    if (slug) autoSlugs.push({ slug, title: heading.text, line: heading.line })
  }

  const out: Diagnostic[] = []

  for (const [id, lines] of explicit) {
    if (lines.length < 2) continue
    for (const line of lines) {
      const others = lines.filter((l) => l !== line).join(", ")
      out.push({
        level: "warning",
        check: "slide-id",
        line,
        message:
          `<!--id:${id}--> が ${lines.length} 枚にある（${others} 行目にも）。` +
          `#${id} は常に最初の1枚に解決し、残りは誰からも指せなくなる`,
      })
    }
  }

  // 明示 ID が押さえている名前を自動 slug が欲しがった場合。採番は明示側を優先するので
  // リンクは正しい行き先に着くが、この見出しの ID は推測できない綴りに変わる
  for (const auto of autoSlugs) {
    const claimedAt = explicit.get(auto.slug)
    if (!claimedAt) continue
    out.push({
      level: "warning",
      check: "slide-id",
      line: auto.line,
      message:
        `見出し '${auto.title}' の自動 ID '${auto.slug}' は ` +
        `${claimedAt.join(", ")} 行目の <!--id:${auto.slug}--> が押さえている` +
        `（このスライドは '${auto.slug}-2' になる。指したいなら <!--id:--> で名前を付ける）`,
    })
  }

  return out
}

// ── frontmatter ────────────────────────────────────────────────────

export interface LintContext {
  /** `splitFrontmatter` の結果。渡さなければ frontmatter は見ない */
  readonly frontmatter?: FrontmatterSplit
  /**
   * `stale_after` の期限切れを判定する基準時刻。
   *
   * 注入できるようにしてあるのは、**これがリポジトリで唯一「md を1文字も触らずに
   * 暦で赤くなる」診断**だから。配布デッキに warning ゼロを課しているテストが
   * 実時刻で走ると、差分ゼロのまま ある日 npm test が落ち、publish まで止まる。
   */
  readonly now?: Date
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/**
 * 宣言された `kind` ごとの値の見方。**宣言に kind を足したらここにも足す** —
 * 足し忘れは selfcheck が「見る実装が lint に無い」として落とす。
 *
 * 形の正規表現はここに書かない（`value-patterns` が正本で、`matchesDeclaredForm` が引く）。
 */
export const FIELD_VALIDATORS: Readonly<Record<FieldKind, (value: unknown) => boolean>> = {
  text: (v) => typeof v === "string",
  "list-of-text": (v) => Array.isArray(v) && v.every((x) => typeof x === "string"),
  date: (v) => typeof v === "string" && matchesDeclaredForm("date", v),
  timestamp: (v) => typeof v === "string" && matchesDeclaredForm("timestamp", v),
  actor: (v) => typeof v === "string" && matchesDeclaredForm("actor", v),
  uri: (v) => typeof v === "string" && matchesDeclaredForm("uri", v),
  object: isPlainObject,
  "list-of-objects": (v) => Array.isArray(v) && v.every(isPlainObject),
}

/** 編集距離が max 以下か。タイポ検出にしか使わないので、打ち切り付きの素朴な実装でよい */
function withinDistance(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false
  let edits = 0
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++
      j++
      continue
    }
    if (++edits > max) return false
    if (a.length > b.length) i++
    else if (a.length < b.length) j++
    else {
      i++
      j++
    }
  }
  return edits + (a.length - i) + (b.length - j) <= max
}

/**
 * frontmatter を宣言に照らして見る。**規則はすべて宣言から引く。**
 *
 * error にするのは `malformed`（読めない）だけ。読めないと全フィールドがまとめて
 * 消えるので、そこだけは止める。他は warning に倒す — 名乗り方の不備でサイトが
 * 生成できなくなるほうが困る。
 */
function checkFrontmatter(
  split: FrontmatterSplit,
  tokens: readonly Token[],
  now: Date
): Diagnostic[] {
  const decl = getFrontmatter()
  const out: Diagnostic[] = []
  const emit = (
    level: "error" | "warning" | "ignore",
    check: string,
    line: number,
    message: string
  ): void => {
    if (level !== "ignore") out.push({ level, check, line, message })
  }

  if (split.block === undefined) {
    if (split.nearMiss) {
      emit(
        decl["not-recognized"],
        "frontmatter-not-recognized",
        1,
        "1行目が `---` だが frontmatter と認識されなかった" +
          "（2行目を `key: value` にし、閉じの `---` を置く。このままでは本文として描かれる）"
      )
    } else {
      emit(decl.require, "frontmatter-missing", 1, "デッキが frontmatter を持っていない")
    }
    return out
  }

  const { data, errors, keyLines } = readFrontmatter(split.block)
  if (!data) {
    for (const e of errors) {
      emit(
        decl.malformed,
        "frontmatter-malformed",
        e.line,
        `frontmatter を YAML として読めない: ${e.message}`
      )
    }
    return out
  }

  const lineOf = (key: string): number => keyLines.get(key) ?? 1
  const declared = new Map(decl.fields.map((f) => [f.name, f]))

  const checkKind = (kind: FieldKind, value: unknown, at: string, line: number): boolean => {
    if (FIELD_VALIDATORS[kind](value)) return true
    emit("warning", "frontmatter-field", line, `${at}: ${kind} として読めない値`)
    return false
  }

  const checkSubFields = (
    field: FrontmatterField,
    entry: Record<string, unknown>,
    at: string,
    line: number
  ): void => {
    for (const sub of field["sub-fields"] ?? ([] as readonly SubField[])) {
      const value = entry[sub.name]
      if (value === undefined || value === null) {
        if (sub.required) {
          emit("warning", "frontmatter-field", line, `${at}: 必須の '${sub.name}' が無い`)
        }
        continue
      }
      checkKind(sub.kind, value, `${at}.${sub.name}`, line)
    }
  }

  // 名乗ったからには、必須のキーは名乗る。**名乗っていない md は上で return 済み**なので、
  // frontmatter を持たないフィクスチャを巻き込まない（OKF の必須は `type` ひとつ）
  for (const field of decl.fields) {
    if (field.level !== "required") continue
    const value = data[field.name]
    if (value === undefined || value === null || value === "") {
      emit(
        "warning",
        "frontmatter-field",
        1,
        `必須の '${field.name}' が無い（OKF はこの1つだけを必須にしている。無いと読む側が種別で振り分けられない）`
      )
    }
  }

  for (const [key, value] of Object.entries(data)) {
    const line = lineOf(key)
    const field = declared.get(key)

    if (!field) {
      // 未知のキーは拒まない（宣言 unknown: ignore）。ただし1文字違いはタイポとして報せる
      const near = decl.fields.find((f) => withinDistance(f.name, key, decl["near-miss-distance"]))
      if (near) {
        emit(
          decl["unknown-near-miss"],
          "frontmatter-unknown-key",
          line,
          `'${key}' は宣言に無い（'${near.name}' の書き間違い？ このままでは誰も読まない）`
        )
      } else {
        emit(decl.unknown, "frontmatter-unknown-key", line, `'${key}' は宣言に無い`)
      }
      continue
    }

    if (value === undefined || value === null) continue
    if (!checkKind(field.kind, value, key, line)) continue

    if (field["allowed-values"] && !field["allowed-values"].includes(value as string)) {
      emit(
        "warning",
        "frontmatter-field",
        line,
        `${key}: '${value}' は宣言に無い（${field["allowed-values"].join(" / ")} のいずれか）`
      )
    }

    if (field.vocabulary) {
      const vocab = getVocabulary(field.vocabulary)
      if (vocab && !resolveTerm(vocab, String(value))) {
        emit(
          vocab.unknown,
          "frontmatter-field",
          line,
          `${key}: '${value}' は ${vocab.label} に無い（${vocab["unknown-effect"] ?? "誰も照合しない"}）`
        )
      }
    }

    if (field.kind === "object") {
      checkSubFields(field, value as Record<string, unknown>, key, line)
    } else if (field.kind === "list-of-objects") {
      ;(value as Record<string, unknown>[]).forEach((entry, i) => {
        checkSubFields(field, entry, `${key}[${i}]`, line)
      })
    }

    if (field.kind === "date" && field.expired && field.expired !== "ignore") {
      // 日付は ISO なので文字列比較で足りる（時刻とタイムゾーンを持ち込まない）
      const today = now.toISOString().slice(0, 10)
      if (String(value) < today) {
        emit(
          field.expired,
          "frontmatter-stale",
          line,
          `${key}: ${value} を過ぎている（直すのは日付ではなく中身）`
        )
      }
    }
  }

  // title は本文からの派生の写し。食い違ったら直すのは frontmatter のほう
  const heading = tokens.find((t) => t.type === "H1")
  if (typeof data.title === "string" && heading?.type === "H1" && heading.text !== data.title) {
    emit(
      decl["title-matches-heading"],
      "frontmatter-title",
      lineOf("title"),
      `title '${data.title}' が1枚目の見出し '${heading.text}' と違う` +
        "（表示名の正本は見出しのほう。ここは外部ツールに読ませるための写し）"
    )
  }

  return out
}

/** 宣言に照らして Markdown を検証する。行番号順に返す */
export function lintSource(markdown: string, options: LintContext = {}): Diagnostic[] {
  const frontmatter = splitFrontmatter(markdown)
  return lintTokens(tokenize(frontmatter.body), { ...options, frontmatter })
}

/**
 * トークン列を受け取る版。パイプラインはこちらを使い、同じ文字列を2度トークン化しない。
 */
export function lintTokens(tokens: readonly Token[], context: LintContext = {}): Diagnostic[] {
  const out: Diagnostic[] = []
  const slides = splitSlides(tokens)

  // frontmatter はデッキに1枚なので、スライドごとのループの外で見る
  if (context.frontmatter) {
    out.push(...checkFrontmatter(context.frontmatter, tokens, context.now ?? new Date()))
  }

  // ID はスライドをまたいで衝突するので、レイアウトごとのループの外で見る。
  // タイトルスライドも対象に入れる（`<!--id:-->` の applies-to は title-slide を含み、
  // 表紙の自動 slug が本文スライドの明示 ID とぶつかりうる）
  out.push(...checkSlideIds(slides))

  // リンクの書き方はスライドをまたがないが、レイアウトとも無関係なのでここで見る
  out.push(...checkLinkForm(tokens))

  for (const slide of slides) {
    out.push(...checkUnknownDirectives(slide.tokens))

    const layout = detectLayout(slide.tokens)
    if (!layout) continue

    out.push(...checkAnnotationScope(layout, slide.tokens))
    out.push(...checkFieldSet(layout, slide.tokens, slide.line))

    const headings = collectHeadings(slide.tokens)
    const h4Slot = layout.slots.find((s) => s.marker === "####")

    let readsImages = false
    for (const slot of layout.slots) {
      const kind = markerKind(slot.marker)
      out.push(...checkVocabulary(slot, kind, headings))

      if (kind.kind === "code-fence") {
        out.push(...checkCardinality(slot, countCodeFences(slide.tokens, kind.language), slide.line))
      } else if (kind.kind === "image") {
        readsImages = true
        out.push(...checkCardinality(slot, countImages(slide.tokens, kind.extension), slide.line))
      } else if (slot.marker === "###") {
        const resolved = isDynamicCardinality(slot.cardinality)
          ? gridCellCount(slide.tokens)
          : undefined
        out.push(...checkCardinality(slot, headings.h3.length, slide.line, resolved))
      } else {
        // `####` は `###` ごとに数える（フェーズ4つ × 行4つ を16件と読まないため）
        for (const group of headings.h4Groups) {
          out.push(...checkCardinality(slot, group.length, group[0]?.line ?? slide.line))
        }
      }
    }

    if (!h4Slot && headings.h4.length > 0) {
      out.push({
        level: "warning",
        check: "slot-cardinality",
        line: headings.h4[0].line,
        message: `${layout.label} は #### を読まない（この行以下は描かれない）`,
      })
    }

    // 画像の枠を持たないレイアウトに置かれた `![…](…)` は、どこにも描かれず消える
    // （`####` と同じ「黙って落ちる」種類の間違い）
    if (!readsImages) {
      for (const token of slide.tokens) {
        if (token.type !== "Image") continue
        out.push({
          level: "warning",
          check: "slot-cardinality",
          line: token.line,
          message: `${layout.label} は画像を読まない（'${token.src}' は描かれない）`,
        })
      }
    }
  }

  return out.sort((a, b) => a.line - b.line)
}

/** 人が読む1行にする。`file:line` は端末からクリックできる */
export function formatDiagnostic(d: Diagnostic, file?: string): string {
  const where = file ? `${file}:${d.line}` : `line ${d.line}`
  return `  [${d.level}] ${d.check} | ${where} | ${d.message}`
}

/**
 * この結果で失敗させるか。**判定はここが唯一の正本** — `--lint` とパイプラインで
 * 規則が分かれていると、語彙の `unknown:` を `error` に変えたとき片方だけが変わる。
 */
export function shouldFail(diagnostics: readonly Diagnostic[], strict: boolean): boolean {
  return diagnostics.some((d) => d.level === "error") || (strict && diagnostics.length > 0)
}

