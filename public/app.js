// /app.js
import { api, auth, db } from "./firebase.js";

// ---------- DOM helpers ----------
const $ = (s) => document.querySelector(s);
const app = $("#app");
const sidebar = $("#sidebar");
const btnMenu = $("#btnMenu");
const btnLogin = $("#btnLogin");
const btnLogout = $("#btnLogout");
const authDlg = $("#authDlg");
const yearEl = $("#year");
yearEl.textContent = new Date().getFullYear();

btnMenu.addEventListener("click", () => sidebar.classList.toggle("open"));
$("#closeAuth")?.addEventListener("click", () => authDlg.close());

// ---------- Auth ----------
$("#doSignUp").addEventListener("click", async (e) => {
  e.preventDefault();
  const email = $("#authEmail").value.trim();
  const pass = $("#authPass").value;
  try {
    await api.createUserWithEmailAndPassword(auth, email, pass);
    authDlg.close();
  } catch (err) {
    alert(err.message);
  }
});

$("#doSignIn").addEventListener("click", async (e) => {
  e.preventDefault();
  const email = $("#authEmail").value.trim();
  const pass = $("#authPass").value;
  try {
    await api.signInWithEmailAndPassword(auth, email, pass);
    authDlg.close();
  } catch (err) {
    alert(err.message);
  }
});

$("#doForgot").addEventListener("click", async () => {
  const email = $("#authEmail").value.trim();
  if (!email) return alert("Enter your email first.");
  try {
    await api.sendPasswordResetEmail(auth, email);
    alert("Password reset email sent. Check your inbox.");
  } catch (err) {
    alert(err.message);
  }
});

const pwInput = $("#authPass");
const pwBtn = $("#pwToggle");
pwBtn.addEventListener("click", () => {
  const on = pwBtn.getAttribute("aria-pressed") === "true";
  pwBtn.setAttribute("aria-pressed", String(!on));
  pwInput.type = on ? "password" : "text";
});

btnLogin.addEventListener("click", () => authDlg.showModal());
btnLogout.addEventListener("click", () => api.signOut(auth));

let currentUser = null;
let currentRole = "guest";
let userSettings = {
  theme: localStorage.getItem("theme") || "dark",
  fontSize: localStorage.getItem("fontSize") || "default",
};
applySettings(userSettings);

api.onAuthStateChanged(auth, async (u) => {
  currentUser = u;
  btnLogin.classList.toggle("hidden", !!u);
  btnLogout.classList.toggle("hidden", !u);
  document
    .querySelectorAll(".auth-only")
    .forEach((el) => el.classList.toggle("hidden", !u));
  await ensureUserDoc();
  const role = await getUserRole();
  currentRole = role;
  document
    .querySelectorAll(".admin-only")
    .forEach((el) =>
      el.classList.toggle("hidden", !(u && (role === "admin" || role === "ta")))
    );
  if (u) userSettings = await loadSettings();
  applySettings(userSettings);
  route();
});

async function ensureUserDoc() {
  if (!currentUser) return;
  const ref = api.doc(db, "users", currentUser.uid);
  const snap = await api.getDoc(ref);
  if (!snap.exists()) {
    await api.setDoc(ref, {
      email: currentUser.email,
      displayName: currentUser.displayName || "",
      role: "student",
      credits: 0,
      settings: { theme: userSettings.theme, fontSize: userSettings.fontSize },
      createdAt: api.serverTimestamp(),
    });
  }
}

async function getUserRole() {
  if (!currentUser) return "guest";
  const ref = api.doc(db, "users", currentUser.uid);
  const snap = await api.getDoc(ref);
  return (snap.exists() && snap.data().role) || "student";
}

