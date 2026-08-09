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
### 実務: [[日々の実務]]
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
関連: [[AIは保守者]] / [[人が承認する]] / [[差分だけ渡す]]

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
関連: [[人が承認する]] / [[夜間の手入れ]] / [[書き手を残す]]

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
関連: [[不変の生データ]] / [[剪定]] / [[生成物は直さない]]

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
関連: [[AIは保守者]] / [[夜間の手入れ]] / [[語彙を寄せる]]

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

---

## 日々の実務
<!--id:日々の実務-->
<!--agenda-->
役割と境界を決めたあと、毎日の手入れで効いてくること

### 語彙: [[語彙を寄せる]]
### 検査: [[規約は走らせる]]
### 導出: [[生成物は直さない]]
### 未解決: [[問いを置く]]
### 分量: [[差分だけ渡す]]
### 署名: [[書き手を残す]]
### 戻る: [[LLM-Wiki|原則]]

---

## 語彙を寄せる
<!--id:語彙を寄せる-->
<!--pattern-->
### 状況
同じものを指す言葉が、ノートごとに少しずつ違う。

### 問題
人は文脈で読み替えるが、その読み替えは残らない。
言い方が割れると、検索もリンクも当たらなくなる。

### 解決
**正の言い方を1つ決め、別名はそこへ向ける。**
決めるのは人、寄せるのは AI。語彙表は残す。
変えるときは [[人が承認する]] を通す。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <text x="30" y="34" font-family="sans-serif" font-size="13" fill="#9CA3AF">ばらけた言い方</text>

  <rect x="26" y="48" width="104" height="28" rx="4" fill="none" stroke="#9CA3AF" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="78" y="67" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">ユーザー</text>
  <rect x="26" y="88" width="104" height="28" rx="4" fill="none" stroke="#9CA3AF" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="78" y="107" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">利用者</text>
  <rect x="26" y="128" width="104" height="28" rx="4" fill="none" stroke="#9CA3AF" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="78" y="147" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">お客さま</text>

  <line x1="136" y1="62" x2="184" y2="100" stroke="#4B5563" stroke-width="1"/>
  <line x1="136" y1="102" x2="184" y2="102" stroke="#4B5563" stroke-width="1"/>
  <line x1="136" y1="142" x2="184" y2="104" stroke="#4B5563" stroke-width="1"/>
  <path d="M186 102 l-9 -5 l0 10 z" fill="#4B5563"/>

  <rect x="196" y="82" width="112" height="42" rx="4" fill="#F1F5F9" stroke="#1E40AF" stroke-width="2"/>
  <text x="252" y="102" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#1E40AF">顧客</text>
  <text x="252" y="118" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1E40AF">正の言い方</text>

  <line x1="30" y1="182" x2="310" y2="182" stroke="#E2E8F0" stroke-width="1"/>

  <text x="30" y="212" font-family="sans-serif" font-size="12" fill="#4B5563">どれを正にするか</text>
  <rect x="140" y="196" width="48" height="24" rx="4" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <text x="164" y="213" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#4B5563">人</text>

  <text x="204" y="212" font-family="sans-serif" font-size="12" fill="#1E40AF">寄せる</text>
  <rect x="256" y="196" width="48" height="24" rx="4" fill="none" stroke="#1E40AF" stroke-width="1.5"/>
  <text x="280" y="213" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1E40AF">AI</text>

  <text x="170" y="264" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">言い方が1つなら、リンクが当たる</text>
  <text x="170" y="290" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9CA3AF">別名は消さず、正へ向けておく</text>
