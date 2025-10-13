// /js/app.js
import { auth, db, storage } from "./firebase.js";

import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut, // ← ADD THIS
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

import {
  ref as sref,
  uploadBytesResumable,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// ===== Mobile menu toggle (topbar → underbar nav) =====
document.getElementById("btnMenu")?.addEventListener("click", () => {
  document.getElementById("navLinks")?.classList.toggle("open");
});

// Mini guard
function needAdmin(role) {
  if (!(role === "admin" || role === "ta")) {
    alert("Admins only");
    throw new Error("no-admin");
  }
}

// Add Course
document.getElementById("formCourse")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const data = {
    title: f.title.value.trim(),
    level: Number(f.level.value || 0),
    credits: Number(f.credits.value || 0),
    summary: f.summary.value.trim(),
    ts: serverTimestamp(),
  };
  // doc id from slug
  const id = data.title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
  await setDoc(doc(db, "courses", id), data, { merge: true });
  alert("Course saved: " + id);
  f.reset();
});

// Add Lesson
document.getElementById("formLesson")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const courseId = f.courseId.value.trim();
  const payload = {
    order: Number(f.order.value || 1),
    title: f.title.value.trim(),
    readingUrl: f.readingUrl.value.trim(),
    pages: Number(f.pages.value || 22),
    videos: (f.videos.value || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    ts: serverTimestamp(),
  };
  const lessonsCol = collection(db, "courses", courseId, "lessons");
  await addDoc(lessonsCol, payload);
  alert("Lesson saved to " + courseId);
  f.reset();
});

// Add Quiz
document.getElementById("formQuiz")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const courseId = f.courseId.value.trim();
  const lessonId = f.lessonId.value.trim();
  const payload = {
    type: f.type.value,
    text: f.text.value.trim(),
    options: (f.options.value || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    ts: serverTimestamp(),
  };
  await addDoc(
    collection(db, "courses", courseId, "lessons", lessonId, "quizzes"),
    payload
  );
  alert("Quiz saved.");
  f.reset();
});

// ---------- Globals DOM ----------
const $ = (s) => document.querySelector(s);
const appEl = $("#app");

const btnMenu = document.getElementById("btnMenu");
const navLinks = document.getElementById("navLinks");
// const topbar   = document.getElementById('topbar');

// ===== Auth modal behavior =====
const authDlg = document.getElementById("authDlg");
const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");

const doLogin = $("#doLogin");
const doSignup = $("#doSignup");
const doForgot = $("#doForgot");
const closeAuth = $("#closeAuth");

const buyDlg = $("#buyDlg");
$("#closeBuy")?.addEventListener("click", () => buyDlg.close());

const yearEl = $("#year");
if (yearEl) yearEl.textContent = new Date().getFullYear();
document
  .querySelectorAll("[data-route]")
  .forEach((b) =>
    b.addEventListener("click", () => (location.hash = b.dataset.route))
  );

let currentUser = null;
let currentRole = "guest";
let profileCache = null;
currentRole = await getUserRole();

