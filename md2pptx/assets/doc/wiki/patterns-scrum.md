# ゴールは後から決まる

試行錯誤でゴールを見つけるスクラムのパターン

---

## 探し方
<!--id:探し方-->
<!--agenda-->
先にゴールを見つけ、次にその手段を見つける

### 立てる: [[仮のゴール]]
### 見せる: [[動くものが問う]]
### 判定: [[完成を先に決める]]
### 区切る: [[期限で問い直す]]
### 残す: [[外れを棚に残す]]
### 選ぶ: [[分からない順に取る]]
### 貯める: [[やり方を型にする]]
### 対応: [[patterns-agent/対応表|エージェントとの対応]]

---

## 仮のゴール
<!--id:仮のゴール-->
<!--pattern-->
### 状況
何を達成すべきかを決めきってから着手しようとする。

### 問題
決めきるだけの情報は、着手前には無い。
一度決めたゴールは、外れていても期の終わりまで生き延びる。
途中で分かったことが、ゴールの側に届かない。

### 解決
**ゴールを、期限付きの仮説として置く。**
「これができれば何が確かめられるか」を一文で書き、外れたら捨てる前提にする。
捨てた記録は [[外れを棚に残す]]。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <text x="30" y="32" font-family="sans-serif" font-size="13" fill="#9CA3AF">決めきってから始める</text>

  <circle cx="40" cy="72" r="5" fill="#9CA3AF"/>
  <line x1="40" y1="72" x2="278" y2="72" stroke="#9CA3AF" stroke-width="1.5"/>
  <path d="M280 72 l-9 -5 l0 10 z" fill="#9CA3AF"/>
  <line x1="290" y1="52" x2="290" y2="92" stroke="#9CA3AF" stroke-width="1.5"/>
  <path d="M290 54 l22 8 l-22 8 z" fill="none" stroke="#9CA3AF" stroke-width="1.5"/>

  <line x1="130" y1="106" x2="130" y2="88" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="4 3"/>
  <line x1="124" y1="86" x2="136" y2="74" stroke="#9CA3AF" stroke-width="1.5"/>
  <line x1="136" y1="86" x2="124" y2="74" stroke="#9CA3AF" stroke-width="1.5"/>
  <line x1="206" y1="106" x2="206" y2="88" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="4 3"/>
  <line x1="200" y1="86" x2="212" y2="74" stroke="#9CA3AF" stroke-width="1.5"/>
  <line x1="212" y1="86" x2="200" y2="74" stroke="#9CA3AF" stroke-width="1.5"/>
  <text x="168" y="124" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">分かったことが届かない</text>

  <line x1="30" y1="144" x2="310" y2="144" stroke="#E2E8F0" stroke-width="1"/>

  <text x="30" y="172" font-family="sans-serif" font-size="13" fill="#1E40AF">仮説として置き直す</text>

  <text x="73" y="196" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">ゴール A</text>
  <line x1="46" y1="192" x2="100" y2="192" stroke="#9CA3AF" stroke-width="1.5"/>
  <text x="170" y="196" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">ゴール B</text>
  <line x1="143" y1="192" x2="197" y2="192" stroke="#9CA3AF" stroke-width="1.5"/>
  <text x="267" y="196" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1E40AF">ゴール C</text>

  <rect x="32" y="206" width="82" height="34" rx="4" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <text x="73" y="228" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#4B5563">試す</text>
  <rect x="129" y="206" width="82" height="34" rx="4" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <text x="170" y="228" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#4B5563">試す</text>
  <rect x="226" y="206" width="82" height="34" rx="4" fill="#F1F5F9" stroke="#1E40AF" stroke-width="2"/>
  <text x="267" y="228" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1E40AF">試す</text>

  <line x1="114" y1="223" x2="127" y2="223" stroke="#4B5563" stroke-width="1.5"/>
  <line x1="211" y1="223" x2="224" y2="223" stroke="#4B5563" stroke-width="1.5"/>

  <text x="170" y="278" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">捨てられるゴールだけが、直せる</text>
  <text x="170" y="302" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9CA3AF">外れた A と B は消さずに残す</text>
