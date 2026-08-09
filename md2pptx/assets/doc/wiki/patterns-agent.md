# エージェントがゴールを見つける

ゴールも手段も事後に見つける、自律エージェントのパターン

---

## 組み立て方
<!--id:組み立て方-->
<!--agenda-->
人が渡すのは方向と境界だけ。ゴールは走らせてから決まる

### 立てる: [[ゴールを立てさせる]]
### 確かめる: [[実行が判定する]]
### 判定: [[検査を先に書く]]
### 区切る: [[予算で問い直す]]
### 残す: [[失敗も残す]]
### 選ぶ: [[伸びしろで選ぶ]]
### 貯める: [[できたことを部品に]]
### 対応: [[対応表]]
### 戻る: [[patterns-scrum/探し方|スクラムのパターン]]

---

## ゴールを立てさせる
<!--id:ゴールを立てさせる-->
<!--pattern-->
### 状況
達成してほしいことを、全部プロンプトに書き切ろうとする。

### 問題
書き切れるゴールなら、エージェントは要らない。
書き切れないゴールを固定すると、状況が変わっても的の外れた探索を続ける。
何を狙うべきかは、その場を見た側にしか分からない。

### 解決
**人は方向と境界だけを渡し、具体的なゴールはエージェントに立てさせる。**
立てたゴールは仮のものとして扱い、変えたときは申告させる。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <text x="30" y="30" font-family="sans-serif" font-size="13" fill="#9CA3AF">書き切ろうとする</text>

  <rect x="30" y="44" width="128" height="52" rx="4" fill="none" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="5 3"/>
  <line x1="42" y1="60" x2="146" y2="60" stroke="#9CA3AF" stroke-width="1"/>
  <line x1="42" y1="72" x2="138" y2="72" stroke="#9CA3AF" stroke-width="1"/>
  <line x1="42" y1="84" x2="128" y2="84" stroke="#9CA3AF" stroke-width="1"/>

  <line x1="170" y1="70" x2="196" y2="70" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="4 4"/>
  <text x="206" y="66" font-family="sans-serif" font-size="12" fill="#9CA3AF">状況が変わると</text>
  <text x="206" y="84" font-family="sans-serif" font-size="12" fill="#9CA3AF">的が外れたまま</text>

  <line x1="30" y1="116" x2="310" y2="116" stroke="#E2E8F0" stroke-width="1"/>

  <text x="30" y="142" font-family="sans-serif" font-size="13" fill="#1E40AF">人が渡すもの</text>

  <path d="M46 250 L150 166 L262 250 Z" fill="#F1F5F9" stroke="#4B5563" stroke-width="1.5"/>
  <line x1="150" y1="166" x2="150" y2="250" stroke="#4B5563" stroke-width="1.5" stroke-dasharray="5 4"/>
  <text x="160" y="162" font-family="sans-serif" font-size="12" fill="#4B5563">方向</text>
  <text x="150" y="268" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#4B5563">人が引く境界</text>

  <circle cx="114" cy="222" r="7" fill="#FFFFFF" stroke="#1E40AF" stroke-width="2"/>
  <circle cx="176" cy="204" r="7" fill="#FFFFFF" stroke="#1E40AF" stroke-width="2"/>
  <circle cx="204" cy="234" r="7" fill="#FFFFFF" stroke="#1E40AF" stroke-width="2"/>
  <circle cx="86" cy="240" r="7" fill="#FFFFFF" stroke="#1E40AF" stroke-width="2"/>

  <text x="286" y="200" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1E40AF">立てた</text>
  <text x="286" y="218" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1E40AF">ゴール</text>
  <line x1="258" y1="212" x2="216" y2="228" stroke="#1E40AF" stroke-width="1"/>

  <text x="170" y="296" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">書き切れるなら、エージェントは要らない</text>
