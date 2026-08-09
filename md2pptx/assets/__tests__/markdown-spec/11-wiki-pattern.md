---
# Wiki Pattern Layout Demo
Left column plus a required SVG diagram
---
## Seed Note
<!--pattern-->
### 状況
A thought arrives while doing something else.

### 問題
Waiting for a tidy moment means the note never gets written.

### 解決
Write one sentence. Grow it later.

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <rect x="30" y="80" width="120" height="30" rx="4" fill="none" stroke="#1E40AF" stroke-width="1.5"/>
  <line x1="170" y1="95" x2="210" y2="95" stroke="#4B5563" stroke-width="1.5"/>
  <path d="M212 95 l-9 -5 l0 10 z" fill="#4B5563"/>
  <rect x="220" y="60" width="90" height="120" rx="4" fill="none" stroke="#4B5563" stroke-width="1.5"/>
  <text x="170" y="250" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">one line grows</text>
</svg>
```

<!--takeaway-->
Takeaway と図解が同居する形。
---
## Sections Out Of Order
<!--pattern-->
### 解決
Sections are stacked in the order the vocabulary declares them, not the order written.

### 状況
The three sections are written 解決 → 状況 → 問題.

### 問題
Reading order must not depend on authoring order.

```pattern-diagram
<svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <rect x="40" y="50" width="260" height="40" rx="4" fill="none" stroke="#9CA3AF" stroke-width="1.5"/>
  <rect x="40" y="110" width="260" height="40" rx="4" fill="none" stroke="#9CA3AF" stroke-width="1.5"/>
  <rect x="40" y="170" width="260" height="40" rx="4" fill="none" stroke="#1E40AF" stroke-width="2"/>
  <text x="170" y="256" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#1F2937">declared order wins</text>
</svg>
```
