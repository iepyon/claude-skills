import { describe, it, expect } from "vitest"
import { parseInlineFormatting, stripInlineFormatting } from "../src/parser/inline-formatter.js"

describe("parseInlineFormatting - Phase 1 (Bold only)", () => {
  it("should parse bold text", () => {
    const runs = parseInlineFormatting("Hello **world**")
    expect(runs).toEqual([
      { text: "Hello " },
      { text: "world", bold: true }
    ])
  })

  it("should handle multiple bold segments", () => {
    const runs = parseInlineFormatting("**First** normal **second**")
    expect(runs).toEqual([
      { text: "First", bold: true },
      { text: " normal " },
      { text: "second", bold: true }
    ])
  })

  it("should handle text without formatting", () => {
    const runs = parseInlineFormatting("Plain text")
    expect(runs).toEqual([{ text: "Plain text" }])
  })

  it("should handle CJK text", () => {
    const runs = parseInlineFormatting("日本語の**太字**テスト")
    expect(runs).toEqual([
      { text: "日本語の" },
      { text: "太字", bold: true },
      { text: "テスト" }
    ])
  })

  it("should handle bold at start", () => {
    const runs = parseInlineFormatting("**Bold** at start")
    expect(runs).toEqual([
      { text: "Bold", bold: true },
      { text: " at start" }
    ])
  })

  it("should handle bold at end", () => {
    const runs = parseInlineFormatting("End with **bold**")
    expect(runs).toEqual([
      { text: "End with " },
      { text: "bold", bold: true }
    ])
  })

  it("should handle only bold text", () => {
    const runs = parseInlineFormatting("**AllBold**")
    expect(runs).toEqual([
      { text: "AllBold", bold: true }
    ])
  })

  it("should handle empty string", () => {
    const runs = parseInlineFormatting("")
    expect(runs).toEqual([{ text: "" }])
  })

  it("should handle incomplete markers", () => {
    const runs = parseInlineFormatting("**incomplete")
    expect(runs).toEqual([{ text: "**incomplete" }])
  })

  it("should handle spaces inside bold", () => {
    const runs = parseInlineFormatting("Text **with spaces** here")
    expect(runs).toEqual([
      { text: "Text " },
      { text: "with spaces", bold: true },
      { text: " here" }
    ])
  })
})

describe("stripInlineFormatting - Phase 1", () => {
  it("should strip bold markers", () => {
    expect(stripInlineFormatting("Hello **world**")).toBe("Hello world")
  })

  it("should handle multiple markers", () => {
    expect(stripInlineFormatting("**First** and **second**")).toBe("First and second")
  })

  it("should handle text without markers", () => {
    expect(stripInlineFormatting("Plain text")).toBe("Plain text")
  })

  it("should handle CJK text", () => {
    expect(stripInlineFormatting("日本語の**太字**テスト")).toBe("日本語の太字テスト")
  })

  it("should handle incomplete markers", () => {
    expect(stripInlineFormatting("**incomplete")).toBe("**incomplete")
  })
})

describe("parseInlineFormatting - Phase 3 (Inline Code)", () => {
  it("should parse inline code", () => {
    const runs = parseInlineFormatting("Use `npm install` to install")
    expect(runs).toEqual([
      { text: "Use " },
      { text: "npm install", code: true },
      { text: " to install" }
    ])
  })

  it("should handle both code and bold", () => {
    const runs = parseInlineFormatting("Use **bold** and `code`")
    expect(runs).toEqual([
      { text: "Use " },
      { text: "bold", bold: true },
      { text: " and " },
      { text: "code", code: true }
    ])
  })

  it("should handle multiple code segments", () => {
    const runs = parseInlineFormatting("`first` and `second` code")
    expect(runs).toEqual([
      { text: "first", code: true },
      { text: " and " },
      { text: "second", code: true },
      { text: " code" }
    ])
  })

  it("should handle CJK in code", () => {
    const runs = parseInlineFormatting("コマンド`npm install`を実行")
    expect(runs).toEqual([
      { text: "コマンド" },
      { text: "npm install", code: true },
      { text: "を実行" }
    ])
  })

  it("should handle all three formats together", () => {
    const runs = parseInlineFormatting("**Bold** and `code` together")
    expect(runs).toEqual([
      { text: "Bold", bold: true },
      { text: " and " },
      { text: "code", code: true },
      { text: " together" }
    ])
  })
})