async function loadSettings() {
  if (!currentUser) return userSettings;
  const snap = await api.getDoc(api.doc(db, "users", currentUser.uid));
  const s = snap.data()?.settings || {};
  const merged = {
    theme: s.theme || userSettings.theme,
    fontSize: s.fontSize || userSettings.fontSize,
  };
  localStorage.setItem("theme", merged.theme);
  localStorage.setItem("fontSize", merged.fontSize);
  return merged;
}
async function saveSettings(s) {
  userSettings = s;
  localStorage.setItem("theme", s.theme);
  localStorage.setItem("fontSize", s.fontSize);
  if (currentUser) {
    await api.updateDoc(api.doc(db, "users", currentUser.uid), { settings: s });
  }
  applySettings(s);
}
function applySettings(s) {
  document.documentElement.classList.toggle("light", s.theme === "light");
  document.documentElement.style.setProperty(
    "--fs",
    s.fontSize === "small" ? "14px" : s.fontSize === "large" ? "18px" : "16px"
  );
}

// ---------- Router ----------
window.addEventListener("hashchange", route);
window.addEventListener("load", route);

const pages = {
  "#/home": renderHome,
  "#/courses": renderCourses,
  "#/course": renderCourse,
  "#/learn": renderLearn,
  "#/dashboard": renderDashboard,
  "#/shop": renderShop,
  "#/profile": renderProfile,
  "#/admin": renderAdmin,
};

function route() {
  const hash = location.hash || "#/home";
  const parts = hash.split("/"); // ['#', 'home', 'id?']
  const path = `#/${parts[1] || "home"}`;
  const id = parts[2];
  const fn = pages[path] || renderHome;
  fn(id);
  sidebar.classList.remove("open");
}

// ---------- Firestore helpers ----------
async function fetchAnnouncements() {
  const q = api.query(
    api.collection(db, "announcements"),
    api.orderBy("ts", "desc")
  );
  const res = await api.getDocs(q);
  return res.docs.map((d) => ({ id: d.id, ...d.data() }));
}
async function fetchCourses() {
  const q = api.query(
    api.collection(db, "courses"),
    api.orderBy("level", "asc")
  );
  const res = await api.getDocs(q);
  return res.docs.map((d) => ({ id: d.id, ...d.data() }));
}
async function fetchCourse(id) {
  const ref = api.doc(db, "courses", id);
  const s = await api.getDoc(ref);
  return { id: s.id, ...s.data() };
}
async function fetchLessons(courseId) {
  const q = api.query(
    api.collection(db, "lessons"),
    api.where("courseId", "==", courseId),
    api.orderBy("index", "asc")
  );
  const res = await api.getDocs(q);
  return res.docs.map((d) => ({ id: d.id, ...d.data() }));
}
async function fetchQuiz(lessonId) {
  const q = api.query(
    api.collection(db, "quizzes"),
    api.where("lessonId", "==", lessonId)
  );
  const res = await api.getDocs(q);
  return res.docs.map((d) => ({ id: d.id, ...d.data() }));
}
async function getEnrollment(courseId) {
  if (!currentUser) return null;
  const q = api.query(
    api.collection(db, "enrollments"),
    api.where("userId", "==", currentUser.uid),
    api.where("courseId", "==", courseId)
  );
  const res = await api.getDocs(q);
  return res.docs[0] ? { id: res.docs[0].id, ...res.docs[0].data() } : null;
}
async function enroll(course) {
  if (!currentUser) return authDlg.showModal();
  const exists = await getEnrollment(course.id);
  if (exists) return routeToLearn(course.id);
  await api.addDoc(api.collection(db, "enrollments"), {
    userId: currentUser.uid,
    courseId: course.id,
    status: "active",
    progress: 0,
    ts: api.serverTimestamp(),
  });
  routeToLearn(course.id);
}
function routeToLearn(courseId) {
  location.hash = `#/learn/${courseId}`;
}

// ---------- UI Renderers ----------
async function renderHome() {
  const anns = await fetchAnnouncements();
  app.innerHTML = `
    <section class="grid cols-1 cols-2">
      <div class="card">
        <h2>Announcements</h2>
        ${
          anns
            .map(
              (a) => `
          <article class="card" style="margin:.6rem 0">
            <div class="row between">
              <h4>${escapeHtml(a.title || "Update")}</h4>
              <span class="badge">${a.level || "All"}</span>
            </div>
            <p class="muted">${escapeHtml(a.body || "")}</p>
          </article>
        `
            )
            .join("") || '<p class="muted">No announcements yet.</p>'
        }
      </div>
      <div class="card">
        <h2>Why Pāli?</h2>
        <p>Pāli is an ancient language of the Theravāda canon. Interactive lessons, quizzes, and certificates keep you motivated.</p>
        <div class="chips">
          <span class="chip">Beginner → Pro</span>
          <span class="chip">Interactive Quizzes</span>
          <span class="chip">Certificates</span>
          <span class="chip">TA & Master Track</span>
        </div>
      </div>
    </section>
  `;
}

