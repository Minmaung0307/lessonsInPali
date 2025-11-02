// importer.js — robust + idempotent import (catalog / chapters / lesson)
// usage: import { importAnyJson } from './importer.js'
import {
  setDoc, doc, collection, getDocs, deleteDoc
} from "firebase/firestore";
import { db } from "./firebase.js";

// ---------- helpers ----------
function pickDefined(obj) {
  const out = {};
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v !== undefined) out[k] = v;
  });
  return out;
}

// Firestore subcollection purge (idempotent “replace” behaviour)
async function clearSubcollection(pathSegments) {
  const colRef = collection(db, ...pathSegments);
  const snap = await getDocs(colRef);
  const batchDeletes = [];
  for (const d of snap.docs) {
    batchDeletes.push(deleteDoc(d.ref));
  }
  // delete sequentially to be simple (could batch if needed)
  for (const p of batchDeletes) { await p; }
}

// SA/SCQ/MCQ — safe question payload (no undefined fields)
function buildQuestionPayload(q) {
  const type = String(q.type || '').toLowerCase() || (Array.isArray(q.answerIndex) ? 'mcq' : 'scq');

  // normalize answers
  let answerIndex = q.answerIndex;
  if (type === 'scq') {
    // single → number only
    if (Array.isArray(answerIndex)) {
      answerIndex = (answerIndex.length ? Number(answerIndex[0]) : 0);
    }
    answerIndex = Number(answerIndex);
  } else if (type === 'mcq') {
    // multi → array of numbers
    answerIndex = Array.isArray(answerIndex) ? answerIndex.map(Number) : [];
  } else if (type === 'sa') {
    // SA has no answerIndex, accept[] only
    answerIndex = undefined;
  }

  // choices only for scq/mcq
  const choices = (type === 'sa')
    ? undefined
    : (Array.isArray(q.choices) ? q.choices.slice() : []);

  // feedback optional object/string
  const feedback = (q.feedback && typeof q.feedback === 'object') || typeof q.feedback === 'string'
    ? q.feedback
    : undefined;

  const accept = Array.isArray(q.accept) ? q.accept.slice() : undefined;

  return pickDefined({
    text: q.text || '',
    type,
    choices,          // omitted when undefined
    answerIndex,      // omitted if undefined
    accept,           // SA synonyms list (optional)
    points: Number(q.points ?? 1),
    feedback
  });
}

