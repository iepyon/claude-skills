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
import { CONSUMED_KEYS, SKILL_MD, staleSkillRegions } from "../tools/gen-ontology-doc.js"
import {
  getAnnotations,
  getFieldSets,
  getLayouts,
  getLimits,
  getVocabularies,
  isDynamicCardinality,
  loadOntology,
  markerKind,
  parseCardinality,
} from "./index.js"

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
  const fieldSets = getFieldSets()
  const limits = getLimits()

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
    if (layout.produces) {
      fail(
        layout.produces.includes(layout.name),
        `${at}: produces に自分自身の _tag が入っていない（上限や集計が片側だけに効く）`
      )
    }
    if (layout["field-set"]) {
      const fs = fieldSets[layout["field-set"]]
      fail(!!fs, `${at}: 未宣言の field-set '${layout["field-set"]}' を参照している`)
      fail(
        !fs || fs.layout === layout.name,
        `${at}: field-set '${layout["field-set"]}' が別のレイアウト '${fs?.layout}' を指している`
      )
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
      if (term.pattern) {
        try {
          new RegExp(term.pattern)
        } catch (e) {
          problems.push(`${at}.${term.key}: pattern が不正 (${String(e)})`)
        }
      }
      const sub = term["sub-labels"]
      if (sub) {
        for (const s of sub.terms) {
          if (sub.match === "exact") {
            fail(!!s.canonical, `${at}.${term.key}.${s.key}: match: exact なのに canonical が無い`)
          } else {
            fail(
              !!(s.contains?.length || s["contains-all"]?.length),
              `${at}.${term.key}.${s.key}: match: contains-any なのに contains が無い`
            )
          }
        }
      }
    }
    // どのスロットからも参照されない語彙は、宣言しても誰も照合しない
    fail(
      layouts.some((l) => l.slots.some((s) => s.vocabulary === name)),
      `${at}: どのスロットからも参照されていない`
    )
  }

  // --- フィールドセット ---
  for (const [name, fs] of Object.entries(fieldSets)) {
    const at = `field-set ${name}`
    fail(names.has(fs.layout), `${at}: 未宣言のレイアウト '${fs.layout}' を指している`)
    fail(fs.keys.length > 0, `${at}: keys が空`)
    const seen = new Set<string>()
    for (const k of fs.keys) {
      fail(!seen.has(k.name), `${at}: キー '${k.name}' が重複している`)
      seen.add(k.name)
      fail(!!k.description, `${at}.${k.name}: description が無い`)
      fail(
        ["text", "int", "list"].includes(k.kind),
        `${at}.${k.name}: kind '${k.kind}' が未知`
      )
      fail(
        k.kind !== "list" || !!k.separator,
        `${at}.${k.name}: kind: list なのに separator が無い`
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