async function renderCourses() {
  const list = await fetchCourses();
  app.innerHTML = `
    <h2>All Courses</h2>
    <div class="grid cols-1 cols-2">
      ${list.map((c) => courseCard(c)).join("") || sampleCourses()}
    </div>
  `;
}
function sampleCourses() {
  const fake = [
    {
      id: "demo-beg",
      title: "Intro to Pāli",
      level: 0,
      credits: 1,
      lessons: 5,
      summary: "Alphabet, pronunciation, simple grammar.",
    },
    {
      id: "demo-int",
      title: "Pāli Grammar I",
      level: 1,
      credits: 2,
      lessons: 8,
      summary: "Cases, verbs, and syntax.",
    },
  ];
  return fake.map((c) => courseCard(c)).join("");
}
function courseCard(c) {
  return `
  <article class="card course-card">
    <div class="cover">${emojiByLevel(c.level)}</div>
    <div>
      <h4>${escapeHtml(c.title)}</h4>
      <div class="meta">
        <span class="chip">${levelName(c.level)}</span>
        <span class="chip">${c.credits || 1} credit(s)</span>
        <span class="chip">${c.lessons || 0} lessons</span>
      </div>
      <p class="muted">${escapeHtml(c.summary || "")}</p>
      <div class="row">
        <button class="btn small" onclick="location.hash='#/course/${
          c.id
        }'">Details</button>
        <button class="btn small ghost" onclick='(${enroll}).call(null, ${JSON.stringify(
    c
  )})'>Enroll</button>
      </div>
    </div>
  </article>`;
}

async function renderCourse(id) {
  // show demo content if no doc
  let c = {
    id,
    title: "Course Details",
    level: 0,
    credits: 1,
    summary: "Demo course page.",
  };
  if (id && !id.startsWith("demo-"))
    try {
      c = await fetchCourse(id);
    } catch {}
  const enrolled = await getEnrollment(c.id);
  app.innerHTML = `
    <section class="card">
      <h2>${escapeHtml(c.title)}</h2>
      <div class="chips">
        <span class="chip">${levelName(c.level)}</span>
        <span class="chip">${c.credits || 1} credit(s)</span>
      </div>
      <p>${escapeHtml(c.summary || "")}</p>
      <div class="row">
        <button class="btn" onclick='(${enroll}).call(null, ${JSON.stringify(
    c
  )})'>${enrolled ? "Continue learning" : "Enroll & Start"}</button>
        <button class="btn ghost" onclick="location.hash='#/courses'">Back</button>
      </div>
    </section>
  `;
}

