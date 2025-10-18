# Admin Import and Data Folder Usage Guide

This document explains how **Admin → Import** works and whether you still need local data folders (e.g., `/data/courses/...`) once importing into Firestore.

---

## 1. Overview

When you use the **Admin Console → Import**, all course data (catalog, chapters, lessons, quizzes, etc.) is written directly into **Firestore**.  
Once imported, your app reads directly from Firestore—not from local `/data` folders.

✅ **So you do NOT need to keep `data/courses/...` folders for runtime use.**  
They are optional for **backup or version control** purposes only.

---

## 2. When Data Folders Are Needed

You might still want to keep `/data/courses/...` folders if:

### a) For Backup or Version Control
You can keep your JSON files organized for future updates or for git commits, e.g.:

```
data/courses/pali-beg-1/catalog.json
data/courses/pali-beg-1/chapters.json
data/courses/pali-beg-1/lessons/l1.json
```

Later, you can re-import them through the Admin panel.

### b) For Quick Import Scripts
You can automate importing JSON from `/data` using code like this:

```js
// Example in renderAdmin()
document.getElementById('btnImportFolder')?.addEventListener('click', async () => {
  try {
    const base = '/data/courses/pali-beg-1';
    const cat = await (await fetch(`${base}/catalog.json`)).json();
    await importAnyJson(cat);
    const ch = await (await fetch(`${base}/chapters.json`)).json();
    await importAnyJson({ course: { id: cat.courses?.[0]?.id || 'pali-beg-1' }, chapters: ch.chapters });
    const l1 = await (await fetch(`${base}/lessons/l1.json`)).json();
    await importAnyJson(l1);
    alert('Quick import done ✅');
  } catch (e) {
    console.error(e); alert('Quick import failed.');
  }
});
```

---

## 3. When Data Folders Are *Not* Needed

After importing, the **runtime app** (Dashboard, Courses, Lessons) only fetches data from **Firestore**, like so:

```
courses/{courseId}
  chapters/{chapterId}
    lessons/{lessonId}
      contents/{contentId}
      quizzes/{quizId}
        questions/{questionId}
```

That means `/data/courses/...` files are **not accessed at runtime**.  
The Admin import process has already pushed those JSON structures into Firestore.

---

## 4. Media Files (PDF, Video, Audio, Image)

If you reference media files in your JSON using local paths (e.g. `/data/courses/.../handout.pdf`), those files must still exist in your hosting/public folder or Firebase Storage.

| Case | Example | Required Action |
|------|----------|------------------|
| Hosted file | `/data/courses/.../handout.pdf` | Must exist under `/public/data/...` when deployed |
| Firebase Storage | `gs://your-bucket/...` | OK – `resolveMediaUrl()` converts to HTTPS automatically |
| External URL | `https://...` | Works instantly |

✅ **Recommended:** Upload all media (PDF/video/audio/image) to **Firebase Storage** and store their HTTPS download URLs in Firestore.

---

## 5. Importer Behavior Summary

| Data Type | Imported To | Reads From at Runtime |
|------------|-------------|------------------------|
| Catalog | `/courses/{id}` | Firestore |
| Chapters | `/courses/{id}/chapters/{id}` | Firestore |
| Lessons | `/courses/{id}/chapters/{id}/lessons/{id}` | Firestore |
| Contents | `/courses/{id}/.../contents` | Firestore |
| Quizzes | `/courses/{id}/.../quizzes` | Firestore |

---

## 6. Reading vs Contents Recap

| Field | Purpose | Example |
|--------|----------|----------|
| `reading` | Single handout document (PDF or text) | `"https://example.com/lesson1.pdf"` |
| `contents` | List of videos, audios, images, or links | `[{"type":"video","url":"https://youtu.be/..."}]` |

---

## 7. Best Practice Recommendations

1. ✅ Import all JSON data through **Admin → Import**.  
2. 🧾 Keep `/data` JSONs for source/backup only (optional).  
3. 🎬 Store all media in Firebase Storage or a CDN, not under `/data` if possible.  
4. 🔁 Avoid reusing IDs (course/chapter/lesson) to prevent Firestore overwrite.  
5. 🧠 Use `resolveMediaUrl()` for `gs://` links.  
6. 💾 Verify your Firestore rules allow Admin imports and reads.  

---

**Summary:**  
Once imported via Admin → Import, the app reads only from Firestore. The `/data/...` folders are no longer required at runtime, though you may retain them for version control or offline backups.

---

*Document version: 2025‑10‑16*  
*Author: Firebase Learning Platform System Guide*
