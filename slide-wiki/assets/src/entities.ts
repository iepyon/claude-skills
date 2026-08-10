// XML/HTML の実体参照をデコードする。
//
// 生成物を読む側（両インスペクタ）と、生成物を作る側（hljs の出力を run に
// 割る syntax-highlighter）が同じ規則で読まないと、同じ文字が経路によって
// 違う結果になる。実際、以前は `&#x27;`（hljs が出す形）を知る実装と
// `&#39;`/`&apos;` を知る実装に分かれていて、アポストロフィを含むコードが
// 読む脚によって変わっていた。
//
// &amp; は最後にデコードする。そうしないと "&amp;lt;" が "<" になってしまう。
export const decodeEntities = (text: string): string =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