</svg>
```

<!--takeaway-->
関連: [[規約は走らせる]] / [[つなぎ直し]]

---

## 規約は走らせる
<!--id:規約は走らせる-->
<!--pattern-->
### 状況
決まりを文書にしたが、守られたか誰も確かめない。

### 問題
読ませる規約は破られる。破れたと気づくのは後。
AI は言われた規約を、次の会話では持っていない。

### 解決
**規約を検査として書き、毎回走らせる。**
散文は入口の説明にとどめ、判定はコードに置く。
落ちた検査は、そのまま [[問いを置く]] の材料。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <text x="30" y="34" font-family="sans-serif" font-size="13" fill="#9CA3AF">読ませる規約</text>

  <rect x="26" y="46" width="104" height="58" rx="4" fill="none" stroke="#9CA3AF" stroke-width="1" stroke-dasharray="4 3"/>
  <line x1="40" y1="66" x2="116" y2="66" stroke="#9CA3AF" stroke-width="1"/>
  <line x1="40" y1="80" x2="104" y2="80" stroke="#9CA3AF" stroke-width="1"/>
  <line x1="40" y1="94" x2="112" y2="94" stroke="#9CA3AF" stroke-width="1"/>

  <line x1="140" y1="75" x2="180" y2="75" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="4 4"/>
  <text x="190" y="80" font-family="sans-serif" font-size="12" fill="#9CA3AF">守られたか不明</text>

  <line x1="30" y1="126" x2="310" y2="126" stroke="#E2E8F0" stroke-width="1"/>

  <text x="30" y="154" font-family="sans-serif" font-size="13" fill="#1E40AF">走らせる規約</text>

  <rect x="26" y="166" width="104" height="58" rx="4" fill="#F1F5F9" stroke="#1E40AF" stroke-width="2"/>
  <text x="78" y="190" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#1E40AF">検査</text>
  <text x="78" y="208" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1E40AF">毎回走る</text>

  <line x1="140" y1="195" x2="178" y2="195" stroke="#1E40AF" stroke-width="2"/>
  <path d="M180 195 l-9 -5 l0 10 z" fill="#1E40AF"/>

  <polyline points="190,176 198,184 214,164" fill="none" stroke="#4B5563" stroke-width="2"/>
  <text x="226" y="182" font-family="sans-serif" font-size="12" fill="#4B5563">通った</text>

  <line x1="190" y1="204" x2="210" y2="224" stroke="#1E40AF" stroke-width="2"/>
  <line x1="210" y1="204" x2="190" y2="224" stroke="#1E40AF" stroke-width="2"/>
  <text x="226" y="220" font-family="sans-serif" font-size="12" fill="#1E40AF">落ちた</text>

  <text x="170" y="266" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">判定を人の記憶に置かない</text>
  <text x="170" y="292" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9CA3AF">落ちた検査が、次の手入れになる</text>
</svg>
```

<!--takeaway-->
関連: [[AIは保守者]] / [[語彙を寄せる]]

---

## 生成物は直さない
<!--id:生成物は直さない-->
<!--pattern-->
### 状況
AI が作った索引や要約に誤りを見つけ、その場で直したくなる。

### 問題
直した先は次の生成で消える。消えたことに気づかないまま、
同じ誤りを何度も直し続ける。直した労力だけが記録に残らない。

### 解決
**導出されたものは直さず、導いた側を直す。**
索引が変なら [[索引は後から]] の作り方を直す。
要約が変なら元のノートを。生成物にはそう書き添える。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <text x="30" y="34" font-family="sans-serif" font-size="13" fill="#9CA3AF">流れ</text>

  <rect x="26" y="46" width="76" height="44" rx="4" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <text x="64" y="73" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#4B5563">元</text>

  <line x1="106" y1="68" x2="130" y2="68" stroke="#4B5563" stroke-width="1.5"/>
  <path d="M132 68 l-9 -5 l0 10 z" fill="#4B5563"/>

  <rect x="136" y="46" width="76" height="44" rx="4" fill="none" stroke="#1E40AF" stroke-width="1.5"/>
  <text x="174" y="73" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1E40AF">生成</text>

  <line x1="216" y1="68" x2="240" y2="68" stroke="#4B5563" stroke-width="1.5"/>
  <path d="M242 68 l-9 -5 l0 10 z" fill="#4B5563"/>

  <rect x="246" y="46" width="68" height="44" rx="4" fill="#F1F5F9" stroke="#4B5563" stroke-width="1.5"/>
  <text x="280" y="65" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#4B5563">索引</text>
  <text x="280" y="81" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#4B5563">要約</text>

  <line x1="30" y1="112" x2="310" y2="112" stroke="#E2E8F0" stroke-width="1"/>

  <text x="30" y="140" font-family="sans-serif" font-size="12" fill="#9CA3AF">生成物を直すと</text>
  <rect x="26" y="150" width="146" height="30" rx="4" fill="none" stroke="#9CA3AF" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="99" y="170" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">手直し</text>
  <line x1="182" y1="165" x2="210" y2="165" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="4 4"/>
  <line x1="222" y1="153" x2="244" y2="177" stroke="#9CA3AF" stroke-width="1.5"/>
  <line x1="244" y1="153" x2="222" y2="177" stroke="#9CA3AF" stroke-width="1.5"/>
  <text x="256" y="170" font-family="sans-serif" font-size="11" fill="#9CA3AF">消える</text>

  <text x="30" y="212" font-family="sans-serif" font-size="12" fill="#1E40AF">元を直すと</text>
  <rect x="26" y="222" width="146" height="30" rx="4" fill="none" stroke="#1E40AF" stroke-width="1.5"/>
  <text x="99" y="242" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1E40AF">手直し</text>
  <line x1="182" y1="237" x2="210" y2="237" stroke="#1E40AF" stroke-width="2"/>
  <path d="M212 237 l-9 -5 l0 10 z" fill="#1E40AF"/>
  <polyline points="222,236 230,244 246,224" fill="none" stroke="#1E40AF" stroke-width="2"/>
  <text x="256" y="242" font-family="sans-serif" font-size="11" fill="#1E40AF">残る</text>

  <text x="170" y="292" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">直すのは、生成物ではなく生成の元</text>