// ---------- Utils ----------
function escapeHtml(s = "") {
  return s.replace(
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

const applyTheme = (v) =>
  (document.documentElement.dataset.theme = v || "pali");
const applyFontSize = (v) => (document.documentElement.dataset.fs = v || "md");

async function ensureUserDoc() {
  if (!auth.currentUser) return;
  const ref = doc(db, "users", auth.currentUser.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(
      ref,
      {
        email: auth.currentUser.email || "",
        displayName: auth.currentUser.displayName || "",
        role: "student",
        credits: 0,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

// ===== Sticky offsets: set --topbarH dynamically =====
// function updateTopbarHeight(){
//   const h = document.getElementById('topbar')?.offsetHeight || 64;
//   document.documentElement.style.setProperty('--topbarH', String(h)); // number only
// }
// window.addEventListener('load', updateTopbarHeight);
// window.addEventListener('resize', updateTopbarHeight);
// new ResizeObserver(updateTopbarHeight).observe(document.getElementById('topbar'));

// ===== Mobile menu toggle =====
const underNav = document.getElementById("underNav");
document.getElementById("btnMenu")?.addEventListener("click", () => {
  underNav?.classList.toggle("open");
});

// Auto-close on link click (mobile)
underNav?.addEventListener("click", (e) => {
  const a = e.target.closest("a.nav-link");
  if (!a) return;
  if (window.innerWidth < 860) underNav.classList.remove("open");
});

/* ✅ Burger toggle */
btnMenu?.addEventListener("click", () => {
  const open = navLinks?.classList.toggle("open");
  btnMenu.setAttribute("aria-expanded", open ? "true" : "false");
});

navLinks?.querySelectorAll("a.nav-link").forEach((a) => {
  a.addEventListener("click", () => {
    navLinks.classList.remove("open");
    btnMenu?.setAttribute("aria-expanded", "false");
  });
});

// Link တစ်ခုနှိပ်လျှင် panel ပိတ် + active state update
function setActiveNav() {
  // const cur = location.hash || '#/';
  const cur = location.hash.split("?")[0] || "#/";
  document.querySelectorAll(".nav-link").forEach((a) => {
    const href = a.getAttribute("href");
    a.classList.toggle("active", href === cur);
  });
}

/* Nav link တစ်ခုကနေ navigate လုပ်ချိန် panel ပိတ် */
navLinks?.addEventListener("click", (e) => {
  const a = e.target.closest("a.nav-link");
  if (!a) return;
  navLinks.classList.remove("open");
  btnMenu?.setAttribute("aria-expanded", "false");
  // active သတ်မှတ်
  setTimeout(setActiveNav, 0);
});
window.addEventListener("hashchange", setActiveNav);
window.addEventListener("load", setActiveNav);

// keyboard: Space/Enter နဲ့ burger toggle
btnMenu?.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    btnMenu.click();
  }
});

// ===== Router (single, duplicate-safe) =====
if (!window.__APP_ROUTER__) {
  window.__APP_ROUTER__ = true;

  window.route = async function route() {
    const hash = location.hash.replace(/^#/, "") || "/";
    if (hash === "/") return renderHome?.();
    if (hash.startsWith("/courses")) return renderCourses?.();
    if (hash.startsWith("/dashboard")) return renderDashboard?.();
    if (hash.startsWith("/admin")) return renderAdmin?.();
    if (hash.startsWith("/profile")) return renderProfile?.();
    if (hash.startsWith("/settings")) return renderSettings?.();
    if (hash.startsWith("/certs")) return renderCertificates?.();
    if (hash.startsWith("/transcripts")) return renderTranscripts?.();
    return renderNotFound?.();
  };

  window.addEventListener("hashchange", window.route);
  window.addEventListener("load", window.route);
}

function defaultsProfile(d = {}) {
  return {
    name: "",
    dob: "",
    email: currentUser?.email || "",
    contact: "",
    address: "",
    education: "",
    portfolio: "",
    github: "",
    socials: "",
    skills: "",
    theme: "pali",
    fontSize: "md",
    photoURL: "",
    ...d,
  };
}

// Logout button
// document.getElementById('btnLogout')?.addEventListener('click', async () => {
//   try {
//     await signOut(auth);                  // ← use the imported signOut
//     // UI cleanup after logout (optional)
//     document.getElementById('underNav')?.classList.remove('open');
//     // route() ကို သင့်စနစ်တက် ပြန်ခေါ်ချင်ရင်
//     // route();
//   } catch (e) {
//     console.error(e);
//     alert("Logout failed: " + (e?.message || ""));
//   }
// });
document
  .getElementById("btnLogout")
  ?.addEventListener("click", () => signOut(auth));
document
  .getElementById("btnLogout_m")
  ?.addEventListener("click", () => signOut(auth));

/* ✅ Auth visibility helper (guest/student/admin menu gating) */
function applyAuthVisibility(user, role) {
  const authed = !!user;
  const isStaff = authed && (String(role) === "admin" || String(role) === "ta");

  // auth-only / admin-only gating
  document
    .querySelectorAll(".auth-only")
    .forEach((el) => el.classList.toggle("hidden", !authed));

  document
    .querySelectorAll(".admin-only")
    .forEach((el) => el.classList.toggle("hidden", !isStaff));

  // buttons (desktop + mobile)
  document.getElementById("btnLogin")?.classList.toggle("hidden", authed);
  document.getElementById("btnLogout")?.classList.toggle("hidden", !authed);
  document.getElementById("btnLogin_m")?.classList.toggle("hidden", authed);
  document.getElementById("btnLogout_m")?.classList.toggle("hidden", !authed);
}

// ✅ getUserRole() — current user’s role ကို Firestore မှာ query လုပ်ပြီး ပြန်ပေးမယ်
async function getUserRole() {
  if (!auth.currentUser) return "guest";
  try {
    const ref = doc(db, "users", auth.currentUser.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      return data.role || "student"; // default = student
    } else {
      return "student";
    }
  } catch (err) {
    console.error("getUserRole error:", err);
    return "guest";
  }
}

async function loadProfile() {
  if (!auth.currentUser) return defaultsProfile();
  const ref = doc(db, "users", auth.currentUser.uid);
  const snap = await getDoc(ref);
  profileCache = defaultsProfile(snap.exists() ? snap.data() : {});
  return profileCache;
}
async function saveProfile(patch = {}) {
  if (!auth.currentUser) throw new Error("Not logged in");
  const ref = doc(db, "users", auth.currentUser.uid);
  await setDoc(ref, patch, { merge: true });
  profileCache = defaultsProfile({ ...(profileCache || {}), ...patch });
  return profileCache;
}

// ---------- Auth UI ----------
btnLogin?.addEventListener("click", () => authDlg?.showModal());
document
  .getElementById("btnAuthCancel")
  ?.addEventListener("click", () => authDlg?.close());
document
  .getElementById("closeAuth")
  ?.addEventListener("click", () => authDlg?.close());

// Tabs
(() => {
  const tabs = document.querySelectorAll(".auth-card .tab");
  const email = document.getElementById("authEmail");
  const pw = document.getElementById("authPassword");
  let mode = "login";
  tabs.forEach((t) =>
    t.addEventListener("click", () => {
      tabs.forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
      mode = t.dataset.mode;
      // forgot mode → hide password
      document.querySelector(".pw").style.display =
        mode === "forgot" ? "none" : "block";
    })
  );

  // password eye toggle
  document.getElementById("togglePw")?.addEventListener("click", () => {
    pw.type = pw.type === "password" ? "text" : "password";
  });

  // submit
  document.getElementById("authForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = document.getElementById("authError");
    errEl.classList.add("hidden");
    errEl.textContent = "";
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email.value, pw.value);
        authDlg.close();
      } else if (mode === "signup") {
        const { user } = await createUserWithEmailAndPassword(
          auth,
          email.value,
          pw.value
        );
        // create base user doc if not exist
        await setDoc(
          doc(db, "users", user.uid),
          { email: user.email, role: "student", createdAt: serverTimestamp() },
          { merge: true }
        );
        authDlg.close();
      } else {
        // forgot
        await sendPasswordResetEmail(auth, email.value);
        errEl.textContent = "Reset link sent to your email.";
        errEl.classList.remove("hidden");
      }
    } catch (e) {
      errEl.textContent = e.message || "Something went wrong";
      errEl.classList.remove("hidden");
    }
  });
})();

$("#btnEmailLogin")?.addEventListener("click", async () => {
  const email = $("#email").value.trim(),
    pass = $("#password").value;
  try {
    await authApi.signInWithEmailAndPassword(auth, email, pass);
    authDlg.close();
  } catch (e) {
    alert(e.message);
  }
});
$("#btnEmailSignup")?.addEventListener("click", async () => {
  const email = $("#email").value.trim(),
    pass = $("#password").value;
  try {
    await authApi.createUserWithEmailAndPassword(auth, email, pass);
    authDlg.close();
  } catch (e) {
    alert(e.message);
  }
});
$("#btnForgot")?.addEventListener("click", async () => {
  const email = $("#email").value.trim();
  try {
    await authApi.sendPasswordResetEmail(auth, email);
    alert("Reset email sent.");
  } catch (e) {
    alert(e.message);
  }
});
$("#btnGithub")?.addEventListener("click", async () => {
  try {
    await authApi.signInWithPopup(auth, providers.github);
    authDlg.close();
  } catch (e) {
    alert(e.message);
  }
});
btnLogout?.addEventListener("click", async () => {
  try {
    await authApi.signOut(auth);
  } catch (e) {
    console.error(e);
  }
});

doLogin?.addEventListener("click", async () => {
  const email = $("#authEmail").value.trim();
  const pass = $("#authPass").value;
  await signInWithEmailAndPassword(auth, email, pass);
  authDlg.close();
});
doSignup?.addEventListener("click", async () => {
  const email = $("#authEmail").value.trim();
  const pass = $("#authPass").value;
  await createUserWithEmailAndPassword(auth, email, pass);
  authDlg.close();
});
doForgot?.addEventListener("click", async () => {
  const email = $("#authEmail").value.trim();
  await sendPasswordResetEmail(auth, email);
  alert("Password reset email sent.");
});

// mobile toggle
document.getElementById("btnMenu")?.addEventListener("click", () => {
  document.getElementById("navLinks")?.classList.toggle("open");
});

// role-based gating
function gateNavByAuth(user, role = "guest") {
  // login/logout buttons
  document.getElementById("btnLogin")?.classList.toggle("hidden", !!user);
  document.getElementById("btnLogout")?.classList.toggle("hidden", !user);

  // auth-only links (Dashboard/Profile/Settings/Certificates/Transcripts)
  document
    .querySelectorAll(".auth-only")
    .forEach((el) => el.classList.toggle("hidden", !user));

  // admin-only (Admin)
  const isStaff = role === "admin" || role === "ta";
  document
    .querySelectorAll(".admin-only")
    .forEach((el) => el.classList.toggle("hidden", !isStaff));
}