describe("stripInlineFormatting - Phase 3", () => {
  it("should strip code markers", () => {
    expect(stripInlineFormatting("Use `npm install`")).toBe("Use npm install")
  })

  it("should strip both code and bold markers", () => {
    expect(stripInlineFormatting("**Bold** and `code`")).toBe("Bold and code")
  })

  it("should handle mixed CJK and markers", () => {
    expect(stripInlineFormatting("日本語の**太字**と`コード`")).toBe("日本語の太字とコード")
  })
})

describe("parseInlineFormatting - Phase 2 (Italic)", () => {
  it("should parse italic text", () => {
    const runs = parseInlineFormatting("Hello *italic*")
    expect(runs).toEqual([
      { text: "Hello " },
      { text: "italic", italic: true }
    ])
  })

  it("should handle both bold and italic", () => {
    const runs = parseInlineFormatting("**bold** and *italic*")
    expect(runs).toEqual([
      { text: "bold", bold: true },
      { text: " and " },
      { text: "italic", italic: true }
    ])
  })

  it("should handle multiple italic segments", () => {
    const runs = parseInlineFormatting("*First* and *second* italic")
    expect(runs).toEqual([
      { text: "First", italic: true },
      { text: " and " },
      { text: "second", italic: true },
      { text: " italic" }
    ])
  })

  it("should handle CJK italic", () => {
    const runs = parseInlineFormatting("日本語の*イタリック*テスト")
    expect(runs).toEqual([
      { text: "日本語の" },
      { text: "イタリック", italic: true },
      { text: "テスト" }
    ])
  })
})

describe("All formats together", () => {
  it("should handle all three formats in one string", () => {
    const runs = parseInlineFormatting("**Bold**, *italic*, and `code` together")
    expect(runs).toEqual([
      { text: "Bold", bold: true },
      { text: ", " },
      { text: "italic", italic: true },
      { text: ", and " },
      { text: "code", code: true },
      { text: " together" }
    ])
  })

  it("should handle complex mixed formatting", () => {
    const runs = parseInlineFormatting("Use `npm install` to install **packages** with *ease*")
    expect(runs).toEqual([
      { text: "Use " },
      { text: "npm install", code: true },
      { text: " to install " },
      { text: "packages", bold: true },
      { text: " with " },
      { text: "ease", italic: true }
    ])
  })

  it("should strip all three markers", () => {
    expect(stripInlineFormatting("**Bold**, *italic*, and `code`"))
      .toBe("Bold, italic, and code")
  })

  it("should handle CJK with all formats", () => {
    expect(stripInlineFormatting("日本語の**太字**と*イタリック*と`コード`"))
      .toBe("日本語の太字とイタリックとコード")
  })
})

describe("parseInlineFormatting - links", () => {
  it("should parse an external markdown link", () => {
    expect(parseInlineFormatting("See [Anthropic](https://anthropic.com) now")).toEqual([
      { text: "See " },
      { text: "Anthropic", link: { kind: "external", href: "https://anthropic.com" } },
      { text: " now" },
    ])
  })

  it("should parse a bare wikilink and display the id", () => {
    expect(parseInlineFormatting("go to [[intro]]")).toEqual([
      { text: "go to " },
      { text: "intro", link: { kind: "internal", target: "intro" } },
    ])
  })

  it("should parse a labelled wikilink and display the label", () => {
    expect(parseInlineFormatting("[[intro|はじめに]] を読む")).toEqual([
      { text: "はじめに", link: { kind: "internal", target: "intro" } },
      { text: " を読む" },
    ])
  })

  it("should keep a wikilink inside backticks literal", () => {
    expect(parseInlineFormatting("`[[intro]]` と書く")).toEqual([
      { text: "[[intro]]", code: true },
      { text: " と書く" },
    ])
  })

  it("should not confuse a wikilink with a markdown link", () => {
    expect(parseInlineFormatting("[[a]] and [b](c)")).toEqual([
      { text: "a", link: { kind: "internal", target: "a" } },
      { text: " and " },
      { text: "b", link: { kind: "external", href: "c" } },
    ])
  })

  it("should leave an unterminated wikilink as plain text", () => {
    expect(parseInlineFormatting("[[broken")).toEqual([{ text: "[[broken" }])
  })

  it("should omit the link key entirely on undecorated runs", () => {
    const [run] = parseInlineFormatting("plain")
    expect("link" in run).toBe(false)
  })

  it("should support CJK slide ids", () => {
    expect(parseInlineFormatting("[[種ノート]]")).toEqual([
      { text: "種ノート", link: { kind: "internal", target: "種ノート" } },
    ])
  })
})