</svg>
```

<!--takeaway-->
関連: [[伸びしろで選ぶ]] / [[patterns-scrum/仮のゴール|仮のゴール]] / [[patterns-llm/人が承認する|人が承認する]]

---

## 実行が判定する
<!--id:実行が判定する-->
<!--pattern-->
### 状況
エージェントが自分の出力を自分で評価し、達成したと判断している。

### 問題
自己評価は、うまく言い切る能力を測っているだけになる。
誤りを達成として通すと、その上に積まれた探索がまるごと無駄になる。
気づくのは、ずっと後の失敗が返ってきたとき。

### 解決
**達成したかどうかは、実際に走らせた結果で決める。**
走らせて確かめられない主張は、ゴールに使わない。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <text x="30" y="30" font-family="sans-serif" font-size="13" fill="#9CA3AF">自分で採点する</text>

  <rect x="30" y="46" width="72" height="34" rx="4" fill="none" stroke="#9CA3AF" stroke-width="1.5"/>
  <text x="66" y="68" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">出力</text>
  <path d="M102 76 a26 20 0 1 1 0 -22" fill="none" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="4 3"/>
  <path d="M100 52 l6 -2 l-1 8 z" fill="#9CA3AF"/>
  <text x="150" y="70" font-family="sans-serif" font-size="12" fill="#9CA3AF">できました</text>

  <line x1="230" y1="63" x2="252" y2="63" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="4 3"/>
  <circle cx="272" cy="63" r="13" fill="none" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="4 3"/>
  <text x="272" y="69" text-anchor="middle" font-family="sans-serif" font-size="15" fill="#9CA3AF">?</text>

  <text x="170" y="106" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">上手く言えたことしか測れない</text>

  <line x1="30" y1="128" x2="310" y2="128" stroke="#E2E8F0" stroke-width="1"/>

  <text x="30" y="156" font-family="sans-serif" font-size="13" fill="#1E40AF">走らせて確かめる</text>

  <rect x="30" y="172" width="66" height="34" rx="4" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <text x="63" y="194" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#4B5563">出力</text>
  <line x1="96" y1="189" x2="118" y2="189" stroke="#4B5563" stroke-width="1.5"/>
  <path d="M120 189 l-9 -5 l0 10 z" fill="#4B5563"/>

  <rect x="124" y="172" width="82" height="34" rx="4" fill="#F1F5F9" stroke="#1E40AF" stroke-width="2"/>
  <text x="165" y="194" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1E40AF">実行する</text>
  <line x1="206" y1="189" x2="228" y2="189" stroke="#4B5563" stroke-width="1.5"/>
  <path d="M230 189 l-9 -5 l0 10 z" fill="#4B5563"/>

  <polyline points="240,182 248,190 264,170" fill="none" stroke="#1E40AF" stroke-width="2.5"/>
  <line x1="240" y1="200" x2="260" y2="220" stroke="#4B5563" stroke-width="2.5"/>
  <line x1="260" y1="200" x2="240" y2="220" stroke="#4B5563" stroke-width="2.5"/>

  <line x1="250" y1="228" x2="250" y2="246" stroke="#1E40AF" stroke-width="1.5"/>
  <line x1="250" y1="246" x2="70" y2="246" stroke="#1E40AF" stroke-width="1.5"/>
  <line x1="70" y1="246" x2="70" y2="212" stroke="#1E40AF" stroke-width="1.5"/>
  <path d="M70 210 l-5 9 l10 0 z" fill="#1E40AF"/>
  <text x="160" y="264" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1E40AF">結果が次の入力になる</text>

  <text x="170" y="298" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">確かめられない主張は、ゴールにしない</text>
</svg>
```

<!--takeaway-->
関連: [[検査を先に書く]] / [[できたことを部品に]] / [[patterns-scrum/動くものが問う|動くものが問う]]

---

## 検査を先に書く
<!--id:検査を先に書く-->
<!--pattern-->
### 状況
ゴールが探索の途中で変わるので、合否の基準も一緒に動いている。

### 問題
判定が動くと、どの試行が前進だったのか後から分からない。
記録は残っても、比べられない記録は選択の材料にならない。

