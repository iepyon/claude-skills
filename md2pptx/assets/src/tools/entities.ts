// XML/HTML の実体参照をデコードする。PPTX と HTML の両インスペクタが同じ規則で
// 読まないと、`=>` を含むコードが片方だけ `=&gt;` になって3者比較が偽陽性を出す。
//
// &amp; は最後にデコードする。そうしないと "&amp;lt;" が "<" になってしまう。
export const decodeEntities = (text: string): string =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
