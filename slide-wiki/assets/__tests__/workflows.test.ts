import { describe, it, expect } from "vitest"
import { existsSync, readFileSync } from "fs"
import { join } from "path"
import { parse } from "yaml"

/**
 * GitHub Actions の宣言に対する検査。
 *
 * ここにあるのは1件の事故の再発防止である。公開用の `pages.yml` は
 * `concurrency: {group: pages, cancel-in-progress: true}` を単一グループで持っていて、
 * 以前そこに PR の run が混ざったとき、**後から始まった PR 側が push 側を殺して
 * デプロイが消えた**。原因と対処は pages.yml のコメントに書かれているが、
 * コメントは次にワークフローを足す人を止められない（`ci.yml` を作るときに
 * 同じ group 名を書くか、pages.yml に `pull_request` を1行足すだけで再発する）。
 *
 * このサイトが載せている `実行可能な規約` — 守らせたい規約は、読み物ではなく
 * 落ちる仕組みにする — をワークフローの側でも守るため、テストにしてある。
 */

const REPO_ROOT = join(__dirname, "..", "..", "..")
const WORKFLOW_DIR = join(REPO_ROOT, ".github", "workflows")

interface Workflow {
  readonly on?: Record<string, unknown>
  readonly concurrency?: { readonly group?: string }
}

// `on:` は YAML 1.1 の真偽値リテラルなので、パーサによっては `true` というキーになる。
// どちらでも読めるようにしておく（ここで取り違えると検査が空振りする）
const triggers = (wf: Workflow): string[] =>
  Object.keys(wf.on ?? (wf as unknown as Record<true, Record<string, unknown>>)[true] ?? {})

const load = (name: string): Workflow => parse(readFileSync(join(WORKFLOW_DIR, name), "utf-8"))

// スキルを `.github/` ごと持たない場所へ複製した場合に落とさない。
// ただし「見つからないので緑」を黙って許すと検査が消えるので、存在確認そのものを表に出す
const present = existsSync(WORKFLOW_DIR)

describe.skipIf(!present)("github workflows", () => {
  it("finds the workflows to check", () => {
    expect(existsSync(join(WORKFLOW_DIR, "pages.yml"))).toBe(true)
    expect(existsSync(join(WORKFLOW_DIR, "ci.yml"))).toBe(true)
  })

  it("never publishes from a pull request", () => {
    // PR で公開が走ると、レビュー前の内容が本番サイトに出る
    expect(triggers(load("pages.yml"))).not.toContain("pull_request")
  })

  it("keeps every workflow in its own concurrency group", () => {
    // 同じ group を共有した瞬間、cancel-in-progress が他方の run を殺す。
    // 殺されたのが公開側だと、デプロイが黙って消える（実際に起きた）
    const groups = ["pages.yml", "ci.yml"].map((f) => load(f).concurrency?.group)
    for (const group of groups) expect(group, "each workflow must set a concurrency group").toBeTruthy()
    expect(new Set(groups).size, `concurrency groups must be distinct: ${groups.join(" / ")}`).toBe(
      groups.length
    )
  })

  it("runs the type checker somewhere, since vitest cannot", () => {
    // vitest は esbuild で型を捨てるので、npm test だけでは型エラーが出ない。
    // typecheck を CI から外すと、その穴が黙って戻る（BACKLOG B-25）
    const ci = readFileSync(join(WORKFLOW_DIR, "ci.yml"), "utf-8")
    expect(ci).toContain("npm run typecheck")
  })
})