### 解決
**ゴールを立てたら、まず検査を書き、それから手段を探す。**
検査はエージェントの外に置き、探索の最中は書き換えさせない。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <text x="30" y="30" font-family="sans-serif" font-size="13" fill="#9CA3AF">手段を探してから決める</text>

  <rect x="30" y="46" width="62" height="30" rx="4" fill="none" stroke="#9CA3AF" stroke-width="1.5"/>
  <text x="61" y="66" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">ゴール</text>
  <line x1="92" y1="61" x2="110" y2="61" stroke="#9CA3AF" stroke-width="1.5"/>
  <path d="M112 61 l-9 -5 l0 10 z" fill="#9CA3AF"/>
  <rect x="116" y="46" width="62" height="30" rx="4" fill="none" stroke="#9CA3AF" stroke-width="1.5"/>
  <text x="147" y="66" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">探索</text>
  <line x1="178" y1="61" x2="196" y2="61" stroke="#9CA3AF" stroke-width="1.5"/>
  <path d="M198 61 l-9 -5 l0 10 z" fill="#9CA3AF"/>
  <rect x="202" y="46" width="62" height="30" rx="4" fill="none" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="5 3"/>
  <text x="233" y="66" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">判定</text>

  <text x="30" y="98" font-family="sans-serif" font-size="12" fill="#9CA3AF">試行 1</text>
  <line x1="80" y1="94" x2="130" y2="94" stroke="#9CA3AF" stroke-width="1.5"/>
  <text x="30" y="116" font-family="sans-serif" font-size="12" fill="#9CA3AF">試行 2</text>
  <line x1="80" y1="112" x2="164" y2="112" stroke="#9CA3AF" stroke-width="1.5"/>
  <text x="192" y="108" font-family="sans-serif" font-size="12" fill="#9CA3AF">比べられない</text>

  <line x1="30" y1="138" x2="310" y2="138" stroke="#E2E8F0" stroke-width="1"/>

  <text x="30" y="166" font-family="sans-serif" font-size="13" fill="#1E40AF">検査を書いてから探す</text>

  <rect x="30" y="182" width="62" height="30" rx="4" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <text x="61" y="202" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#4B5563">ゴール</text>
  <line x1="92" y1="197" x2="110" y2="197" stroke="#4B5563" stroke-width="1.5"/>
  <path d="M112 197 l-9 -5 l0 10 z" fill="#4B5563"/>
  <rect x="116" y="182" width="62" height="30" rx="4" fill="#F1F5F9" stroke="#1E40AF" stroke-width="2"/>
  <text x="147" y="202" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1E40AF">検査</text>
  <line x1="178" y1="197" x2="196" y2="197" stroke="#4B5563" stroke-width="1.5"/>
  <path d="M198 197 l-9 -5 l0 10 z" fill="#4B5563"/>
  <rect x="202" y="182" width="62" height="30" rx="4" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <text x="233" y="202" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#4B5563">探索</text>

  <line x1="147" y1="216" x2="147" y2="236" stroke="#1E40AF" stroke-width="1.5" stroke-dasharray="4 3"/>
  <text x="30" y="248" font-family="sans-serif" font-size="12" fill="#4B5563">試行 1</text>
  <line x1="80" y1="244" x2="147" y2="244" stroke="#4B5563" stroke-width="1.5"/>
  <line x1="240" y1="238" x2="256" y2="250" stroke="#9CA3AF" stroke-width="2"/>
  <line x1="256" y1="238" x2="240" y2="250" stroke="#9CA3AF" stroke-width="2"/>
  <text x="30" y="268" font-family="sans-serif" font-size="12" fill="#1E40AF">試行 2</text>
  <line x1="80" y1="264" x2="228" y2="264" stroke="#1E40AF" stroke-width="1.5"/>
  <polyline points="240,262 247,269 260,254" fill="none" stroke="#1E40AF" stroke-width="2"/>

  <text x="170" y="300" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">同じ物差しでだけ、前進が見える</text>