onAuthStateChanged(auth, async (u) => {
  currentUser = u || null;

  let role = "guest";
  if (u) {
    try {
      role = await getUserRole(); // users/{uid}.role ကနေ ယူတာ
      if (!role) role = "student"; // fallback
      console.log("✅ Logged in as:", u.email, "Role:", role);
    } catch (e) {
      console.warn('getUserRole failed, fallback to "student"', e);
      role = "student";
    }
  } else {
    console.log("🚪 Logged out");
  }
  currentRole = role;

  // UI gating + active nav update
  applyAuthVisibility(currentUser, currentRole);
  if (typeof setActiveNav === "function") setActiveNav();

  // nav gating (function ရှိမရှိစစ်ပြီး ခေါ်)
  if (typeof gateNavByAuth === "function") {
    gateNavByAuth(currentUser, currentRole);
  }

  // route render (hashchange/load ကနေ route ခေါ်ထားရင် ဒီလို guard လုပ်ချင်ရင်)
  if (!window.__ROUTE_LOCK__) {
    window.__ROUTE_LOCK__ = true;
    try {
      route && route();
    } finally {
      window.__ROUTE_LOCK__ = false;
    }
  }
});

// logout
document
  .getElementById("btnLogout")
  ?.addEventListener("click", () => signOut(auth));

// ---------- Home ----------
function renderHome() {
  appEl.innerHTML = `
    <section class="card hero">
      <img src="/icons/icon-192.png" alt="Lotus">
      <div>
        <h1>Pāli Lessons</h1>
        <p class="muted">Ancient language, modern learning — Explore structured Pāli courses from Beginner to Pro.</p>
        <div class="list">
          <span class="badge">Beginner → Pro</span>
          <span class="badge">Gated quizzes</span>
          <span class="badge">Certificates (≥65%)</span>
          <span class="badge">Shop & PayPal</span>
        </div>
      </div>
    </section>

    <section class="grid cards" id="homeCourses"></section>
  `;
  renderCourseCards("#homeCourses");
}
// async function renderCourseCards(){
//   const q = query(collection(db, "courses"), orderBy("level","asc"), orderBy("title","asc"));
//   const snap = await getDocs(q);
//   let html = `<section class="grid">`;
//   snap.forEach(d=>{
//     const c = d.data();
//     html += `
//       <article class="card">
//         <div class="row" style="justify-content:space-between;align-items:baseline">
//           <h3 style="margin:0">${c.title}</h3>
//           <span class="badge">${["Beginner","Intermediate","Advanced","Pro"][c.level||0]}</span>
//         </div>
//         <p class="muted">${c.summary||""}</p>
//         <div class="row">
//           <button class="btn" data-buy="${d.id}" data-price="${(c.price||0).toFixed(2)}">Buy $${(c.price||0).toFixed(2)}</button>
//           <a class="btn ghost" href="#/courses/${d.id}">Details</a>
//         </div>
//       </article>
//     `;
//   });
//   html += `</section>`;
//   app.innerHTML += html;

//   // attach PayPal buy buttons on click
//   app.querySelectorAll("button[data-buy]").forEach(btn=>{
//     btn.addEventListener("click", ()=> openBuyDialog(btn.dataset.buy, btn.dataset.price));
//   });
// }
// ---------- Courses (cards) ----------
async function renderCourseCards(sel) {
  const host = document.querySelector(sel);
  host.innerHTML = "";
  let items = [];

  // မူရင်း multi-orderBy (index လိုအပ်)
  const qIndexed = query(
    collection(db, "courses"),
    orderBy("level", "asc"),
    orderBy("title", "asc")
  );

  try {
    const snap = await getDocs(qIndexed);
    snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
  } catch (e) {
    // ✅ index build အဆင်ပြေနေတာ မဟုတ်တယ် => fallback
    console.warn("[courses] indexed query failed, fallback:", e.message);

    // index မလိုအောင် orderBy တစ်ခုပဲ အသုံးပြု
    const qSimple = query(collection(db, "courses"), orderBy("level", "asc"));
    const snap = await getDocs(qSimple);
    snap.forEach((d) => items.push({ id: d.id, ...d.data() }));

    // ဒုတိယ sort ကို client-side မှာလုပ် (level → title)
    items.sort(
      (a, b) =>
        a.level - b.level ||
        String(a.title || "").localeCompare(String(b.title || ""))
    );
  }

  for (const c of items) {
    host.insertAdjacentHTML(
      "beforeend",
      `
      <article class="card">
        <h3>${c.title || ""}</h3>
        <p class="muted">${c.summary || ""}</p>
        <div class="row-2">
          <span class="badge">Level ${c.level}</span>
          <span class="badge">${c.credits || 0} credits</span>
        </div>
        <div class="row-2" style="margin-top:.6rem">
          <button class="btn small" data-action="preview" data-id="${
            c.id
          }">Details</button>
          <button class="btn small ghost" data-action="enroll" data-id="${
            c.id
          }">Enroll</button>
        </div>
      </article>
    `
    );
  }

  host
    .querySelectorAll("button[data-action='preview']")
    .forEach((b) =>
      b.addEventListener("click", (e) => openCourse(e.target.dataset.id))
    );
  host
    .querySelectorAll("button[data-action='enroll']")
    .forEach((b) =>
      b.addEventListener("click", (e) => enrollCourse(e.target.dataset.id))
    );
}

// import { jsPDF } from "jspdf";

