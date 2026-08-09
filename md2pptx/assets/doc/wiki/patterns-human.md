# Wiki が育つパターン

人が書き、AI が手入れする。育つ知識の作り方

---

## 読み方
<!--id:読み方-->
<!--agenda-->
順番に読んでもよいし、リンクを辿ってもよい

### 置く: [[種ノート]]
### 伸ばす: [[育つ見出し]]
### 割る: [[一枚一義]]
### 繋ぐ: [[つなぎ直し]]
### 索引: [[索引は後から]]
### 手入れ: [[剪定]]
### 束ねる: [[収穫]]
### AI: [[patterns-llm/LLM-Wiki|LLM Wiki]]
### 探索: [[patterns-scrum/探し方|ゴールは後から決まる]]

---

## 種ノート
<!--id:種ノート-->
<!--pattern-->
### 状況
思いついたことを、後で書こうと思って書かないまま忘れる。

### 問題
「ちゃんと書ける状態」を待つと、永遠にその状態は来ない。
整った文章を書く体力と、思いつきを捕まえる速度は両立しない。

### 解決
**一文でよいから置く。** 見出しだけでもよい。
育てるのは後の自分に任せる。育て方は [[育つ見出し]]。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <text x="30" y="34" font-family="sans-serif" font-size="13" fill="#9CA3AF">いま</text>
  <text x="285" y="34" font-family="sans-serif" font-size="13" fill="#9CA3AF">あとで</text>
  <line x1="30" y1="46" x2="310" y2="46" stroke="#9CA3AF" stroke-width="1"/>
  <path d="M310 46 l-8 -4 l0 8 z" fill="#9CA3AF"/>

  <rect x="30" y="80" width="80" height="26" rx="4" fill="none" stroke="#1E40AF" stroke-width="1.5"/>
  <line x1="42" y1="93" x2="98" y2="93" stroke="#1E40AF" stroke-width="1.5"/>
  <text x="70" y="128" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#1E40AF">一文</text>

  <rect x="130" y="80" width="80" height="74" rx="4" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <line x1="142" y1="93" x2="198" y2="93" stroke="#4B5563" stroke-width="1.5"/>
  <line x1="142" y1="112" x2="186" y2="112" stroke="#9CA3AF" stroke-width="1"/>
  <line x1="142" y1="128" x2="192" y2="128" stroke="#9CA3AF" stroke-width="1"/>

  <rect x="230" y="80" width="80" height="140" rx="4" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <line x1="242" y1="93" x2="298" y2="93" stroke="#4B5563" stroke-width="1.5"/>
  <line x1="242" y1="112" x2="286" y2="112" stroke="#9CA3AF" stroke-width="1"/>
  <line x1="242" y1="128" x2="292" y2="128" stroke="#9CA3AF" stroke-width="1"/>
  <line x1="242" y1="144" x2="280" y2="144" stroke="#9CA3AF" stroke-width="1"/>
  <line x1="242" y1="160" x2="290" y2="160" stroke="#9CA3AF" stroke-width="1"/>
  <line x1="242" y1="176" x2="272" y2="176" stroke="#9CA3AF" stroke-width="1"/>

  <text x="170" y="272" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">置いた一文だけが、後から育つ</text>
  <text x="170" y="296" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9CA3AF">置かなかった思いつきは残らない</text>
</svg>
```

<!--takeaway-->
関連: [[一枚一義]] / [[つなぎ直し]]

---

## 育つ見出し
<!--id:育つ見出し-->
<!--pattern-->
### 状況
[[種ノート]] が増えてきたが、どれも数行のまま止まっている。

### 問題
本文を厚くしようとすると手が止まる。書くことが無いのではなく、
何を書く場所なのかが決まっていない。

### 解決
**本文より先に見出しを増やす。** 見出しは「ここに何を書くか」の宣言で、
書く前に構造だけ育てられる。見出しが3つを超えたら [[一枚一義]] の出番。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <text x="30" y="34" font-family="sans-serif" font-size="13" fill="#1E40AF">見出し（先）</text>
  <text x="200" y="34" font-family="sans-serif" font-size="13" fill="#9CA3AF">本文（後）</text>

  <line x1="30" y1="70" x2="150" y2="70" stroke="#1E40AF" stroke-width="2.5"/>
  <line x1="200" y1="70" x2="290" y2="70" stroke="#4B5563" stroke-width="1"/>
  <line x1="200" y1="86" x2="270" y2="86" stroke="#4B5563" stroke-width="1"/>

  <line x1="30" y1="126" x2="150" y2="126" stroke="#1E40AF" stroke-width="2.5"/>
  <line x1="200" y1="126" x2="282" y2="126" stroke="#4B5563" stroke-width="1"/>

  <line x1="30" y1="182" x2="150" y2="182" stroke="#1E40AF" stroke-width="2.5"/>
  <line x1="200" y1="182" x2="290" y2="182" stroke="#9CA3AF" stroke-width="1" stroke-dasharray="4 4"/>

  <line x1="30" y1="222" x2="150" y2="222" stroke="#1E40AF" stroke-width="2.5"/>
  <line x1="200" y1="222" x2="264" y2="222" stroke="#9CA3AF" stroke-width="1" stroke-dasharray="4 4"/>

  <text x="170" y="272" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">空の見出しは「書く場所」の宣言</text>
  <text x="170" y="296" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9CA3AF">構造だけ先に育つ</text>
</svg>
```

