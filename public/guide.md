# guide.md — Pāli LMS (Hybrid Content + Firestore)

This is a practical, copy-pasteable guide for how we structure courses, chapters, lessons, and quizzes using the **Hybrid (Option C)** approach:

- **Metadata + progress** in **Firestore**
- **Bulk/static content JSON** in **`public/data/...`** (served by Firebase Hosting)
- Admin can **import JSON** from the **Admin Console → Import** tab

---

## 1) Folder layout (Hosting)

```
public/
├─ index.html
├─ js/
│  ├─ app.js
│  └─ firebase.js
├─ img/
│  ├─ placeholder.png
│  └─ course thumbnails...
├─ data/
│  └─ courses/
│     ├─ catalog.json                ← list of courses
│     ├─ pali-beg-1/
│     │  ├─ chapters.json            ← chapters for pali-beg-1
│     │  └─ ch1-lesson1.json         ← example lesson
│     └─ pali-int-1/
│        ├─ chapters.json
│        └─ ch1-lesson1.json
└─ icons/, manifest.json, etc.
```

> All files in `public/` are deployed to Firebase Hosting.  
> You can reference them with absolute paths like `/data/courses/...`.

---

## 2) Firestore data model (after import)

```
/courses/{courseId}
  title, summary, level, credits, price, img, benefits[], ts
  /chapters/{chapterId}
    title, summary, order
    /lessons/{lessonId}
      title, order, reading (URL)
      /contents/{contentId}
        type ("video" | "audio" | "image" | "text")
        url, caption, order
      /quizzes/{quizId}
        title, shuffle, passPct
        /questions/{questionId}
          text, choices[], answerIndex, points

/users/{uid}
  email, role ("admin" | "ta" | ...)
  /enrollments/{courseId}  ← Personal enrollment records
    courseId, courseTitle, ts, ...
```

---