function makeCertPDF({ name, courseTitle, score }) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("l", "pt", "a4");

  // background + border
  doc.setFillColor(255, 255, 255); // white bg (no fade)
  doc.rect(0, 0, 842, 595, "F");
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(4);
  doc.rect(24, 24, 842 - 48, 595 - 48);

  // title + text
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.text("Certificate of Completion", 842 / 2, 120, { align: "center" });

  doc.setFontSize(22);
  doc.text(name || "Student Name", 842 / 2, 175, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.text("has successfully completed", 842 / 2, 205, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(courseTitle || "Course Title", 842 / 2, 235, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.text(`Score: ${score ?? 0}%`, 842 / 2, 265, { align: "center" });

  const issued = new Date().toLocaleDateString();
  doc.setFontSize(12);
  doc.text(`Issued: ${issued}`, 842 / 2, 520, { align: "center" });

  doc.save(`certificate-${(courseTitle || "course").replace(/\s+/g, "-")}.pdf`);
}

async function renderStudentDashboard() {
  if (!auth.currentUser) {
    return;
  }
  const uid = auth.currentUser.uid;

  // Enrollments (progress per course)
  const q1 = query(collection(db, 'users', uid, 'enrollments'), orderBy('ts','desc'));
  const snap1 = await getDocs(q1);
  const courses = [];
  for (const d of snap1.docs) {
    const e = d.data();
    courses.push(e);
  }

  const wrap = document.getElementById("myCourses");
  wrap.innerHTML =
    courses
      .map((e) => {
        const pcent = Math.round(
          ((e.progress || 0) / (e.totalLessons || 12)) * 100
        );
        return `
      <div class="item">
        <div class="row">
          <strong>${e.courseTitle || e.courseId}</strong>
          <span>${e.progress || 0} / ${e.totalLessons || 12} lessons</span>
        </div>
        <div class="progress"><i style="width:${pcent}%"></i></div>
      </div>
    `;
      })
      .join("") || '<p class="muted">No enrollments yet.</p>';

  // Certificates
  const q2 = query(collection(db, "certificates"), where("userId", "==", uid)); // client sort if needed
  const snap2 = await getDocs(q2);
  const certs = [];
  for (const d of snap2.docs) {
    certs.push({ id: d.id, ...d.data() });
  }

  const certWrap = document.getElementById("myCerts");
  certWrap.innerHTML =
    certs
      .map(
        (c) => `
    <div class="item">
      <div class="row">
        <strong>${c.courseId}</strong>
        <span>Score: <b>${c.score || "-"}</b></span>
      </div>
      <div class="row">
        <small>${new Date(
          c.ts?.seconds * 1000 || Date.now()
        ).toLocaleString()}</small>
        ${
          c.pdfUrl
            ? `<a class="btn" href="${c.pdfUrl}" target="_blank" rel="noopener">Download PDF</a>`
            : ""
        }
      </div>
    </div>
  `
      )
      .join("") || '<p class="muted">No certificates yet.</p>';

  const name = userProfile?.name || auth.currentUser?.displayName || "Student";
  const courseTitle = "Pāli Beginner — Module 1";
  const score = 82;

  appEl.innerHTML = `
    <section class="card">
      <h2>My Dashboard</h2>
      <!-- ...progress widgets... -->
      <div class="row" style="gap:.5rem;margin-top:1rem">
        <button id="btnCert" class="btn">Download Certificate (PDF)</button>
      </div>
    </section>
  `;

  // ✅ button → PDF
  document.getElementById("btnCert")?.addEventListener("click", () => {
    makeCertPDF({ name, courseTitle, score });
  });
}

// ✅ place this once, after renderStudentDashboard is declared (or right after it)
window.renderDashboard = function renderDashboard() {
  return renderStudentDashboard();
};

function renderCourses() {
  appEl.innerHTML = `<h2>Courses</h2><section class="grid cards" id="courseList"></section>`;
  renderCourseCards("#courseList");
}

function $$(s) {
  return document.querySelector(s);
}
function openBuyDialog(courseId, price) {
  const buyDlg = $("#buyDlg");
  $("#buyTitle").textContent = `Purchase course – $${price}`;
  buyDlg?.showModal();

  const mount = $("#paypal-buttons");
  if (!mount) {
    alert("Mount not found");
    return;
  }
  mount.innerHTML = "";

  if (!window.paypal) {
    mount.innerHTML = "<p class='muted'>PayPal SDK not loaded.</p>";
    return;
  }

  window.paypal
    .Buttons({
      style: {
        layout: "vertical",
        color: "gold",
        shape: "rect",
        label: "paypal",
      },
      createOrder(_, actions) {
        return actions.order.create({
          purchase_units: [
            { amount: { value: String(price) }, custom_id: courseId },
          ],
        });
      },
      async onApprove(data, actions) {
        const details = await actions.order.capture();
        const u = auth.currentUser;
        await fetch("/verifyPayPal", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": u?.uid || "",
          },
          body: JSON.stringify({ orderId: data.orderID, courseId }),
        })
          .then((r) => r.json())
          .catch(() => ({ ok: false }));

        alert("Payment verified. You're enrolled!");
        buyDlg?.close();
        location.hash = "#/dashboard";
      },
      onError(err) {
        console.error(err);
        alert("PayPal error.");
      },
    })
    .render(mount);
}
window.openBuyDialog = openBuyDialog;

// ✅ Enroll (writes to users/{uid}/enrollments/{courseId})
async function enrollCourse(courseOrId) {
  try {
    if (!db) {
      alert("App not initialized (db). Refresh.");
      return;
    }
    const user = auth?.currentUser;
    if (!user) {
      window.authDlg?.showModal?.();
      return;
    }
    const uid = user.uid;

    // Normalize id/object
    let courseId = "";
    let course = null;
    if (typeof courseOrId === "string") {
      courseId = courseOrId.trim();
    } else if (courseOrId && typeof courseOrId === "object") {
      course = courseOrId;
      courseId = course.id || course.courseId || "";
    }
    if (!courseId) {
      alert("Cannot enroll: missing course id.");
      return;
    }

    // Get course data if not provided
    if (!course) {
      const cRef = doc(db, "courses", courseId);
      const cSnap = await getDoc(cRef);
      if (!cSnap.exists()) {
        alert("Course not found.");
        return;
      }
      course = { id: cSnap.id, ...cSnap.data() };
    }

    // Subcollection path: users/{uid}/enrollments/{courseId}
    const enrRef = doc(db, "users", uid, "enrollments", courseId);
    await setDoc(
      enrRef,
      {
        userId: uid,
        courseId,
        courseTitle: course.title || "",
        level: typeof course.level === "number" ? course.level : 0,
        status: "enrolled",
        progress: 0,
        ts: serverTimestamp(),
      },
      { merge: true }
    );

    // Success
    if (window.toast) toast(`Enrolled in ${course.title || "course"} 🎉`);
    else alert(`Enrolled in ${course.title || "course"} 🎉`);
    location.hash = "#/dashboard";
  } catch (err) {
    console.error("[enrollCourse] Failed:", err);
    if (
      String(err?.message || "").includes("Missing or insufficient permissions")
    ) {
      alert(
        "Permission denied: check Firestore rules for users/{uid}/enrollments/* create/read."
      );
    } else {
      alert("Enroll failed: " + (err?.message || err));
    }
  }
}
window.enrollCourse = enrollCourse;

