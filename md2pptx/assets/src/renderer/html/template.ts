import { Theme } from "../../schema/index.js"
import { SLIDE_WIDTH, SLIDE_HEIGHT } from "../../constants.js"
import { SYNTAX_HIGHLIGHT_CSS } from "../syntax-highlighter.js"
import { inchesToPx } from "./element-renderers.js"

// Generate complete HTML document
export function generateHtml(slidesHtml: string[], theme: Theme): string {
  const slideWidthPx = inchesToPx(SLIDE_WIDTH)
  const slideHeightPx = inchesToPx(SLIDE_HEIGHT)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Presentation</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: ${theme.fonts.body}, sans-serif;
      background-color: #1a1a2e;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px 0 24px;
    }

    .slide-wrapper {
      overflow: hidden;
    }

    .presentation-container {
      position: relative;
      width: ${slideWidthPx}px;
      height: ${slideHeightPx}px;
      transform-origin: top left;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 32px rgba(0,0,0,0.4);
    }

    .slide {
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

    .slide-counter {
      position: absolute;
      bottom: 10px;
      right: 14px;
      padding: 4px 10px;
      background-color: rgba(0, 0, 0, 0.45);
      color: rgba(255,255,255,0.65);
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
      pointer-events: none;
    }

    .controls {
      display: flex;
      gap: 10px;
      margin-top: 20px;
      z-index: 1000;
    }

    .controls button {
      padding: 8px 24px;
      font-size: 14px;
      background: rgba(255,255,255,0.06);
      color: #aaa;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .controls button:hover:not(:disabled) {
      background: rgba(255,255,255,0.12);
      color: #ddd;
    }

    .controls button:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    /* 箇条書き。記号は ::before で描画するため DOM テキストには現れない
       （PPTX のネイティブバレットと抽出結果を一致させるため）。 */
    .para-stack { width: 100%; }
    .para-stack > p { margin: 0; }
    .para-bullet, .para-number { padding-left: 0.25in; text-indent: -0.25in; }
    .para-bullet::before { content: "\\2022  "; }
    /* 各項目が自分の番号を counter-reset で宣言し、increment で確定させる。
       非リスト行を挟んでも番号が狂わない。 */
    .para-number { counter-increment: para-num; }
    .para-number::before { content: counter(para-num) ". "; }

    /* リンク。色は継承させ、下線だけで示す（テーマの文字色を壊さないため） */
    .text-box a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
    .text-box a.wikilink { text-decoration-style: dashed; cursor: pointer; }
    .text-box a.ext-link { text-decoration-style: solid; }
    /* 解決できなかった内部リンク。ビューアが実行時に付ける */
    .text-box a.wikilink.broken { color: #C62828; text-decoration-color: #C62828; }

${SYNTAX_HIGHLIGHT_CSS}
  </style>
</head>
<body>
  <div class="slide-wrapper" id="slideWrapper">
    <div class="presentation-container" id="presentation">
${slidesHtml.join("\n")}
      <div class="slide-counter">
        <span id="current-slide">1</span> / <span id="total-slides">${slidesHtml.length}</span>
      </div>
    </div>
  </div>

  <div class="controls">
    <button id="prev-btn">\u2190 Previous</button>
    <button id="next-btn">Next \u2192</button>
  </div>

  <script>
    let currentSlide = 0;
    const slides = document.querySelectorAll('.slide');
    const totalSlides = slides.length;
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const currentSlideSpan = document.getElementById('current-slide');
    const presentation = document.getElementById('presentation');

    function showSlide(index) {
      slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
      });
      currentSlideSpan.textContent = index + 1;
      prevBtn.disabled = index === 0;
      nextBtn.disabled = index === totalSlides - 1;
    }

    function nextSlide() {
      if (currentSlide < totalSlides - 1) {
        currentSlide++;
        showSlide(currentSlide);
      }
    }

    function prevSlide() {
      if (currentSlide > 0) {
        currentSlide--;
        showSlide(currentSlide);
      }
    }

    // Button controls
    nextBtn.addEventListener('click', nextSlide);
    prevBtn.addEventListener('click', prevSlide);

    // 内部リンク（[[slide-id]]）。data-slide-key から番号を引いてジャンプする。
    // 解決できないリンクは .broken を付けて見た目で分かるようにするだけで、
    // 遷移はしない（存在しないスライドへ飛ばすより気づける方がよい）。
    const slideIndexByKey = new Map();
    slides.forEach((slide, i) => {
      const key = slide.dataset.slideKey;
      if (key && !slideIndexByKey.has(key)) slideIndexByKey.set(key, i);
    });

    document.querySelectorAll('a.wikilink').forEach((a) => {
      if (!slideIndexByKey.has(a.dataset.wikilink)) a.classList.add('broken');
    });

    document.addEventListener('click', (e) => {
      const a = e.target.closest ? e.target.closest('a.wikilink') : null;
      if (!a) return;
      e.preventDefault();
      const index = slideIndexByKey.get(a.dataset.wikilink);
      if (index === undefined) return;
      currentSlide = index;
      showSlide(currentSlide);
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      }
    });

    // Responsive scaling
    const wrapper = document.getElementById('slideWrapper');
    function scalePresentation() {
      const viewportWidth = window.innerWidth - 48;
      const viewportHeight = window.innerHeight - 120;
      const slideWidth = ${slideWidthPx};
      const slideHeight = ${slideHeightPx};

      const scaleX = viewportWidth / slideWidth;
      const scaleY = viewportHeight / slideHeight;
      const scale = Math.min(scaleX, scaleY, 1);

      presentation.style.transform = \`scale(\${scale})\`;
      wrapper.style.width = Math.round(slideWidth * scale) + 'px';
      wrapper.style.height = Math.round(slideHeight * scale) + 'px';
    }

    window.addEventListener('resize', scalePresentation);
    scalePresentation();
    showSlide(0);
  </script>
</body>
</html>`
}