<!--takeaway-->
関連: [[種ノート]] / [[一枚一義]]

---

## 一枚一義
<!--id:一枚一義-->
<!--pattern-->
### 状況
1枚のノートに話題が2つ以上混ざり、どこからも参照しにくくなっている。

### 問題
「あの話」を指したいのに、リンク先の半分は関係ない話。
参照されないノートは、二度と読み返されない。

### 解決
**1枚には1つのことだけ書く。** 混ざったら割る。
割ったノート同士は必ず [[つなぎ直し]] で繋ぐ。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <rect x="24" y="70" width="104" height="120" rx="5" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <circle cx="60" cy="108" r="16" fill="none" stroke="#1E40AF" stroke-width="1.5"/>
  <circle cx="96" cy="152" r="16" fill="none" stroke="#9CA3AF" stroke-width="1.5"/>
  <text x="76" y="212" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9CA3AF">混ざった1枚</text>

  <line x1="140" y1="130" x2="188" y2="130" stroke="#4B5563" stroke-width="1.5"/>
  <path d="M190 130 l-9 -5 l0 10 z" fill="#4B5563"/>

  <rect x="204" y="62" width="98" height="66" rx="5" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <circle cx="253" cy="95" r="16" fill="none" stroke="#1E40AF" stroke-width="1.5"/>

  <rect x="204" y="158" width="98" height="66" rx="5" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <circle cx="253" cy="191" r="16" fill="none" stroke="#9CA3AF" stroke-width="1.5"/>

  <line x1="253" y1="128" x2="253" y2="158" stroke="#1E40AF" stroke-width="1.5"/>
  <text x="253" y="248" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#1E40AF">割って、繋ぐ</text>

  <text x="170" y="292" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">1枚に1つなら、名指しで指せる</text>
</svg>
```

<!--takeaway-->
関連: [[育つ見出し]] / [[つなぎ直し]]

---

## つなぎ直し
<!--id:つなぎ直し-->
<!--pattern-->
### 状況
ノートは増えたが、どれも孤立していて検索でしか辿り着けない。

### 問題
検索は「探す言葉を知っている」ときしか効かない。
忘れた知識は、忘れているがゆえに検索できない。

### 解決
**新しいノートは、必ず既存の1枚に繋いでから閉じる。**
繋ぎ先が思いつかないなら、それはまだ [[一枚一義]] になっていない兆候。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <line x1="86" y1="90" x2="164" y2="66" stroke="#9CA3AF" stroke-width="1"/>
  <line x1="86" y1="90" x2="120" y2="164" stroke="#9CA3AF" stroke-width="1"/>
  <line x1="164" y1="66" x2="222" y2="126" stroke="#9CA3AF" stroke-width="1"/>
  <line x1="120" y1="164" x2="222" y2="126" stroke="#9CA3AF" stroke-width="1"/>

  <circle cx="86" cy="90" r="15" fill="#FFFFFF" stroke="#4B5563" stroke-width="1.5"/>
  <circle cx="164" cy="66" r="15" fill="#FFFFFF" stroke="#4B5563" stroke-width="1.5"/>
  <circle cx="120" cy="164" r="15" fill="#FFFFFF" stroke="#4B5563" stroke-width="1.5"/>
  <circle cx="222" cy="126" r="15" fill="#FFFFFF" stroke="#4B5563" stroke-width="1.5"/>

  <line x1="236" y1="138" x2="266" y2="182" stroke="#1E40AF" stroke-width="2"/>
  <circle cx="276" cy="196" r="15" fill="#FFFFFF" stroke="#1E40AF" stroke-width="2"/>
  <text x="276" y="230" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#1E40AF">新しい1枚</text>

  <circle cx="56" cy="212" r="15" fill="#FFFFFF" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="4 3"/>
  <line x1="46" y1="202" x2="66" y2="222" stroke="#9CA3AF" stroke-width="1.5"/>
  <line x1="66" y1="202" x2="46" y2="222" stroke="#9CA3AF" stroke-width="1.5"/>
  <text x="56" y="248" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9CA3AF">孤立</text>

  <text x="170" y="292" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">繋いでから閉じる。繋がらない1枚は残さない</text>
</svg>
```