async function loadMyEnrollments() {
  const u = auth?.currentUser;
  if (!u) return [];
  const q = query(
    collection(db, "users", u.uid, "enrollments"),
    orderBy("ts", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
window.loadMyEnrollments = loadMyEnrollments;

async function openCourse(courseId) {
  const ref = doc(db, "courses", courseId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    alert("Not found");
    return;
  }
  const c = { id: snap.id, ...snap.data() };
  appEl.innerHTML = `
    <article class="card">
      <h2>${escapeHtml(c.title)}</h2>
      <p class="muted">${escapeHtml(c.summary || "")}</p>
      <div id="lessonList" class="list"></div>
    </article>
  `;
  const lq = query(
    collection(db, "lessons"),
    where("courseId", "==", c.id),
    orderBy("index", "asc")
  );
  const ls = await getDocs(lq);
  const host = $("#lessonList");
  ls.forEach((docu) => {
    const L = { id: docu.id, ...docu.data() };
    host.insertAdjacentHTML(
      "beforeend",
      `
      <div class="card">
        <div class="row-2"><strong>Lesson ${
          L.index + 1
        }:</strong><span>${escapeHtml(L.title)}</span></div>
        <button class="btn small" data-action="start" data-id="${
          L.id
        }">Open</button>
      </div>
    `
    );
  });
  host
    .querySelectorAll("button[data-action='start']")
    .forEach((b) =>
      b.addEventListener("click", (e) => openLesson(e.target.dataset.id))
    );
}

async function openLesson(lessonId) {
  if (!auth.currentUser) {
    authDlg.showModal();
    return;
  }
  const ref = doc(db, "lessons", lessonId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    alert("Not found");
    return;
  }
  const L = { id: snap.id, ...snap.data() };

  // quiz gate (single or multiple choice demo)
  const qq = query(
    collection(db, "quizzes"),
    where("lessonId", "==", L.id),
    orderBy("ts", "asc")
  );
  const qs = await getDocs(qq);
  let qHtml = "";
  qs.forEach((qd) => {
    const q = { id: qd.id, ...qd.data() };
    if (q.type === "mc") {
      qHtml += `<div class="card"><p><strong>Q:</strong> ${escapeHtml(
        q.text
      )}</p>
      ${(q.options || [])
        .map(
          (opt, i) =>
            `<label><input type="radio" name="q_${
              q.id
            }" value="${i}"> ${escapeHtml(opt)}</label>`
        )
        .join("<br>")}
      </div>`;
    } else {
      qHtml += `<div class="card"><p><strong>Q:</strong> ${escapeHtml(
        q.text
      )}</p>
      <input data-free id="q_${q.id}" placeholder="Your answer"></div>`;
    }
  });

  appEl.innerHTML = `
    <article class="card">
      <h2>${escapeHtml(L.title)}</h2>
      <div class="card">${L.content || ""}</div>
      <h3>Quiz</h3>
      ${qHtml || "<p class='muted'>No questions yet</p>"}
      <div class="row-2" style="margin-top:.6rem">
        <button class="btn" id="btnSubmitQuiz">Submit</button>
        <button class="btn ghost" onclick="history.back()">Back</button>
      </div>
    </article>
  `;

  $("#btnSubmitQuiz")?.addEventListener("click", async () => {
    // simple scoring with public keys collection (admin-only)
    const keySnap = await getDoc(doc(db, "quizKeys", L.id));
    let score = 0,
      total = 0;
    if (keySnap.exists()) {
      const key = keySnap.data();
      for (const [qid, ans] of Object.entries(key)) {
        total++;
        const selected = document.querySelector(
          `input[name='q_${qid}']:checked`
        );
        const free = document.getElementById(`q_${qid}`);
        const val = selected
          ? Number(selected.value)
          : free
          ? free.value.trim()
          : "";
        if (String(val) === String(ans)) score++;
      }
    }
    const pct = total ? Math.round((score / total) * 100) : 0;
    const passed = pct >= 65;
    await addDoc(collection(db, "users", uid, "attempts"), {
      userId: auth.currentUser.uid,
      lessonId: L.id,
      score: pct,
      pass: passed,
      ts: serverTimestamp(),
    });
    alert(`Score: ${pct}% ${passed ? "✅ pass" : "❌ fail"}`);
  });
}

// ---------- Dashboard ----------
async function renderDashboard() {
  const user = auth?.currentUser;
  if (!user) {
    authDlg?.showModal?.();
    return;
  }

  const appEl = document.getElementById("app");
  appEl.innerHTML = `
    <section class="card max">
      <h2>Dashboard</h2>

      <div class="grid-2">
        <div>
          <h3>Announcements</h3>
          <div id="annList">Loading…</div>
        </div>

        <div>
          <h3>Messages</h3>
          <div id="msgList">Loading…</div>
        </div>
      </div>
    </section>
  `;

  /* -------------------- Announcements (public) -------------------- */
  try {
    // single-field orderBy သာမန်အတွက် composite index မလို
    const aq = query(collection(db, "announcements"), orderBy("ts", "desc"));
    const as = await getDocs(aq);

    const annBox = document.getElementById("annList");
    if (as.empty) {
      annBox.innerHTML = `<div class="card muted">No announcements.</div>`;
    } else {
      annBox.innerHTML = "";
      as.forEach((d) => {
        const a = d.data();
        annBox.insertAdjacentHTML(
          "beforeend",
          `
            <article class="card">
              <strong>${escapeHtml(a.title || "")}</strong>
              <p class="muted" style="margin:.25rem 0">
                ${a.ts?.toDate ? a.ts.toDate().toLocaleString() : ""}
              </p>
              <p>${escapeHtml(a.body || "")}</p>
            </article>
          `
        );
      });
    }
  } catch (e) {
    console.error("[dashboard] announcements:", e);
    document.getElementById(
      "annList"
    ).innerHTML = `<div class="card error">Announcements unavailable.</div>`;
  }

  /* -------------------- Messages (to me + broadcast '*') -------------------- */
  try {
    // composite index မတောင်းအောင်: where + client-side sort
    const mineQ = query(
      collection(db, "messages"),
      where("to", "==", user.uid)
    );
    const allQ = query(collection(db, "messages"), where("to", "==", "*"));

    const [mineSnap, broadSnap] = await Promise.all([
      getDocs(mineQ),
      getDocs(allQ),
    ]);

    const items = [];
    mineSnap.forEach((d) => items.push({ id: d.id, ...d.data() }));
    broadSnap.forEach((d) => items.push({ id: d.id, ...d.data() }));

    // robust sort by timestamp
    items.sort((a, b) => {
      const ta = a.ts?.toMillis ? a.ts.toMillis() : (a.ts?.seconds || 0) * 1000;
      const tb = b.ts?.toMillis ? b.ts.toMillis() : (b.ts?.seconds || 0) * 1000;
      return tb - ta;
    });

    const msgBox = document.getElementById("msgList");
    if (!items.length) {
      msgBox.innerHTML = `<div class="card muted">No messages.</div>`;
    } else {
      msgBox.innerHTML = items
        .map(
          (m) => `
        <article class="card">
          <p class="muted" style="margin:0 0 .25rem">
            ${m.ts?.toDate ? m.ts.toDate().toLocaleString() : ""}
          </p>
          <p>${escapeHtml(m.text || "")}</p>
        </article>
      `
        )
        .join("");
    }
  } catch (e) {
    console.error("[dashboard] messages:", e);
    document.getElementById(
      "msgList"
    ).innerHTML = `<div class="card error">Messages unavailable.</div>`;
  }
}

// ---------- Admin (CRUD) ----------
function requireStaff() {
  const ok = currentUser && (currentRole === "admin" || currentRole === "ta");
  if (!ok) {
    document.getElementById(
      "app"
    ).innerHTML = `<div class="card">Admin only.</div>`;
    return false;
  }
  return true;
}

async function renderAdmin() {
  if (!requireStaff()) return;
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="card max">
      <h2>Admin Console</h2>
      <div class="tabs">
        <button class="tab is-active" data-tab="courses">Courses</button>
        <button class="tab" data-tab="ann">Announcements</button>
        <button class="tab" data-tab="msg">Message Students</button>
      </div>

      <div id="tab-courses">
        <form id="formCourse" class="form grid-2">
          <label>Title <input name="title" required></label>
          <label>Level
            <select name="level">
              <option value="0">Beginner</option>
              <option value="1">Intermediate</option>
              <option value="2">Advanced</option>
              <option value="3">Pro</option>
            </select>
          </label>
          <label>Credits <input name="credits" type="number" min="0" value="10"></label>
          <label>Summary <textarea name="summary" class="summary-lg"></textarea></label>
          <button class="btn" type="submit">Save course</button>
        </form>
        <div id="adminCourses" class="grid"></div>
      </div>

      <div id="tab-ann" class="hidden">
        <form id="formAnn" class="form">
          <label>Title <input name="title" required></label>
          <label>Level
            <select name="level">
              <option value="*">All</option>
              <option value="0">Beginner</option>
              <option value="1">Intermediate</option>
              <option value="2">Advanced</option>
              <option value="3">Pro</option>
            </select>
          </label>
          <label>Body <textarea name="body" class="summary-lg"></textarea></label>
          <button class="btn" type="submit">Publish</button>
        </form>
        <div id="adminAnns" class="stack"></div>
      </div>

      <div id="tab-msg" class="hidden">
        <form id="formMsg" class="form">
          <label>To
            <input name="to" placeholder="user uid or * for broadcast" required>
          </label>
          <label>Message <textarea name="text" required></textarea></label>
          <button class="btn" type="submit">Send</button>
        </form>
        <div id="adminMsgs" class="stack"></div>
      </div>
    </section>
  `;

  // tabs
  app.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      app
        .querySelectorAll(".tab")
        .forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const k = btn.dataset.tab;
      app
        .querySelector("#tab-courses")
        .classList.toggle("hidden", k !== "courses");
      app.querySelector("#tab-ann").classList.toggle("hidden", k !== "ann");
      app.querySelector("#tab-msg").classList.toggle("hidden", k !== "msg");
    });
  });

  // CRUD — Courses
  document
    .getElementById("formCourse")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      const data = {
        title: f.title.value.trim(),
        level: Number(f.level.value || 0),
        credits: Number(f.credits.value || 0),
        summary: f.summary.value.trim(),
        ts: serverTimestamp(),
      };
      await addDoc(collection(db, "courses"), data);
      f.reset();
      loadAdminCourses();
    });

  async function loadAdminCourses() {
    const box = document.getElementById("adminCourses");
    box.innerHTML = "";
    const snap = await getDocs(
      query(collection(db, "courses"), orderBy("title", "asc"))
    );
    snap.forEach((d) => {
      const c = d.data();
      box.insertAdjacentHTML(
        "beforeend",
        `
        <article class="card">
          <h3>${c.title}</h3>
          <p class="muted">${c.summary || ""}</p>
          <div class="row-2">
            <span class="badge">Level ${c.level}</span>
            <span class="badge">${c.credits || 0} credits</span>
          </div>
          <div class="row">
            <button class="btn small" data-action="edit-course" data-edit="${
              d.id
            }">Edit</button>
            <button class="btn small danger" data-action="delete-course" data-del="${
              d.id
            }">Delete</button>
          </div>
        </article>
      `
      );
    });
    // delete
    box.querySelectorAll("[data-del]").forEach((b) => {
      b.addEventListener("click", async () => {
        await deleteDoc(doc(db, "courses", b.dataset.del));
        loadAdminCourses();
      });
    });
    // (edit flow ကိုနောက်တစ်ဖက် ဆက်ဖြည့်နိုင်)
  }
  loadAdminCourses();

  // event delegation (once)
  const adminList = document.getElementById("adminCourseList"); // container id you render into
  if (adminList && !adminList.__wired) {
    adminList.__wired = true;
    adminList.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      const act = btn.getAttribute("data-action");

      if (act === "edit-course") {
        openCourseEditor(id); // -> ပဲလုပ်သင့်တဲ့ function (form ဖြင့်နေရာတစ်ခုကို ပြ)
      } else if (act === "delete-course") {
        if (confirm("Delete this course?")) {
          await deleteCourse(id);
          renderAdmin(); // refresh list
        }
      }
    });
  }

  // Announcements
  document.getElementById("formAnn").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const data = {
      title: f.title.value.trim(),
      level: f.level.value, // '*' or '0..3'
      body: f.body.value.trim(),
      ts: serverTimestamp(),
    };
    await addDoc(collection(db, "announcements"), data);
    f.reset();
    loadAdminAnns();
  });

  async function loadAdminAnns() {
    const box = document.getElementById("adminAnns");
    box.innerHTML = "";
    const snap = await getDocs(
      query(collection(db, "announcements"), orderBy("ts", "desc"))
    );
    snap.forEach((d) => {
      const a = d.data();
      box.insertAdjacentHTML(
        "beforeend",
        `
        <div class="card">
          <strong>${a.title}</strong>
          <div class="muted">Level: ${a.level}</div>
          <p>${a.body}</p>
          <button class="btn small danger" data-del="${d.id}">Delete</button>
        </div>
      `
      );
    });
    box.querySelectorAll("[data-del]").forEach((b) => {
      b.addEventListener("click", async () => {
        await deleteDoc(doc(db, "announcements", b.dataset.del));
        loadAdminAnns();
      });
    });
  }
  loadAdminAnns();

  // Message Students
  document.getElementById("formMsg").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const msg = {
      from: currentUser.uid,
      to: f.to.value.trim(), // uid or "*"
      text: f.text.value.trim(),
      ts: serverTimestamp(),
    };
    await addDoc(collection(db, "messages"), msg);
    f.reset();
    loadAdminMsgs();
  });

  async function loadAdminMsgs() {
    const box = document.getElementById("adminMsgs");
    box.innerHTML = "";
    const snap = await getDocs(
      query(collection(db, "messages"), orderBy("ts", "desc"))
    );
    snap.forEach((d) => {
      const m = d.data();
      box.insertAdjacentHTML(
        "beforeend",
        `
        <div class="card">
          <div><strong>To:</strong> ${m.to}</div>
          <p>${m.text}</p>
        </div>
      `
      );
    });
  }
  loadAdminMsgs();
}