async function renderLearn(courseId) {
  if (!currentUser) return authDlg.showModal();
  const course =
    courseId && !courseId.startsWith("demo-")
      ? await fetchCourse(courseId)
      : { title: "Demo Course" };
  const lessons =
    courseId && !courseId.startsWith("demo-")
      ? await fetchLessons(courseId)
      : [
          {
            id: "l1",
            courseId: "demo",
            title: "Alphabet",
            content: "<p>Pāli consonants overview…</p>",
          },
          {
            id: "l2",
            courseId: "demo",
            title: "Vowels",
            content: "<p>Short and long vowels…</p>",
          },
        ];
  app.innerHTML = `<section class="card"><h2>${escapeHtml(course.title)}</h2>
    ${lessons.map((l, i) => lessonItem(l, i)).join("")}
  </section>`;
}
function lessonItem(l, idx) {
  return `<article class="card" style="margin:.6rem 0">
    <div class="row between">
      <h4>Lesson ${idx + 1}: ${escapeHtml(l.title)}</h4>
      <button class="btn small" onclick='(${openLesson}).call(null, ${JSON.stringify(
    l
  )})'>Open</button>
    </div>
  </article>`;
}
async function openLesson(lesson) {
  const quiz = lesson.id.startsWith("l")
    ? [
        {
          id: "q1",
          type: "single",
          text: "Which is NOT a Pāli letter?",
          options: ["ka", "ga", "qa", "ca"],
          answer: 2,
        },
        {
          id: "q2",
          type: "short",
          text: "Write ASCII for “Dhamma”.",
          answer: "dhamma",
        },
      ]
    : await fetchQuiz(lesson.id);
  app.innerHTML = `<section class="card">
    <h3>${escapeHtml(lesson.title)}</h3>
    <div class="card" style="margin:.6rem 0">${lesson.content || ""}</div>
    ${renderQuiz(quiz)}
    <div class="row">
      <button class="btn" id="submitQuiz">Submit</button>
      <button class="btn ghost" onclick="history.back()">Back</button>
    </div>
    <p class="muted">Pass (≥ 65%) to unlock next lesson.</p>
  </section>`;
  $("#submitQuiz").addEventListener("click", () => gradeQuiz(lesson, quiz));
}
function renderQuiz(qs) {
  if (!qs.length) return '<p class="muted">No quiz for this lesson yet.</p>';
  return `<ol>${qs.map((q) => quizItem(q)).join("")}</ol>`;
}
function quizItem(q) {
  const id = q.id;
  if (q.type === "single") {
    return `<li class="card"><p><strong>${escapeHtml(q.text)}</strong></p>
      ${(q.options || [])
        .map(
          (opt, i) => `
        <label class="row"><input type="radio" name="q_${id}" value="${i}"> <span>${escapeHtml(
            opt
          )}</span></label>
      `
        )
        .join("")}
    </li>`;
  } else if (q.type === "multiple") {
    return `<li class="card"><p><strong>${escapeHtml(q.text)}</strong></p>
      ${(q.options || [])
        .map(
          (opt, i) => `
        <label class="row"><input type="checkbox" name="q_${id}" value="${i}"> <span>${escapeHtml(
            opt
          )}</span></label>
      `
        )
        .join("")}
    </li>`;
  } else {
    return `<li class="card"><p><strong>${escapeHtml(q.text)}</strong></p>
      <input type="text" name="q_${id}" placeholder="Your answer" class="card" />
    </li>`;
  }
}
async function gradeQuiz(lesson, qs) {
  let correct = 0;
  for (const q of qs) {
    if (q.type === "single") {
      const sel = document.querySelector(`input[name="q_${q.id}"]:checked`);
      if (sel && Number(sel.value) === Number(q.answer)) correct++;
    } else if (q.type === "multiple") {
      const checks = [
        ...document.querySelectorAll(`input[name="q_${q.id}"]:checked`),
      ]
        .map((x) => Number(x.value))
        .sort();
      const ans = (q.answer || []).map(Number).sort();
      if (JSON.stringify(checks) === JSON.stringify(ans)) correct++;
    } else {
      const v = document
        .querySelector(`input[name="q_${q.id}"]`)
        .value.trim()
        .toLowerCase();
      const ans = (q.answer || "").toString().trim().toLowerCase();
      if (v && v === ans) correct++;
    }
  }
  const score = qs.length ? Math.round((correct / qs.length) * 100) : 0;
  const pass = score >= 65;
  alert(`Score: ${score}% — ${pass ? "PASS ✅" : "RETRY ❌"}`);
  if (currentUser) {
    await api.addDoc(api.collection(db, "attempts"), {
      userId: currentUser.uid,
      lessonId: lesson.id,
      score,
      pass,
      ts: api.serverTimestamp(),
    });
  }
  if (pass) {
    history.back();
  }
}

