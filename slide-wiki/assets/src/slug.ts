/**
 * 見出しから ID を作る。
 *
 * 日本語の見出しをそのまま残すのは、この Wiki のデッキが日本語で書かれるため。
 * `#種ノート` と書けることに価値があるので、ラテン文字に潰さない。
 * URL のフラグメントは UTF-8 を許すので、これで困らない。
 *
 * **parser の外に置いてあるのは、リンクを読む側（`okf.ts` 経由の
 * `inline-formatter.ts`）とスライドに ID を振る側（`parser/slide-ids.ts`）の
 * 両方が呼ぶため。** `slide-ids.ts` に置いたままだと
 * inline-formatter → slide-ids → slide-converter → block-formatter → inline-formatter
 * の循環になる。綴りが1つであることは `deck-slug` と `#fragment` が
 * 同じ規則で作られる保証そのものなので、2つに割ってはいけない。
 */
export function slugify(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s/\\_]+/g, "-")        // 空白・パス区切り → ハイフン
    .replace(/[^\p{L}\p{N}-]/gu, "")   // 文字・数字・ハイフン以外を落とす
    .replace(/-{2,}/g, "-")            // ハイフンの連続を畳む
    .replace(/^-+|-+$/g, "")           // 端のハイフンを落とす
}
