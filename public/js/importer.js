// importer.js — safely import hybrid JSON from admin textarea
import { setDoc, doc } from "firebase/firestore";
import { db } from "./firebase.js";

/** drop undefined keys (Firestore-safe) */
function pickDefined(obj) {
  const o = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) o[k] = v;
  }
  return o;
}

/** write quiz + questions as subcollection */
async function saveQuizBundle(courseId, chapterId, lessonId, quiz) {
  if (!quiz || !Array.isArray(quiz.questions)) return;

  const qid = crypto.randomUUID();

  // quiz meta
  await setDoc(
    doc(db, "courses", courseId, "chapters", chapterId, "lessons", lessonId, "quizzes", qid),
    {
      title: quiz.title || "Quiz",
      shuffle: !!quiz.shuffle,
      passPct: quiz.passPct ?? 70
    },
    { merge: true }
  );

  // questions
  for (const q of quiz.questions) {
    const qDocId = q.id || crypto.randomUUID();

    const payload = pickDefined({
      text: q.text || "",
      type: q.type || (Array.isArray(q.answerIndex) ? "mcq" : "scq"),
      // omit choices unless it's an array (avoid Unsupported field: undefined)
      choices: Array.isArray(q.choices) ? q.choices : undefined,
      // number OR array is fine
      answerIndex: q.answerIndex,
      // short-answer accepted list (optional)
      accept: Array.isArray(q.accept) ? q.accept : undefined,
      points: q.points ?? 1,
      // feedback object allowed (optional)
      feedback: q.feedback || undefined
    });

    await setDoc(
      doc(
        db,
        "courses",
        courseId,
        "chapters",
        chapterId,
        "lessons",
        lessonId,
        "quizzes",
        qid,
        "questions",
        qDocId
      ),
      payload,
      { merge: true }
    );
  }
}

export async function importAnyJson(j) {
  if (!j) throw new Error("Empty JSON");

  // ===== 1) catalog.json =====
  if (Array.isArray(j.courses)) {
    for (const c of j.courses) {
      const id = c.id || crypto.randomUUID();
      const data = { ...c };
      delete data.chaptersUrl; // external reference only

      await setDoc(doc(db, "courses", id), pickDefined(data), { merge: true });

      // optional: auto-follow chaptersUrl
      if (c.chaptersUrl) {
        try {
          const r = await fetch(c.chaptersUrl, { cache: "no-store" });
          if (r.ok) await importAnyJson(await r.json());
        } catch {}
      }
    }
    return "catalog";
  }

  // ===== 2) chapters.json =====
  if (Array.isArray(j.chapters) && j.course?.id) {
    const cid = j.course.id;

    for (const ch of j.chapters) {
      const chid = ch.id || crypto.randomUUID();
      const payload = pickDefined({
        title: ch.title || "",
        order: ch.order ?? 1,
        summary: ch.summary || ""
      });

      await setDoc(doc(db, "courses", cid, "chapters", chid), payload, { merge: true });

      // optional: follow per-chapter lessonsUrl
      if (ch.lessonsUrl) {
        try {
          const r = await fetch(ch.lessonsUrl, { cache: "no-store" });
          if (r.ok) await importAnyJson({ ...(await r.json()), _cid: cid, _chid: chid });
        } catch {}
      }
    }
    return "chapters";
  }

  // ===== 3) lesson hybrid JSON =====
  // supports: { courseId, chapterId, lesson, reading, blocks, quiz, theme }
  if (j.lesson && (j._cid || j.courseId) && (j._chid || j.chapterId)) {
    const courseId  = j._cid || j.courseId;
    const chapterId = j._chid || j.chapterId;
    const l         = j.lesson;
    const lid       = l.id || crypto.randomUUID();

    // lesson core (keep blocks as a field on the lesson doc)
    await setDoc(
      doc(db, "courses", courseId, "chapters", chapterId, "lessons", lid),
      pickDefined({
        title: l.title || "",
        order: l.order ?? 1,
        reading: j.reading || "",
        theme: j.theme || {},
        // store blocks raw for LessonUI.render to use later
        blocks: Array.isArray(j.blocks) ? j.blocks : undefined
      }),
      { merge: true }
    );

    // ⚠️ DO NOT try to map custom blocks into legacy "contents" subcollection here.
    // Your reader for contents expects simple {type,url,caption,order}, but blocks are richer.

    // quiz (as subcollection)
    await saveQuizBundle(courseId, chapterId, lid, j.quiz);

    return "lesson";
  }

  throw new Error("Unrecognized JSON structure");
}