</svg>
```

<!--takeaway-->
関連: [[実行が判定する]] / [[patterns-scrum/完成を先に決める|完成を先に決める]] / [[patterns-llm/規約は走らせる|規約は走らせる]]

---

## 予算で問い直す
<!--id:予算で問い直す-->
<!--pattern-->
### 状況
見込みの無い方向に、エージェントが延々と試行を重ねている。

### 問題
自律的な探索は自分では止まらない。
止まらないループは、成果ではなく費用だけを積み上げる。
やめる判断をエージェント自身の見立てに任せると、いつも「あと一手」になる。

### 解決
**手数と費用の上限を先に決め、尽きたら手段ではなくゴールを立て直す。**
上限に届いたことは失敗の合図ではなく、問い直しの合図として扱う。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <text x="30" y="30" font-family="sans-serif" font-size="13" fill="#4B5563">予算</text>

  <rect x="30" y="42" width="280" height="26" rx="4" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <rect x="30" y="42" width="196" height="26" rx="4" fill="#F1F5F9" stroke="none"/>
  <line x1="226" y1="36" x2="226" y2="74" stroke="#1E40AF" stroke-width="2"/>
  <text x="128" y="60" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#4B5563">使った手数</text>
  <text x="268" y="60" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">残り</text>

  <line x1="46" y1="82" x2="46" y2="106" stroke="#4B5563" stroke-width="1.5"/>
  <line x1="86" y1="82" x2="86" y2="106" stroke="#4B5563" stroke-width="1.5"/>
  <line x1="126" y1="82" x2="126" y2="106" stroke="#4B5563" stroke-width="1.5"/>
  <line x1="166" y1="82" x2="166" y2="106" stroke="#4B5563" stroke-width="1.5"/>
  <line x1="206" y1="82" x2="206" y2="106" stroke="#4B5563" stroke-width="1.5"/>
  <text x="126" y="126" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#4B5563">同じゴールへの試行</text>

  <line x1="226" y1="82" x2="226" y2="150" stroke="#1E40AF" stroke-width="1.5" stroke-dasharray="4 3"/>
  <text x="248" y="120" font-family="sans-serif" font-size="12" fill="#1E40AF">上限</text>

  <line x1="226" y1="152" x2="120" y2="186" stroke="#4B5563" stroke-width="1.5"/>
  <line x1="226" y1="152" x2="248" y2="186" stroke="#4B5563" stroke-width="1.5"/>

  <rect x="34" y="192" width="146" height="34" rx="4" fill="none" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="5 3"/>
  <text x="107" y="214" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">あと一手だけ続ける</text>
  <line x1="46" y1="238" x2="66" y2="258" stroke="#9CA3AF" stroke-width="2"/>
  <line x1="66" y1="238" x2="46" y2="258" stroke="#9CA3AF" stroke-width="2"/>
  <text x="84" y="254" font-family="sans-serif" font-size="11" fill="#9CA3AF">費用だけ積む</text>

  <rect x="196" y="192" width="114" height="34" rx="4" fill="#F1F5F9" stroke="#1E40AF" stroke-width="2"/>
  <text x="253" y="214" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1E40AF">ゴールを立て直す</text>
  <text x="253" y="252" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1E40AF">別の的を狙い直す</text>

  <text x="170" y="292" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">上限は、失敗ではなく問い直しの合図</text>
</svg>
```

<!--takeaway-->
関連: [[ゴールを立てさせる]] / [[伸びしろで選ぶ]] / [[patterns-scrum/期限で問い直す|期限で問い直す]]

---

## 失敗も残す
<!--id:失敗も残す-->
<!--pattern-->
### 状況
失敗した試行を捨て、うまくいった経路だけを次に渡している。

### 問題
いまの失敗は、次のゴールから見れば途中の一歩かもしれない。
捨ててしまうと、そこから枝を伸ばす道が消える。
残った経路が一本だと、探索は最後に触った結果に引きずられる。

