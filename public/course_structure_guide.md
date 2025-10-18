# Course Structure and Content Guide

This document explains the relationship between **IDs**, **Reading**, and **Contents** fields in the Firebase-based learning system.

---

## 1. Firestore Path Structure

Data is stored in Firestore using a nested hierarchy:

```
/courses/{courseId}
  /chapters/{chapterId}
    /lessons/{lessonId}
```

- **courseId** — The unique identifier for each course (e.g., `pali-beg-1`).
- **chapterId** — Unique per chapter, but not the same as courseId. Used to group lessons.
- **lessonId** — Unique per lesson. Independent of both courseId and chapterId.

### Example Path

```
/courses/pali-beg-1/chapters/ch1/lessons/l1
```

### ID Rules

| Level | Example ID | Should Match | Notes |
|-------|-------------|--------------|-------|
| Course | `pali-beg-1` | – | Used globally to identify a course |
| Chapter | `ch1`, `intro` | ❌ | Should be unique within its course |
| Lesson | `l1`, `vowels` | ❌ | Unique within its chapter |

Importer JSON uses these IDs to create or link documents in the right place.

---

## 2. Reading vs Contents

### 🧾 `reading`

- Used for **a single document**, like a PDF or handout.
- Example use case: “Download the handout for this lesson.”
- Appears as a single **“Open handout (PDF)”** button in the UI.

```json
"reading": "https://example.com/lesson1-handout.pdf"
```

### 🎬 `contents`

- Used for **multi-block materials** — videos, audios, images, links, or text.
- You can have many entries per lesson.
- Each entry has a `type`, `url`, `caption`, and `order`.

#### Example:

```json
"contents": [
  { "type": "video", "url": "https://youtu.be/AbCdEf12345", "caption": "Intro", "order": 1 },
  { "type": "audio", "url": "https://cdn.example.com/track.mp3", "caption": "Pronunciation", "order": 2 },
  { "type": "image", "url": "https://cdn.example.com/chart.png", "caption": "Alphabet chart", "order": 3 },
  { "type": "text",  "url": "https://example.com/blog/pali-basics", "caption": "Further reading", "order": 4 }
]
```

---

## 3. Media Handling

- **YouTube Links** → automatically rendered as an iframe if URL includes `youtu.be` or `watch?v=`.  
- **Firebase Storage (`gs://`) URLs** → converted to `https://` via `resolveMediaUrl()` before rendering.
- **Other media types** are displayed inline using `<video>`, `<audio>`, or `<img>`.

| Type | Rendered As | Notes |
|------|--------------|-------|
| `video` | `<video controls>` | For uploaded or external videos |
| `audio` | `<audio controls>` | Audio lessons or chants |
| `image` | `<img>` | Charts, texts, or infographics |
| `text`  | `<a href>` | Links to articles or blogs |
| YouTube | `<iframe>` | Detected automatically |

---

## 4. Quizzes

Each lesson can include quizzes in the following path:

```
/courses/{courseId}/chapters/{chapterId}/lessons/{lessonId}/quizzes/{quizId}/questions/{questionId}
```

You can include single-choice, multiple-choice, or short-answer questions.

#### Example:

```json
"quiz": {
  "title": "Lesson 1 Quiz",
  "shuffle": true,
  "passPct": 70,
  "questions": [
    { "text": "Which is a vowel?", "choices": ["ka", "a", "ta", "ma"], "answerIndex": 1, "points": 1 },
    { "text": "Translate 'Buddha'.", "answer": "Enlightened One", "type": "short" }
  ]
}
```

---

## 5. Summary of Key Points

| Concept | Description |
|----------|--------------|
| `courseId` | Identifies the main course; shared across all its chapters/lessons. |
| `chapterId` | Groups lessons; unique within each course. |
| `lessonId` | Individual lesson identifier; unique within a chapter. |
| `reading` | One main handout (usually PDF). |
| `contents` | Multiple blocks of multimedia materials. |
| YouTube | Automatically iframe-rendered. |
| Storage URLs | Resolved via `resolveMediaUrl()`. |
| Quizzes | Nested collection under each lesson. |

---

### ✅ Best Practices

1. **Keep IDs short and readable** (`pali-beg-1`, `ch1`, `l1`).
2. **Always set an `order`** for `contents` so items show up in correct sequence.
3. **Use `reading` only for single PDFs** — all multimedia belongs to `contents`.
4. **Avoid reusing IDs** across courses to prevent overwriting Firestore docs.
5. **Use consistent captions** — they help students identify what each media block is about.

---

*Document version: 2025-10-16*  
*Author: System-generated reference guide for Firebase course structure*