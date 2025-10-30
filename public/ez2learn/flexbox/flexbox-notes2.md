# Flexbox Masterclass (Mobile‑First)

**မြန်မာ + English စုံလင်သင်ခန်းစာ** – Flexbox ကို *တကယ့်လုပ်ရပ်နဲ့ သုံးနိုင်အောင်* လေ့ကျင့်ခန်းတွေနဲ့တကွရည်ညွှန်းချက်ပေးထားပါတယ်။

---

## 1) Why Flexbox?
- One‑dimensional layout (main axis + cross axis)
- Perfect for navbars, toolbars, buttons, forms, media objects, and card rows
- Use Grid for 2‑D page layout; Flexbox for stacks/rows inside areas

---

## 2) Core Properties (Cheat‑Sheet)
### Container
- `display: flex | inline-flex`
- `flex-direction: row | row-reverse | column | column-reverse`
- `flex-wrap: nowrap | wrap | wrap-reverse`
- `flex-flow: <direction> <wrap>`
- `justify-content` (main axis)
- `align-items` (cross axis)
- `align-content` (works only with multiple rows)
- `gap: <len>` (preferred over margins for spacing)

### Items
- `flex: <grow> <shrink> <basis>` e.g. `flex: 1 1 220px`
- `order`, `align-self`
- `min-width: 0` lets content shrink (very important with long text/images)
- `margin-left: auto` to push items to the end

---

## 3) Mobile‑First Strategy
1. Start with column stacks for small screens.
2. Add media queries (`@media (min-width: 768px)`) to switch to rows.
3. Use `gap` for spacing; avoid brittle margin hacks.

---

## 4) Real‑World Patterns Included
- **CTA Form**: labels + inputs stack on mobile, align in a row on wider screens (`flex-direction` switch).
- **Login Form**: auxiliary row with `margin-left:auto` to push links; wrap on mobile.
- **Navbar**: spacer pattern via `.spacer { margin-left: auto; }`.
- **Cards Grid**: fluid columns using `flex: 1 1 220px` and `flex-wrap: wrap`.
- **Media Object**: image + text with `min-width:0` to avoid overflow.

Open `flexbox-masterclass.html` in a browser to interact with a sandbox that live‑updates flex properties.

---

## 5) Common Pitfalls (မှားတတ်ချက်များ)
- **Items don’t shrink** → Add `min-width: 0` to the flex items that contain long text/images.
- **Expect multiple rows but get one line** → Use `flex-wrap: wrap`.
- **Confusing alignment** → `justify-content` is main axis; `align-items` is cross axis.
- **`align-content` does nothing** → It only applies when there are multiple rows (wrapping).
- **Mixing `width` with `flex-basis`** → Prefer `flex-basis` for sizing within flex layouts.
- **Spacing with margins** → Prefer `gap` on the container for consistent spacing.

---

## 6) Exercises (လေ့ကျင့်ခန်း)
1. **Navbar (mobile‑first)** – Build a stacked menu on small screens that becomes a single line with a right‑aligned section (`margin-left:auto`) on ≥768px.
2. **3‑up Cards** – Make 1‑2‑3‑4 columns with `flex:1 1 240px` and `gap`. Ensure equal heights via `align-items: stretch`.
3. **Login Form** – Align labels and inputs in a row for ≥768px and stack them on mobile. Keep inputs fluid with `flex:1 1 auto`.
4. **CTA Form** – Provide two buttons where the secondary button is pushed to the end using a spacer or `margin-left:auto`.
5. **Media Object** – Add `min-width:0` to the text column and verify that long titles do not overflow at narrow widths.
6. **Holy‑Grail Bonus** – Use a flex column on `body` to make footer stick to the bottom with `min-height: 100dvh`.

---

## 7) Testing Checklist
- Resize from 320px → desktop and confirm: wrapping, alignment, equal heights.
- Keyboard test: forms are tab‑friendly; buttons reachable.
- Long strings (e.g., URLs) don’t overflow due to `min-width:0`.

---

## 8) Snippets to Remember
```css
.container { display: flex; flex-wrap: wrap; gap: 12px; }
.item { flex: 1 1 220px; min-width: 0; }
.spacer { margin-left: auto; } /* push right */
```

```css
/* Mobile-first forms */
.form .row { display:flex; flex-direction:column; gap:8px; }
@media (min-width:768px) {
  .form .row { flex-direction:row; align-items:center; }
  .form .row > label { flex:0 0 140px; }
  .form .row > input { flex:1 1 auto; min-width:0; }
}
```

---

## 9) Folder & Files
- `flexbox-masterclass.html` – Demo + interactive sandbox
- `flexbox.css` – Styles (mobile‑first)
- `flexbox.js` – Interactions (nav toggle, sandbox controls, small form JS)
- `flexbox-notes.md` – These notes

---

Happy flex‑ing! 💪