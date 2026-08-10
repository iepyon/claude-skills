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
import { slugify } from "../parser/slide-ids.js"
import { tokenize, type Token } from "../parser/tokenizer.js"
import {
  getFieldSet,
  getLayouts,
  getVocabulary,
  isDynamicCardinality,
  markerKind,
  parseCardinality,
  resolveTerm,
  type MarkerKind,
} from "./index.js"
import type { Layout, Slot } from "./types.js"

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
 * スライド ID の衝突。
 *
 * なぜ採番側ではなくここで報告するか: `assignSlideIds` は必ず一意な ID を返す契約である
 * （重複するとサイトのリンクが解決できない）。だから機械は連番で先に進むしかなく、
 * 「どちらかが間違っている」と言えるのは書き手だけ。採番が跡を残し、lint がそれを読む。
 *
 * **折れたリンクより見つけにくい。** `<!--id:seed-->` を2枚に書くと `[[seed]]` は
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
          `[[${id}]] は常に最初の1枚に解決し、残りは誰からも指せなくなる`,
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

/** 宣言に照らして Markdown を検証する。行番号順に返す */
export function lintSource(markdown: string): Diagnostic[] {
  return lintTokens(tokenize(markdown))
}

/**
 * トークン列を受け取る版。パイプラインはこちらを使い、同じ文字列を2度トークン化しない。
 */
export function lintTokens(tokens: readonly Token[]): Diagnostic[] {
  const out: Diagnostic[] = []
  const slides = splitSlides(tokens)

  // ID はスライドをまたいで衝突するので、レイアウトごとのループの外で見る。
  // タイトルスライドも対象に入れる（`<!--id:-->` の applies-to は title-slide を含み、
  // 表紙の自動 slug が本文スライドの明示 ID とぶつかりうる）
  out.push(...checkSlideIds(slides))

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

