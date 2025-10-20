# Lesson UI JSON Schema — Detailed Guide

_Last generated: 2025-10-19T21:03:56_

This guide explains **how to structure your JSON** for the `LessonUI.render('#selector', blocks)` function in `lesson-ui-kit.js`.  
Each file typically looks like this:

```jsonc
{ "blocks": [ /* one or many block objects */ ] }
```

---

## 1) Shared rules

- **Order matters**: the renderer draws blocks from top to bottom.
- **Minimal fields**: every block must have a `type` string.
- **Text fields** accept **inline markdown** (`**bold**`, `
` line breaks, backticks for code).
- Unknown fields are ignored (safe to add metadata for your own tooling).
- Colors accept any valid CSS color: `#rrggbb`, `rgb()`, or named colors.

---

## 2) Block reference

### 2.1 `lessonHero`
A header banner with icon circles and a left-bottom lesson badge.

```jsonc
{
  "type": "lessonHero",
  "bgColor": "#345667",
  "accentColor": "#5a94b6",
  "footerColor": "#cfd3d6",
  "icons": [{"emoji": "🧑‍💻"}, { "emoji":"✏️"}],
  "badge": { "text":"1.1.3", "color":"#2d6fb3" },
  "title": "Get Started with the Command Line",
  "titleColor": "#1f5d93"
}
```

### 2.2 `infoTip` / `warningTip` / `successTip` / `toolTip` / `nerdNote`
Card with a **left accent** and an optional **floating icon**.

**Important-style:**  
```jsonc
{
  "type":"infoTip",
  "variant":"important",
  "title":"IMPORTANT",
  "titleBorder":"#2d6fb3",
  "body":"Type out every line of code instead of copying.",
  "bodyLeftBar":"#2d6fb3",
  "icon": "ℹ️"     // optional
}
```

**Nerd Note:** (circle avatar on left)  
```jsonc
{
  "type":"nerdNote",
  "title":"NERD NOTE",
  "icon":"🤓",
  "badgeWord":"Desktop",
  "color":"#3b873e",
  "body":"The graphical 'desktop' is the Desktop folder in your user directory!"
}
```

### 2.3 `pauseBlock`
Togglable **Show Answer** pattern (click again to hide).

```jsonc
{
  "type":"pauseBlock",
  "title":"PAUSE",
  "underline": true,
  "icon":"❓",
  "question": "What do you think `cd` stands for?",
  "answer": "change directory",
  "leftBadge": { "icon":"❓", "bg":"#2d6fb3" }
}
```

### 2.4 `proTip`
A pill header that expands/collapses to reveal content.

```jsonc
{
  "type":"proTip",
  "title":"SHOW PRO TIP",
  "icon":"💎",
  "pill": true,
  "content":"Press ↑ / ↓ in the terminal to cycle through command history."
}
```

### 2.5 `codeBlock`
Monospace panel with simple inline token highlighting.

```jsonc
{
  "type":"codeBlock",
  "lang":"bash",               // for future syntax hooks
  "theme":"light",            // light|dark (optional)
  "code":"cd projects\nmkdir run-buddy\n",
  "tokens":[
    { "match":"cd", "color":"#b4007a" },
    { "match":"run-buddy", "bg":"#fff0f0", "color":"#a33" }
  ]
}
```

### 2.6 `section` / `h1` / `h2` / `text`
Simple content structure units.

```jsonc
{ "type":"section", "title":"Getting Ready for Class",
   "style": { "bg":"#f5f7fa", "borderLeft":"6px solid #2d6fb3", "radius":"16px" } }
{ "type":"h1", "text":"Virtual Class 1", "color":"#2d6fb3" }
{ "type":"text", "text":"Please download the files before class." }
```

### 2.7 `ul` / `ol`
Lists can include links.

```jsonc
{ "type":"ol", "items":[
  { "text":"01-HTML", "href":"/assets/01-html.zip" },
  { "text":"02-Attributes", "href":"/assets/02-attributes.zip" }
]}
{ "type":"ul", "items":[
  { "text":"📖 README Guide", "href":"https://example.com/readme" }
]}
```

### 2.8 `video`
Embeds YouTube/hosted videos.

```jsonc
{ "type":"video", "src":"https://www.youtube.com/embed/dQw4w9WgXcQ", "caption":"Watch the video" }
```

---

## 3) Putting files together

- You can keep **one JSON per block** (each file still uses `{"blocks":[ ... ]}`) **or** combine many blocks in a single `lesson-ui-examples.json`.
- In HTML:
  ```html
  <script src="/js/lesson-ui-kit.js"></script>
  <script>
    fetch('/data/lesson-ui-hero.json')
      .then(r => r.json())
      .then(d => LessonUI.render('#lessonBlocks', d.blocks));
  </script>
  ```

- In your **Firestore** lesson document, you can store the exact `blocks` array and call `LessonUI.render` with it.

---

## 4) Authoring checklist

1. Decide the **order** of blocks (top → bottom).
2. For tips/notes, pick a **variant** and color accents.
3. For code, add `tokens` for words you want highlighted.
4. For lists, use `ul/ol` and optional `"href"` for each item.
5. Test on mobile (most blocks are responsive by default).

---

## 5) Extending

- Add a new `type` and implement a renderer in `lesson-ui-kit.js` (inside the `renderers` map).
- The CSS that `lesson-ui-kit.js` injects is scoped under `.LUI` to avoid collisions. You can override with more specific selectors.

Happy building!