// Blocks → HTML contents (if your app only renders “contents”)
function blockToHtmlContent(b, order) {
  const t = (b.type || '').toLowerCase();

  if (t === 'h1') {
    return { type: 'html', order, caption: '', url: '',
      html: `<h3 style="margin:.25rem 0;color:#1e3a8a;font-weight:800">${escapeHtml(b.text||'')}</h3>` };
  }

  if (t === 'hr') {
    return { type: 'html', order, caption:'', url:'', html: `<hr style="border:0;height:1px;background:linear-gradient(90deg,#0000,#cbd5e1,#0000)">` };
  }

  if (t === 'list') {
    const items = Array.isArray(b.items) ? b.items : [];
    const li = items.map(x=>`<li>${escapeHtml(String(x))}</li>`).join('');
    const left = (b.class === 'has-leftbar')
      ? `style="border-left:6px solid ${(b.data&&b.data.bar)||'#7c3aed'}; padding-left:.75rem;"` : '';
    return { type: 'html', order, caption:'', url:'', html:
      (b.ordered
        ? `<ol ${left} style="padding-left:1.25rem">${li}</ol>`
        : `<ul ${left} style="padding-left:1.25rem">${li}</ul>`)
    };
  }

  if (t === 'tip' || t === 'pauseblock' || t === 'protip') {
    const title = escapeHtml(b.title || (t==='tip' ? 'IMPORTANT' : t==='protip' ? 'PRO TIP' : 'PAUSE'));
    const text  = escapeHtml(b.text || b.answer || b.question || '');
    const cls   = b.class ? ` ${b.class}` : '';
    return { type:'html', order, caption:'', url:'', html:
      `<div class="lu-tip${cls}" data-variant="${escapeHtml(b.variant||'important')}"
            style="border:1px solid #e5e7eb;border-radius:12px;padding:12px 14px;background:#fafafa">
        <div style="font-weight:800;display:inline-block;border:3px solid currentColor;padding:.15rem .5rem;border-radius:6px;margin-bottom:.35rem">${title}</div>
        <div style="border-left:8px solid currentColor;padding-left:12px">${text}</div>
      </div>`
    };
  }

  if (t === 'hero') {
    const badge = escapeHtml(b.badge||'01');
    const title = escapeHtml(b.title||'Chapter');
    const sub   = escapeHtml(b.subtitle||'');
    const accent= b.accent || '#5b7aa5';
    const icons = (Array.isArray(b.icons) ? b.icons : []).map(ic=>{
      const html = (typeof ic === 'object' ? ic.html : ic) || '💠';
      return `<div style="width:120px;height:120px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#e6eef7">${html}</div>`;
    }).join('');
    return { type:'html', order, caption:'', url:'', html:
      `<section style="border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
         <div style="background:${accent};color:#e8f1f6;padding:22px;display:flex;gap:18px;flex-wrap:wrap;align-items:center">${icons}</div>
         <div style="background:#e9eef3;padding:16px 20px;display:flex;gap:12px;align-items:center">
           <div style="min-width:84px;height:84px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#2f6fa5;color:#fff;font-weight:800;font-size:28px;border:6px solid #c9d3dd">${badge}</div>
           <div>
             <div style="font-size:34px;font-weight:800;color:#1e3c57">${title}</div>
             <div style="color:#385a73">${sub}</div>
           </div>
         </div>
       </section>`
    };
  }

  // default paragraph/text
  return { type:'html', order, caption:'', url:'', html:
    `<div style="font-size:16px;line-height:1.7">${escapeHtml(b.text||'')}</div>` };
}