</svg>
```

<!--takeaway-->
関連: [[索引は後から]] / [[追記で残す]]

---

## 問いを置く
<!--id:問いを置く-->
<!--pattern-->
### 状況
分からないことを、答えが出るまで書かないでいる。

### 問題
頭の中にある問いは、他人にも AI にも見えない。
見えない作業は、誰にも引き取れないまま忘れられる。

### 解決
**問いを問いのまま1枚にする。**
答えの無いノートがあってよい。AI は答えない。
材料を集めて繋ぐだけ。答えが出たら [[追記で残す]]。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <text x="82" y="34" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9CA3AF">書かない問い</text>
  <text x="248" y="34" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#1E40AF">置いた問い</text>
  <line x1="166" y1="48" x2="166" y2="234" stroke="#E2E8F0" stroke-width="1"/>

  <circle cx="82" cy="118" r="26" fill="none" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="5 4"/>
  <text x="82" y="126" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#9CA3AF">?</text>
  <text x="82" y="176" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">頭の中にある</text>
  <text x="82" y="196" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">誰にも見えない</text>

  <line x1="248" y1="140" x2="204" y2="182" stroke="#4B5563" stroke-width="1.5"/>
  <line x1="248" y1="140" x2="248" y2="192" stroke="#4B5563" stroke-width="1.5"/>
  <line x1="248" y1="140" x2="292" y2="182" stroke="#4B5563" stroke-width="1.5"/>

  <circle cx="248" cy="114" r="26" fill="#F1F5F9" stroke="#1E40AF" stroke-width="2"/>
  <text x="248" y="122" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#1E40AF">?</text>

  <circle cx="202" cy="190" r="11" fill="#FFFFFF" stroke="#4B5563" stroke-width="1.5"/>
  <circle cx="248" cy="202" r="11" fill="#FFFFFF" stroke="#4B5563" stroke-width="1.5"/>
  <circle cx="294" cy="190" r="11" fill="#FFFFFF" stroke="#4B5563" stroke-width="1.5"/>
  <text x="248" y="234" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#4B5563">AI が集めた材料</text>

  <text x="170" y="274" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">答えの無い1枚が、作業の入口になる</text>
  <text x="170" y="298" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9CA3AF">見えている問いだけが、引き取れる</text>
</svg>
```

<!--takeaway-->
関連: [[規約は走らせる]] / [[出典まで辿れる]]

---

## 差分だけ渡す
<!--id:差分だけ渡す-->
<!--pattern-->
### 状況
手入れのたびに、Wiki 全体を AI に読ませている。

### 問題
量が増えるほど費用は上がり、注意は薄くなる。
気づくのは、見落としが増えてからになる。

### 解決
**変わったところと、その周りだけを渡す。**
何が変わったかは履歴が知っている。
全体を見るのは [[索引は後から]] を作り直すときだけ。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <text x="30" y="34" font-family="sans-serif" font-size="13" fill="#9CA3AF">Wiki 全体</text>

  <line x1="56" y1="70" x2="110" y2="56" stroke="#E2E8F0" stroke-width="1.5"/>
  <line x1="110" y1="56" x2="150" y2="96" stroke="#E2E8F0" stroke-width="1.5"/>
  <line x1="56" y1="70" x2="74" y2="128" stroke="#E2E8F0" stroke-width="1.5"/>
  <line x1="74" y1="128" x2="60" y2="190" stroke="#E2E8F0" stroke-width="1.5"/>
  <line x1="126" y1="148" x2="150" y2="190" stroke="#E2E8F0" stroke-width="1.5"/>

  <line x1="74" y1="128" x2="126" y2="148" stroke="#1E40AF" stroke-width="2"/>
  <line x1="126" y1="148" x2="150" y2="96" stroke="#1E40AF" stroke-width="2"/>

  <rect x="62" y="84" width="112" height="84" rx="6" fill="none" stroke="#1E40AF" stroke-width="1" stroke-dasharray="5 4"/>

  <circle cx="56" cy="70" r="9" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
  <circle cx="110" cy="56" r="9" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
  <circle cx="60" cy="190" r="9" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
  <circle cx="150" cy="190" r="9" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>

  <circle cx="74" cy="128" r="10" fill="#FFFFFF" stroke="#1E40AF" stroke-width="1.5"/>
  <circle cx="150" cy="96" r="10" fill="#FFFFFF" stroke="#1E40AF" stroke-width="1.5"/>
  <circle cx="126" cy="148" r="11" fill="#F1F5F9" stroke="#1E40AF" stroke-width="2.5"/>
  <text x="105" y="216" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1E40AF">変わった1枚</text>

  <line x1="180" y1="126" x2="222" y2="126" stroke="#1E40AF" stroke-width="2"/>
  <path d="M224 126 l-9 -5 l0 10 z" fill="#1E40AF"/>

  <rect x="230" y="104" width="82" height="44" rx="4" fill="#F1F5F9" stroke="#1E40AF" stroke-width="2"/>
  <text x="271" y="131" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#1E40AF">AI</text>
  <text x="271" y="168" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1E40AF">読むのはここだけ</text>

  <text x="170" y="264" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">変わった所と、その周りだけ渡す</text>
  <text x="170" y="290" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9CA3AF">全部読ませるほど、注意は薄くなる</text>