### 解決
**成否によらず、試行を親子の関係付きで保管する。**
次の一手は直前の結果からではなく、保管庫全体から選ぶ。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <text x="30" y="30" font-family="sans-serif" font-size="13" fill="#9CA3AF">成功だけ残す</text>

  <circle cx="46" cy="66" r="8" fill="#FFFFFF" stroke="#4B5563" stroke-width="1.5"/>
  <line x1="54" y1="66" x2="88" y2="66" stroke="#4B5563" stroke-width="1.5"/>
  <circle cx="96" cy="66" r="8" fill="#FFFFFF" stroke="#4B5563" stroke-width="1.5"/>
  <line x1="104" y1="66" x2="138" y2="66" stroke="#4B5563" stroke-width="1.5"/>
  <circle cx="146" cy="66" r="8" fill="#FFFFFF" stroke="#4B5563" stroke-width="1.5"/>

  <line x1="90" y1="86" x2="102" y2="102" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="4 3"/>
  <line x1="98" y1="98" x2="114" y2="114" stroke="#9CA3AF" stroke-width="2"/>
  <line x1="114" y1="98" x2="98" y2="114" stroke="#9CA3AF" stroke-width="2"/>
  <text x="134" y="112" font-family="sans-serif" font-size="12" fill="#9CA3AF">枝を伸ばせない</text>

  <line x1="30" y1="134" x2="310" y2="134" stroke="#E2E8F0" stroke-width="1"/>

  <text x="30" y="162" font-family="sans-serif" font-size="13" fill="#1E40AF">失敗も親子で残す</text>

  <circle cx="52" cy="216" r="9" fill="#FFFFFF" stroke="#4B5563" stroke-width="1.5"/>

  <line x1="61" y1="212" x2="106" y2="188" stroke="#4B5563" stroke-width="1.5"/>
  <line x1="61" y1="220" x2="106" y2="246" stroke="#4B5563" stroke-width="1.5"/>

  <circle cx="116" cy="184" r="9" fill="#FFFFFF" stroke="#4B5563" stroke-width="1.5"/>
  <polyline points="112,184 115,187 121,180" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <circle cx="116" cy="250" r="9" fill="#F1F5F9" stroke="#9CA3AF" stroke-width="1.5"/>
  <line x1="112" y1="246" x2="120" y2="254" stroke="#9CA3AF" stroke-width="1.5"/>
  <line x1="120" y1="246" x2="112" y2="254" stroke="#9CA3AF" stroke-width="1.5"/>

  <line x1="125" y1="182" x2="170" y2="172" stroke="#4B5563" stroke-width="1.5"/>
  <circle cx="180" cy="170" r="9" fill="#FFFFFF" stroke="#4B5563" stroke-width="1.5"/>
  <line x1="176" y1="170" x2="179" y2="173" stroke="#4B5563" stroke-width="1.5"/>
  <line x1="179" y1="173" x2="185" y2="166" stroke="#4B5563" stroke-width="1.5"/>

  <line x1="125" y1="248" x2="170" y2="234" stroke="#1E40AF" stroke-width="2"/>
  <circle cx="180" cy="231" r="10" fill="#F1F5F9" stroke="#1E40AF" stroke-width="2.5"/>
  <line x1="190" y1="228" x2="234" y2="216" stroke="#1E40AF" stroke-width="2"/>
  <circle cx="244" cy="213" r="10" fill="#F1F5F9" stroke="#1E40AF" stroke-width="2.5"/>

  <text x="252" y="250" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1E40AF">失敗から伸びた枝</text>

  <text x="170" y="288" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">次の一手は、保管庫全体から選ぶ</text>
  <text x="170" y="310" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9CA3AF">直前の結果に引きずられない</text>
