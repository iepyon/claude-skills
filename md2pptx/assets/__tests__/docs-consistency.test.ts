import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "fs"
import { join } from "path"
import { getPlugins } from "../src/plugins/registry.js"
import "../src/plugins/index.js" // side-effect: self-registration

/**
 * md2pptx は「Claude がドキュメントを読んで機械的に使う」スキルなので、ドキュメントの
 * 誤りは実装済み機能の不使用・生成品質の劣化に直結する（BACKLOG B-01）。
 *
 * md の構造（レイアウト一覧・ディレクティブ・語彙・文字数）については、この照合はもう
 * 要らない — ontology.yaml が正本になり、SKILL.md と ontology.md は生成物になった。
 * それらの鮮度は ontology.test.ts が見る。
 *
 * ここに残すのは**生成できない事実**だけ: CLAUDE.md / README が数え上げているファイル名や
 * 件数と、SKILL.md frontmatter の散文（Claude の呼び出し判定に使われるので生成しない）。
 */

const ASSETS_DIR = join(__dirname, "..")
const SKILL_DIR = join(ASSETS_DIR, "..")

const SKILL_MD = join(SKILL_DIR, "SKILL.md")
const CLAUDE_MD = join(SKILL_DIR, "CLAUDE.md")
const ASSETS_README = join(ASSETS_DIR, "README.md")

const read = (path: string): string => readFileSync(path, "utf-8")

/**
 * SKILL.md の「レイアウト一覧」表の本文行（ヘッダ・区切り行を除く）。
 *
 * 表そのものは生成物だが、frontmatter の件数はこの表と突き合わせる必要がある。
 */
const layoutTableRows = (skill: string): string[] => {
  const table = skill.match(/<!-- BEGIN GENERATED: layouts -->\n([\s\S]*?)\n<!-- END GENERATED/)
  if (!table) throw new Error("SKILL.md must have a generated レイアウト一覧 table")
  return table[1]
    .split("\n")
    .filter((line) => line.startsWith("|") && !/^\|\s*-+/.test(line))
    .slice(1) // ヘッダ行を除く
}

describe("docs consistency", () => {
  it("CLAUDE.md and README state the current plugin count", () => {
    const pluginDirs = readdirSync(join(ASSETS_DIR, "src", "plugins"), {
      withFileTypes: true,
    }).filter((e) => e.isDirectory())

    // icon-layout が2つ登録するのでディレクトリ数と登録数は一致しない。どちらも
    // ドキュメントが数字で書いているため、プラグイン追加時に両方の更新を強制する。
    expect(read(CLAUDE_MD)).toContain(`${pluginDirs.length}ディレクトリ`)
    expect(read(CLAUDE_MD)).toContain(`${getPlugins().length}プラグイン登録`)
    expect(read(ASSETS_README)).toContain(`(${getPlugins().length} registrations)`)
  })

  it("docs never reference a .ts file that does not exist", () => {
    // src/ 配下・__tests__ 配下・assets 直下のいずれかに同名ファイルがあればよい。
    // ツリー図のインデントやパス表記の揺れに強くするため basename で照合する。
    const basename = (path: string): string => path.split("/").pop()!
    const known = new Set(
      [
        ...readdirSync(join(ASSETS_DIR, "src"), { recursive: true }),
        ...readdirSync(join(ASSETS_DIR, "__tests__"), { recursive: true }),
        ...readdirSync(ASSETS_DIR),
      ]
        .map((entry) => basename(String(entry)))
        .filter((name) => name.endsWith(".ts"))
    )

    for (const path of [CLAUDE_MD, ASSETS_README]) {
      const mentioned = new Set(read(path).match(/[\w.-]+\.ts\b/g) ?? [])
      const missing = [...mentioned].filter((name) => !known.has(basename(name)))
      expect(missing, `${path} references nonexistent files`).toEqual([])
    }
  })

  it("CLAUDE.md's test table lists every test file", () => {
    const claude = read(CLAUDE_MD)
    const testFiles = readdirSync(join(ASSETS_DIR, "__tests__")).filter((f) =>
      f.endsWith(".test.ts")
    )

    // テストファイルが1つも見つからないなら照合が空振りしている
    expect(testFiles.length).toBeGreaterThan(0)

    const unlisted = testFiles.filter((f) => !claude.includes(f))
    expect(unlisted).toEqual([])
  })

  it("the skill description's layout count matches SKILL.md's layout table", () => {
    // frontmatter の description は Claude がスキルを呼ぶかの判定に使う散文なので生成しない。
    // その中の数字だけが生成物とずれうるので、ここで突き合わせる。
    const skill = read(SKILL_MD)

    const claimed = skill.match(/Supports (\d+) layout types/)
    expect(claimed, "SKILL.md frontmatter must state a layout count").not.toBeNull()

    expect(Number(claimed![1])).toBe(layoutTableRows(skill).length)
  })

  it("the docs point at the ontology instead of restating it", () => {
    // 語彙や上限をここへ書き戻すと、生成物と手書きが二重管理に戻る
    for (const path of [SKILL_MD, CLAUDE_MD, ASSETS_README]) {
      expect(read(path), `${path} must link to the ontology`).toMatch(/ontology\.(md|yaml)/)
    }
  })
})
