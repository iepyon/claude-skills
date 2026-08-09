# LLM が手入れする Wiki

AI が保守者として入ってくる Wiki のパターン

---

## LLM Wiki
<!--id:LLM-Wiki-->
<!--agenda-->
人は観察と判断を入れ、AI は規約に従って整える

### 夜: [[夜間の手入れ]]
### 役割: [[AIは保守者]]
### 素材: [[不変の生データ]]
### 履歴: [[追記で残す]]
### 承認: [[人が承認する]]
### 根拠: [[出典まで辿れる]]
### 戻る: [[patterns-human/読み方|読み方]]

---

## 夜間の手入れ
<!--id:夜間の手入れ-->
<!--pattern-->
### 状況
日中は素材が溜まる一方で、整える時間が取れない。

### 問題
整えない Wiki は倉庫になる。だが整える作業は退屈で、
いつも「あとで」に回される。人の可処分時間で律速される。

### 解決
**AI を定時に走らせる。** その日の素材を取り込み、
[[つなぎ直し]] を実行し、[[索引は後から]] を作り直す。
人は朝、整った状態から読み始める。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <circle cx="170" cy="150" r="94" fill="none" stroke="#E2E8F0" stroke-width="1"/>

  <path d="M76 150 A94 94 0 0 1 264 150" fill="none" stroke="#4B5563" stroke-width="2.5"/>
  <path d="M264 150 A94 94 0 0 1 76 150" fill="none" stroke="#1E40AF" stroke-width="2.5" stroke-dasharray="6 4"/>

  <text x="170" y="42" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#4B5563">昼 — 人が素材を置く</text>
  <text x="170" y="272" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#1E40AF">夜 — AI が整える</text>

  <path d="M266 146 l-4 -10 l10 3 z" fill="#4B5563"/>
  <path d="M74 154 l4 10 l-10 -3 z" fill="#1E40AF"/>

  <rect x="120" y="106" width="100" height="24" rx="3" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <text x="170" y="123" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#4B5563">溜まった素材</text>

  <line x1="170" y1="136" x2="170" y2="160" stroke="#1E40AF" stroke-width="1.5"/>
  <path d="M170 162 l-5 -9 l10 0 z" fill="#1E40AF"/>

  <rect x="112" y="168" width="116" height="24" rx="3" fill="none" stroke="#1E40AF" stroke-width="1.5"/>
  <text x="170" y="185" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1E40AF">繋ぎ直し・索引</text>

  <text x="170" y="308" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">朝には整っている</text>
</svg>
```

<!--takeaway-->
関連: [[AIは保守者]] / [[人が承認する]]

---

## AIは保守者
<!--id:AIは保守者-->
<!--pattern-->
### 状況
AI に全部書かせたくなる。実際それらしい文章は出てくる。

### 問題
一次情報と判断は人にしか持てない。AI に著者をやらせると、
それらしいが中身の無いノートが増え、本物と見分けがつかなくなる。

### 解決
**役割を分ける。** 人が観察と判断を入れ、AI は規約に従って
整形・接続・検出だけを担う。AI は著者ではなく司書。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <text x="86" y="34" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">人 — 著者</text>
  <text x="254" y="34" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1E40AF">AI — 司書</text>
  <line x1="170" y1="48" x2="170" y2="256" stroke="#E2E8F0" stroke-width="1"/>

  <rect x="22" y="60" width="128" height="30" rx="4" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <text x="86" y="80" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#4B5563">観察</text>
  <rect x="22" y="102" width="128" height="30" rx="4" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <text x="86" y="122" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#4B5563">判断</text>
  <rect x="22" y="144" width="128" height="30" rx="4" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <text x="86" y="164" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#4B5563">一次情報</text>

  <rect x="190" y="60" width="128" height="30" rx="4" fill="none" stroke="#1E40AF" stroke-width="1.5"/>
  <text x="254" y="80" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#1E40AF">整形</text>
  <rect x="190" y="102" width="128" height="30" rx="4" fill="none" stroke="#1E40AF" stroke-width="1.5"/>
  <text x="254" y="122" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#1E40AF">接続</text>
  <rect x="190" y="144" width="128" height="30" rx="4" fill="none" stroke="#1E40AF" stroke-width="1.5"/>
  <text x="254" y="164" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#1E40AF">検出</text>

  <text x="254" y="204" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">著者</text>
  <rect x="190" y="212" width="128" height="30" rx="4" fill="none" stroke="#9CA3AF" stroke-width="1" stroke-dasharray="4 3"/>
  <line x1="196" y1="218" x2="312" y2="236" stroke="#9CA3AF" stroke-width="1.5"/>
  <line x1="312" y1="218" x2="196" y2="236" stroke="#9CA3AF" stroke-width="1.5"/>

  <text x="170" y="286" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">AI に著者をやらせない</text>
  <text x="170" y="308" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9CA3AF">それらしい空のノートが増えるだけ</text>
</svg>
```