async function renderDashboard() {
  if (!currentUser) return authDlg.showModal();
  app.innerHTML = `
    <section class="grid cols-1 cols-2">
      <div class="card">
        <h3>Your Progress</h3>
        <table class="table">
          <tr><th>Course</th><th>Status</th><th>Open</th></tr>
          <tr><td>Intro to Pāli</td><td>Active</td><td><button class="btn small" onclick="location.hash='#/learn/demo-beg'">Open</button></td></tr>
        </table>
      </div>
      <div class="card">
        <h3>Notes</h3>
        <div id="notesList"></div>
        <button class="btn small" id="addNote">+ New note</button>
      </div>
    </section>
  `;
  // simple client-only notes list to avoid errors when collection empty
  $("#addNote").addEventListener("click", () =>
    alert("Notes feature enabled after first login & Firestore rules.")
  );
}

async function renderShop() {
  app.innerHTML = `
    <h2>Shop</h2>
    <div class="grid cols-1 cols-2">
      <article class="card">
        <h4>Pāli Flashcards</h4>
        <p class="muted">Printable PDF set for beginners.</p>
        <div class="row"><span class="chip">$9.99</span><button class="btn small">Order</button></div>
      </article>
      <article class="card">
        <h4>Certificate (Hard Copy)</h4>
        <p class="muted">Order a printed certificate after completion.</p>
        <div class="row"><span class="chip">$14.99</span><button class="btn small">Order</button></div>
      </article>
    </div>
  `;
}

async function renderProfile() {
  if (!currentUser) return authDlg.showModal();
  const s = userSettings;
  app.innerHTML = `
    <section class="card">
      <h2>Profile & Preferences</h2>
      <div class="grid cols-1 cols-2">
        <div class="card">
          <h3>Theme</h3>
          <div class="row">
            <label><input type="radio" name="theme" value="dark" ${
              s.theme !== "light" ? "checked" : ""
            }/> Dark</label>
            <label><input type="radio" name="theme" value="light" ${
              s.theme === "light" ? "checked" : ""
            }/> Light</label>
          </div>
        </div>
        <div class="card">
          <h3>Font Size</h3>
          <div class="row">
            <label><input type="radio" name="fontSize" value="small" ${
              s.fontSize === "small" ? "checked" : ""
            }/> Small</label>
            <label><input type="radio" name="fontSize" value="default" ${
              s.fontSize === "default" ? "checked" : ""
            }/> Default</label>
            <label><input type="radio" name="fontSize" value="large" ${
              s.fontSize === "large" ? "checked" : ""
            }/> Large</label>
          </div>
        </div>
      </div>
      <div class="row">
        <button id="savePrefs" class="btn">Save</button>
        <button class="btn ghost" onclick="location.hash='#/dashboard'">Back</button>
      </div>
    </section>
  `;
  $("#savePrefs").addEventListener("click", async () => {
    const theme = document.querySelector('input[name="theme"]:checked').value;
    const fontSize = document.querySelector(
      'input[name="fontSize"]:checked'
    ).value;
    await saveSettings({ theme, fontSize });
    alert("Preferences saved.");
  });
}

async function renderAdmin() {
  if (!(currentUser && (currentRole === "admin" || currentRole === "ta")))
    return (app.innerHTML = `<div class="card"><p class="muted">Admins/TAs only.</p></div>`);
  app.innerHTML = `
    <section class="grid cols-1 cols-2">
      <div class="card"><h3>Add Course</h3><p class="muted">Use your existing Admin form (Courses/Lessons/Quizzes/Announcements)…</p></div>
      <div class="card"><h3>Message Students</h3><p class="muted">Coming soon.</p></div>
    </section>
  `;
}

// ---------- Utils ----------
function emojiByLevel(l) {
  return ["🌱", "🌿", "🌳", "🏔️"][Number(l) || 0];
}
function levelName(l) {
  return ["Beginner", "Intermediate", "Advanced", "Pro"][Number(l) || 0];
}
function escapeHtml(s = "") {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c])
  );
}

// switch version
// function escapeHtml(s = '') {
//   return String(s).replace(/[&<>"']/g, (ch) => {
//     switch (ch) {
//       case '&': return '&amp;';
//       case '<': return '&lt;';
//       case '>': return '&gt;';
//       case '"': return '&quot;';
//       case "'": return '&#39;';
//       default:  return ch;
//     }
//   });
// }