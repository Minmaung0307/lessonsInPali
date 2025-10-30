# Flexbox + Grid — Beginner Masterclass Notes

## When to use which?
- **Flexbox**: one dimension (row **or** column). Great for navbars, toolbars, button rows, forms rows.
- **Grid**: two dimensions (rows **and** columns). Great for page layouts, galleries, dashboards.

## Flex essentials
- Container: `display:flex; gap:12px; flex-wrap:wrap;`
- Main axis vs Cross axis (`flex-direction` changes this)
- Alignment: `justify-content` (main), `align-items` (cross)
- Children sizing: `flex: 1 1 220px; min-width:0;`
- Pitfall: forget `min-width:0` → overflow text

## Grid essentials
- Container: `display:grid; gap:12px;`
- Columns: `grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))`
- Auto rows: `grid-auto-rows: 140px`
- Areas: name + `grid-area` mapping
- Auto-fit vs Auto-fill:
  - **auto-fit**: collapses empty tracks → compacts nicely
  - **auto-fill**: reserves tracks even if empty

## Mobile-first
- Defaults for mobile; enhance at `@media (min-width:768px)`
- Container width clamp: `width: min(1100px, 92%); margin-inline:auto;`

## Debug tips
- Use DevTools “Layout” overlays (Grid/Flex badges)
- Outline children temporarily: `.demo > * { outline: 1px dashed #334155 }`
- Inspect computed styles, especially the final grid-template-columns string