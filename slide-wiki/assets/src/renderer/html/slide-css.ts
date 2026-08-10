import { Theme } from "../../schema/index.js"
import { SLIDE_WIDTH, SLIDE_HEIGHT } from "../../constants.js"
import { SYNTAX_HIGHLIGHT_CSS } from "../syntax-highlighter.js"

/**
 * スライド1枚の見た目を決める CSS。
 *
 * `--html` と `--wiki` の両方がこれを読む。ここを共有していないと、
 * 箇条書きの記号やコードハイライトが片方だけ変わって静かにドリフトする。
 * レイアウト座標を LayoutResult に一本化しているのと同じ理由で、
 * 「スライドの見た目」も1箇所に置く。
 *
 * 外側のシェル（背景・ページ送り・サイドバー等）はここに含めない。
 */
export function slideBaseCss(theme: Theme): string {
  return `    .slide {
      position: absolute;
      width: ${SLIDE_WIDTH}in;
      height: ${SLIDE_HEIGHT}in;
      display: none;
      font-family: ${theme.fonts.body}, sans-serif;
    }

    .slide.active {
      display: block;
    }

    .title-slide .text-box {
      justify-content: center;
      text-align: center;
    }

    .content-slide .text-box {
      justify-content: flex-start;
      text-align: left;
    }

    /* flex コンテナ直下の唯一の子。中は普通のインラインフローに戻る */
    .rich-text { width: 100%; }

    /* 箇条書き。記号は ::before で描画するため DOM テキストには現れない
       （PPTX のネイティブバレットと抽出結果を一致させるため）。 */
    .para-stack { width: 100%; }
    .para-stack > p { margin: 0; }
    .para-bullet, .para-number { padding-left: 0.25in; text-indent: -0.25in; }
    .para-bullet::before { content: "\\2022  "; }
    /* 各項目が自分の番号を counter-reset で宣言し、increment で確定させる。
       非リスト行を挟んでも番号が狂わない。
       この「項目ごとに自己完結」という性質が、Wiki のホバープレビューで
       スライドを cloneNode しても番号が正しく出ることを担保している。 */
    .para-number { counter-increment: para-num; }
    .para-number::before { content: counter(para-num) ". "; }

    /* コードは1行 = 1つの <p>。PPTX が改行ごとに段落を作るのに合わせてある。
       色は run ごとの inline style で付く（PPTX に渡す textRuns と同じ正本）。 */
    .code-line { margin: 0; }
    /* 空行も1行ぶんの高さを保つ（文字が無いので抽出には現れない） */
    .code-line:empty::before { content: "\\200b"; }

    /* リンク。色は継承させ、下線だけで示す（テーマの文字色を壊さないため） */
    .text-box a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
    .text-box a.wikilink { text-decoration-style: dashed; cursor: pointer; }
    .text-box a.ext-link { text-decoration-style: solid; }
    /* 解決できなかった内部リンク。ビューアが実行時に付ける */
    .text-box a.wikilink.broken { color: #C62828; text-decoration-color: #C62828; }

${SYNTAX_HIGHLIGHT_CSS}`
}