<!--takeaway-->
関連: [[人が承認する]] / [[夜間の手入れ]]

---

## 不変の生データ
<!--id:不変の生データ-->
<!--pattern-->
### 状況
AI が整えるうちに、元になった記録まで書き換わっていく。

### 問題
元が失われると後から検算できない。
AI の要約がいつのまにか事実として通用しはじめる。

### 解決
**生データ / Wiki / スキーマ の3層に分け、生データ層は追加のみにする。**
AI が書き換えてよいのは Wiki 層だけ。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <text x="52" y="44" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1E40AF">AI</text>

  <rect x="86" y="52" width="224" height="46" rx="4" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <text x="198" y="74" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#4B5563">スキーマ</text>
  <text x="198" y="91" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#9CA3AF">読み方の規約</text>

  <rect x="86" y="118" width="224" height="46" rx="4" fill="none" stroke="#1E40AF" stroke-width="2"/>
  <text x="198" y="140" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#1E40AF">Wiki</text>
  <text x="198" y="157" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1E40AF">AI が書き換えてよい唯一の層</text>

  <rect x="86" y="184" width="224" height="56" rx="4" fill="#F1F5F9" stroke="#4B5563" stroke-width="2"/>
  <text x="198" y="208" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#4B5563">生データ</text>
  <text x="198" y="227" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#9CA3AF">追加のみ・書き換え不可</text>

  <line x1="52" y1="56" x2="52" y2="141" stroke="#1E40AF" stroke-width="1.5"/>
  <line x1="52" y1="141" x2="78" y2="141" stroke="#1E40AF" stroke-width="2"/>
  <path d="M80 141 l-9 -5 l0 10 z" fill="#1E40AF"/>

  <line x1="52" y1="141" x2="52" y2="212" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="4 4"/>
  <line x1="52" y1="212" x2="78" y2="212" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="4 4"/>
  <line x1="56" y1="202" x2="76" y2="222" stroke="#9CA3AF" stroke-width="1.5"/>
  <line x1="76" y1="202" x2="56" y2="222" stroke="#9CA3AF" stroke-width="1.5"/>

  <text x="170" y="278" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">元が残るから、後から検算できる</text>
</svg>
```

<!--takeaway-->
関連: [[出典まで辿れる]] / [[追記で残す]]

---

## 追記で残す
<!--id:追記で残す-->
<!--pattern-->
### 状況
判断が変わるたびに、前の記述を上書きしてしまう。

### 問題
上書きすると「なぜそう考えたか」が消える。
AI は指示すれば平気で上書きするので、放っておくと履歴が痩せる。

### 解決
**出来事を追記し、現在の状態はそこからの射影として導く。**
消すのではなく、変わったと書き足す。[[剪定]] が効くのはこの上でだけ。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <text x="30" y="34" font-family="sans-serif" font-size="13" fill="#4B5563">出来事（追記だけ）</text>

  <rect x="30" y="48" width="240" height="26" rx="3" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <text x="42" y="66" font-family="sans-serif" font-size="12" fill="#4B5563">A だと考えた</text>
  <rect x="30" y="82" width="240" height="26" rx="3" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <text x="42" y="100" font-family="sans-serif" font-size="12" fill="#4B5563">反例が出た</text>
  <rect x="30" y="116" width="240" height="26" rx="3" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <text x="42" y="134" font-family="sans-serif" font-size="12" fill="#4B5563">B に変えた</text>

  <line x1="290" y1="48" x2="290" y2="152" stroke="#9CA3AF" stroke-width="1"/>
  <path d="M290 154 l-4 -9 l8 0 z" fill="#9CA3AF"/>
  <text x="298" y="106" font-family="sans-serif" font-size="12" fill="#9CA3AF">時間</text>

  <line x1="150" y1="152" x2="150" y2="188" stroke="#1E40AF" stroke-width="1.5"/>
  <path d="M150 190 l-5 -9 l10 0 z" fill="#1E40AF"/>
  <text x="164" y="176" font-family="sans-serif" font-size="12" fill="#1E40AF">射影</text>

  <rect x="60" y="198" width="180" height="42" rx="4" fill="none" stroke="#1E40AF" stroke-width="2"/>
  <text x="150" y="218" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#1E40AF">いまの結論: B</text>
  <text x="150" y="234" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1E40AF">導かれるもの・書き換えない</text>

  <text x="170" y="278" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">上書きしないから、理由が残る</text>
</svg>
```