## 3) Security rules (must be deployed)

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function authed(){ return request.auth != null; }
    function isStaff(){
      return authed() &&
        get(/databases/$(db)/documents/users/$(request.auth.uid)).data.role
          in ['admin','ta']; // add 'staff' if you use that
    }

    match /users/{uid} {
      allow read, write: if authed() && (request.auth.uid == uid || isStaff());
      match /enrollments/{courseId} {
        allow read, create, update, delete: if authed() && request.auth.uid == uid;
      }
    }

    match /posts/{id} {
      allow read: if true;
      allow write: if isStaff();
    }

    match /courses/{cid} {
      allow read: if true;
      allow write: if isStaff();
      match /chapters/{chid} {
        allow read: if true; allow write: if isStaff();
        match /lessons/{lid} {
          allow read: if true; allow write: if isStaff();
          match /contents/{ctid} { allow read: if true; allow write: if isStaff(); }
          match /quizzes/{qid} {
            allow read: if true; allow write: if isStaff();
            match /questions/{qsid} { allow read: if true; allow write: if isStaff(); }
          }
        }
      }
    }

    match /announcements/{id} { allow read: if true; allow write: if isStaff(); }

    match /messages/{id} {
      allow create: if authed();
      allow read: if authed() &&
        (resource.data.to == request.auth.uid || resource.data.to == "*" || isStaff());
    }
  }
}
```

> Make sure your **admin account’s** user doc is `role: "admin"` (or `"ta"`) so `isStaff()` returns true.

---

## 4) Admin Import — How it works

- Go to **Admin → Import** tab.
- Paste **one JSON document at a time** into the textarea.
- Click **Import**.
- The app’s `importAnyJson(json)` function autodetects the JSON shape and writes to Firestore:
  - **`{ "courses": [...] }`** → creates/updates `/courses/{id}`
  - **`{ "course": { id }, "chapters": [...] }`** → creates/updates `/courses/{id}/chapters/{chid}`
  - **`{ "courseId", "chapterId", "lesson": {...}, "contents": [...], "quiz": {...} }`** → creates lesson, contents, quiz, questions under that course/chapter

> If your course JSON includes `chaptersUrl` (e.g. `/data/courses/pali-beg-1/chapters.json`), the importer will fetch and process that automatically.  
> If a chapter JSON includes `lessonsUrl`, it will fetch that file too.

---

## 5) JSON shapes (copy-paste)

### 5.1 Catalog (multiple courses)

```json
{
  "courses": [
    {
      "id": "pali-beg-1",
      "title": "Pāli Beginner I",
      "summary": "Intro to the Pāli alphabet and basic grammar.",
      "level": 0,
      "credits": 3,
      "price": 0,
      "img": "/img/pali-beg-1.jpg",
      "benefits": ["Alphabet", "Pronunciation", "Basic Grammar"],
      "chaptersUrl": "/data/courses/pali-beg-1/chapters.json"
    },
    {
      "id": "pali-int-1",
      "title": "Pāli Intermediate I",
      "summary": "Sandhi, compounds and syntax.",
      "level": 1,
      "credits": 4,
      "price": 19.99,
      "img": "/img/pali-int-1.jpg",
      "benefits": ["Sandhi", "Compounds", "Syntax"]
    }
  ]
}
```

### 5.2 Chapters (per course)

```json
{
  "course": { "id": "pali-beg-1" },
  "chapters": [
    {
      "id": "ch1",
      "order": 1,
      "title": "Alphabet & Sounds",
      "summary": "Consonants & vowels",
      "lessonsUrl": "/data/courses/pali-beg-1/ch1-lesson1.json"
    },
    { "id": "ch2", "order": 2, "title": "Basic Nouns", "summary": "Gender & number" }
  ]
}
```

```json
{
  "course": { "id": "pali-int-1" },
  "chapters": [
    {
      "id": "ch1",
      "order": 1,
      "title": "Review & Sandhi",
      "summary": "Key review and sandhi",
      "lessonsUrl": "/data/courses/pali-int-1/ch1-lesson1.json"
    },
    { "id": "ch2", "order": 2, "title": "Compounds", "summary": "Tatpurusa, Bahuvrihi…" }
  ]
}
```

### 5.3 Lesson (+ contents + quiz)

```json
{
  "courseId": "pali-beg-1",
  "chapterId": "ch1",
  "lesson": { "id": "l1", "order": 1, "title": "Vowels & Consonants" },
  "reading": "https://example.com/handout.pdf",
  "contents": [
    { "type": "video", "url": "https://cdn.example.com/intro.mp4", "caption": "Intro video", "order": 1 },
    { "type": "audio", "url": "https://cdn.example.com/pronunciation.mp3", "caption": "Pronunciation drill", "order": 2 },
    { "type": "image", "url": "https://cdn.example.com/chart.png", "caption": "Alphabet chart", "order": 3 },
    { "type": "text",  "url": "https://example.com/post/abc", "caption": "External reference", "order": 4 }
  ],
  "quiz": {
    "title": "Lesson 1 Quiz",
    "passPct": 70,
    "shuffle": true,
    "questions": [
      { "text": "How many basic vowels in Pāli traditional listing?", "choices": ["5","7","8","10"], "answerIndex": 2, "points": 1 },
      { "text": "Select all that are vowels.", "choices": ["a","i","k","u"], "answerIndex": 0, "points": 2 }
    ]
  }
}
```

```json
{
  "courseId": "pali-int-1",
  "chapterId": "ch1",
  "lesson": { "id": "l1", "order": 1, "title": "Intro & Sandhi Basics" },
  "reading": "https://example.com/handout.pdf",
  "contents": [
    { "type": "video", "url": "https://cdn.example.com/intro-int.mp4", "caption": "Course intro", "order": 1 }
  ],
  "quiz": {
    "title": "Lesson 1 Quiz",
    "passPct": 70,
    "shuffle": true,
    "questions": [
      { "text": "Sandhi applies to…", "choices": ["Only vowels","Only consonants","Both","Neither"], "answerIndex": 2, "points": 1 }
    ]
  }
}
```

---

## 6) What the import does

- **Catalog JSON** → creates/updates `/courses/{id}`  
- **Chapters JSON** → creates/updates `/courses/{id}/chapters/{chid}`  
- **Lesson JSON** → creates `/courses/{id}/chapters/{chid}/lessons/{lid}` + subcollections (`contents`, `quizzes`, `questions`)

---

## 7) Admin Console (manual editing)

- **Courses tab** — Add/edit course info
- **Posts tab** — Text/image/video/audio posts
- **Announcements tab** — Level-targeted news
- **Messages tab** — DM or broadcast
- **Import tab** — Paste JSON → Import

---

## 8) Troubleshooting

- Invalid JSON → one object only per import
- Missing/insufficient permissions → ensure `role: "admin"`
- Image not showing → file path `/img/...`
- PayPal not working → check SDK script and client ID

---

## 9) Quick test sequence

1. Import **catalog.json**
2. Import **pali-beg-1/chapters.json**
3. Import **pali-beg-1/ch1-lesson1.json**
4. Import **pali-int-1/chapters.json**
5. Import **pali-int-1/ch1-lesson1.json**

Result:
- “Pāli Beginner I” and “Pāli Intermediate I” appear in Courses
- Chapters + lessons + quizzes all linked and viewable
- Students can enroll / take quiz / view progress