</svg>
```

<!--takeaway-->
関連: [[期限で問い直す]] / [[外れを棚に残す]] / [[patterns-agent/ゴールを立てさせる|ゴールを立てさせる]]

---

## 動くものが問う
<!--id:動くものが問う-->
<!--pattern-->
### 状況
何を作るべきかを、資料と会議で議論している。

### 問題
資料の空白は、読み手が想像で埋める。
埋め方は人ごとに違うので、合意しても全員が同じものを指していない。
本当の要望は、触れるものが出るまで言葉にならない。

### 解決
**毎回、触れるものを外に出す。**
見せる場を受け入れの場ではなく、次のゴールを見つける場として使う。
出てきた要望は、そのまま次の [[仮のゴール]] の材料になる。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <text x="84" y="30" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9CA3AF">資料で見せる</text>
  <text x="248" y="30" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#1E40AF">動くものを見せる</text>
  <line x1="166" y1="44" x2="166" y2="252" stroke="#E2E8F0" stroke-width="1"/>

  <rect x="46" y="48" width="76" height="46" rx="4" fill="none" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="5 3"/>
  <line x1="58" y1="64" x2="110" y2="64" stroke="#9CA3AF" stroke-width="1"/>
  <line x1="58" y1="76" x2="100" y2="76" stroke="#9CA3AF" stroke-width="1"/>

  <line x1="84" y1="98" x2="46" y2="128" stroke="#9CA3AF" stroke-width="1"/>
  <line x1="84" y1="98" x2="84" y2="128" stroke="#9CA3AF" stroke-width="1"/>
  <line x1="84" y1="98" x2="122" y2="128" stroke="#9CA3AF" stroke-width="1"/>

  <circle cx="46" cy="142" r="13" fill="none" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="4 3"/>
  <rect x="71" y="130" width="26" height="24" rx="2" fill="none" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="4 3"/>
  <path d="M122 130 l14 24 l-28 0 z" fill="none" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="4 3"/>

  <text x="84" y="182" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">想像が割れる</text>
  <text x="84" y="202" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">合意しても</text>
  <text x="84" y="220" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">別のものを見ている</text>

  <rect x="210" y="48" width="76" height="46" rx="4" fill="#F1F5F9" stroke="#1E40AF" stroke-width="2"/>
  <path d="M238 62 l16 9 l-16 9 z" fill="#1E40AF"/>

  <line x1="248" y1="98" x2="210" y2="128" stroke="#4B5563" stroke-width="1"/>
  <line x1="248" y1="98" x2="248" y2="128" stroke="#4B5563" stroke-width="1"/>
  <line x1="248" y1="98" x2="286" y2="128" stroke="#4B5563" stroke-width="1"/>

  <rect x="197" y="130" width="26" height="24" rx="2" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <rect x="235" y="130" width="26" height="24" rx="2" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <rect x="273" y="130" width="26" height="24" rx="2" fill="none" stroke="#4B5563" stroke-width="1.5"/>

  <line x1="248" y1="160" x2="248" y2="184" stroke="#1E40AF" stroke-width="1.5"/>
  <path d="M248 186 l-5 -9 l10 0 z" fill="#1E40AF"/>
  <rect x="196" y="192" width="104" height="30" rx="4" fill="none" stroke="#1E40AF" stroke-width="1.5"/>
  <text x="248" y="212" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1E40AF">次に作るもの</text>

  <text x="170" y="278" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">触れるものが、次の問いを引き出す</text>
  <text x="170" y="302" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9CA3AF">見せる場は、受け入れの場ではない</text>
</svg>
```

<!--takeaway-->
関連: [[仮のゴール]] / [[分からない順に取る]] / [[patterns-agent/実行が判定する|実行が判定する]]

---

## 完成を先に決める
<!--id:完成を先に決める-->
<!--pattern-->
### 状況
ゴールが動くので、何をもって「できた」とするかも毎回揺れている。

### 問題
判定がゴールと一緒に動くと、どんな結果も達成に見えてしまう。
うまくいったのか分からない試行は、次の材料にならない。