<!--takeaway-->
関連: [[不変の生データ]] / [[剪定]]

---

## 人が承認する
<!--id:人が承認する-->
<!--pattern-->
### 状況
AI が自動で判断を書き換え、いつのまにか結論が変わっている。

### 問題
気づかない変更は、間違っていても発見されない。
自動化の速度がそのまま誤りの伝播速度になる。

### 解決
**解釈を伴う変更は提案で止め、人の承認を経てから反映する。**
機械的に決まることだけ自動で通す。境界を先に決めておく。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <rect x="24" y="126" width="72" height="34" rx="4" fill="none" stroke="#1E40AF" stroke-width="1.5"/>
  <text x="60" y="148" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#1E40AF">AI の変更</text>

  <line x1="96" y1="136" x2="132" y2="80" stroke="#4B5563" stroke-width="1.5"/>
  <line x1="96" y1="150" x2="132" y2="210" stroke="#4B5563" stroke-width="1.5"/>

  <text x="140" y="62" font-family="sans-serif" font-size="12" fill="#9CA3AF">機械的に決まる</text>
  <line x1="136" y1="76" x2="290" y2="76" stroke="#4B5563" stroke-width="1.5"/>
  <path d="M292 76 l-9 -5 l0 10 z" fill="#4B5563"/>
  <text x="196" y="106" font-family="sans-serif" font-size="12" fill="#4B5563">そのまま反映</text>

  <text x="140" y="196" font-family="sans-serif" font-size="12" fill="#9CA3AF">解釈を伴う</text>
  <line x1="136" y1="214" x2="196" y2="214" stroke="#4B5563" stroke-width="1.5"/>
  <rect x="198" y="196" width="60" height="36" rx="4" fill="#F1F5F9" stroke="#1E40AF" stroke-width="2"/>
  <text x="228" y="219" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1E40AF">承認</text>
  <line x1="260" y1="214" x2="290" y2="214" stroke="#4B5563" stroke-width="1.5" stroke-dasharray="4 3"/>
  <path d="M292 214 l-9 -5 l0 10 z" fill="#4B5563"/>
  <text x="228" y="254" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1E40AF">人が見るまで止まる</text>

  <text x="170" y="292" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">境界を先に決めておく</text>
</svg>
```

<!--takeaway-->
関連: [[AIは保守者]] / [[夜間の手入れ]]

---

## 出典まで辿れる
<!--id:出典まで辿れる-->
<!--pattern-->
### 状況
Wiki の主張が、どの記録に基づくのか分からなくなる。

### 問題
根拠の無い主張は、人が書いたのか AI が書いたのかすら判別できない。
判別できないものは、信じることも疑うこともできない。

### 解決
**主張から一次資料まで、リンクの鎖を切らさない。**
鎖が切れている箇所は、AI が検出して報告する。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <rect x="26" y="52" width="96" height="32" rx="4" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <text x="74" y="73" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#4B5563">主張</text>
  <line x1="122" y1="68" x2="152" y2="68" stroke="#4B5563" stroke-width="1.5"/>
  <path d="M154 68 l-9 -5 l0 10 z" fill="#4B5563"/>
  <rect x="156" y="52" width="96" height="32" rx="4" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <text x="204" y="73" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#4B5563">まとめ</text>
  <line x1="252" y1="68" x2="282" y2="68" stroke="#4B5563" stroke-width="1.5"/>
  <path d="M284 68 l-9 -5 l0 10 z" fill="#4B5563"/>
  <rect x="286" y="52" width="30" height="32" rx="4" fill="#F1F5F9" stroke="#1E40AF" stroke-width="2"/>

  <text x="26" y="126" font-family="sans-serif" font-size="12" fill="#9CA3AF">鎖が切れている場合</text>

  <rect x="26" y="140" width="96" height="32" rx="4" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <text x="74" y="161" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#4B5563">主張</text>
  <line x1="122" y1="156" x2="152" y2="156" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="4 4"/>
  <rect x="156" y="140" width="96" height="32" rx="4" fill="none" stroke="#9CA3AF" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="204" y="161" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">?</text>

  <line x1="137" y1="180" x2="137" y2="212" stroke="#1E40AF" stroke-width="1.5"/>
  <path d="M137 178 l-5 9 l10 0 z" fill="#1E40AF"/>
  <rect x="70" y="214" width="140" height="30" rx="4" fill="none" stroke="#1E40AF" stroke-width="1.5"/>
  <text x="140" y="234" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1E40AF">AI が検出して報告</text>

  <text x="170" y="284" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">辿れるものだけが、疑える</text>
</svg>
```

<!--takeaway-->
関連: [[不変の生データ]] / [[つなぎ直し]] / [[収穫]]