</svg>
```

<!--takeaway-->
関連: [[伸びしろで選ぶ]] / [[patterns-scrum/外れを棚に残す|外れを棚に残す]] / [[patterns-llm/不変の生データ|不変の生データ]]

---

## 伸びしろで選ぶ
<!--id:伸びしろで選ぶ-->
<!--pattern-->
### 状況
次に狙うゴールを、達成しやすさの見込みで選んでいる。

### 問題
できることばかり選ぶと何も分からず、できないことばかり選ぶと何も進まない。
どちらでも試行が学びに変わらないまま、予算だけが減る。

### 解決
**直前までの成功率がまだ動いている領域に、手数を寄せる。**
伸びが止まった領域は降ろし、まったく動かない領域は後回しにする。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <line x1="46" y1="40" x2="46" y2="220" stroke="#9CA3AF" stroke-width="1.5"/>
  <line x1="46" y1="220" x2="308" y2="220" stroke="#9CA3AF" stroke-width="1.5"/>
  <text x="30" y="44" font-family="sans-serif" font-size="11" fill="#9CA3AF">成功率</text>
  <text x="292" y="238" font-family="sans-serif" font-size="11" fill="#9CA3AF">試行</text>

  <polyline points="46,214 100,74 180,62 300,58" fill="none" stroke="#9CA3AF" stroke-width="2"/>
  <text x="240" y="50" font-family="sans-serif" font-size="12" fill="#9CA3AF">もう伸びない</text>

  <polyline points="46,216 120,214 200,215 300,213" fill="none" stroke="#9CA3AF" stroke-width="2" stroke-dasharray="5 4"/>
  <text x="196" y="208" font-family="sans-serif" font-size="12" fill="#9CA3AF">まだ動かない</text>

  <polyline points="46,212 110,190 170,152 240,110 300,86" fill="none" stroke="#1E40AF" stroke-width="2.5"/>
  <circle cx="240" cy="110" r="6" fill="#F1F5F9" stroke="#1E40AF" stroke-width="2"/>
  <text x="112" y="118" font-family="sans-serif" font-size="12" fill="#1E40AF">いま伸びている</text>

  <line x1="252" y1="106" x2="286" y2="132" stroke="#1E40AF" stroke-width="1.5"/>
  <path d="M288 134 l-3 -10 l-7 7 z" fill="#1E40AF"/>
  <text x="286" y="152" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1E40AF">ここへ寄せる</text>

  <text x="170" y="278" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">選ぶのは、できる的でも難しい的でもない</text>
  <text x="170" y="302" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9CA3AF">成功率がまだ動いている的を選ぶ</text>
</svg>
```

<!--takeaway-->
関連: [[失敗も残す]] / [[予算で問い直す]] / [[patterns-scrum/分からない順に取る|分からない順に取る]]

---

## できたことを部品に
<!--id:できたことを部品に-->
<!--pattern-->
### 状況
一度解けた手順を、次の実行でまたゼロから組み立てている。

### 問題
文脈は次の実行に残らない。
同じ探索を繰り返すぶんだけ手数が減り、遠くのゴールに届かなくなる。
届かないゴールは、そもそも候補として立たなくなる。