async function openCourseEditor(id){
  const ref = doc(db, "courses", id);
  const snap = await getDoc(ref);
  if (!snap.exists()){ alert("Course not found"); return; }
  const c = snap.data();

  // တည်ရှိနေတဲ့ admin card အတွင်းက editor panel ကိုပြ
  const host = document.getElementById('adminEditor');
  host.innerHTML = `
    <div class="card">
      <h3>Edit: ${escapeHtml(c.title || "")}</h3>
      <label>Title <input id="editTitle" value="${escapeHtml(c.title||"")}"></label>
      <label>Level <input id="editLevel" type="number" min="0" max="3" value="${c.level ?? 0}"></label>
      <label>Credits <input id="editCredits" type="number" min="0" max="100" value="${c.credits ?? 0}"></label>
      <label>Summary <textarea id="editSummary">${escapeHtml(c.summary||"")}</textarea></label>
      <div class="row" style="gap:.5rem">
        <button class="btn" id="btnSaveCourse">Save</button>
        <button class="btn ghost" id="btnCancelEdit">Cancel</button>
      </div>
    </div>
  `;

  document.getElementById('btnCancelEdit')?.addEventListener('click', ()=> {
    host.innerHTML = "";
  });

  document.getElementById('btnSaveCourse')?.addEventListener('click', async ()=>{
    await updateDoc(ref, {
      title: document.getElementById('editTitle').value.trim(),
      level: Number(document.getElementById('editLevel').value || 0),
      credits: Number(document.getElementById('editCredits').value || 0),
      summary: document.getElementById('editSummary').value.trim()
    });
    alert("Saved");
    host.innerHTML = "";
    renderAdmin(); // refresh list
  });
}

