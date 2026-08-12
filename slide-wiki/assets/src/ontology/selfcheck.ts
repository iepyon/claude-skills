/**
 * オントロジー自身の点検。`npx tsx src/ontology/selfcheck.ts` で走る。
 *
 * 宣言が壊れていても、それを読む lint やドキュメント生成は「何も検出しない」形で
 * 静かに壊れる（語彙の参照先が無ければ照合が空振りするだけ）。だから宣言そのものを
 * 突き合わせる場所を1つ置く。__tests__/ontology.test.ts がこれを呼ぶ。
 */
import "../plugins/index.js" // side-effect: プラグインの自己登録
import { readFileSync } from "fs"
import { getPlugins } from "../plugins/registry.js"
import { OKF_VERSION, RESERVED_OKF_FILES, deckSlug, isReservedOkfFile, parseOkfLink } from "../okf.js"
import { DECK_ORDER_FILE } from "../deck-order.js"
import { CONSUMED_KEYS, EFFECT_LABEL, SKILL_MD, staleSkillRegions } from "../tools/gen-ontology-doc.js"
import {
  getAnnotations,
  getFrontmatter,
  getLayouts,
  getLimits,
  getOkf,
  getVocabularies,
  isDynamicCardinality,
  loadOntology,
  markerKind,
  parseCardinality,
} from "./index.js"
import { FIELD_VALIDATORS } from "./lint.js"
import { splitFrontmatter } from "./frontmatter.js"

/** effect に許す綴り。表に出す言葉を持つものだけ（EFFECT_LABEL がその正本） */
const KNOWN_EFFECTS: ReadonlySet<string> = new Set(Object.keys(EFFECT_LABEL))