### 解決
**完成の条件を、ゴールとは別に、先に決めて外に置く。**
ゴールは毎回差し替えてよい。差し替えないのは判定のほうにする。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <text x="30" y="30" font-family="sans-serif" font-size="13" fill="#9CA3AF">差し替わるもの</text>

  <rect x="30" y="44" width="80" height="32" rx="4" fill="none" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="5 3"/>
  <text x="70" y="65" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">ゴール A</text>
  <rect x="130" y="44" width="80" height="32" rx="4" fill="none" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="5 3"/>
  <text x="170" y="65" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">ゴール B</text>
  <rect x="230" y="44" width="80" height="32" rx="4" fill="none" stroke="#1E40AF" stroke-width="1.5"/>
  <text x="270" y="65" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1E40AF">ゴール C</text>

  <line x1="70" y1="80" x2="150" y2="126" stroke="#4B5563" stroke-width="1.2"/>
  <line x1="170" y1="80" x2="170" y2="126" stroke="#4B5563" stroke-width="1.2"/>
  <line x1="270" y1="80" x2="190" y2="126" stroke="#4B5563" stroke-width="1.2"/>
  <path d="M170 130 l-5 -9 l10 0 z" fill="#4B5563"/>

  <rect x="86" y="136" width="168" height="46" rx="4" fill="#F1F5F9" stroke="#4B5563" stroke-width="2.5"/>
  <text x="170" y="157" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#4B5563">完成の条件</text>
  <text x="170" y="174" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#9CA3AF">先に決めて、動かさない</text>

  <line x1="130" y1="182" x2="106" y2="212" stroke="#4B5563" stroke-width="1.5"/>
  <line x1="210" y1="182" x2="234" y2="212" stroke="#4B5563" stroke-width="1.5"/>

  <polyline points="92,216 100,224 116,204" fill="none" stroke="#1E40AF" stroke-width="2.5"/>
  <text x="104" y="248" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1E40AF">できた</text>

  <line x1="226" y1="206" x2="246" y2="226" stroke="#9CA3AF" stroke-width="2.5"/>
  <line x1="246" y1="206" x2="226" y2="226" stroke="#9CA3AF" stroke-width="2.5"/>
  <text x="236" y="248" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">できていない</text>

  <text x="170" y="284" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">ゴールは動かす。判定は動かさない</text>
  <text x="170" y="306" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9CA3AF">一緒に動くと、全部が達成に見える</text>
</svg>
```

<!--takeaway-->
関連: [[動くものが問う]] / [[patterns-agent/検査を先に書く|検査を先に書く]]

---

## 期限で問い直す
<!--id:期限で問い直す-->
<!--pattern-->
### 状況
見込みが外れていても、あと少しで終わりそうに見えて続けてしまう。

### 問題
ゴールを探す作業には、自然な終わりが無い。
終わりが無いものは、成果ではなく消耗で終わる。
やめる判断を各自の見切りに任せると、誰もやめない。

### 解決
**期間を先に固定し、期限では作業ではなくゴールを問い直す。**
延ばすのは期限ではなく、次に置く仮説のほう。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <text x="30" y="30" font-family="sans-serif" font-size="13" fill="#9CA3AF">終わりを決めない</text>

  <line x1="30" y1="66" x2="150" y2="66" stroke="#9CA3AF" stroke-width="2"/>
  <line x1="150" y1="66" x2="230" y2="66" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="6 4"/>
  <line x1="230" y1="66" x2="310" y2="66" stroke="#E2E8F0" stroke-width="1.5" stroke-dasharray="3 5"/>
  <text x="170" y="92" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">あと少しに見え続ける</text>

  <line x1="30" y1="116" x2="310" y2="116" stroke="#E2E8F0" stroke-width="1"/>

  <text x="30" y="144" font-family="sans-serif" font-size="13" fill="#1E40AF">期間を先に固定する</text>

  <rect x="30" y="160" width="82" height="34" rx="4" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <text x="71" y="182" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#4B5563">試す</text>
  <rect x="129" y="160" width="82" height="34" rx="4" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <text x="170" y="182" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#4B5563">試す</text>
  <rect x="228" y="160" width="82" height="34" rx="4" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <text x="269" y="182" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#4B5563">試す</text>

  <circle cx="120" cy="177" r="9" fill="#F1F5F9" stroke="#1E40AF" stroke-width="2"/>
  <text x="120" y="182" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1E40AF">?</text>
  <circle cx="219" cy="177" r="9" fill="#F1F5F9" stroke="#1E40AF" stroke-width="2"/>
  <text x="219" y="182" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1E40AF">?</text>

  <line x1="120" y1="200" x2="120" y2="222" stroke="#1E40AF" stroke-width="1.5"/>
  <path d="M120 224 l-5 -9 l10 0 z" fill="#1E40AF"/>
  <line x1="219" y1="200" x2="219" y2="222" stroke="#1E40AF" stroke-width="1.5"/>
  <path d="M219 224 l-5 -9 l10 0 z" fill="#1E40AF"/>

  <rect x="76" y="230" width="188" height="30" rx="4" fill="none" stroke="#1E40AF" stroke-width="1.5"/>
  <text x="170" y="250" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1E40AF">ゴールを問い直す</text>

  <text x="170" y="288" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">期限は、作業ではなくゴールに効かせる</text>
  <text x="170" y="310" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9CA3AF">延ばすのは期限ではなく、次の仮説</text>
</svg>
```

