# CSS Grid — Beginner Masterclass (Notes)

## Why Grid?
- Two‑dimensional layout (rows + columns) with first‑class gaps
- True “masonry‑like” responsiveness using `auto-fit`/`auto-fill` + `minmax()`
- Semantic patterns via `grid-template-areas`

## Core Properties
- `display: grid` / `inline-grid`
- `grid-template-columns` / `grid-template-rows`
- `repeat()`, `minmax()`, `1fr`
- `gap`, `row-gap`, `column-gap`
- `grid-auto-rows`, `grid-auto-flow`
- `justify-items`, `align-items`, `place-items`
- `grid-column`, `grid-row`, `grid-area`, `grid-template-areas`

## Auto‑fit vs Auto‑fill
- **auto‑fit:** collapses empty tracks (compacts to fit content)
- **auto‑fill:** reserves tracks even if empty
Use with `minmax(220px, 1fr)` to create fluid columns that never shrink under 220px.

## Patterns
- Fluid card deck:
  ```css
  .deck{ display:grid; gap:12px;
         grid-template-columns: repeat(auto-fit, minmax(220px,1fr)); }
  .deck > article{ min-width:0; }
  ```
- Holy‑grail with areas:
  ```css
  .layout{ display:grid; gap:12px;
    grid-template-columns: 260px 1fr;
    grid-template-areas: "header header" "sidebar content" "footer footer"; }
  .header{grid-area:header}.sidebar{grid-area:sidebar}.content{grid-area:content}.footer{grid-area:footer}
  ```

## Pitfalls
- Using margins for gutters → use `gap`
- Hard-coded widths; avoid with `fr` + `minmax`
- Forgetting `min-width:0` on nested flex children if mixing Grid + Flex
- Confusing area names (“header header” must match `.header{grid-area:header}`)

## Debug Tips
- DevTools → Layout → Toggle grid overlay
- Outline cells for learning: `.demo > * { outline:1px dashed #334155 }`
- Inspect computed `grid-template-columns` string