/** 点検の失敗。1件ずつ集めて最後にまとめて出す（最初の1件で止めない） */
export function selfcheckProblems(): string[] {
  const problems: string[] = []
  const fail = (cond: unknown, message: string): void => {
    if (!cond) problems.push(message)
  }

  const onto = loadOntology()
  const layouts = getLayouts()
  const annotations = getAnnotations()
  const vocabularies = getVocabularies()
  const limits = getLimits()
  const frontmatter = getFrontmatter()

  fail(Number.isInteger(onto.version) && onto.version > 0, "version が正の整数でない")
  fail(layouts.length > 0, "layouts が空")

  // --- レイアウト ---
  const names = new Set<string>()
  const labels = new Set<string>()
  const annotationNames = new Set(annotations.map((a) => a.name))
  // ディレクティブの綴りは注釈とレイアウトで共通の名前空間。重複すると
  // 先に評価されたマッチャが勝ち、後から足したほうが黙って効かなくなる。
  const directiveSyntaxes = new Map<string, string>()
  for (const a of annotations) {
    directiveSyntaxes.set(a.syntax, `annotation ${a.name}`)
  }

  for (const layout of layouts) {
    const at = `layout ${layout.name}`
    fail(!names.has(layout.name), `${at}: name が重複している`)
    names.add(layout.name)
    fail(!labels.has(layout.label), `${at}: label '${layout.label}' が重複している`)
    labels.add(layout.label)
    fail(!!layout.description, `${at}: description が無い`)
    fail(!!layout.example, `${at}: example が無い（宣言だけでは書き方が伝わらない）`)

    for (const d of layout.directives) {
      const owner = directiveSyntaxes.get(d.syntax)
      fail(!owner, `${at}: ディレクティブ '${d.syntax}' が ${owner} と重複している`)
      directiveSyntaxes.set(d.syntax, at)
      if (d.pattern) {
        try {
          new RegExp(d.pattern)
        } catch (e) {
          problems.push(`${at}: pattern '${d.pattern}' が正規表現として不正 (${String(e)})`)
        }
      }
    }

    for (const name of layout.annotations) {
      fail(annotationNames.has(name), `${at}: 未宣言の注釈 '${name}' を挙げている`)
    }

    for (const slot of layout.slots) {
      const sat = `${at}.slots.${slot.name}`
      const kind = markerKind(slot.marker)
      fail(
        kind.kind !== "unknown",
        `${sat}: marker が ### / #### / \`\`\`<lang> / ![…](….<ext>) のいずれでもない`
      )
      // 行そのものが枠になるスロット（フェンス・画像）は見出しを持たない。
      // 語彙を宣言しても照合される見出しが無い
      fail(
        kind.kind === "heading" || kind.kind === "unknown" || slot.heading === "free",
        `${sat}: 行そのものが枠のスロットは見出しを持たないので heading: free でなければならない`
      )
      try {
        parseCardinality(slot.cardinality)
      } catch (e) {
        problems.push(`${sat}: ${String(e)}`)
      }
      if (slot.heading === "vocabulary") {
        fail(!!slot.vocabulary, `${sat}: heading: vocabulary なのに vocabulary が無い`)
        fail(
          !slot.vocabulary || slot.vocabulary in vocabularies,
          `${sat}: 未宣言の語彙 '${slot.vocabulary}' を参照している`
        )
      } else {
        fail(!slot.vocabulary, `${sat}: heading: free なのに vocabulary を持っている`)
      }
    }
    // 件数がディレクティブの引数で決まる宣言は、その引数を実際に捕まえていること
    const dynamic = layout.slots.some((s) => isDynamicCardinality(s.cardinality))
    fail(
      !dynamic || layout.directives.some((d) => (d.pattern?.match(/\(/g)?.length ?? 0) >= 2),
      `${at}: 件数が引数で決まる宣言だが、その引数をディレクティブが捕まえていない`
    )

    if (layout["max-chars"] !== undefined) {
      fail(layout["max-chars"] > 0, `${at}: max-chars が正でない`)
    }
  }

  // --- 注釈 ---
  const elementNames = new Set(Object.keys(onto.elements))
  for (const a of annotations) {
    const at = `annotation ${a.name}`
    fail(!!a.description, `${at}: description が無い`)
    try {
      new RegExp(a.pattern)
    } catch (e) {
      problems.push(`${at}: pattern '${a.pattern}' が正規表現として不正 (${String(e)})`)
    }
    for (const el of a["applies-to"]) {
      fail(elementNames.has(el), `${at}: 未宣言の要素 '${el}' に適用しようとしている`)
    }
    // どのレイアウトでも効かない注釈は、宣言されているのに使い道が無い
    fail(
      layouts.some((l) => l.annotations.includes(a.name)),
      `${at}: どのレイアウトの annotations にも挙がっていない`
    )
  }

  // --- 語彙 ---
  for (const [name, vocab] of Object.entries(vocabularies)) {
    const at = `vocabulary ${name}`
    fail(vocab.terms.length > 0, `${at}: terms が空`)
    fail(
      ["warning", "error", "ignore"].includes(vocab.unknown),
      `${at}: unknown '${vocab.unknown}' が未知の扱い`
    )
    const keys = new Set<string>()
    for (const term of vocab.terms) {
      fail(!keys.has(term.key), `${at}: key '${term.key}' が重複している`)
      keys.add(term.key)
      fail(!!term.canonical, `${at}.${term.key}: canonical が無い`)
    }
    // どこからも参照されない語彙は、宣言しても誰も照合しない。
    // 参照元はスロットの見出しだけではない — frontmatter のフィールドも語彙を指す
    // （deck-types はスロットを持たないので、スロットだけを見ると存在できない）
    fail(
      layouts.some((l) => l.slots.some((s) => s.vocabulary === name)) ||
        frontmatter.fields.some((f) => f.vocabulary === name),
      `${at}: どのスロット・frontmatter フィールドからも参照されていない`
    )
  }

  // --- frontmatter ---
  {
    const at = "frontmatter"
    fail(frontmatter.fields.length > 0, `${at}: fields が空`)
    const seenFields = new Set<string>()
    const usedKinds = new Set<string>()
    for (const f of frontmatter.fields) {
      fail(!seenFields.has(f.name), `${at}: フィールド '${f.name}' が重複している`)
      seenFields.add(f.name)
      usedKinds.add(f.kind)
      fail(!!f.description, `${at}.${f.name}: description が無い`)
      // 宣言した kind を見る実装が無ければ、その形は誰も検査しない
      fail(
        FIELD_VALIDATORS[f.kind] !== undefined,
        `${at}.${f.name}: kind '${f.kind}' を見る実装が lint に無い`
      )
      fail(
        !f.vocabulary || !!vocabularies[f.vocabulary],
        `${at}.${f.name}: 未宣言の語彙 '${f.vocabulary}' を指している`
      )
      fail(
        f.default === undefined || (f["allowed-values"]?.includes(f.default) ?? false),
        `${at}.${f.name}: default '${f.default}' が allowed-values に無い`
      )
      // 効き先は生成ドキュメントの列になるので、綴りが未知だと表に空欄が出る
      fail(
        f.effect === undefined || KNOWN_EFFECTS.has(f.effect),
        `${at}.${f.name}: effect '${f.effect}' が未知`
      )
      for (const sub of f["sub-fields"] ?? []) {
        usedKinds.add(sub.kind)
        fail(!!sub.description, `${at}.${f.name}.${sub.name}: description が無い`)
        fail(
          FIELD_VALIDATORS[sub.kind] !== undefined,
          `${at}.${f.name}.${sub.name}: kind '${sub.kind}' を見る実装が lint に無い`
        )
      }
    }
    // 使われない正規表現が宣言に残っていると、直したつもりで何も変わらない
    for (const kind of Object.keys(frontmatter["value-patterns"])) {
      fail(usedKinds.has(kind), `${at}.value-patterns.${kind}: どのフィールドの kind でもない`)
    }
    // 逆向き。フィールドを1つ消したときに置き去りになった実装を拾う
    // （`kind: int` は order を宣言から外したあと、これが無いと残り続けた）
    for (const kind of Object.keys(FIELD_VALIDATORS)) {
      fail(usedKinds.has(kind), `${at}: kind '${kind}' の実装はあるが、どのフィールドも使っていない`)
    }
    // 認識の条件 ⇔ 実装。宣言だけ書き替えて実装が古いまま、を作らせない
    const fence = frontmatter.recognition["first-line"]
    fail(
      splitFrontmatter(`${fence}\ntype: deck\n${fence}\n\n# T\n`).block !== undefined,
      `${at}.recognition: 宣言どおりに書いた frontmatter を実装が認識しない`
    )
    fail(
      splitFrontmatter(`${fence}\n# T\n${fence}\n`).block === undefined,
      `${at}.recognition: 2行目が見出しの md を実装が frontmatter と誤認する`
    )
    // 上の2件は**挙動そのもの**を留める（この2つの md がこう読まれること）。
    // 以下は**宣言と実装の一致**を留める。2条件の連言のうち2行目の条件は
    // `frontmatter.ts` の KEY_LINE が同じ内容を持つ二重持ちで、あちらは宣言を
    // 読めない（パイプラインの最下層に居るので、宣言ローダを import すると依存が
    // 上向きに戻って循環する）。読ませる代わりに、**両方の判定を突き合わせる** —
    // これが無いと second-line-pattern はどこからも読まれない飾りになり、
    // 「宣言を直したつもりで何も変わらない」が起きる（value-patterns と同じ理由）。
    const declaresKeyLine = new RegExp(frontmatter.recognition["second-line-pattern"])
    // 宣言が受ける例と受けない例を両方置く。片側だけだと、パターンを広げ過ぎた・
    // 狭め過ぎたのどちらかを見逃す
    for (const secondLine of [
      "type: deck", // 素直なキー行
      "order:", // 値の無いキー（行末で閉じる）
      "sub.key-name: 1", // `.` と `-` を含む名
      "# T", // 見出し。区切りから書き始めた普通のデッキ
      "概要: なにか", // 非 ASCII の「キーらしい行」
      "  type: deck", // 行頭が下がっている
      "type:deck", // `:` の後に空白が無い
    ]) {
      const declared = declaresKeyLine.test(secondLine)
      // 実装がその行をキー行と見たか。囲みは宣言の first-line で組む
      const implemented =
        splitFrontmatter(`${fence}\n${secondLine}\n${fence}\n\n# T\n`).block !== undefined
      fail(
        declared === implemented,
        `${at}.recognition.second-line-pattern: 2行目 '${secondLine}' の扱いが食い違う` +
          `（宣言=${declared} 実装=${implemented}）`
      )
    }
  }

  // --- 制限 ---
  fail(limits["max-chars-per-slide"] > 0, "limits.max-chars-per-slide が正でない")
  fail(
    limits["recommended-chars-per-slide"] <= limits["max-chars-per-slide"],
    "limits: 推奨値が上限を超えている"
  )
  for (const tag of limits["excluded-layouts"]) {
    fail(names.has(tag), `limits.excluded-layouts: 未宣言のレイアウト '${tag}'`)
  }

  // --- 宣言 ⇔ 実装（プラグインレジストリ） ---
  const registered = new Map(getPlugins().map((p) => [p.id, p]))
  for (const layout of layouts) {
    if (!layout.plugin) continue
    const plugin = registered.get(layout.plugin)
    fail(!!plugin, `layout ${layout.name}: plugin '${layout.plugin}' が登録されていない`)
    if (plugin) {
      fail(
        plugin.layoutTag === layout.name,
        `layout ${layout.name}: プラグイン '${layout.plugin}' の layoutTag は '${plugin.layoutTag}'`
      )
    }
  }
  const declaredPlugins = new Set(layouts.map((l) => l.plugin).filter(Boolean))
  for (const p of registered.values()) {
    fail(
      declaredPlugins.has(p.id),
      `plugin '${p.id}' が ontology.yaml の layouts に宣言されていない（ドキュメントにも lint にも現れない）`
    )
  }

  // --- バンドル（宣言 ⇔ src/okf.ts・src/deck-order.ts） ---
  // 予約名・版・並びの宣言のファイル名は、規則を宣言が持ち綴りをコードが持つ。
  // 分けているのはパーサ・CLI・lint・生成器が宣言の読み込みを挟まずに綴りを引けるように
  // するためで、layouts[].plugin ⇔ registry と同じ双方向の突き合わせで縛る
  const okf = getOkf()
  const declaredReserved = okf["reserved-files"].map((f) => f.name)
  for (const name of declaredReserved) {
    fail(isReservedOkfFile(name), `okf.reserved-files: '${name}' を src/okf.ts が予約名として知らない`)
  }
  for (const name of RESERVED_OKF_FILES) {
    fail(declaredReserved.includes(name), `okf.reserved-files: src/okf.ts の予約名 '${name}' が宣言に無い`)
  }
  fail(okf["okf-version"] === OKF_VERSION, `okf.okf-version が src/okf.ts の OKF_VERSION と違う`)
  fail(
    okf["deck-set"]["order-file"] === DECK_ORDER_FILE,
    `okf.deck-set.order-file が src/deck-order.ts の綴りと違う`
  )
  // 規則そのものは宣言に写さない（写しは照合できない）代わりに、例のほうを実装に通す。
  // **通すのは2つの入口**で、`deckSlug` は `order.yaml` の照合が使う側、`parseOkfLink` は
  // リンクを読む側。両者が同じ slug に着くことは、リンクがパス区切りを受けなくなって以来
  // ただの偶然（どちらも「拡張子を落として `deckSlug` に通す」だけ）なので、
  // コメントで一致を語らずにここで留める
  for (const e of okf["deck-slug"].examples) {
    fail(
      deckSlug(e.name) === e.slug,
      `okf.deck-slug.examples: '${e.name}' は実装では '${deckSlug(e.name)}' になる（宣言は '${e.slug}'）`
    )
    // 空白を含む名前は除く。**markdown のリンクの行き先に空白は書けない**ので
    // （`<…>` で囲まないかぎり。inline-formatter の走査も `[^()\s]+` で切る）、
    // `Wiki の作り方.md` はリンクとして書きようがなく、`parseOkfLink` が読めないのが正しい。
    // 例表の「リンクの書き方」の欄がその名前にも綴りを示しているのは宣言側の誤り（未修正）
    if (/\s/.test(e.name)) continue
    fail(
      parseOkfLink(`${e.name}.md`)?.ref === e.slug,
      `okf.deck-slug.examples: リンク '${e.name}.md' は '${parseOkfLink(`${e.name}.md`)?.ref}' を指す（宣言は '${e.slug}'）`
    )
  }
  fail(
    okf["deck-slug"].examples.some((e) => e.name !== e.slug),
    `okf.deck-slug.examples: 変換が起きる例が1つも無い（読み手に規則が伝わらない）`
  )

  // --- 宣言 ⇔ 生成物 ---
  // 宣言したのにドキュメントへ出ないキーは、生成物どうしを比べる --check では見つからない
  for (const key of Object.keys(onto)) {
    fail(
      CONSUMED_KEYS.has(key),
      `トップレベルキー '${key}' を gen-ontology-doc.ts が読んでいない（宣言しても ontology.md に出ない）`
    )
  }
  for (const name of staleSkillRegions(readFileSync(SKILL_MD, "utf-8"))) {
    problems.push(
      `SKILL.md の生成領域 '${name}' を生成側が作らない（差し替えられず古いまま残る）`
    )
  }

  return problems
}

export function selfcheck(): number {
  const problems = selfcheckProblems()
  for (const p of problems) console.error(`  [error] ${p}`)
  if (problems.length > 0) {
    console.error(`ontology.yaml の自己点検: ${problems.length} 件の不整合`)
    return 1
  }
  const onto = loadOntology()
  console.log(
    `ontology.yaml v${onto.version}: レイアウト ${onto.layouts.length} / 注釈 ${onto.annotations.length} / ` +
      `語彙 ${Object.keys(onto.vocabularies).length} / プラグイン ${getPlugins().length} — 整合`
  )
  return 0
}

// 直接実行されたときだけ走らせる（import 時に副作用を持たせない）
if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(selfcheck())
}