<!--takeaway-->
関連: [[仮のゴール]] / [[patterns-agent/予算で問い直す|予算で問い直す]]

---

## 外れを棚に残す
<!--id:外れを棚に残す-->
<!--pattern-->
### 状況
採らなかった案や、うまくいかなかった試みを、その場で捨てている。

### 問題
外れた理由は、次にゴールが変わったとき効いてくる。
消してしまうと、同じ道を同じ人がもう一度歩く。
拾い直せないと、ゴールを大胆に捨てる判断もできなくなる。

### 解決
**やめた案とやめた理由を、順番の付いた棚に残す。**
棚から拾い直せることが、ゴールを捨てられる条件になる。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <text x="82" y="30" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9CA3AF">捨てる</text>
  <text x="248" y="30" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#1E40AF">棚に残す</text>
  <line x1="164" y1="44" x2="164" y2="248" stroke="#E2E8F0" stroke-width="1"/>

  <rect x="44" y="52" width="76" height="26" rx="3" fill="none" stroke="#9CA3AF" stroke-width="1.5"/>
  <text x="82" y="70" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">外れた案</text>
  <line x1="82" y1="84" x2="82" y2="106" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="4 3"/>
  <line x1="70" y1="110" x2="94" y2="134" stroke="#9CA3AF" stroke-width="2"/>
  <line x1="94" y1="110" x2="70" y2="134" stroke="#9CA3AF" stroke-width="2"/>

  <text x="82" y="176" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">同じ道を</text>
  <text x="82" y="196" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">もう一度歩く</text>
  <path d="M52 214 a30 18 0 1 0 60 0 a30 18 0 1 0 -60 0" fill="none" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="5 4"/>
  <path d="M112 214 l-8 -6 l0 12 z" fill="#9CA3AF"/>

  <rect x="196" y="52" width="112" height="26" rx="3" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <text x="252" y="70" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#4B5563">案 A とやめた理由</text>
  <rect x="196" y="84" width="112" height="26" rx="3" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <text x="252" y="102" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#4B5563">案 B とやめた理由</text>
  <rect x="196" y="116" width="112" height="26" rx="3" fill="#F1F5F9" stroke="#1E40AF" stroke-width="2"/>
  <text x="252" y="134" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1E40AF">案 C とやめた理由</text>

  <line x1="188" y1="129" x2="188" y2="184" stroke="#1E40AF" stroke-width="1.5"/>
  <line x1="188" y1="129" x2="194" y2="129" stroke="#1E40AF" stroke-width="1.5"/>
  <line x1="188" y1="184" x2="216" y2="184" stroke="#1E40AF" stroke-width="1.5"/>
  <path d="M218 184 l-9 -5 l0 10 z" fill="#1E40AF"/>

  <rect x="222" y="168" width="88" height="32" rx="4" fill="none" stroke="#1E40AF" stroke-width="1.5"/>
  <text x="266" y="188" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1E40AF">次のゴール</text>
  <text x="252" y="222" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1E40AF">拾い直せる</text>

  <text x="170" y="276" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">外れは、次のゴールから見れば材料</text>
  <text x="170" y="300" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9CA3AF">残すのは案そのものと、やめた理由</text>