<!--takeaway-->
関連: [[索引は後から]] / [[剪定]]

---

## 索引は後から
<!--id:索引は後から-->
<!--pattern-->
### 状況
書き始める前に、きれいなカテゴリ体系を設計したくなる。

### 問題
中身が無いうちに作った分類は、必ず外れる。
そして一度作った分類は、外れていても捨てにくい。

### 解決
**索引はリンクが溜まってから、事後に作る。**
どこへ繋がるかは [[つなぎ直し]] の結果が教えてくれる。
実際によく通る道だけを索引にする。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <text x="30" y="36" font-family="sans-serif" font-size="13" fill="#9CA3AF">先に作った分類</text>
  <rect x="30" y="50" width="70" height="24" rx="3" fill="none" stroke="#9CA3AF" stroke-width="1" stroke-dasharray="4 3"/>
  <rect x="112" y="50" width="70" height="24" rx="3" fill="none" stroke="#9CA3AF" stroke-width="1" stroke-dasharray="4 3"/>
  <rect x="194" y="50" width="70" height="24" rx="3" fill="none" stroke="#9CA3AF" stroke-width="1" stroke-dasharray="4 3"/>
  <line x1="278" y1="46" x2="308" y2="78" stroke="#9CA3AF" stroke-width="1.5"/>
  <line x1="308" y1="46" x2="278" y2="78" stroke="#9CA3AF" stroke-width="1.5"/>

  <line x1="60" y1="150" x2="140" y2="132" stroke="#9CA3AF" stroke-width="1"/>
  <line x1="140" y1="132" x2="212" y2="158" stroke="#4B5563" stroke-width="2.5"/>
  <line x1="60" y1="150" x2="118" y2="196" stroke="#4B5563" stroke-width="2.5"/>
  <line x1="118" y1="196" x2="212" y2="158" stroke="#4B5563" stroke-width="2.5"/>
  <line x1="212" y1="158" x2="270" y2="200" stroke="#9CA3AF" stroke-width="1"/>
  <circle cx="60" cy="150" r="10" fill="#FFFFFF" stroke="#4B5563" stroke-width="1.5"/>
  <circle cx="140" cy="132" r="10" fill="#FFFFFF" stroke="#4B5563" stroke-width="1.5"/>
  <circle cx="118" cy="196" r="10" fill="#FFFFFF" stroke="#4B5563" stroke-width="1.5"/>
  <circle cx="212" cy="158" r="10" fill="#FFFFFF" stroke="#4B5563" stroke-width="1.5"/>
  <circle cx="270" cy="200" r="10" fill="#FFFFFF" stroke="#4B5563" stroke-width="1.5"/>
  <text x="170" y="236" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#4B5563">よく通る道が太くなる</text>

  <rect x="86" y="252" width="168" height="26" rx="4" fill="none" stroke="#1E40AF" stroke-width="1.5"/>
  <text x="170" y="270" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#1E40AF">後から作る索引</text>
  <text x="170" y="304" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">道ができてから、名前を付ける</text>
</svg>
```

<!--takeaway-->
関連: [[つなぎ直し]] / [[収穫]]

---

## 剪定
<!--id:剪定-->
<!--pattern-->
### 状況
古いノートが残り続け、どれが今も有効なのか分からない。

### 問題
消すのが惜しくて全部残すと、全部が信用できなくなる。
量は、それ自体が読みにくさになる。

### 解決
**間違っていたノートは消さず、間違っていたと書き足す。**
消すのは重複だけ。判断の履歴は [[収穫]] の材料になる。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <text x="30" y="34" font-family="sans-serif" font-size="13" fill="#1E40AF">間違いは、書き足す</text>
  <rect x="30" y="48" width="180" height="52" rx="4" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <line x1="44" y1="68" x2="196" y2="68" stroke="#9CA3AF" stroke-width="1"/>
  <line x1="44" y1="84" x2="170" y2="84" stroke="#9CA3AF" stroke-width="1"/>
  <rect x="30" y="104" width="180" height="34" rx="4" fill="none" stroke="#1E40AF" stroke-width="1.5" stroke-dasharray="5 3"/>
  <text x="120" y="126" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#1E40AF">これは違っていた</text>
  <text x="248" y="98" font-family="sans-serif" font-size="13" fill="#4B5563">残る</text>

  <line x1="30" y1="170" x2="310" y2="170" stroke="#E2E8F0" stroke-width="1"/>

  <text x="30" y="200" font-family="sans-serif" font-size="13" fill="#9CA3AF">消すのは重複だけ</text>
  <rect x="30" y="214" width="112" height="34" rx="4" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <line x1="44" y1="234" x2="128" y2="234" stroke="#9CA3AF" stroke-width="1"/>
  <rect x="158" y="214" width="112" height="34" rx="4" fill="none" stroke="#9CA3AF" stroke-width="1" stroke-dasharray="4 3"/>
  <line x1="164" y1="210" x2="264" y2="252" stroke="#9CA3AF" stroke-width="1.5"/>
  <line x1="264" y1="210" x2="164" y2="252" stroke="#9CA3AF" stroke-width="1.5"/>

  <text x="170" y="292" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">履歴を消さずに、量だけ減らす</text>
</svg>
```