### 解決
**通った手順を、名前と使い方を添えて保存し、次の探索から呼べるようにする。**
保存してよいのは [[実行が判定する]] を通った手順だけにする。

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <text x="30" y="30" font-family="sans-serif" font-size="13" fill="#9CA3AF">毎回ゼロから組む</text>

  <circle cx="42" cy="66" r="6" fill="#FFFFFF" stroke="#9CA3AF" stroke-width="1.5"/>
  <line x1="48" y1="66" x2="70" y2="66" stroke="#9CA3AF" stroke-width="1.5"/>
  <circle cx="76" cy="66" r="6" fill="#FFFFFF" stroke="#9CA3AF" stroke-width="1.5"/>
  <line x1="82" y1="66" x2="104" y2="66" stroke="#9CA3AF" stroke-width="1.5"/>
  <circle cx="110" cy="66" r="6" fill="#FFFFFF" stroke="#9CA3AF" stroke-width="1.5"/>
  <line x1="116" y1="66" x2="138" y2="66" stroke="#9CA3AF" stroke-width="1.5"/>
  <circle cx="144" cy="66" r="6" fill="#FFFFFF" stroke="#9CA3AF" stroke-width="1.5"/>
  <line x1="150" y1="66" x2="172" y2="66" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="4 3"/>
  <circle cx="178" cy="66" r="6" fill="#FFFFFF" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="3 3"/>
  <line x1="184" y1="66" x2="206" y2="66" stroke="#E2E8F0" stroke-width="1.5" stroke-dasharray="3 4"/>

  <rect x="240" y="50" width="66" height="32" rx="4" fill="none" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="5 3"/>
  <text x="273" y="70" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">ゴール</text>
  <text x="170" y="102" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">手数が尽きて届かない</text>

  <line x1="30" y1="124" x2="310" y2="124" stroke="#E2E8F0" stroke-width="1"/>

  <text x="30" y="152" font-family="sans-serif" font-size="13" fill="#1E40AF">部品を呼ぶ</text>

  <rect x="30" y="166" width="112" height="26" rx="3" fill="#F1F5F9" stroke="#1E40AF" stroke-width="1.5"/>
  <text x="86" y="184" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1E40AF">検索して読む</text>
  <rect x="30" y="198" width="112" height="26" rx="3" fill="#F1F5F9" stroke="#1E40AF" stroke-width="1.5"/>
  <text x="86" y="216" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1E40AF">直して試す</text>
  <rect x="30" y="230" width="112" height="26" rx="3" fill="#F1F5F9" stroke="#1E40AF" stroke-width="1.5"/>
  <text x="86" y="248" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1E40AF">まとめて出す</text>
  <text x="86" y="272" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1E40AF">名前の付いた部品</text>

  <circle cx="166" cy="210" r="6" fill="#FFFFFF" stroke="#4B5563" stroke-width="1.5"/>
  <line x1="150" y1="179" x2="164" y2="204" stroke="#1E40AF" stroke-width="1.5"/>
  <line x1="150" y1="211" x2="158" y2="210" stroke="#1E40AF" stroke-width="1.5"/>
  <line x1="150" y1="243" x2="164" y2="218" stroke="#1E40AF" stroke-width="1.5"/>

  <line x1="172" y1="210" x2="200" y2="210" stroke="#4B5563" stroke-width="1.5"/>
  <circle cx="206" cy="210" r="6" fill="#FFFFFF" stroke="#4B5563" stroke-width="1.5"/>
  <line x1="212" y1="210" x2="238" y2="210" stroke="#4B5563" stroke-width="1.5"/>

  <rect x="244" y="194" width="66" height="32" rx="4" fill="none" stroke="#1E40AF" stroke-width="2"/>
  <text x="277" y="214" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1E40AF">ゴール</text>

  <text x="170" y="300" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">部品が増えるほど、遠い的が候補になる</text>
</svg>
```

<!--takeaway-->
関連: [[実行が判定する]] / [[patterns-scrum/やり方を型にする|やり方を型にする]]

---

## 対応表
<!--id:対応表-->
<!--table-->

| 共通の力学 | スクラム | エージェント |
| --- | --- | --- |
| ゴールは捨てられる仮説 | 仮のゴール | ゴールを立てさせる |
| 外に出して初めて分かる | 動くものが問う | 実行が判定する |
| 判定はゴールの外に置く | 完成を先に決める | 検査を先に書く |
| 探索は自分では止まらない | 期限で問い直す | 予算で問い直す |
| 外れは次の踏み石 | 外れを棚に残す | 失敗も残す |
| 学びの大きい順に取る | 分からない順に取る | 伸びしろで選ぶ |
| 手段は在庫として貯まる | やり方を型にする | できたことを部品に |

<!--takeaway-->
上の4行がゴールを見つける側、下の3行がその手段を見つける側。行き来は各パターンの関連リンクから