</svg>
```

<!--takeaway-->
関連: [[仮のゴール]] / [[patterns-agent/失敗も残す|失敗も残す]] / [[patterns-llm/追記で残す|追記で残す]]

---

## 分からない順に取る
<!--id:分からない順に取る-->
<!--pattern-->
### 状況
次にやることを、価値の見積もりが大きい順に並べている。

### 問題
ゴールがまだ仮説なら、その価値の見積もりも仮説の上に乗っている。
結果が読めている項目をいくら積んでも、読めていた分しか分からない。
ゴールは動かないまま、消化だけが進む。

### 解決
**結果がどちらに転んでも次の判断が変わる項目から取る。**
確実にできる項目は、分からない項目の後ろに置く。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <text x="82" y="30" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9CA3AF">結果が読める項目</text>
  <text x="250" y="30" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#1E40AF">結果が読めない項目</text>
  <line x1="166" y1="44" x2="166" y2="244" stroke="#E2E8F0" stroke-width="1"/>

  <rect x="38" y="54" width="88" height="30" rx="4" fill="none" stroke="#9CA3AF" stroke-width="1.5"/>
  <text x="82" y="74" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">やってみる</text>
  <line x1="82" y1="88" x2="82" y2="112" stroke="#9CA3AF" stroke-width="1.5"/>
  <path d="M82 114 l-5 -9 l10 0 z" fill="#9CA3AF"/>
  <rect x="38" y="120" width="88" height="30" rx="4" fill="none" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="5 3"/>
  <text x="82" y="140" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">思ったとおり</text>

  <line x1="82" y1="156" x2="82" y2="180" stroke="#9CA3AF" stroke-width="1.5"/>
  <path d="M82 182 l-5 -9 l10 0 z" fill="#9CA3AF"/>
  <text x="82" y="202" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">ゴールは同じ</text>
  <line x1="46" y1="214" x2="118" y2="214" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="4 4"/>

  <rect x="206" y="54" width="88" height="30" rx="4" fill="#F1F5F9" stroke="#1E40AF" stroke-width="2"/>
  <text x="250" y="74" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1E40AF">やってみる</text>

  <line x1="250" y1="88" x2="212" y2="116" stroke="#4B5563" stroke-width="1.5"/>
  <line x1="250" y1="88" x2="288" y2="116" stroke="#4B5563" stroke-width="1.5"/>
  <path d="M210 118 l3 -10 l7 7 z" fill="#4B5563"/>
  <path d="M290 118 l-3 -10 l-7 7 z" fill="#4B5563"/>

  <rect x="180" y="122" width="62" height="28" rx="4" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <text x="211" y="141" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#4B5563">通った</text>
  <rect x="258" y="122" width="62" height="28" rx="4" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <text x="289" y="141" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#4B5563">通らない</text>

  <line x1="211" y1="156" x2="211" y2="180" stroke="#1E40AF" stroke-width="1.5"/>
  <path d="M211 182 l-5 -9 l10 0 z" fill="#1E40AF"/>
  <line x1="289" y1="156" x2="289" y2="180" stroke="#1E40AF" stroke-width="1.5"/>
  <path d="M289 182 l-5 -9 l10 0 z" fill="#1E40AF"/>

  <rect x="180" y="188" width="62" height="28" rx="4" fill="none" stroke="#1E40AF" stroke-width="1.5"/>
  <text x="211" y="207" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1E40AF">ゴール D</text>
  <rect x="258" y="188" width="62" height="28" rx="4" fill="none" stroke="#1E40AF" stroke-width="1.5"/>
  <text x="289" y="207" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1E40AF">ゴール E</text>

  <text x="170" y="272" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">どちらに転んでも次が変わる項目を先に</text>
  <text x="170" y="296" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9CA3AF">読めていた分しか、分からない</text>
</svg>
```

<!--takeaway-->
関連: [[動くものが問う]] / [[patterns-agent/伸びしろで選ぶ|伸びしろで選ぶ]]

---

## やり方を型にする
<!--id:やり方を型にする-->
<!--pattern-->
### 状況
うまくいったやり方が、その回の記憶として個人に残っている。

### 問題
ゴールが変わるたびに、手段を毎回ゼロから組み直すことになる。
試行錯誤の速さは、手元にある手段の数で決まる。
在庫が増えないチームは、いつまでも同じ距離しか進めない。

