
# Lesson UI Kit (Vanilla JS)

This kit lets you describe rich lesson UIs in **JSON**, then render them with a tiny vanilla JS file.

## How to use

1. Put `lesson-ui-kit.js` in your `public/js/` (or anywhere).
2. Include it in HTML:

```html
<script src="/js/lesson-ui-kit.js"></script>
<div id="lessonBlocks"></div>
<script>
  // Example: fetch JSON and render
  fetch('/data/lesson-ui-examples.json')
    .then(r=>r.json())
    .then(data => LessonUI.render('#lessonBlocks', data.blocks));
</script>
```

## Block types

### 1) `lessonHero`
```
{
  "type":"lessonHero",
  "top":{ "height":220, "bg":"#355a6a", "icons":[{"src":"/img/ic-code.svg","size":170,"x":40,"y":28,"bg":"#cfe8fa"}] },
  "band":{ "height":150, "bg":"#cfd3d6" },
  "badge":{ "text":"1.1.3","size":150,"bg":"#2e70b2","color":"#fff","ring":"#aac0cf","ringWidth":22,"offsetX":36,"offsetY":-10 },
  "title":{ "text":"Get Started…","color":"#2e70b2","stroke":"#fff","strokeWidth":6,"fontSize":48,"weight":800 },
  "radius":14
}
```
- `top.icons[]` supports: `src`, `size`, `x`, `y`, `bg`, `ring`, `ringWidth`, `opacity`.

### 2) `infoTip` / `warningTip` / `successTip` / `toolTip` / `nerdNote`
```
{ "type":"warningTip", "title":"Heads up!", "icon":"/img/ic-alert.svg", "color":"#d97706", "items":["…"] }
```
- Shows a left colored bar and an optional floating circular icon.

### 3) `pauseBlock`
```
{ "type":"pauseBlock", "title":"PAUSE", "icon":"/img/ic-question.svg",
   "question":"What does `cd` stand for?", "answer":"change directory",
   "toggleLabel":"Show Answer", "toggleHide":"Hide Answer" }
```

### 4) `proTip`
```
{ "type":"proTip", "label":"SHOW PRO TIP", "hideLabel":"HIDE PRO TIP",
   "icon":"/img/ic-diamond.svg", "text":"Tip content…" }
```

### 5) `codeBlock`
```
{ "type":"codeBlock", "lang":"bash",
   "highlight":["cd","pwd","run-buddy","touch","ls"],
   "code":"cd projects\nmkdir run-buddy\ncd run-buddy\npwd" }
```
- `highlight[]` will wrap exact tokens with a soft badge.

## Notes & Tips
- The kit injects minimal CSS automatically once (`#lesson-ui-kit-styles`).
- You can mix blocks in any order in your JSON array.
- All colors and sizes are override-able via JSON fields.
- Icons use public URLs (SVG/PNG).

_Last updated: 2025-10-19T20:49:17.557868Z_
