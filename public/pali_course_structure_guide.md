
# Lesson JSON and Course Structure Guide

This document explains how to organize your course content files (`catalog.json`, `chapters.json`, and `lessons.json`) for your Firebase-powered education platform.

---

## 1. catalog.json

Defines the **list of courses** available. Each course entry includes its metadata and benefits.

```json
{
  "courses": [
    {
      "id": "pali-beg-1",
      "title": "Pāli Beginner I",
      "summary": "Intro to Pāli alphabet, sounds and basic grammar.",
      "description": "A gentle start to Pāli. Learn vowels/consonants, basic nouns & simple questions.",
      "level": 0,
      "credits": 3,
      "price": 0,
      "img": "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=80",
      "benefits": [
        "Read the Pāli alphabet",
        "Pronounce vowels/consonants correctly",
        "Understand basic noun forms"
      ],
      "tags": ["alphabet", "pronunciation", "nouns"]
    }
  ]
}
```

---

## 2. chapters.json

Each course has its own chapters file listing the order and structure of chapters and lessons.

```json
{
  "course": { "id": "pali-beg-1" },
  "chapters": [
    {
      "id": "ch1",
      "order": 1,
      "title": "Alphabet & Sounds",
      "summary": "Vowels, consonants and basic sound rules",
      "lessons": [
        { "id": "l1", "order": 1, "title": "Vowels & Consonants" },
        { "id": "l2", "order": 2, "title": "Pronunciation Drills" }
      ]
    },
    {
      "id": "ch2",
      "order": 2,
      "title": "Basic Nouns",
      "summary": "Gender, number, and very common nouns",
      "lessons": [
        { "id": "l1", "order": 1, "title": "Gender & Number" }
      ]
    }
  ]
}
```

---

## 3. lessons.json

Each lesson JSON file contains the actual content: reading overview, contents (videos, audios, images, text), and quizzes.

### Example:
```json
{
  "courseId": "pali-beg-1",
  "chapterId": "ch1",
  "lesson": { "id": "l1", "order": 1, "title": "Vowels & Consonants" },

  "reading": "သင်ခန်းစာအကျဉ်း - ဒီသင်ခန်းစာမှာ long/short vowels အရေးကြီးချက်တွေကို အရင်သိကျက်ပါ။ PDF လက်စွဲ: https://example.com/handout.pdf",

  "contents": [
    { "type": "text", "caption": "အပိုင်း (၁)", "text": "ပဌမအပိုင်းတွင် သရအက္ခရာများကို လေ့လာပါ။", "order": 1 },
    { "type": "text", "caption": "အပိုင်း (၂)", "text": "အောက်ပါအက္ခရာများကို စာလုံးချင်းဆက်ရေးခြင်းနည်းလမ်းများကို လေ့ကျင့်ပါ။", "order": 2 },
    { "type": "image", "url": "https://i.imgur.com/4ZQZ4GZ.png", "caption": "Alphabet chart", "order": 3 },
    { "type": "video", "url": "https://youtu.be/TbdhjNLdumU", "caption": "Pronunciation practice", "order": 4 }
  ],

  "quiz": {
    "title": "Lesson 1 Quiz",
    "passPct": 70,
    "shuffle": true,
    "questions": [
      { "type": "mcq", "text": "Which is a vowel?", "choices": ["ka","a","ta"], "answerIndex": 1, "points": 1 },
      { "type": "mcq", "multiple": true, "text": "Select all vowels:", "choices": ["a","i","u"], "answerIndexes": [0,1,2], "points": 2 },
      { "type": "short", "text": "Write one long vowel in Pāli.", "acceptedAnswers": ["ā","ī","ū"], "points": 2 }
    ]
  }
}
```

---

## 4. Field meanings

| Field | Description |
|-------|--------------|
| `reading` | Overview / short guide text. Often a paragraph or a link to a handout. |
| `contents` | Main lesson blocks (video, audio, image, or paragraph texts). |
| `quiz` | Evaluation section with MCQ, multiple choice, and short answers. |
| `caption` | Optional short explanation shown under each media. |
| `order` | Controls display sequence for each content block. |

---

## 5. Notes for Implementation

- **Paragraph-level texts:** each paragraph = one `"type": "text"` entry in `contents`.
- **Media mix:** combine `"image"`, `"video"`, `"audio"`, `"text"` freely in desired order.
- **YouTube links:** renderer auto-embeds `https://youtu.be/...` or `https://www.youtube.com/watch?v=...`.
- **IDs must match:** `catalog.course.id` = `chapters.course.id` = `lessons.courseId`.
- **Import workflow:** Admin → Imports can create the correct Firestore structure automatically.
- **Data consistency:** keep `order` numeric, starting from 1 in each array.
- **Reading vs Contents:** `reading` = short intro; `contents` = full detailed materials.

---

© 2025 Pali Lessons JSON Schema Guide