### 解決
**通ったやり方に名前を付け、誰でも呼べる形にして残す。**
振り返りの成果物を感想ではなく、次から使える手順にする。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <text x="30" y="30" font-family="sans-serif" font-size="13" fill="#9CA3AF">毎回ゼロから組む</text>

  <rect x="30" y="44" width="26" height="20" rx="2" fill="none" stroke="#9CA3AF" stroke-width="1.5"/>
  <rect x="62" y="44" width="26" height="20" rx="2" fill="none" stroke="#9CA3AF" stroke-width="1.5"/>
  <rect x="94" y="44" width="26" height="20" rx="2" fill="none" stroke="#9CA3AF" stroke-width="1.5"/>
  <rect x="126" y="44" width="26" height="20" rx="2" fill="none" stroke="#9CA3AF" stroke-width="1.5"/>
  <text x="166" y="59" font-family="sans-serif" font-size="12" fill="#9CA3AF">1回目</text>

  <rect x="30" y="72" width="26" height="20" rx="2" fill="none" stroke="#9CA3AF" stroke-width="1.5"/>
  <rect x="62" y="72" width="26" height="20" rx="2" fill="none" stroke="#9CA3AF" stroke-width="1.5"/>
  <rect x="94" y="72" width="26" height="20" rx="2" fill="none" stroke="#9CA3AF" stroke-width="1.5"/>
  <rect x="126" y="72" width="26" height="20" rx="2" fill="none" stroke="#9CA3AF" stroke-width="1.5"/>
  <text x="166" y="87" font-family="sans-serif" font-size="12" fill="#9CA3AF">2回目</text>

  <rect x="30" y="100" width="26" height="20" rx="2" fill="none" stroke="#9CA3AF" stroke-width="1.5"/>
  <rect x="62" y="100" width="26" height="20" rx="2" fill="none" stroke="#9CA3AF" stroke-width="1.5"/>
  <rect x="94" y="100" width="26" height="20" rx="2" fill="none" stroke="#9CA3AF" stroke-width="1.5"/>
  <rect x="126" y="100" width="26" height="20" rx="2" fill="none" stroke="#9CA3AF" stroke-width="1.5"/>
  <text x="166" y="115" font-family="sans-serif" font-size="12" fill="#9CA3AF">3回目</text>

  <line x1="30" y1="140" x2="310" y2="140" stroke="#E2E8F0" stroke-width="1"/>

  <text x="30" y="168" font-family="sans-serif" font-size="13" fill="#1E40AF">型にして呼ぶ</text>

  <rect x="30" y="182" width="26" height="20" rx="2" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <rect x="62" y="182" width="26" height="20" rx="2" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <rect x="94" y="182" width="26" height="20" rx="2" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <rect x="126" y="182" width="26" height="20" rx="2" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <text x="166" y="197" font-family="sans-serif" font-size="12" fill="#4B5563">1回目</text>

  <line x1="91" y1="206" x2="91" y2="222" stroke="#1E40AF" stroke-width="1.5"/>
  <path d="M91 224 l-5 -9 l10 0 z" fill="#1E40AF"/>
  <rect x="34" y="228" width="114" height="28" rx="4" fill="#F1F5F9" stroke="#1E40AF" stroke-width="2"/>
  <text x="91" y="247" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1E40AF">名前の付いた手順</text>

  <line x1="154" y1="242" x2="196" y2="242" stroke="#1E40AF" stroke-width="1.5"/>
  <path d="M198 242 l-9 -5 l0 10 z" fill="#1E40AF"/>

  <rect x="204" y="216" width="34" height="20" rx="2" fill="#F1F5F9" stroke="#1E40AF" stroke-width="1.5"/>
  <text x="248" y="231" font-family="sans-serif" font-size="12" fill="#1E40AF">2回目</text>
  <rect x="204" y="244" width="34" height="20" rx="2" fill="#F1F5F9" stroke="#1E40AF" stroke-width="1.5"/>
  <text x="248" y="259" font-family="sans-serif" font-size="12" fill="#1E40AF">3回目</text>

  <text x="170" y="292" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">手段の在庫が、試行錯誤の速さを決める</text>
  <text x="170" y="314" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9CA3AF">振り返りの成果物は、感想ではなく手順</text>
</svg>
```

<!--takeaway-->
関連: [[分からない順に取る]] / [[patterns-agent/できたことを部品に|できたことを部品に]]