describe("stripInlineFormatting - links", () => {
  it("should keep only the label of a markdown link", () => {
    expect(stripInlineFormatting("See [Anthropic](https://anthropic.com)")).toBe("See Anthropic")
  })

  it("should keep the id of a bare wikilink", () => {
    expect(stripInlineFormatting("go to [[intro]]")).toBe("go to intro")
  })

  it("should keep only the label of a labelled wikilink", () => {
    expect(stripInlineFormatting("[[intro|はじめに]] を読む")).toBe("はじめに を読む")
  })

  it("should strip links mixed with other decorations", () => {
    expect(stripInlineFormatting("**太字**と[[a|リンク]]と`code`")).toBe("太字とリンクとcode")
  })
})

/**
 * 装飾の中の記法。
 *
 * パターンの「そこで」の一行目のように、**結論を太字にしてから参照を張る**書き方は
 * 自然に出てくる。再帰しないと bold の交替が内側の `[[…]]` ごと飲むので、リンクが
 * 黙って消える — しかも stripInlineFormatting は中を剥がすため、文字数だけは正しく
 * 数えられて表示と食い違う。実際に配布デッキの `切れない鎖` で1本死んでいた。
 */
describe("parseInlineFormatting - decorations nest", () => {
  it("should keep a wikilink alive inside bold", () => {
    expect(parseInlineFormatting("**主張から [[原本と写し|原本]] まで**")).toEqual([
      { text: "主張から ", bold: true },
      { text: "原本", bold: true, link: { kind: "internal", target: "原本と写し" } },
      { text: " まで", bold: true },
    ])
  })

  it("should keep a wikilink alive inside italic", () => {
    expect(parseInlineFormatting("*斜体の [[接ぎ木]]*")).toEqual([
      { text: "斜体の ", italic: true },
      { text: "接ぎ木", italic: true, link: { kind: "internal", target: "接ぎ木" } },
    ])
  })

  it("should keep an external link alive inside bold", () => {
    expect(parseInlineFormatting("**[docs](https://example.com) を見る**")).toEqual([
      { text: "docs", bold: true, link: { kind: "external", href: "https://example.com" } },
      { text: " を見る", bold: true },
    ])
  })

  it("should stack decorations instead of replacing them", () => {
    // code は交替の先頭なので中身を書式として解釈しない。装飾は積み上がる
    expect(parseInlineFormatting("**`[[種ノート]]` は記法**")).toEqual([
      { text: "[[種ノート]]", bold: true, code: true },
      { text: " は記法", bold: true },
    ])
  })

  it("should not nest italic into bold (a limit of the star grammar, not of the recursion)", () => {
    // `*` の交替が `**` を先に割るので、`*` と `**` は互いに入れ子にできない。
    // 再帰を入れても変わらない（内側に届く前に外側の切り方が決まっている）。
    // 記録しておくのは、`[[…]]` が効くようになったぶん「装飾も入れ子になった」と
    // 読まれうるため — なったのはリンクとコードだけである。
    expect(parseInlineFormatting("*斜体の中に **太字** がある*")).toEqual([
      { text: "斜体の中に ", italic: true },
      { text: "太字", italic: true },
      { text: " がある", italic: true },
    ])
  })

  it("should leave a plain bold run as one run", () => {
    // 内側に記法が無ければ分割しない（既存のスナップショットが動かない条件）
    expect(parseInlineFormatting("**ただの太字**")).toEqual([{ text: "ただの太字", bold: true }])
  })

  it("should not recurse into a link label", () => {
    // ラベルは表示テキスト。`**` はリテラルとして残す（現時点の仕様）
    expect(parseInlineFormatting("[[id|**強調**]]")).toEqual([
      { text: "**強調**", link: { kind: "internal", target: "id" } },
    ])
  })
})