<!--takeaway-->
関連: [[つなぎ直し]] / [[収穫]]

---

## 収穫
<!--id:収穫-->
<!--pattern-->
### 状況
Wiki は育ったが、他人に見せられる形になっていない。

### 問題
育てることと、届けることは別の作業。
リンクで繋がった網は、読者にとっては入口が無い。

### 解決
**よく参照されたノートを並べ替えて、1本の道にする。**
それがこのスライドの形。網から道を切り出すのが収穫で、
網そのものは [[索引は後から]] のまま残しておく。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <text x="30" y="34" font-family="sans-serif" font-size="13" fill="#9CA3AF">網（入口が無い）</text>
  <line x1="60" y1="86" x2="128" y2="62" stroke="#9CA3AF" stroke-width="1"/>
  <line x1="60" y1="86" x2="104" y2="132" stroke="#1E40AF" stroke-width="2.5"/>
  <line x1="128" y1="62" x2="196" y2="104" stroke="#9CA3AF" stroke-width="1"/>
  <line x1="104" y1="132" x2="196" y2="104" stroke="#1E40AF" stroke-width="2.5"/>
  <line x1="196" y1="104" x2="262" y2="140" stroke="#1E40AF" stroke-width="2.5"/>
  <line x1="104" y1="132" x2="180" y2="150" stroke="#9CA3AF" stroke-width="1"/>
  <circle cx="60" cy="86" r="11" fill="#FFFFFF" stroke="#1E40AF" stroke-width="2"/>
  <circle cx="128" cy="62" r="11" fill="#FFFFFF" stroke="#9CA3AF" stroke-width="1.5"/>
  <circle cx="104" cy="132" r="11" fill="#FFFFFF" stroke="#1E40AF" stroke-width="2"/>
  <circle cx="196" cy="104" r="11" fill="#FFFFFF" stroke="#1E40AF" stroke-width="2"/>
  <circle cx="180" cy="150" r="11" fill="#FFFFFF" stroke="#9CA3AF" stroke-width="1.5"/>
  <circle cx="262" cy="140" r="11" fill="#FFFFFF" stroke="#1E40AF" stroke-width="2"/>

  <line x1="170" y1="182" x2="170" y2="212" stroke="#4B5563" stroke-width="1.5"/>
  <path d="M170 214 l-5 -9 l10 0 z" fill="#4B5563"/>
  <text x="186" y="204" font-family="sans-serif" font-size="13" fill="#4B5563">切り出す</text>

  <circle cx="52" cy="248" r="11" fill="#FFFFFF" stroke="#1E40AF" stroke-width="2"/>
  <line x1="63" y1="248" x2="87" y2="248" stroke="#1E40AF" stroke-width="2"/>
  <circle cx="98" cy="248" r="11" fill="#FFFFFF" stroke="#1E40AF" stroke-width="2"/>
  <line x1="109" y1="248" x2="133" y2="248" stroke="#1E40AF" stroke-width="2"/>
  <circle cx="144" cy="248" r="11" fill="#FFFFFF" stroke="#1E40AF" stroke-width="2"/>
  <line x1="155" y1="248" x2="179" y2="248" stroke="#1E40AF" stroke-width="2"/>
  <circle cx="190" cy="248" r="11" fill="#FFFFFF" stroke="#1E40AF" stroke-width="2"/>
  <text x="240" y="253" font-family="sans-serif" font-size="13" fill="#1E40AF">1本の道</text>

  <text x="170" y="296" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">網は残したまま、道だけを配る</text>
</svg>
```

<!--takeaway-->
関連: [[剪定]] / [[patterns-llm/LLM-Wiki|LLM Wiki]]