</svg>
```

<!--takeaway-->
関連: [[夜間の手入れ]] / [[一枚一義]]

---

## 書き手を残す
<!--id:書き手を残す-->
<!--pattern-->
### 状況
ノートの一行が、人の判断なのか AI の整形なのか分からない。

### 問題
疑うべき場所が分からないと、全部を等しく疑うことになる。
等しく疑われる Wiki は、結局どこも読まれない。

### 解決
**書いた主体を行に残す。** 人の判断には手を触れない。
AI が足したぶんは、後から一括で剥がせるようにする。
何に基づくかは [[出典まで辿れる]] が受け持つ。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <text x="30" y="34" font-family="sans-serif" font-size="13" fill="#9CA3AF">1枚のノート</text>

  <rect x="26" y="46" width="172" height="118" rx="4" fill="none" stroke="#4B5563" stroke-width="1.5"/>

  <circle cx="42" cy="70" r="3.5" fill="#4B5563"/>
  <line x1="54" y1="70" x2="182" y2="70" stroke="#4B5563" stroke-width="1.5"/>
  <circle cx="42" cy="94" r="3.5" fill="none" stroke="#1E40AF" stroke-width="1.5"/>
  <line x1="54" y1="94" x2="166" y2="94" stroke="#1E40AF" stroke-width="1.5" stroke-dasharray="5 3"/>
  <circle cx="42" cy="118" r="3.5" fill="#4B5563"/>
  <line x1="54" y1="118" x2="174" y2="118" stroke="#4B5563" stroke-width="1.5"/>
  <circle cx="42" cy="142" r="3.5" fill="none" stroke="#1E40AF" stroke-width="1.5"/>
  <line x1="54" y1="142" x2="158" y2="142" stroke="#1E40AF" stroke-width="1.5" stroke-dasharray="5 3"/>

  <circle cx="222" cy="66" r="3.5" fill="#4B5563"/>
  <text x="234" y="71" font-family="sans-serif" font-size="12" fill="#4B5563">人の判断</text>
  <circle cx="222" cy="94" r="3.5" fill="none" stroke="#1E40AF" stroke-width="1.5"/>
  <text x="234" y="99" font-family="sans-serif" font-size="12" fill="#1E40AF">AI の整形</text>

  <line x1="112" y1="172" x2="112" y2="198" stroke="#1E40AF" stroke-width="1.5"/>
  <path d="M112 200 l-5 -9 l10 0 z" fill="#1E40AF"/>
  <text x="128" y="192" font-family="sans-serif" font-size="12" fill="#1E40AF">AI の分だけ剥がす</text>

  <rect x="26" y="208" width="172" height="56" rx="4" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <circle cx="42" cy="228" r="3.5" fill="#4B5563"/>
  <line x1="54" y1="228" x2="182" y2="228" stroke="#4B5563" stroke-width="1.5"/>
  <circle cx="42" cy="248" r="3.5" fill="#4B5563"/>
  <line x1="54" y1="248" x2="174" y2="248" stroke="#4B5563" stroke-width="1.5"/>
  <text x="212" y="241" font-family="sans-serif" font-size="12" fill="#4B5563">判断は残る</text>

  <text x="170" y="296" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">誰が書いたかが、疑いどころを教える</text>
</svg>
```

<!--takeaway-->
関連: [[AIは保守者]] / [[剪定]]