// ---------- small helpers ----------
function profileViewHTML(p = {}) {
  const line = (label, val) => `
    <div class="kv">
      <div class="kv-k">${label}</div>
      <div class="kv-v">${
        val ? escapeHtml(val) : '<span class="muted">—</span>'
      }</div>
    </div>`;
  return `
    <div class="profile-view">
      <div class="profile-head">
        <img class="avatar" src="${
          p.photoURL || "/icons/icon-192.png"
        }" alt="avatar">
        <div>
          <h3 class="h3 tight">${escapeHtml(p.name || "Unnamed")}</h3>
          <div class="muted">${escapeHtml(p.email || "")}</div>
        </div>
      </div>
      <div class="grid-2 sm1">
        <div class="card sub">${line("Contact", p.contact)}${line(
    "DoB",
    p.dob
  )}</div>
        <div class="card sub">${line("Education", p.education)}${line(
    "Skills",
    p.skills
  )}</div>
        <div class="card sub">${line("Address", p.address)}</div>
        <div class="card sub">${line("Portfolio", p.portfolio)}${line(
    "GitHub",
    p.github
  )}</div>
        <div class="card sub">${line("Socials", p.socials)}</div>
      </div>
    </div>
  `;
}

function profileFormHTML(p = {}) {
  return `
    <form id="profileForm" class="form grid-2 sm1">
      <label>Full name<input name="name" value="${escapeHtml(
        p.name || ""
      )}" /></label>
      <label>Date of Birth<input type="date" name="dob" value="${escapeHtml(
        p.dob || ""
      )}" /></label>

      <label>Email<input type="email" name="email" value="${escapeHtml(
        p.email || ""
      )}" /></label>
      <label>Contact<input name="contact" value="${escapeHtml(
        p.contact || ""
      )}" /></label>

      <label class="col-2">Address<textarea name="address" rows="2">${escapeHtml(
        p.address || ""
      )}</textarea></label>

      <label>Education<input name="education" value="${escapeHtml(
        p.education || ""
      )}" /></label>
      <label>Skills (comma-separated)<input name="skills" value="${escapeHtml(
        p.skills || ""
      )}" /></label>

      <label>Portfolio<input name="portfolio" value="${escapeHtml(
        p.portfolio || ""
      )}" /></label>
      <label>GitHub<input name="github" value="${escapeHtml(
        p.github || ""
      )}" /></label>

      <label class="col-2">Social links<input name="socials" value="${escapeHtml(
        p.socials || ""
      )}" /></label>

      <div class="col-2 row gap">
        <label class="file">
          <input id="photoFile" type="file" accept="image/*" />
          <span>Upload profile image</span>
        </label>
        <button class="btn danger ghost" type="button" id="btnRemovePhoto">Remove photo</button>
        <div class="spacer"></div>
        <button class="btn" type="submit">Save</button>
        <button class="btn ghost" type="button" id="btnCancelEdit">Cancel</button>
      </div>
    </form>
  `;
}