function escapeHtml(s) {
  return String(s==null?'':s).replace(/[&<>"]/g, c=>({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
}

// ---------- main importer ----------
export async function importAnyJson(json) {
  if (!json) throw new Error("Empty JSON");

  // 1) catalog
  if (Array.isArray(json.courses)) {
    for (const c of json.courses) {
      const id = c.id || crypto.randomUUID();
      const data = { ...c };
      delete data.chaptersUrl;
      await setDoc(doc(db, "courses", id), data, { merge: true });
    }
    return "catalog";
  }

  // 2) chapters
  if (Array.isArray(json.chapters) && json.course?.id) {
    const cid = json.course.id;
    for (const ch of json.chapters) {
      const chid = ch.id || crypto.randomUUID();
      await setDoc(
        doc(db, "courses", cid, "chapters", chid),
        pickDefined({
          id: chid,
          title: ch.title || "",
          order: ch.order ?? 1,
          summary: ch.summary || ""
        }),
        { merge: true }
      );
    }
    return "chapters";
  }

  // 3) lesson (supports: reading + contents OR blocks + quiz)
  if (json.lesson && json.courseId && json.chapterId) {
    const cid  = json.courseId;
    const chid = json.chapterId;
    const lid  = json.lesson.id || crypto.randomUUID();

    // put/merge lesson root
    await setDoc(
      doc(db, "courses", cid, "chapters", chid, "lessons", lid),
      pickDefined({
        id: lid,
        title: json.lesson.title || "",
        order: json.lesson.order ?? 1,
        reading: json.reading || ""
      }),
      { merge: true }
    );

    // —— replace contents completely to avoid duplicates
    await clearSubcollection(["courses", cid, "chapters", chid, "lessons", lid, "contents"]);

    // (A) plain contents
    if (Array.isArray(json.contents)) {
      for (const [i, ct] of json.contents.entries()) {
        const id = crypto.randomUUID();
        await setDoc(
          doc(db, "courses", cid, "chapters", chid, "lessons", lid, "contents", id),
          pickDefined({
            id,
            type: ct.type || 'text',
            url: ct.url || '',
            caption: ct.caption || '',
            order: ct.order ?? (i+1),
            html: ct.html // allow html too
          })
        );
      }
    }

    // (B) blocks → contents(html)
    if (Array.isArray(json.blocks)) {
      let idx = (Array.isArray(json.contents) ? json.contents.length : 0) + 1;
      for (const b of json.blocks) {
        const hv = blockToHtmlContent(b, idx++);
        const id = crypto.randomUUID();
        await setDoc(
          doc(db, "courses", cid, "chapters", chid, "lessons", lid, "contents", id),
          pickDefined({ id, ...hv })
        );
      }
    }

    // —— replace quizzes + questions completely
    await clearSubcollection(["courses", cid, "chapters", chid, "lessons", lid, "quizzes"]);

    if (json.quiz && Array.isArray(json.quiz.questions)) {
      // create single quiz meta
      const qid = crypto.randomUUID();
      await setDoc(
        doc(db, "courses", cid, "chapters", chid, "lessons", lid, "quizzes", qid),
        pickDefined({
          id: qid,
          title: json.quiz.title || "Quiz",
          shuffle: !!json.quiz.shuffle,
          passPct: Number(json.quiz.passPct ?? 70)
        })
      );

      // ensure questions subcol is clean
      await clearSubcollection(["courses", cid, "chapters", chid, "lessons", lid, "quizzes", qid, "questions"]);

      for (const q of json.quiz.questions) {
        const qDocId = q.id || crypto.randomUUID();
        const payload = {
            ...buildQuestionPayload(q),
            ..._qPayload(q),   // ✅ support question / choice images & captions
          };
        await setDoc(
          doc(db, "courses", cid, "chapters", chid, "lessons", lid, "quizzes", qid, "questions", qDocId),
          payload
        );
      }
    }

    return "lesson";
  }

  throw new Error("Unrecognized JSON structure");
}

function _qPayload(q = {}) {
  // normalize question-level image fields
  const qImg = q.img || q.image || q.imageUrl || "";
  const qImgAlt = q.imgAlt || q.imageAlt || "";
  const qImgCap = q.caption || q.imageCaption || "";

  // normalize choices: allow strings or { text, img, alt }
  let choices = Array.isArray(q.choices) ? q.choices.slice() : [];
  choices = choices.map((c) => {
    if (c && typeof c === "object") {
      return {
        text: String(c.text ?? "").trim(),
        img: String(c.img || c.image || c.imageUrl || "").trim(),
        alt: String(c.alt || c.imageAlt || "").trim(),
      };
    }
    return { text: String(c ?? "").trim(), img: "", alt: "" };
  });

  // backward-compat for answers
  const typeRaw = String(q.type || "").toLowerCase().trim();
  let type = typeRaw;
  if (!type) {
    if (Array.isArray(q.answerIndexes)) type = "mcq"; // multi
    else if (typeof q.answerIndex === "number") type = "mcq"; // single
    else if (q.answerText || q.acceptedAnswers) type = "short";
    else type = "mcq";
  }

  // answers
  let answerIndex = (typeof q.answerIndex === "number") ? q.answerIndex : null;
  let answerIndexes = Array.isArray(q.answerIndexes) ? q.answerIndexes : null;
  const acceptedAnswers = Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers :
                          (q.accept ? [].concat(q.accept).filter(Boolean) : null);

  // points
  const points = Number.isFinite(q.points) ? Number(q.points) : 1;

  return {
    // core
    type,                                 // "mcq" | "short"
    text: String(q.text || "").trim(),

    // display media for the QUESTION
    img: qImg,
    imgAlt: qImgAlt,
    imgCaption: qImgCap,

    // choices (for mcq)
    choices,                              // [{text, img, alt}]
    answerIndex,                          // single
    answerIndexes,                        // multiple
    acceptedAnswers,                      // for short
    caseInsensitive: !!q.caseInsensitive,

    // meta
    feedback: String(q.feedback || "").trim(),
    points,
    order: Number.isFinite(q.order) ? q.order : undefined,
  };
}