// ---------- main renderer ----------
async function renderProfile() {
  if (!auth.currentUser) {
    authDlg?.showModal();
    return;
  }

  const uid = auth.currentUser.uid;
  const meRef = doc(db, "users", uid);
  const snap = await getDoc(meRef);
  const p = snap.exists() ? snap.data() : {};

  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="card max">
      <h2 class="h2">Profile</h2>

      <!-- Preferences on top -->
      <div class="card sub prefs">
        <div class="row wrap gap">
          <label>Theme
            <select id="prefTheme">
              <option value="pali">Pāli (Sepia)</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label>Font size
            <select id="prefFontSize">
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
              <option value="xl">XL</option>
            </select>
          </label>
          <div class="spacer"></div>
          <button class="btn" id="btnEditProfile">Edit</button>
        </div>
      </div>

      <!-- View / Edit container -->
      <div id="profileBody">
        ${profileViewHTML(p)}
      </div>
    </section>
  `;

  // init prefs
  const selTheme = document.getElementById("prefTheme");
  const selFS = document.getElementById("prefFontSize");
  selTheme.value = p.theme || "pali";
  selFS.value = p.fontSize || "md";
  applyTheme(selTheme.value);
  applyFontSize(selFS.value);

  // live-apply + save
  selTheme.addEventListener("change", async (e) => {
    const v = e.target.value;
    applyTheme(v);
    await setDoc(meRef, { theme: v }, { merge: true });
  });
  selFS.addEventListener("change", async (e) => {
    const v = e.target.value;
    applyFontSize(v);
    await setDoc(meRef, { fontSize: v }, { merge: true });
  });

  // edit toggle
  const bodyEl = document.getElementById("profileBody");
  document.getElementById("btnEditProfile").addEventListener("click", () => {
    bodyEl.innerHTML = profileFormHTML(p);
    bindProfileForm();
  });

  function bindProfileForm() {
    const form = document.getElementById("profileForm");

    // Save submit
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const patch = Object.fromEntries(new FormData(form).entries());
      await setDoc(meRef, patch, { merge: true });
      // reload latest
      const s2 = await getDoc(meRef);
      const p2 = s2.exists() ? s2.data() : {};
      bodyEl.innerHTML = profileViewHTML(p2);
    });

    // Cancel
    document.getElementById("btnCancelEdit")?.addEventListener("click", () => {
      bodyEl.innerHTML = profileViewHTML(p);
    });

    // Image upload (resumable)
    document
      .getElementById("photoFile")
      ?.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
          alert("Image too large (max 5MB)");
          return;
        }

        // ext detect
        const t = (file.type || "").toLowerCase();
        let ext = "jpg";
        if (t.includes("png")) ext = "png";
        else if (t.includes("webp")) ext = "webp";
        else if (t.includes("gif")) ext = "gif";
        else if (t.includes("jpeg")) ext = "jpg";

        const r = sref(storage, `profiles/${uid}/avatar.${ext}`);
        const task = uploadBytesResumable(r, file, {
          contentType: file.type || `image/${ext}`,
        });
        await new Promise((res, rej) =>
          task.on("state_changed", () => {}, rej, res)
        );
        const url = await getDownloadURL(task.snapshot.ref);
        await setDoc(meRef, { photoURL: url }, { merge: true });

        // reflect in UI
        const s2 = await getDoc(meRef);
        const p2 = s2.exists() ? s2.data() : {};
        bodyEl.innerHTML = profileFormHTML(p2); // keep editing state after upload
        bindProfileForm();
      });

    // Remove photo
    document
      .getElementById("btnRemovePhoto")
      ?.addEventListener("click", async () => {
        await setDoc(meRef, { photoURL: "" }, { merge: true });
        const s2 = await getDoc(meRef);
        const p2 = s2.exists() ? s2.data() : {};
        bodyEl.innerHTML = profileFormHTML(p2);
        bindProfileForm();
      });
  }
}

function renderSettings() {
  if (!currentUser) {
    location.hash = "/";
    return;
  }
  document.getElementById("app").innerHTML = `
    <section class="card">
      <h2>Settings</h2>
      <div class="row-2">
        <label>Theme
          <select id="setTheme">
            <option value="pali">Pāli (Sepia)</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label>Font size
          <select id="setFS">
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
            <option value="xl">XL</option>
          </select>
        </label>
      </div>
    </section>
  `;
  const meRef = doc(db, "users", currentUser.uid);
  getDoc(meRef).then((s) => {
    const p = s.exists() ? s.data() : {};
    document.getElementById("setTheme").value = p.theme || "pali";
    document.getElementById("setFS").value = p.fontSize || "md";
  });

  document.getElementById("setTheme").addEventListener("change", async (e) => {
    applyTheme(e.target.value);
    await setDoc(meRef, { theme: e.target.value }, { merge: true });
  });
  document.getElementById("setFS").addEventListener("change", async (e) => {
    applyFontSize(e.target.value);
    await setDoc(meRef, { fontSize: e.target.value }, { merge: true });
  });
}

async function renderCertificates(){
  if (!auth?.currentUser){ location.hash = "#/"; return; }
  const uid = auth.currentUser.uid;

  const box = document.getElementById("app");
  box.innerHTML = `
    <section class="card max">
      <h2>Certificates</h2>
      <div id="certList">Loading…</div>
    </section>`;

  try{
    const q = query(
      collection(db, "users", uid, "completions"),        // ✅ top-level
      where("userId","==", uid),
      orderBy("ts","desc")
    );
    const snap = await getDocs(q);
    const list = document.getElementById("certList");
    if (snap.empty){
      list.innerHTML = `<div class="card muted">No certificates yet.</div>`;
      return;
    }
    list.innerHTML = "";
    snap.forEach(d=>{
      const c = d.data();
      list.insertAdjacentHTML("beforeend", `
        <div class="card row-between">
          <div>
            <strong>${c.courseTitle || c.courseId}</strong>
            <div class="muted">Credits: ${c.credits ?? 0}</div>
          </div>
          <div class="row" style="gap:.5rem">
            <button class="btn small" onclick="makeCertPDF('${d.id}')">Download PDF</button>
          </div>
        </div>
      `);
    });
  }catch(err){
    console.error("[certs]", err);
    document.getElementById("certList").innerHTML =
      `<div class="card error">Can't load certificates (permissions?).</div>`;
  }
}
window.renderCertificates = renderCertificates;

async function renderTranscripts(){
  if (!auth?.currentUser){ location.hash = "#/"; return; }
  const uid = auth.currentUser.uid;

  const box = document.getElementById("app");
  box.innerHTML = `
    <section class="card max">
      <h2>Transcripts</h2>
      <div id="txList">Loading…</div>
    </section>`;

  try{
    const q = query(
      collection(db, "users", uid, "attempts"),          // ✅ top-level
      where("userId","==", uid),
      orderBy("ts","desc")
    );
    const snap = await getDocs(q);
    const list = document.getElementById("txList");
    if (snap.empty){
      list.innerHTML = `<div class="card muted">No attempts yet.</div>`;
      return;
    }
    list.innerHTML = "";
    snap.forEach(d=>{
      const a = d.data();
      list.insertAdjacentHTML("beforeend", `
        <div class="card">
          <div class="row-between">
            <strong>${a.courseTitle || a.courseId}</strong>
            <span>${a.score ?? 0}% ${a.pass ? "✅" : "❌"}</span>
          </div>
          <div class="muted">Lesson: ${a.lessonTitle || a.lessonId}</div>
        </div>
      `);
    });
  }catch(err){
    console.error("[transcripts]", err);
    document.getElementById("txList").innerHTML =
      `<div class="card error">Can't load transcripts (permissions?).</div>`;
  }
}
window.renderTranscripts = renderTranscripts;

// ====== Not Found ======
function renderNotFound() {
  app.innerHTML = `<section class="card"><h2>Not found</h2></section>`;
}

// ---------- PayPal (demo button) ----------
window.renderPayPal = function (selector = "#paypal") {
  const host = document.querySelector(selector);
  if (!host) {
    console.warn("PayPal host missing");
    return;
  }
  if (!window.paypal) {
    host.innerHTML = "<p class='muted'>PayPal SDK not loaded.</p>";
    return;
  }
  window.paypal
    .Buttons({
      createOrder: (data, actions) =>
        actions.order.create({
          purchase_units: [
            { amount: { value: "5.00" }, description: "Pāli Course Credit" },
          ],
        }),
      onApprove: async (data, actions) => {
        const details = await actions.order.capture();
        alert("Payment complete. Thanks!");
        // TODO: add credits to user in Firestore
      },
    })
    .render(host);
};

// ---------- EmailJS init (replace IDs) ----------
window.addEventListener("load", () => {
  if (window.emailjs) {
    emailjs.init({ publicKey: "WT0GOYrL9HnDKvLUf" });
  }
});

// ---------- Profile page (route for now via dashboard) ----------
// (You can add a dedicated #/profile similarly using the pattern above)

// ✅ boot point
window.addEventListener("load", () => {
  route(); // handles all navigation automatically
});
