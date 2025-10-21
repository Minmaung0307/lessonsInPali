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
  limit,
  startAt,
  endAt,
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
  const r = role || window.currentRole || "guest";
  const ok = r === "admin" || r === "ta";
  if (!ok) {
    alert("Admin only.");
    location.hash = "#/";
  }
  return ok;
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

// one-line SVG placeholder (gray box with text)
const PLACEHOLDER_IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="500">
      <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="#e9eef3"/><stop offset="100%" stop-color="#dfe6ee"/>
      </linearGradient></defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <g fill="#9aa7b2" font-family="system-ui, -apple-system, Segoe UI, Roboto" text-anchor="middle">
        <circle cx="400" cy="200" r="60" fill="#c7d1db"/>
        <rect x="240" y="290" width="320" height="18" rx="9" fill="#c7d1db"/>
        <text x="400" y="360" font-size="22">Image unavailable</text>
      </g>
    </svg>
  `);

const short = (s = "", n = 140) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

// ---------- Utils Helper 1----------
function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Parse a plain-text post body with simple media markers into HTML
function parseBodyToHTML(body = "") {
  const lines = body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const parts = [];

  for (const line of lines) {
    // [img] https://...
    let m = line.match(/^\[img\]\s+(https?:\/\/\S+)$/i);
    if (m) {
      parts.push(`<div class="post-media"><img src="${m[1]}" alt="" /></div>`);
      continue;
    }
    // [video] https://...
    m = line.match(/^\[video\]\s+(https?:\/\/\S+)$/i);
    if (m) {
      parts.push(
        `<div class="post-media"><video controls preload="metadata" playsinline><source src="${m[1]}"></video></div>`
      );
      continue;
    }
    // [audio] https://...
    m = line.match(/^\[audio\]\s+(https?:\/\/\S+)$/i);
    if (m) {
      parts.push(
        `<div class="post-media"><audio controls preload="metadata"><source src="${m[1]}"></audio></div>`
      );
      continue;
    }

    // Otherwise a normal paragraph (escaped)
    parts.push(`<p>${escapeHtml(line)}</p>`);
  }

  return parts.join("\n");
}

const applyTheme = (v) =>
  (document.documentElement.dataset.theme = v || "pali");
const applyFontSize = (v) => (document.documentElement.dataset.fs = v || "md");

async function ensureUserDoc(u) {
  const r = doc(db, "users", u.uid);
  const s = await getDoc(r);
  if (!s.exists()) {
    await setDoc(
      r,
      {
        email: u.email || "",
        displayName: u.displayName || "",
        role: "student",
        ts: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

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
    const hash = (location.hash || "#/").replace(/^#/, "");

    if (hash === "/" || hash === "") return renderHome?.();

    // ✅ 1) lesson page: /courses/:id/lesson/:lid
    if (hash.startsWith("/courses/") && hash.includes("/lesson/")) {
      const [, , courseId, , lessonId] = hash.split("/");
      return renderCourseDetail?.(courseId, lessonId);
    }

    // ✅ 2) course detail: /courses/:id
    if (/^\/courses\/[^/]+$/.test(hash)) {
      const [, , courseId] = hash.split("/");
      return renderCourseDetail?.(courseId);
    }

    // ✅ 3) courses list
    if (hash.startsWith("/courses")) return renderCourses?.();

    if (hash.startsWith("/dashboard")) return renderDashboard?.();
    if (hash.startsWith("/admin")) return renderAdmin?.();
    if (hash.startsWith("/profile")) return renderProfile?.();
    if (hash.startsWith("/settings")) return renderSettings?.();
    if (hash.startsWith("/certs")) return renderCertificates?.();
    if (hash.startsWith("/transcripts")) return renderTranscripts?.();
    if (hash.startsWith("/search")) return renderSearch?.();

    return renderNotFound?.();
  };

  window.addEventListener("hashchange", window.route);
  window.addEventListener("load", window.route);
}

function removeTopbarMenus() {
  const sel = [
    'a[href="#/certificates"]',
    'a[data-nav="certs"]',
    'a[href="#/transcripts"]',
    'a[data-nav="transcripts"]',
    'a[href="#/settings"]',
    'a[data-nav="settings"]',
  ];
  document.querySelectorAll(sel.join(",")).forEach((el) => el.remove());
}
// app စတင်တဲ့နေရာ/route() ပြီးသွားတဲ့နေရာ တစ်ခုခုမှာ ခေါ်
removeTopbarMenus();

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

document
  .getElementById("btnLogout")
  ?.addEventListener("click", () => signOut(auth));
document
  .getElementById("btnLogout_m")
  ?.addEventListener("click", () => signOut(auth));

/* ✅ Auth visibility helper (guest/student/admin menu gating) */
function applyAuthVisibility(user, role = "guest") {
  const authed = !!user;
  const isStaff = authed && (role === "admin" || role === "ta");

  // login/logout buttons (desktop + mobile)
  ["btnLogin", "btnLogin_m"].forEach(id =>
    document.getElementById(id)?.classList.toggle("hidden", authed)
  );
  ["btnLogout", "btnLogout_m"].forEach(id =>
    document.getElementById(id)?.classList.toggle("hidden", !authed)
  );

  // gated sections
  document.querySelectorAll(".auth-only").forEach(el =>
    el.classList.toggle("hidden", !authed)
  );
  document.querySelectorAll(".admin-only").forEach(el =>
    el.classList.toggle("hidden", !isStaff)
  );
}

// ✅ getUserRole() — current user’s role ကို Firestore မှာ query လုပ်ပြီး ပြန်ပေးမယ်
async function getUserRole() {
  const u = auth.currentUser;
  if (!u) return "guest";
  const s = await getDoc(doc(db, "users", u.uid));
  return s.exists() ? s.data().role || "student" : "student";
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

// Guard to wire onAuthStateChanged only once
if (window.__AUTH_WIRED__) {
  console.warn('[auth] onAuthStateChanged already wired; skipping');
} else {
  window.__AUTH_WIRED__ = true;

  onAuthStateChanged(auth, async (u) => {
    currentUser = u || null;

    // 1) Ensure user doc + figure out role (safe defaults)
    if (u) {
      try { await ensureUserDoc(u); } catch (e) { console.warn('[auth] ensureUserDoc failed', e); }
      try {
        currentRole = (await getUserRole()) || 'student';
      } catch (e) {
        console.warn('[auth] getUserRole failed, fallback student', e);
        currentRole = 'student';
      }
      console.log('✅ Logged in as:', u.email, 'Role:', currentRole);
    } else {
      currentRole = 'guest';
      console.log('🚪 Logged out');
    }

    // 2) Single place to toggle UI (avoid double toggles)
    applyAuthVisibility(currentUser, currentRole);
    if (typeof setActiveNav === 'function') setActiveNav();

    // 3) Route re-render (re-entrant guarded)
    if (!window.__ROUTE_LOCK__) {
      window.__ROUTE_LOCK__ = true;
      // queue to microtask to avoid nested reflows/recursion
      Promise.resolve().then(async () => {
        try {
          if (typeof route === 'function') await route();
        } finally {
          window.__ROUTE_LOCK__ = false;
        }
      });
    }
  });
}

// logout
document
  .getElementById("btnLogout")
  ?.addEventListener("click", () => signOut(auth));

// ---------- Home ----------
// helpers
const PLACEHOLDER_MEDIA = "/img/placeholder.png"; // already configured

function canRenderTrustedHtml() {
  return window.currentRole === "admin" || window.currentRole === "ta";
}

function postCardHTML(p) {
  const ts = p.ts?.toDate ? p.ts.toDate().toLocaleString() : "";
  const title = p.title || "";
  const body = p.body || "";
  const type = (p.type || "text").toLowerCase();

  // Optional top media (from mediaUrl/mediaType)
  let mediaBlock = "";
  if (p.mediaUrl) {
    const mt = (p.mediaType || "").toLowerCase();
    if (mt.startsWith("image/")) {
      mediaBlock = `<img class="cover" src="${p.mediaUrl}" alt="">`;
    } else if (mt.startsWith("video/")) {
      mediaBlock = `<video class="cover" controls preload="metadata" playsinline>
        <source src="${p.mediaUrl}" type="${mt || "video/mp4"}" />
      </video>`;
    } else if (mt.startsWith("audio/")) {
      mediaBlock = `<audio controls preload="metadata" style="width:100%">
        <source src="${p.mediaUrl}" type="${mt || "audio/mpeg"}" />
      </audio>`;
    }
  }

  // Body parsed with markers → HTML
  const bodyHTML = body
    ? `<div class="post-body">${parseBodyToHTML(body)}</div>`
    : "";

  return `
    <article class="card post" data-id="${p.id}">
      ${title ? `<h3>${escapeHtml(title)}</h3>` : ""}
      ${mediaBlock}
      ${bodyHTML}
      <div class="muted" style="margin-top:.25rem">${ts}</div>
    </article>
  `;
}

async function renderHome() {
  appEl.innerHTML = `
    <section class="card hero">
      <div class="banner" id="heroBanner"></div>
      <div class="overlay">
        <h1 id="bannerH">Pāli Lessons</h1>
        <p id="bannerP" class="muted">Latest posts from teachers & staff — announcements, lessons, media updates.</p>
      </div>
    </section>

    <section id="homeFeed" class="stack"></section>
  `;

  // 🔹 Mount banner slider right away
  mountHeroSlider("#heroBanner");

  const feed = document.getElementById("homeFeed");
  feed.innerHTML = `<div class="muted">Loading posts…</div>`;

  if (!window.db) {
    console.error("[home] Firestore not initialized");
    feed.innerHTML = `<div class="card error">App not initialized.</div>`;
    return;
  }

  try {
    const q1 = query(collection(db, "posts"), orderBy("ts", "desc"), limit(50));
    const snap = await getDocs(q1);
    const items = [];
    snap.forEach((d) => items.push({ id: d.id, ...d.data() }));

    feed.innerHTML = items.length
      ? items.map(postCardHTML).join("")
      : `<div class="card muted">No posts yet.</div>`;
  } catch (e) {
    console.error("[home posts]", e);
    feed.innerHTML = `<div class="card error">Failed to load posts.</div>`;
  }
}

// ===== Hero Banner Slider =====

// Local images (public/img/… ထဲ ထားပြီး firebase deploy လုပ်ထားရန်)
const LOCAL_BANNERS = [
  "/img/banner1.svg",
  "/img/banner2.svg",
  "/img/banner3.svg",
  "/img/banner4.png",
];

// Unsplash random (no API key) — reload တစ်ခါချင်း마다 အသစ်တွေ လာနိုင်
// အလိုရှိသလို keyword တွေပြောင်းနိုင်ပါတယ်
const UNSPLASH_RANDOM = [
  "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1528819622765-d6bcf132f793?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1504203700686-0c3b9dba4991?auto=format&fit=crop&w=1600&q=80",
];

// Mix local + online (သင်မလိုတယ်ဆိုရင် တစ်မျိုးတည်းသုံး)
const BANNER_SOURCES = [...LOCAL_BANNERS, ...UNSPLASH_RANDOM];

// Preload helper
function preload(src) {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res(src);
    img.onerror = () => res(null);
    img.src = src;
  });
}

// Main mount
async function mountHeroSlider(
  targetSel,
  images = BANNER_SOURCES,
  intervalMs = 6000
) {
  const host = document.querySelector(targetSel);
  if (!host) return;

  // preload (faulty URLs ကို filter ပြန်တယ်)
  const loaded = (await Promise.all(images.map(preload))).filter(Boolean);
  if (!loaded.length) {
    // totally failed → fallback to placeholder
    host.innerHTML = `<div class="slide is-active"><img src="${PLACEHOLDER_IMG}" alt=""></div>`;
    return;
  }

  // randomize order
  for (let i = loaded.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [loaded[i], loaded[j]] = [loaded[j], loaded[i]];
  }

  // build DOM
  const slides = loaded
    .map(
      (src, idx) =>
        `<div class="slide${
          idx === 0 ? " is-active" : ""
        }"><img src="${src}" alt=""></div>`
    )
    .join("");
  const dots = loaded
    .map(
      (_, idx) =>
        `<div class="dot${
          idx === 0 ? " is-active" : ""
        }" data-i="${idx}"></div>`
    )
    .join("");

  host.innerHTML = slides + `<div class="dots">${dots}</div>`;

  const slideEls = Array.from(host.querySelectorAll(".slide"));
  const dotEls = Array.from(host.querySelectorAll(".dot"));
  let i = 0,
    timer = null;

  const go = (next) => {
    slideEls[i]?.classList.remove("is-active");
    dotEls[i]?.classList.remove("is-active");
    i = next;
    slideEls[i]?.classList.add("is-active");
    dotEls[i]?.classList.add("is-active");
  };

  const tick = () => {
    const next = (i + 1) % slideEls.length;
    go(next);
  };

  timer = setInterval(tick, intervalMs);

  // dot click → jump
  dotEls.forEach((d) => {
    d.addEventListener("click", () => {
      clearInterval(timer);
      go(Number(d.dataset.i));
      timer = setInterval(tick, intervalMs); // resume
    });
  });
}

function postItemHTML(p) {
  const safeText = escapeHtml(p.text || "");
  if (p.type === "image") {
    return `
      <article class="card post">
        <div class="post-meta">${
          p.ts?.toDate?.().toLocaleString?.() || ""
        }</div>
        <img class="post-img" src="${p.mediaUrl}"
             alt="${(p.title || "").replace(/"/g, "&quot;")}"
             onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'">
        ${safeText ? `<p class="post-text">${safeText}</p>` : ""}
      </article>`;
  }
  if (p.type === "video") {
    return `
      <article class="card post">
        <div class="post-meta">${
          p.ts?.toDate?.().toLocaleString?.() || ""
        }</div>
        <video class="post-video" src="${
          p.mediaUrl
        }" controls preload="metadata"></video>
        ${safeText ? `<p class="post-text">${safeText}</p>` : ""}
      </article>`;
  }
  if (p.type === "audio") {
    return `
      <article class="card post">
        <div class="post-meta">${
          p.ts?.toDate?.().toLocaleString?.() || ""
        }</div>
        <audio class="post-audio" src="${
          p.mediaUrl
        }" controls preload="metadata"></audio>
        ${safeText ? `<p class="post-text">${safeText}</p>` : ""}
      </article>`;
  }
  if (p.type === "link") {
    // simplest: just anchor
    return `
      <article class="card post">
        <a href="${p.mediaUrl}" target="_blank" rel="noopener noreferrer">${
      p.mediaUrl
    }</a>
        ${safeText ? `<p class="post-text">${safeText}</p>` : ""}
      </article>`;
  }
  // default: text
  return `
    <article class="card post">
      <div class="post-meta">${p.ts?.toDate?.().toLocaleString?.() || ""}</div>
      <p class="post-text">${safeText || "(empty)"}</p>
    </article>`;
}

async function loadPosts() {
  const box = document.getElementById("homePosts");
  box.innerHTML = "Loading…";
  const qSnap = await getDocs(
    query(collection(db, "posts"), orderBy("ts", "desc"))
  );
  box.innerHTML = "";
  qSnap.forEach((d) => {
    const p = { id: d.id, ...d.data() };
    box.insertAdjacentHTML("beforeend", postItemHTML(p));
  });
}

// ---------- Courses (cards) ----------
async function renderCourseCards(sel) {
  const host = document.querySelector(sel);
  if (!host) return;
  host.innerHTML = "";

  let items = [];
  try {
    const qIndexed = query(
      collection(db, "courses"),
      orderBy("level", "asc"),
      orderBy("title", "asc")
    );
    const snap = await getDocs(qIndexed);
    snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn("[courses] indexed query failed, fallback:", e.message);
    const qSimple = query(collection(db, "courses"), orderBy("level", "asc"));
    const snap = await getDocs(qSimple);
    snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
    items.sort(
      (a, b) =>
        (a.level ?? 0) - (b.level ?? 0) ||
        String(a.title || "").localeCompare(String(b.title || ""))
    );
  }

  for (const c of items) {
    host.insertAdjacentHTML("beforeend", courseCardHTML(c));
  }

  host
    .querySelectorAll("[data-action='details']")
    .forEach((b) =>
      b.addEventListener("click", (e) => openCourse(e.currentTarget.dataset.id))
    );

  host.querySelectorAll("[data-action='enroll']").forEach((b) =>
    b.addEventListener("click", (e) => {
      const id = e.currentTarget.dataset.id;
      const price = Number(e.currentTarget.dataset.price);
      if (price > 0) {
        openBuyDialog(id, price); // 💳 PayPal
      } else {
        enrollCourse(id); // 🆓 Free
      }
    })
  );
}

function replaceBrokenPlaceholders(root = document) {
  root.querySelectorAll("img").forEach((img) => {
    const s = (img.getAttribute("src") || "").trim();
    if (!s || s.endsWith("/img/placeholder.png")) {
      img.setAttribute("src", PLACEHOLDER_IMG); // ✅ no 404 calls
    }
    // If any image still errors → fallback
    img.addEventListener(
      "error",
      () => {
        img.onerror = null;
        img.src = PLACEHOLDER_IMG;
      },
      { once: true }
    );
  });
}

// each render end:
replaceBrokenPlaceholders(appEl);

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
  const q1 = query(
    collection(db, "users", uid, "enrollments"),
    orderBy("ts", "desc")
  );
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

async function renderCourses() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="card max">
      <h2>Courses</h2>
      <div id="courseGrid" class="course-grid"></div>
    </section>`;

  const snap = await getDocs(
    query(
      collection(db, "courses"),
      orderBy("level", "asc"),
      orderBy("title", "asc")
    )
  );

  const grid = document.getElementById("courseGrid");
  grid.innerHTML = "";
  snap.forEach((d) =>
    grid.insertAdjacentHTML(
      "beforeend",
      courseCardHTML({ id: d.id, ...d.data() })
    )
  );

  ensureCourseDetailsDialog();
  wireCourseCardEvents("#courseGrid");
}

function ensureCourseDetailsDialog() {
  const old = document.getElementById("courseDetails");
  if (old) return;

  const dlg = document.createElement("dialog");
  dlg.id = "courseDetails";
  dlg.innerHTML = `
    <header class="dlg-head">
      <strong id="cdTitle">Course</strong>
      <button class="btn small ghost" id="cdClose" type="button">Close</button>
    </header>

    <div class="dlg-body">
      <div>
        <img id="cdCover" class="dlg-cover" alt="">
      </div>
      <div class="dlg-scroll">
        <div id="cdBody" class="stack"></div>
        <div class="row meta" style="gap:.5rem; margin-top:.75rem" id="cdMeta"></div>
      </div>
    </div>

    <footer class="dlg-foot">
      <div class="row" id="cdMetaChips" style="gap:.5rem"></div>
      <menu style="display:flex; gap:.5rem; margin:0">
        <button class="btn ghost" id="cdOpenPage" type="button">Open details page</button>
        <button class="btn" id="cdEnroll" type="button">Enroll</button>
      </menu>
    </footer>
  `;
  document.body.appendChild(dlg);

  dlg.querySelector("#cdClose").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (e) => {
    const body = dlg.querySelector(".dlg-body");
    if (body && !body.contains(e.target) && e.target === dlg) dlg.close();
  });
}

// ⬇️ REPLACE your existing openCourseDetails() with this
async function openCourseDetails(courseId) {
  ensureCourseDetailsDialog();
  const dlg = document.getElementById("courseDetails");
  const title = dlg.querySelector("#cdTitle");
  const cover = dlg.querySelector("#cdCover");
  const body = dlg.querySelector("#cdBody");
  const chips = dlg.querySelector("#cdMetaChips");
  const btnOpen = dlg.querySelector("#cdOpenPage");
  const btnEnr = dlg.querySelector("#cdEnroll");

  // fetch course
  let c = null;
  try {
    const s = await getDoc(doc(db, "courses", courseId));
    if (!s.exists()) {
      title.textContent = "Course not found";
      body.innerHTML = `<p class="error">This course no longer exists.</p>`;
      btnEnr.disabled = true;
      return dlg.showModal();
    }
    c = { id: s.id, ...s.data() };
  } catch (e) {
    console.error("[course details]", e);
    title.textContent = "Error";
    body.innerHTML = `<p class="error">Failed to load course.</p>`;
    btnEnr.disabled = true;
    return dlg.showModal();
  }

  // header
  title.textContent = c.title || "Course";

  // cover (fallback-safe)
  const FALLBACK = "/img/placeholder.png";
  cover.src = (c.img || "").trim() || FALLBACK;
  cover.onerror = () => {
    cover.onerror = null;
    cover.src = FALLBACK;
  };

  // normalize benefits (array or comma-separated string)
  const benefits = Array.isArray(c.benefits)
    ? c.benefits.filter(Boolean).map(String)
    : String(c.benefits || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

  // description + full benefits list
  const summaryHtml = c.summary
    ? `<p class="desc">${escapeHtml(c.summary)}</p>`
    : "";
  const longDescHtml = c.description
    ? `<p>${escapeHtml(c.description)}</p>`
    : "";

  const benefitsHtml = benefits.length
    ? `
      <h4 style="margin:.75rem 0 .25rem">Benefits</h4>
      <ul class="benefits">
        ${benefits.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}
      </ul>`
    : "";

  // write into modal body (scrollable container wrapper for long text)
  body.innerHTML = `
    <div class="cd-scroll">
      ${summaryHtml}
      ${longDescHtml}
      ${benefitsHtml}
    </div>
  `;

  // meta chips
  const lvlIdx = Number(c.level ?? 0);
  const lvlTxt =
    ["Beginner", "Intermediate", "Advanced", "Pro"][lvlIdx] ??
    `Level ${lvlIdx}`;
  const priceN = Number(c.price || 0);
  const isFree = !priceN || priceN <= 0;
  const priceStr = isFree ? "Free" : `$${priceN.toFixed(2)}`;

  chips.innerHTML = `
    <span class="badge">${lvlTxt}</span>
    <span class="badge">Credits: ${c.credits ?? 0}</span>
    <span class="badge ${
      isFree ? "price-free" : "price-paid"
    }">${priceStr}</span>
  `;

  // actions
  btnOpen.onclick = () => {
    location.hash = `#/courses/${c.id}`;
    dlg.close();
  };
  btnEnr.onclick = () => enrollCourse?.(c.id);

  dlg.showModal();
}
window.openCourseDetails = openCourseDetails;

const grid = document.getElementById("courseGrid");
if (grid) {
  grid.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const cid = btn.getAttribute("data-cid");
    if (btn.dataset.act === "details") openCourseDetails(cid);
    if (btn.dataset.act === "enroll") enrollCourse(cid);
  });
}

// === Admin: open "New / Edit Course" form ===
async function openAdminCourseForm(courseId = null) {
  const dlg =
    document.getElementById("adminCourseDlg") || createAdminCourseDialog();
  dlg.showModal();

  const form = dlg.querySelector("#adminCourseForm");
  form.reset();
  form.dataset.id = courseId || "";

  // default preview image
  dlg.querySelector("#acImgPreview").src = "/img/placeholder.png";

  // Prefill for edit
  if (courseId) {
    const snap = await getDoc(doc(db, "courses", courseId));
    if (!snap.exists()) {
      alert("Course not found");
      return;
    }
    const c = { id: snap.id, ...snap.data() };

    form.title.value = c.title || "";
    form.summary.value = c.summary || "";
    form.description.value = c.description || "";
    form.credits.value = c.credits ?? 0;
    form.level.value = c.level ?? 0;
    form.price.value = typeof c.price === "number" ? c.price : "";
    form.benefits.value = Array.isArray(c.benefits)
      ? c.benefits.join("\n")
      : "";
    form.imageUrl.value = c.img || "";
    if (c.img) dlg.querySelector("#acImgPreview").src = c.img;
  }

  // live preview for URL change
  form.imageUrl.addEventListener(
    "input",
    (e) => {
      dlg.querySelector("#acImgPreview").src =
        e.target.value || "/img/placeholder.png";
    },
    { once: true }
  );
}

function createAdminCourseDialog() {
  const dlg = document.createElement("dialog");
  dlg.id = "adminCourseDlg";
  dlg.innerHTML = `
    <form id="adminCourseForm" method="dialog" class="card" style="width:min(920px,95vw)">
      <h3 style="margin-top:0">Course ${
        /* new vs edit */ ""
      }<span id="acMode"></span></h3>

      <div class="grid-2">
        <div>
          <label>Title<input name="title" required /></label>
          <label>Short summary (card)
            <textarea name="summary" rows="3" placeholder="2–3 lines"></textarea>
          </label>
          <label>Full description (Details dialog)
            <textarea name="description" rows="8"></textarea>
          </label>
          <label>Benefits (one per line)
            <textarea name="benefits" rows="5" placeholder="Benefit 1&#10;Benefit 2"></textarea>
          </label>
        </div>
        <div>
          <img id="acImgPreview" class="cover" alt="" style="width:100%;aspect-ratio:16/9;object-fit:cover;background:#f3f3f3;border-radius:10px;margin-bottom:.5rem">
          <label>Image URL
            <input name="imageUrl" placeholder="https://…" />
          </label>

          <div class="row-2">
            <label>Level
              <select name="level">
                <option value="0">Beginner</option>
                <option value="1">Intermediate</option>
                <option value="2">Advanced</option>
                <option value="3">Pro</option>
              </select>
            </label>
            <label>Credits
              <input type="number" name="credits" min="0" step="1" />
            </label>
          </div>

          <label>Price (leave blank = Free)
            <input type="number" name="price" step="0.01" min="0" />
          </label>
        </div>
      </div>

      <div class="row" style="justify-content:flex-end; gap:.5rem; margin-top:.75rem">
        <button type="button" class="btn ghost" id="acCancel">Cancel</button>
        <button type="submit" class="btn" id="acSave">Save</button>
      </div>
    </form>
  `;
  document.body.appendChild(dlg);

  // close
  dlg.querySelector("#acCancel").addEventListener("click", () => dlg.close());

  // submit → create / update
  dlg
    .querySelector("#adminCourseForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      const id = f.dataset.id || null;

      const payload = {
        title: f.title.value.trim(),
        summary: f.summary.value.trim(),
        description: f.description.value.trim(),
        benefits: f.benefits.value
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        img: f.imageUrl.value.trim(),
        level: Number(f.level.value || 0),
        credits: Number(f.credits.value || 0),
        ts: serverTimestamp(),
      };
      const priceVal = f.price.value.trim();
      if (priceVal !== "") payload.price = Number(priceVal);

      if (!payload.title) {
        alert("Title is required");
        return;
      }

      if (id) {
        await setDoc(doc(db, "courses", id), payload, { merge: true });
      } else {
        const ref = await addDoc(collection(db, "courses"), payload);
        // optional: use custom ID logic if you prefer slug
        console.log("New course id:", ref.id);
      }
      dlg.close();
      // refresh courses/admin lists
      if (typeof renderCourses === "function") renderCourses();
      if (typeof renderAdmin === "function") renderAdmin();
    });

  return dlg;
}

// Hook “Edit” buttons in Admin list
function bindAdminCourseList() {
  const list = document.getElementById("adminCourseList");
  if (!list) return;

  list.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const act = btn.dataset.action;
    const id = btn.dataset.id;

    if (act === "edit") {
      const s = await getDoc(doc(db, "courses", id));
      if (s.exists()) fillCourseForm({ id: s.id, ...s.data() });
    }
    if (act === "delete") {
      if (confirm("Delete this course?")) {
        await deleteDoc(doc(db, "courses", id));
        await loadAdminCourses();
      }
    }
  });

  // form submit/save
  const form = document.getElementById("courseForm");
  form?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const data = formToCourse(form);
    const id = data.id || crypto.randomUUID();

    await setDoc(
      doc(db, "courses", id),
      {
        title: data.title || "",
        summary: data.summary || "",
        description: data.description || "",
        level: Number(data.level ?? 0),
        credits: Number(data.credits ?? 0),
        price: Number(data.price ?? 0),
        img: data.img || "",
        benefits: normBenefits(data.benefits), // store as array
      },
      { merge: true }
    );

    alert("Saved.");
    fillCourseForm({}); // reset
    await loadAdminCourses();
  });

  document
    .getElementById("btnResetCourse")
    ?.addEventListener("click", () => fillCourseForm({}));
}

function formToCourse(form) {
  const o = Object.fromEntries(new FormData(form).entries());
  // benefits: keep raw but normalize when saving
  return o;
}

function $$(s) {
  return document.querySelector(s);
}
function openBuyDialog(courseId, price) {
  // $0 (Free) → PayPal မသွားဘဲ တန်း Enroll
  const p = Number(price || 0);
  if (p <= 0) return enrollCourse(courseId);

  const buyDlg = $("#buyDlg");
  $("#buyTitle").textContent = `Purchase course – $${p.toFixed(2)}`;
  buyDlg?.showModal();

  const mount = $("#paypal-buttons");
  if (!mount) {
    alert("PayPal mount not found");
    return;
  }
  // Prevent duplicate renders
  if (mount.__rendered) return;
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
            { amount: { value: p.toFixed(2) }, custom_id: courseId },
          ],
        });
      },
      async onApprove(data, actions) {
        try {
          await actions.order.capture();
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
        } catch (err) {
          console.error(err);
          alert("PayPal error.");
        }
      },
      onError(err) {
        console.error(err);
        alert("PayPal error.");
      },
    })
    .render(mount);

  mount.__rendered = true;
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

// Cleanup + Server-true UI Guard
async function cleanupOrphanEnrollments(uid) {
  const base = collection(db, "users", uid, "enrollments");
  const es = await getDocs(base); // may read from cache first
  let n = 0;
  for (const d of es.docs) {
    const e = d.data();
    const cRef = doc(db, "courses", e.courseId);
    const cs = await getDoc(cRef);
    if (!cs.exists()) {
      // course မရှိတော့ -> orphan
      try {
        await deleteDoc(d.ref);
        n++;
      } catch (_) {}
    }
  }
  console.log(`[cleanup] removed ${n} orphan enrollments`);
  return n;
}

// --- Certificate & Transcript (GLOBAL) ---
// Make them global because your buttons use inline onclick=""
window.renderCertificate = async function (courseId) {
  try {
    if (!auth.currentUser) {
      authDlg?.showModal?.();
      return;
    }
    const uid = auth.currentUser.uid;

    // user display name
    let student = auth.currentUser.email || uid;
    try {
      const us = await getDoc(doc(db, "users", uid));
      if (us.exists()) {
        const u = us.data();
        student = u.displayName || u.name || student;
      }
    } catch (_) {}

    // course info
    let courseTitle = courseId;
    let credits = "";
    try {
      const cs = await getDoc(doc(db, "courses", courseId));
      if (cs.exists()) {
        const c = cs.data();
        courseTitle = c.title || courseTitle;
        credits = c.credits ?? "" ? ` · ${c.credits} credits` : "";
      }
    } catch (_) {}

    // jsPDF
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
      alert("PDF library not loaded");
      return;
    }

    const pdf = new jsPDF("l", "pt", "a4");
    pdf.setFontSize(28);
    pdf.text("Certificate of Completion", 60, 90);
    pdf.setFontSize(18);
    pdf.text(`This certifies that`, 60, 140);
    pdf.setFontSize(26);
    pdf.text(student, 60, 180);
    pdf.setFontSize(18);
    pdf.text(`has successfully completed`, 60, 220);
    pdf.setFontSize(22);
    pdf.text(`${courseTitle}${credits}`, 60, 260);
    pdf.setFontSize(12);
    const dt = new Date().toLocaleDateString();
    pdf.text(`Date: ${dt}`, 60, 310);
    pdf.text(`Course ID: ${courseId}`, 60, 330);

    pdf.save(`certificate-${courseId}.pdf`);
  } catch (e) {
    console.error("[renderCertificate]", e);
    alert("Failed to generate certificate.");
  }
};

window.renderTranscript = async function () {
  try {
    if (!auth.currentUser) {
      authDlg?.showModal?.();
      return;
    }
    const uid = auth.currentUser.uid;

    // fetch enrollments
    const snap = await getDocs(collection(db, "users", uid, "enrollments"));
    const rows = [];
    for (const d of snap.docs) {
      const e = d.data();
      let title = e.courseTitle || e.courseId;
      let credits = e.credits ?? "";
      // try fill from course doc (title/credits)
      try {
        const cs = await getDoc(doc(db, "courses", e.courseId));
        if (cs.exists()) {
          const c = cs.data();
          title = c.title || title;
          if (credits === "" && c.credits != null) credits = c.credits;
        }
      } catch (_) {}
      rows.push({
        title,
        courseId: e.courseId,
        credits,
        grade: e.grade ?? "",
        status: e.status ?? "",
        ts: e.ts?.toDate ? e.ts.toDate().toLocaleDateString() : "",
      });
    }

    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
      alert("PDF library not loaded");
      return;
    }

    const pdf = new jsPDF("p", "pt", "a4");
    let y = 70;
    pdf.setFontSize(22);
    pdf.text("Transcript", 60, y);
    y += 30;

    pdf.setFontSize(12);
    pdf.text(`Student: ${auth.currentUser.email || uid}`, 60, y);
    y += 20;
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 60, y);
    y += 30;

    // table header
    pdf.setFont(undefined, "bold");
    pdf.text("Course", 60, y);
    pdf.text("ID", 300, y);
    pdf.text("Credits", 420, y);
    pdf.text("Grade", 490, y);
    pdf.text("Status", 550, y);
    pdf.text("Date", 610, y);
    pdf.setFont(undefined, "normal");
    y += 16;

    for (const r of rows) {
      pdf.text(String(r.title || ""), 60, y, { maxWidth: 220 });
      pdf.text(String(r.courseId || ""), 300, y, { maxWidth: 100 });
      pdf.text(String(r.credits || ""), 420, y);
      pdf.text(String(r.grade || ""), 490, y);
      pdf.text(String(r.status || ""), 550, y);
      pdf.text(String(r.ts || ""), 610, y);

      y += 18;
      if (y > 780) {
        pdf.addPage();
        y = 60;
      }
    }

    pdf.save("transcript.pdf");
  } catch (e) {
    console.error("[renderTranscript]", e);
    alert("Failed to generate transcript.");
  }
};

// --- PDF helpers ---
function genCertNo(uid, courseId) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}${String(d.getDate()).padStart(2, "0")}`;
  const last4 = (uid || "user")
    .slice(-4)
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
  const c4 = (courseId || "COURSE")
    .slice(0, 4)
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
  return `${ymd}-${c4}-${last4}`;
}

// Same-origin images are easiest (no CORS). If you must load cross-origin,
// keep the server CORS-allow or serve from your domain.
async function imgToDataURL(url) {
  const r = await fetch(url, { cache: "no-store" });
  const b = await r.blob();
  return await new Promise((res) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.readAsDataURL(b);
  });
}

// ---------- Dashboard ----------
async function renderDashboard() {
  if (!auth.currentUser) {
    location.hash = "#/";
    return;
  }

  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="card max">
      <h2>Dashboard</h2>
      <div class="grid-2">
        <!-- Left: My Courses -->
        <div>
          <h3>My Courses</h3>
          <div id="myCourses" class="course-grid"></div>
        </div>

        <!-- Right: Docs + Announcements + Messages -->
        <div>
          <h3>Documents</h3>
          <div class="row" style="gap:.5rem; flex-wrap:wrap">
            <!-- ✅ မင်းတင်ပေးထားတဲ့ buttons ကို တင်သလိုပဲ ထည့်ထားပါတယ် 
            <button class="btn" onclick="renderCertificate('pali-beg-1')">View Certificate</button>
            <button class="btn ghost" onclick="renderTranscript()">View Transcript</button> -->
          </div>

          <h3 style="margin-top:1rem">Announcements</h3>
          <div id="annList">Loading…</div>

          <h3 style="margin-top:1rem">Messages</h3>
          <div id="msgList">Loading…</div>
        </div>
      </div>
    </section>
  `;

  // Dashboard main HTML ပြီးသွားတဲ့နောက်တန်းမှာ ထည့်
  const achHtml = `
    <section class="card">
      <div class="row" style="justify-content:space-between;align-items:center">
        <h3 style="margin:0">Achievements</h3>
        <span class="muted">View your documents anytime</span>
      </div>
      <div class="row" style="gap:.5rem;margin-top:.5rem">
        <button class="btn" id="btnDashCert">Certificate</button>
        <button class="btn ghost" id="btnDashTranscript">Transcript</button>
      </div>
    </section>
  `;
  document.getElementById("app")?.insertAdjacentHTML("beforeend", achHtml);

  document.getElementById("btnDashCert")?.addEventListener("click", () => {
    // per-course သို့မဟုတ် latest course id ကိုသုံး – သင်က course picker ရှိပြီးသားဆို အဲဒါသုံးပါ
    const cid =
      /* pick current courseId here */ window.lastViewedCourseId ||
      "pali-beg-1";
    renderCertificate(cid);
  });
  document
    .getElementById("btnDashTranscript")
    ?.addEventListener("click", () => {
      renderTranscript(auth.currentUser?.uid);
    });

  /* ---------- My Courses ---------- */
  const uid = auth.currentUser.uid;
  try {
    await cleanupOrphanEnrollments(uid);

    const my = document.getElementById("myCourses");
    if (my) my.innerHTML = `<div class="muted">Loading…</div>`;

    const eq = query(
      collection(db, "users", uid, "enrollments"),
      orderBy("ts", "desc")
    );
    onSnapshot(eq, async (snap) => {
      if (snap.metadata.fromCache && navigator.onLine) return;
      if (!my) return;

      if (snap.empty) {
        my.innerHTML = `<div class="card muted">No courses yet.</div>`;
        return;
      }

      my.innerHTML = "";
      for (const d of snap.docs) {
        const e = d.data();
        const cRef = doc(db, "courses", e.courseId);
        const cs = await getDoc(cRef);
        const c = cs.exists()
          ? { id: cs.id, ...cs.data() }
          : { id: e.courseId, title: e.courseTitle };

        my.insertAdjacentHTML(
          "beforeend",
          `
          <article class="course-card" data-cid="${c.id}">
            <img class="cover" src="${c.img || PLACEHOLDER_IMG}"
                 onerror="this.onerror=null; this.src='${PLACEHOLDER_IMG}'" />
            <div class="body">
              <h3>${c.title || "Untitled Course"}</h3>
              <p class="desc">${c.summary || ""}</p>
              <ul class="meta">
                ${levelLabel(c) ? `<li>${levelLabel(c)}</li>` : ""}
                <li>Credits: ${c.credits ?? 0}</li>
              </ul>
              <div class="footer two-btn-footer">
                <button class="btn btn-open"     data-action="open"     data-id="${
                  c.id
                }">Open</button>
                <button class="btn btn-unenroll" data-action="unenroll" data-id="${
                  c.id
                }">Unenroll</button>
              </div>
            </div>
          </article>
        `
        );
      }

      if (!my.__wired) {
        my.__wired = true;
        my.addEventListener("click", async (e) => {
          const btn = e.target.closest("button[data-action]");
          if (!btn) return;
          const act = btn.dataset.action;
          const cid = btn.dataset.id;
          if (act === "open") {
            location.hash = `#/courses/${cid}`;
          } else if (act === "unenroll") {
            const ok = confirm("Remove this course from your dashboard?");
            if (!ok) return;
            try {
              await deleteDoc(doc(db, "users", uid, "enrollments", cid));
            } catch (_) {}
            const base = collection(db, "users", uid, "enrollments");
            const qs = await getDocs(query(base, where("courseId", "==", cid)));
            qs.forEach((d) => deleteDoc(d.ref));
          }
        });
      }
    });
  } catch (e) {
    console.error("[dashboard] my courses:", e);
  }

  /* ---------- Announcements (public) ---------- */
  try {
    const as = await getDocs(
      query(collection(db, "announcements"), orderBy("ts", "desc"))
    );
    const annBox = document.getElementById("annList");
    if (annBox) {
      if (as.empty) {
        annBox.innerHTML = `<div class="card muted">No announcements.</div>`;
      } else {
        const parts = [];
        as.forEach((d) => {
          const a = d.data();
          const when = a.ts?.toDate ? a.ts.toDate().toLocaleString() : "";
          parts.push(`
            <article class="card">
              <strong>${escapeHtml(a.title || "")}</strong>
              <p class="muted" style="margin:.25rem 0">${when}</p>
              <p>${escapeHtml(a.body || "")}</p>
            </article>
          `);
        });
        annBox.innerHTML = parts.join("");
      }
    }
  } catch (e) {
    console.error("[dashboard] announcements:", e);
    const el = document.getElementById("annList");
    if (el)
      el.innerHTML = `<div class="card error">Announcements unavailable.</div>`;
  }

  /* ---------- Messages (to me + broadcast '*') ---------- */
  try {
    const mineQ = query(collection(db, "messages"), where("to", "==", uid));
    const allQ = query(collection(db, "messages"), where("to", "==", "*"));
    const [mineSnap, broadSnap] = await Promise.all([
      getDocs(mineQ),
      getDocs(allQ),
    ]);

    const items = [];
    mineSnap.forEach((d) => items.push({ id: d.id, ...d.data() }));
    broadSnap.forEach((d) => items.push({ id: d.id, ...d.data() }));
    items.sort((a, b) => {
      const ta = a.ts?.toMillis ? a.ts.toMillis() : (a.ts?.seconds || 0) * 1000;
      const tb = b.ts?.toMillis ? b.ts.toMillis() : (b.ts?.seconds || 0) * 1000;
      return tb - ta;
    });

    const msgBox = document.getElementById("msgList");
    if (msgBox) {
      msgBox.innerHTML = items.length
        ? items
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
            .join("")
        : `<div class="card muted">No messages.</div>`;
    }
  } catch (e) {
    console.error("[dashboard] messages:", e);
    const box = document.getElementById("msgList");
    if (box)
      box.innerHTML = `<div class="card error">Messages unavailable.</div>`;
  }
}

// ---------- Admin (CRUD) ----------
function requireStaff() {
  const app = document.getElementById("app");
  if (!auth.currentUser) {
    // login dialog ရှိရင် ပြ
    try {
      authDlg?.showModal?.();
    } catch {}
    app.innerHTML = `<section class="card max"><h2>Admin</h2><p class="error">Please login.</p></section>`;
    return false;
  }
  if (!["admin", "ta"].includes(currentRole)) {
    app.innerHTML = `<section class="card max"><h2>Admin</h2><p class="error">Admin only.</p></section>`;
    return false;
  }
  return true;
}

async function renderAdmin() {
  if (!requireStaff()) return;

  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="card max" id="adminConsole">
      <h2>Admin Console</h2>

      <div class="tabs" id="adminTabs">
        <button class="tab is-active" data-tab="courses">Courses</button>
        <button class="tab" data-tab="posts">Posts</button>
        <button class="tab" data-tab="ann">Announce</button>
        <button class="tab" data-tab="msg">Message</button>
        <button class="tab" data-tab="import">Import</button>
        <button class="tab" data-tab="certs">Certificates</button>
      </div>

      <!-- COURSES -->
      <div id="tab-courses">
        <form id="formCourse" class="form grid-2">
          <input type="hidden" name="id" />
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

          <!-- optional extras -->
          <label>Price (USD) <input name="price" type="number" step="0.01" min="0" value="0"></label>
          <label>Image URL <input name="img" placeholder="https://…"></label>
          <label>Benefits (comma-separated) <input name="benefits" placeholder="A, B, C"></label>

          <label>Final Pass % <input name="passPct" type="number" min="0" max="100" value="65"></label>
          <label>Final Question Limit <input name="finalLimit" type="number" min="1" value="12"></label>

          <div style="grid-column:1/-1; display:flex; gap:.5rem; justify-content:flex-end">
            <button type="button" id="btnResetCourse" class="btn ghost">Reset</button>
            <button class="btn" type="submit">Save course</button>
          </div>
        </form>

        <!-- ✅ use this exact id in JS -->
        <div id="adminCourseList" class="grid"></div>
      </div>

      <!-- POSTS -->
      <div id="tab-posts" class="hidden">
        <form id="formPosts" class="form grid-2">
          <label>Type
            <select name="type" id="postType">
              <option value="text">Text</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
            </select>
          </label>
          <label>Title
            <input name="title" placeholder="Post title">
          </label>

          <label class="col-2">Body
            <textarea name="body" rows="4" placeholder="Write something…"></textarea>
          </label>

          <div id="rowMedia" class="col-2">
            <label>Media file
              <input type="file" name="media" id="postMedia" accept="image/*,audio/*,video/*">
            </label>
            <label>OR Media URL
              <input name="mediaUrl" placeholder="https://… (optional)">
            </label>
          </div>

          <div class="col-2">
            <button class="btn" type="submit">Publish</button>
          </div>
        </form>

        <div id="adminPosts" class="stack" style="margin-top:1rem"></div>
      </div>

      <!-- ANNOUNCEMENTS -->
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

      <!-- MESSAGES -->
      <div id="tab-msg" class="hidden">
        <form id="formMsg" class="form">
          <label>To <input name="to" placeholder="user uid or * for broadcast" required></label>
          <label>Message <textarea name="text" required></textarea></label>
          <button class="btn" type="submit">Send</button>
        </form>
        <div id="adminMsgs" class="stack"></div>
      </div>

      <!-- IMPORT -->
      <div id="tab-import" class="hidden">
        <h3>Import Course JSON</h3>
        <textarea id="importJson" rows="10" placeholder="Paste catalog/chapters/lesson json here"></textarea>
        <div class="row" style="gap:.5rem">
          <button id="btnImportCourse" class="btn">Import</button>
          <button id="btnImportFolder" class="btn ghost">Quick Import</button>
        </div>
        <p class="muted">Tip: Start with catalog.json, then chapters.json, then each lesson json.</p>
      </div>

      <!-- ✅ NEW: CERTIFICATES (Admin-only preview tools) -->
      <div id="tab-certs" class="hidden">
        <h3>Certificates / Transcript (Admin preview)</h3>
        <form id="certForm" class="form grid-2" onsubmit="return false;">
          <label>User UID
            <input id="certUid" placeholder="user uid (blank = current admin)" />
          </label>
          <label>Course
            <select id="certCourse"></select>
          </label>
          <div style="grid-column:1/-1; display:flex; gap:.5rem; flex-wrap:wrap">
            <button class="btn"          id="btnViewCert"       type="button">View Certificate</button>
            <button class="btn ghost"    id="btnDlCert"         type="button">Download Certificate</button>
            <button class="btn"          id="btnViewTranscript" type="button">View Transcript</button>
            <button class="btn ghost"    id="btnDlTranscript"   type="button">Download Transcript</button>
          </div>
        </form>
      </div>
    </section>
  `;

  // Tabs (null-safe)
  const tabBtns = app.querySelectorAll(".tab");
  const paneKeys = ["courses", "posts", "ann", "msg", "import", "certs"];

  function showTab(k) {
    // buttons
    tabBtns.forEach((b) =>
      b.classList.toggle("is-active", b.dataset.tab === k)
    );
    // panes (null-safe)
    paneKeys.forEach((key) => {
      const el = app.querySelector(`#tab-${key}`);
      if (el) el.classList.toggle("hidden", key !== k);
    });
  }

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => showTab(btn.dataset.tab));
  });

  // initial
  showTab("courses");

  // load course list
  {
    const sel = document.getElementById("certCourse");
    if (sel) {
      sel.innerHTML = `<option value="">Loading…</option>`;
      const cs = await getDocs(
        query(collection(db, "courses"), orderBy("title", "asc"))
      );
      const opts = [];
      cs.forEach((d) => {
        const c = { id: d.id, ...d.data() };
        opts.push(
          `<option value="${c.id}">${escapeHtml(c.title || c.id)}</option>`
        );
      });
      sel.innerHTML = opts.join("") || `<option value="">(no courses)</option>`;
    }

    const pickUid = () =>
      (
        document.getElementById("certUid")?.value ||
        auth.currentUser?.uid ||
        ""
      ).trim();
    const pickCid = () =>
      (document.getElementById("certCourse")?.value || "").trim();

    document
      .getElementById("btnViewCert")
      ?.addEventListener("click", async () => {
        if (!requireStaff()) return;
        const uid = pickUid();
        const cid = pickCid();
        if (!cid) return alert("Choose a course");
        await renderCertificate(cid, uid, "view");
      });
    document
      .getElementById("btnDlCert")
      ?.addEventListener("click", async () => {
        if (!requireStaff()) return;
        const uid = pickUid();
        const cid = pickCid();
        if (!cid) return alert("Choose a course");
        await renderCertificate(cid, uid, "download");
      });
    document
      .getElementById("btnViewTranscript")
      ?.addEventListener("click", async () => {
        if (!requireStaff()) return;
        await renderTranscript(pickUid(), "view");
      });
    document
      .getElementById("btnDlTranscript")
      ?.addEventListener("click", async () => {
        if (!requireStaff()) return;
        await renderTranscript(pickUid(), "download");
      });
  }

  /* ---------- CERTS tab (admin preview) ---------- */
  try {
    // populate course list
    const sel = document.getElementById("certCourse");
    if (sel) {
      sel.innerHTML = `<option value="">Loading…</option>`;
      const cs = await getDocs(
        query(collection(db, "courses"), orderBy("title", "asc"))
      );
      const opts = [];
      cs.forEach((d) => {
        const c = { id: d.id, ...d.data() };
        opts.push(
          `<option value="${c.id}">${escapeHtml(c.title || c.id)}</option>`
        );
      });
      sel.innerHTML = opts.join("") || `<option value="">(no courses)</option>`;
    }

    // wire buttons
    document
      .getElementById("btnViewCert")
      ?.addEventListener("click", async () => {
        if (!requireStaff()) return; // guard
        const uid =
          (document.getElementById("certUid")?.value || "").trim() ||
          auth.currentUser?.uid ||
          "";
        const cid = document.getElementById("certCourse")?.value || "";
        if (!cid) return alert("Choose a course");
        try {
          await renderCertificate?.(cid, uid); // global function
        } catch (e) {
          console.error("[cert-preview]", e);
          alert("Failed to render certificate.");
        }
      });

    document
      .getElementById("btnViewTranscript")
      ?.addEventListener("click", async () => {
        if (!requireStaff()) return; // guard
        const uid =
          (document.getElementById("certUid")?.value || "").trim() ||
          auth.currentUser?.uid ||
          "";
        try {
          await renderTranscript?.(uid); // global function
        } catch (e) {
          console.error("[transcript-preview]", e);
          alert("Failed to render transcript.");
        }
      });
  } catch (e) {
    console.warn("[admin certs]", e);
  }

  // Inside renderAdmin(), after HTML is set:
  document
    .getElementById("btnImportCourse")
    ?.addEventListener("click", async () => {
      try {
        let raw = document.getElementById("importJson")?.value ?? "";
        raw = raw.trim().replace(/^\uFEFF/, ""); // strip BOM

        // Guard: empty
        if (!raw) return alert("Paste some JSON");

        // Support: some people paste multiple JSON roots at once.
        // If so, try to detect and split safely.
        const tryMany = [];
        if (raw.startsWith("[")) {
          // Top-level array of objects allowed too
          const arr = JSON.parse(raw);
          if (!Array.isArray(arr)) throw new Error("Top array expected");
          for (const x of arr) tryMany.push(x);
        } else {
          // Attempt single object; if fails, try to split by "}\n{"
          try {
            tryMany.push(JSON.parse(raw));
          } catch {
            // naive splitter for multiple roots pasted together
            const pieces = raw
              .split(/}\s*[\r\n]+\s*{/g)
              .map((s, i, arr) =>
                i === 0 ? s + "}" : "{" + s + (i === arr.length - 1 ? "" : "}")
              );
            for (const p of pieces) tryMany.push(JSON.parse(p));
          }
        }

        // Import each piece & log which branch importer took
        for (const j of tryMany) {
          console.log("[import] candidate:", j);
          await importAnyJson(j); // your function
          console.log("[import] ok");
        }

        alert("Imported ✅");
      } catch (e) {
        console.error("[import] failed:", e);
        alert("Invalid JSON or import error: " + (e?.message || e));
      }
    });

  // (optional) Quick Import demo
  document
    .getElementById("btnImportFolder")
    ?.addEventListener("click", async () => {
      alert(
        "Wire this to fetch /data/courses/... files and call importAnyJson sequentially."
      );
    });

  // (optional) Clear button, only if you have it in HTML
  document.getElementById("btnClearImport")?.addEventListener("click", () => {
    const ta = document.getElementById("importJson");
    if (ta) ta.value = "";
  });

  /* --------------- COURSES: load/list/bind --------------- */
  const listEl = document.getElementById("adminCourseList");
  // bindAdminCourseList(listEl);

  const formCourse = document.getElementById("formCourse");
  if (!formCourse) {
    console.warn("[admin] #formCourse not found");
    return;
  }

  function normBenefits(b) {
    if (Array.isArray(b)) return b;
    return String(b || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function courseCardAdminHTML(c) {
    const price = Number(c.price ?? 0);
    const priceLabel = price > 0 ? `$${price.toFixed(2)}` : "Free";
    return `
      <article class="course-card" data-id="${c.id}">
        <img src="${c.img || "/img/placeholder.png"}" class="cover" alt="">
        <div class="body">
          <h3>${c.title || ""}</h3>
          <p class="desc">${c.short || c.summary || ""}</p>
          <ul class="meta">
            <li>Level: ${c.level ?? 0}</li>
            <li>Credits: ${c.credits ?? 0}</li>
            <li>Benefits: ${(c.benefits || []).slice(0, 3).join(" • ")}</li>
            <li>Pass ≥ ${c.passPct ?? 65}%</li>              <!-- NEW -->
            <li>Final Qs: ${c.finalLimit ?? 12}</li>         <!-- NEW -->
          </ul>
          <div class="footer">
            <span class="price">${priceLabel}</span>
            <div class="actions">
              <button class="btn ghost" data-action="edit" data-id="${
                c.id
              }">Edit</button>
              <button class="btn danger" data-action="delete" data-id="${
                c.id
              }">Delete</button>
            </div>
          </div>
        </div>
      </article>`;
  }

  async function loadAdminCourses() {
    if (!listEl) return;
    listEl.innerHTML = "Loading…";
    const snap = await getDocs(
      query(collection(db, "courses"), orderBy("title", "asc"))
    );
    const rows = [];
    snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
    listEl.innerHTML = rows.map(courseCardAdminHTML).join("");
  }

  function fillCourseForm(c = {}) {
    formCourse.id.value = c.id || "";
    formCourse.title.value = c.title || "";
    formCourse.level.value = typeof c.level === "number" ? c.level : 0;
    formCourse.credits.value = typeof c.credits === "number" ? c.credits : 10;
    formCourse.summary.value = c.summary || c.short || "";
    formCourse.price.value = typeof c.price === "number" ? c.price : 0;
    formCourse.img.value = c.img || "";
    formCourse.benefits.value = Array.isArray(c.benefits)
      ? c.benefits.join(", ")
      : c.benefits || "";

    // ✅ NEW: final exam settings
    formCourse.passPct.value = typeof c.passPct === "number" ? c.passPct : 65;
    formCourse.finalLimit.value =
      typeof c.finalLimit === "number" ? c.finalLimit : 12;
  }

  document
    .getElementById("btnResetCourse")
    ?.addEventListener("click", () => fillCourseForm({}));

  formCourse.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const id = f.id.value || crypto.randomUUID();

    const data = {
      title: f.title.value.trim(),
      level: Number(f.level.value || 0),
      credits: Number(f.credits.value || 0),
      summary: f.summary.value.trim(),
      price: Number(f.price.value || 0),
      img: f.img.value.trim(),
      benefits: normBenefits(f.benefits.value),

      // ✅ NEW: final exam settings
      passPct: Number(f.passPct.value || 65),
      finalLimit: Number(f.finalLimit.value || 12),

      ts: serverTimestamp(),
    };

    await setDoc(doc(db, "courses", id), data, { merge: true });
    alert("Saved.");
    fillCourseForm({});
    await loadAdminCourses();
  });

  // ✅ one-time delegation on the list container
  if (listEl && !listEl.__wired) {
    listEl.__wired = true;
    listEl.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const id = btn.dataset.id;
      const act = btn.dataset.action;
      if (act === "edit") {
        const s = await getDoc(doc(db, "courses", id));
        if (s.exists()) fillCourseForm({ id: s.id, ...s.data() });
      } else if (act === "delete") {
        if (confirm("Delete this course?")) {
          await deleteDoc(doc(db, "courses", id));
          await loadAdminCourses();
        }
      }
    });
  }

  await loadAdminCourses();

  /* --------------- POSTS --------------- */
  const formPosts = app.querySelector("#formPosts");
  const postType = app.querySelector("#postType");
  const rowMedia = app.querySelector("#rowMedia");

  // type ပြောင်းသလောက် media row ပြ/ဖျောက်
  if (postType && rowMedia) {
    const syncMediaRow = () => {
      rowMedia.classList.toggle("hidden", postType.value === "text");
    };
    postType.addEventListener("change", syncMediaRow);
    syncMediaRow(); // initial
  }

  // Publish handler (guard with if)
  if (formPosts) {
    formPosts.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;

      const type = f.type.value;
      const title = (f.title.value || "").trim();
      const body = (f.body.value || "").trim();

      // either URL or file
      let mediaUrl = (f.mediaUrl?.value || "").trim();
      let mediaType = "";

      const file = f.media?.files?.[0];
      if (file) {
        const path = `posts/${auth.currentUser.uid}/${Date.now()}-${file.name}`;
        const r = sref(storage, path);
        const task = uploadBytesResumable(r, file, {
          contentType: file.type || "application/octet-stream",
        });
        await new Promise((res, rej) =>
          task.on("state_changed", null, rej, res)
        );
        mediaUrl = await getDownloadURL(task.snapshot.ref);
        mediaType = file.type || "";
      }

      await addDoc(collection(db, "posts"), {
        type,
        title,
        body,
        mediaUrl,
        mediaType,
        ts: serverTimestamp(),
      });

      alert("Post published ✅");
      f.reset();
      // type ပြန်ချိန်ထား (text ဖြစ်ရင် media row ဖျောက်)
      postType?.dispatchEvent(new Event("change"));

      // refresh list
      if (typeof loadAdminPosts === "function") loadAdminPosts();
    });
  } else {
    console.warn(
      "[admin] #formPosts not found — make sure renderAdmin() ran and the HTML ids match."
    );
  }

  // Upload helper
  async function uploadAdminPostFile() {
    const file = document.getElementById("postFile")?.files?.[0];
    if (!file) {
      alert("Choose a file");
      return;
    }
    if (!auth.currentUser) {
      authDlg?.showModal?.();
      return;
    }
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const uid = auth.currentUser.uid;
    const r = sref(storage, `posts/${uid}/${Date.now()}-${file.name}`);
    const task = uploadBytesResumable(r, file, {
      contentType: file.type || `application/octet-stream`,
    });
    await new Promise((res, rej) =>
      task.on("state_changed", () => {}, rej, res)
    );
    const url = await getDownloadURL(task.snapshot.ref);
    const f = document.getElementById("formPost");
    f.mediaUrl.value = url;
    f.mediaType.value = file.type || "";
    alert("Uploaded. URL filled in the form.");
  }
  document
    .getElementById("btnUploadPostFile")
    ?.addEventListener("click", uploadAdminPostFile);

  // List posts
  // helper: post card UI (type အလိုက် preview ပြ)
  function renderPostCard(p) {
    const ts = p.ts?.toDate ? p.ts.toDate().toLocaleString() : "";
    let media = "";
    if (p.mediaUrl) {
      if ((p.mediaType || "").startsWith("image/")) {
        media = `<img src="${p.mediaUrl}" alt="" style="max-width:100%;border-radius:12px;margin:.5rem 0">`;
      } else if ((p.mediaType || "").startsWith("video/")) {
        media = `<video src="${p.mediaUrl}" controls style="width:100%;border-radius:12px;margin:.5rem 0"></video>`;
      } else if ((p.mediaType || "").startsWith("audio/")) {
        media = `<audio src="${p.mediaUrl}" controls style="width:100%;margin:.5rem 0"></audio>`;
      } else {
        media = `<div class="muted" style="word-break:break-all">${p.mediaUrl}</div>`;
      }
    }
    return `
      <div class="card">
        <div class="row" style="justify-content:space-between;align-items:center">
          <strong>${escapeHtml(p.title || "(no title)")}
            <span class="badge">${escapeHtml(p.type || "text")}</span>
          </strong>
          <div class="row" style="gap:.5rem">
            <button class="btn small ghost"  data-act="edit" data-id="${
              p.id
            }">Edit</button>
            <button class="btn small danger" data-act="del"  data-id="${
              p.id
            }">Delete</button>
          </div>
        </div>
        <div class="muted" style="margin:.25rem 0">${ts}</div>
        ${media}
        ${p.body ? `<p>${escapeHtml(p.body)}</p>` : ""}
      </div>
    `;
  }

  async function loadAdminPosts() {
    const box = app.querySelector("#adminPosts");
    if (!box) return;
    box.innerHTML = `<div class="muted">Loading…</div>`;
    const snap = await getDocs(
      query(collection(db, "posts"), orderBy("ts", "desc"), limit(50))
    );
    const items = [];
    snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
    box.innerHTML = items.length
      ? items.map(renderPostCard).join("")
      : `<div class="card muted">No posts yet.</div>`;

    // delegate: delete
    box.querySelectorAll('[data-act="del"]').forEach((b) => {
      b.addEventListener("click", async () => {
        const id = b.getAttribute("data-id");
        if (confirm("Delete this post?")) {
          await deleteDoc(doc(db, "posts", id));
          loadAdminPosts();
        }
      });
    });

    // delegate: edit → prefill form
    box.querySelectorAll('[data-act="edit"]').forEach((b) => {
      b.addEventListener("click", async () => {
        const id = b.getAttribute("data-id");
        const s = await getDoc(doc(db, "posts", id));
        if (!s.exists()) return;
        const p = s.data();
        const f = app.querySelector("#formPosts");
        if (!f) return;
        f.type.value = p.type || "text";
        f.title.value = p.title || "";
        f.body.value = p.body || "";
        f.mediaUrl.value = p.mediaUrl || "";
        postType?.dispatchEvent(new Event("change"));

        // overwrite submit for update
        f.onsubmit = async (e2) => {
          e2.preventDefault();
          const upd = {
            type: f.type.value,
            title: (f.title.value || "").trim(),
            body: (f.body.value || "").trim(),
            mediaUrl: (f.mediaUrl.value || "").trim(),
            mediaType: p.mediaType || "",
            ts: serverTimestamp(),
          };
          await updateDoc(doc(db, "posts", id), upd);
          alert("Updated ✅");
          f.reset();
          f.onsubmit = null; // restore default (addEventListener) next render
          loadAdminPosts();
        };
      });
    });
  }
  loadAdminPosts();

  /* --------------- ANNOUNCEMENTS --------------- */
  const formAnn = document.getElementById("formAnn");
  if (formAnn)
    formAnn.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      await addDoc(collection(db, "announcements"), {
        title: f.title.value.trim(),
        level: f.level.value, // '*' or '0..3'
        body: f.body.value.trim(),
        ts: serverTimestamp(),
      });
      f.reset();
      await loadAdminAnns();
    });

  async function loadAdminAnns() {
    const box = document.getElementById("adminAnns");
    box.innerHTML = "Loading…";
    const snap = await getDocs(
      query(collection(db, "announcements"), orderBy("ts", "desc"))
    );
    const rows = [];
    snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
    box.innerHTML = rows
      .map(
        (a) => `
      <div class="card" data-id="${a.id}">
        <strong>${a.title}</strong>
        <div class="muted">Level: ${a.level}</div>
        <p>${a.body}</p>
        <button class="btn small danger" data-del="${a.id}">Delete</button>
      </div>
    `
      )
      .join("");

    box.querySelectorAll("[data-del]").forEach((b) => {
      b.addEventListener("click", async () => {
        await deleteDoc(doc(db, "announcements", b.dataset.del));
        await loadAdminAnns();
      });
    });
  }
  await loadAdminAnns();

  /* --------------- MESSAGES --------------- */
  const formMsg = document.getElementById("formMsg");
  if (formMsg)
    formMsg.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      await addDoc(collection(db, "messages"), {
        from: auth.currentUser.uid,
        to: f.to.value.trim(), // uid or "*"
        text: f.text.value.trim(),
        ts: serverTimestamp(),
      });
      f.reset();
      await loadAdminMsgs();
    });

  async function autoDeleteOldMessages(days = 7) {
    try {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const qOld = query(
        collection(db, "messages"),
        where("ts", "<", cutoff) // ⬅️ Timestamp.fromDate(cutoff) မလို
      );

      const snap = await getDocs(qOld);
      if (snap.empty) return;

      // writeBatch မ.import ထားရင် ဒီ loop ပဲ အသုံးပြု
      const deletions = [];
      snap.forEach((docSnap) => deletions.push(deleteDoc(docSnap.ref)));
      await Promise.all(deletions);

      // console.log(`[cleanup] deleted ${snap.size} old message(s)`);
    } catch (err) {
      console.error("[cleanup messages]", err);
    }
  }

  async function loadAdminMsgs() {
    const box = document.getElementById("adminMsgs");
    if (!box) return;
    box.innerHTML = "Loading…";

    const snap = await getDocs(
      query(collection(db, "messages"), orderBy("ts", "desc"))
    );
    const rows = [];
    snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));

    if (!rows.length) {
      box.innerHTML = `<div class="card muted">No messages.</div>`;
      return;
    }

    box.innerHTML = rows
      .map((m) => {
        const when = m.ts?.toDate ? m.ts.toDate().toLocaleString() : "";
        return `
        <div class="card" data-id="${m.id}">
          <div class="row" style="justify-content:space-between;align-items:center">
            <div>
              <div><strong>To:</strong> ${m.to}</div>
              <p class="muted" style="margin:.25rem 0">${when}</p>
              <p>${escapeHtml(m.text || "")}</p>
            </div>
            <div>
              <button class="btn small danger" data-del="${
                m.id
              }">Delete</button>
            </div>
          </div>
        </div>`;
      })
      .join("");

    // delegate delete
    box.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.del;
        if (!confirm("Delete this message?")) return;
        await deleteDoc(doc(db, "messages", id));
        await loadAdminMsgs();
      });
    });
  }
  await autoDeleteOldMessages(7);
  await loadAdminMsgs();
}

// ===== Draggable horizontal scroll that still allows tapping =====
function makeDraggableScroll(el) {
  if (!el) return;
  let isDown = false, startX = 0, startY = 0, scrollLeft = 0, pid = null;
  let moved = false;

  el.addEventListener('pointerdown', (e) => {
    isDown = true; moved = false;
    pid = e.pointerId; el.setPointerCapture(pid);
    startX = e.clientX; startY = e.clientY;
    scrollLeft = el.scrollLeft;
  });

  el.addEventListener('pointermove', (e) => {
    if (!isDown) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved = true;
    // only scroll horizontally
    el.scrollLeft = scrollLeft - dx;
  });

  function endPointer(e){
    if (!isDown) return;
    isDown = false; if (pid!=null) el.releasePointerCapture(pid); pid = null;

    // treat as tap only if user didn't drag
    if (!moved) {
      const btn = e.target.closest('.tab'); // <-- your existing class
      if (btn) btn.click();
    }
  }
  el.addEventListener('pointerup', endPointer);
  el.addEventListener('pointercancel', endPointer);
  el.addEventListener('mouseleave', endPointer);

  // prevent vertical scroll only when horizontal intent is clear
  el.addEventListener('touchmove', (e) => {
    if (!e.touches || !e.touches[0]) return;
    const t = e.touches[0];
    const dx = Math.abs(t.clientX - startX);
    const dy = Math.abs(t.clientY - startY);
    if (dx > dy) e.preventDefault();
  }, { passive: false });
}

// Tabs (null-safe)
const tabStrip = document.getElementById('adminTabs');
makeDraggableScroll(tabStrip);

const tabBtns = (tabStrip ? tabStrip.querySelectorAll('.tab') : document.querySelectorAll('.tab'));
const paneKeys = ['courses','posts','ann','msg','import','certs'];

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // active UI
    tabBtns.forEach(b => b.classList.toggle('is-active', b === btn));

    // show pane by data-tab
    const key = btn.dataset.tab;
    paneKeys.forEach(k => {
      const pane = document.getElementById(`tab-${k}`);
      if (pane) pane.classList.toggle('hidden', k !== key);
    });
  }, { passive: true });
});

// Active tab helper (route ပြောင်းတိုင်း ခေါ်ပါ)
function highlightAdminTab() {
  const el = document.getElementById('adminTabs');
  if (!el) return;
  const hash = location.hash || '';
  el.querySelectorAll('.admin-tab').forEach(a => {
    const on = hash.startsWith(a.getAttribute('href'));
    a.classList.toggle('active', !!on);
    if (on) {
      // active ကို အလယ်ဘက် သွားအောင်
      a.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  });
}
window.addEventListener('hashchange', highlightAdminTab);

/* ========= YouTube helper ========= */
function getYouTubeId(url = "") {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.slice(1);
    }
    if (u.hostname.includes("youtube.com")) {
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      // /embed/{id}
      const m = u.pathname.match(/\/embed\/([A-Za-z0-9_-]{6,})/);
      if (m) return m[1];
    }
  } catch {}
  return null;
}

/* Helper 4*/
function renderSidebarAndFlatList(courseId, chapters, activeLessonId) {
  const sb = document.getElementById("crsSidebar");
  const flat = [];
  sb.innerHTML = chapters
    .map((ch) => {
      const items = (ch.lessons || [])
        .map((ls) => {
          flat.push({ chId: ch.id, lsId: ls.id, title: ls.title || "" });
          const active =
            activeLessonId && ls.id === activeLessonId ? ' class="active"' : "";
          return `<li${active}><a href="#/courses/${courseId}/lesson/${
            ls.id
          }">${ls.title || "Lesson"}</a></li>`;
        })
        .join("");
      return `
          <details open class="blk">
            <summary><strong>${ch.order ?? ""} ${
        ch.title || ""
      }</strong></summary>
            <ol class="list clean">${
              items || '<li class="muted">No lessons</li>'
            }</ol>
          </details>
        `;
    })
    .join("");
  return flat;
}

// ===== Helper 5: show Certificate & Transcript buttons =====
async function showCertButtonsIfEligible(courseId, enrRef) {
  try {
    if (!enrRef) return;
    const snap = await getDoc(enrRef);
    const e = snap.exists() ? snap.data() : {};
    const prog = e.progress || {};
    const total = Object.keys(prog).length;
    const done = Object.values(prog).filter(Boolean).length;
    const ok = total > 0 && done >= total;

    const box = document.getElementById("certBtns");
    if (!box) return;

    if (ok) {
      box.innerHTML = `
        <button class="btn small" id="btnViewCert">Certificate</button>
        <button class="btn small ghost" id="btnViewTranscript">Transcript</button>
      `;
      document
        .getElementById("btnViewCert")
        ?.addEventListener("click", () => renderCertificate(courseId));
      document
        .getElementById("btnViewTranscript")
        ?.addEventListener("click", () =>
          renderTranscript(auth.currentUser?.uid)
        );
    } else {
      box.innerHTML = "";
    }
  } catch (e) {
    console.warn("[certBtns]", e);
  }
}

/* ========= Course Reader 1 ========= */
async function renderCourseDetail(courseId, lessonId = null) {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="card max" id="courseReader" data-cid="${courseId}">
      <div class="row" style="justify-content:space-between;align-items:center">
        <h2 id="crsTitle">Course</h2>
        <a class="btn ghost" href="#/dashboard">← Back to Dashboard</a>
      </div>

      <div class="grid-2" style="gap:1rem; align-items:flex-start">
        <aside id="crsSidebar" class="card" style="padding:0.5rem; max-height:70vh; overflow:auto"></aside>
        <main id="crsMain" class="card" style="min-height:50vh">Loading…</main>
      </div>
    </section>
  `;

  // --- Course title ---
  try {
    const s = await getDoc(doc(db, "courses", courseId));
    if (s.exists())
      document.getElementById("crsTitle").textContent =
        s.data().title || "Course";
  } catch {}

  // --- Load tree first (NEEDED for counts) ---
  const chapters = await loadCourseTree(courseId);
  const sb = document.getElementById("crsSidebar");
  const main = document.getElementById("crsMain");

  if (!chapters.length) {
    sb.innerHTML = `<div class="muted">No chapters yet.</div>`;
    main.innerHTML = `<div class="muted">No lessons.</div>`;
    return;
  }

  // --- progress state (scoped here) ---
  const uid = auth.currentUser?.uid;
  const enrRef = uid ? doc(db, "users", uid, "enrollments", courseId) : null;
  let progress = {};
  try {
    if (enrRef) {
      const es = await getDoc(enrRef);
      progress = es.exists() ? es.data().progress || {} : {};
    }
  } catch {}

  // --- compute counts for progress bar ---
  const allLessons = chapters.flatMap((ch) =>
    (ch.lessons || []).filter((ls) => ls.id !== "__final__")
  );
  const totalCount = allLessons.length;
  const doneCount = Object.values(progress).filter(Boolean).length;

  // --- Final Exam only when completed all normal lessons ---
  const canShowFinal = totalCount > 0 && doneCount >= totalCount;
  if (canShowFinal && chapters.length) {
    const last = chapters[chapters.length - 1];
    if (!(last.lessons || []).some((l) => l.id === "__final__")) {
      (last.lessons ||= []).push({
        id: "__final__",
        order: 9999,
        title: "Final Exam",
        isFinal: true,
      });
    }
  }

  // --- Sidebar render ---
  // const flat = [];
  const flat = renderSidebarAndFlatList(courseId, chapters, lessonId);
  sb.innerHTML = chapters
    .map((ch) => {
      const items = (ch.lessons || [])
        .map((ls) => {
          flat.push({ chId: ch.id, lsId: ls.id, title: ls.title || "" });
          const active =
            lessonId && ls.id === lessonId ? ' class="active"' : "";
          return `<li${active}><a href="#/courses/${courseId}/lesson/${
            ls.id
          }">${ls.title || "Lesson"}</a></li>`;
        })
        .join("");
      return `
      <details open class="blk">
        <summary><strong>${ch.order ?? ""} ${ch.title || ""}</strong></summary>
        <ol class="list clean">${
          items || '<li class="muted">No lessons</li>'
        }</ol>
      </details>
    `;
    })
    .join("");

  // default select first lesson
  if (!lessonId && flat.length) {
    location.hash = `#/courses/${courseId}/lesson/${flat[0].lsId}`;
    return;
  }

  // idx + prev/next
  const idx = flat.findIndex((x) => x.lsId === lessonId);
  if (idx < 0) {
    main.innerHTML = `<div class="card error">Lesson not found.</div>`;
    return;
  }
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx < flat.length - 1 ? flat[idx + 1] : null;

  if (!next) {
    const existsFinal = chapters[chapters.length - 1]?.lessons?.some(
      (l) => l.id === "__final__"
    );
    if (existsFinal) next = { lsId: "__final__" };
  }

  // --- Normal lesson flow ---
  try {
    // load quiz (optional)
    let quiz = null,
      questions = [];
    const chId = flat[idx].chId;

    const lessonRef = doc(
      db,
      "courses",
      courseId,
      "chapters",
      chId,
      "lessons",
      lessonId
    );
    const lsSnap = await getDoc(lessonRef);
    if (!lsSnap.exists()) {
      main.innerHTML = `<div class="card error">Lesson not found.</div>`;
      return;
    }
    const L = { id: lsSnap.id, ...lsSnap.data() };

    // prepare helpers
    const isUrl = (v) => /^https?:\/\//i.test(v || "");
    const isPdf = (v) => /\.pdf($|\?)/i.test(v || "");
    const getYouTubeId = (u = "") => {
      try {
        const m = u.match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{11})/);
        return m ? m[1] : "";
      } catch {
        return "";
      }
    };

    // load contents
    const contents = [];
    const csnap = await getDocs(
      query(
        collection(
          db,
          "courses",
          courseId,
          "chapters",
          chId,
          "lessons",
          lessonId,
          "contents"
        ),
        orderBy("order", "asc")
      )
    );
    csnap.forEach((d) => contents.push({ id: d.id, ...d.data() }));
    const contentsResolved = await Promise.all(
      contents.map(async (b) => ({
        ...b,
        url: await resolveMediaUrl(b.url || ""),
      }))
    );

    // ✅ normalize quiz object (may be null)
    const quizObj = quiz
      ? {
          title: quiz.title || "Quiz",
          shuffle: !!quiz.shuffle,
          passPct: Number(quiz.passPct ?? 70),
          questions: questions || [],
        }
      : null;
    const qsnap = await getDocs(
      collection(
        db,
        "courses",
        courseId,
        "chapters",
        chId,
        "lessons",
        lessonId,
        "quizzes"
      )
    );
    qsnap.forEach((qd) => {
      if (!quiz) quiz = { id: qd.id, ...qd.data() };
    });
    if (quiz) {
      const qsn = await getDocs(
        collection(
          db,
          "courses",
          courseId,
          "chapters",
          chId,
          "lessons",
          lessonId,
          "quizzes",
          quiz.id,
          "questions"
        )
      );
      qsn.forEach((d) => questions.push({ id: d.id, ...d.data() }));
      quiz.questions = questions;
    }

    // header + shells
    const readingHtml = (() => {
      const r = L.reading || "";
      if (!r) return "";
      if (isUrl(r) && isPdf(r)) {
        return `<p style="margin:.5rem 0"><a class="btn small" href="${r}" target="_blank" rel="noopener">Open handout (PDF)</a></p>`;
      }
      const safe = escapeHtml(String(r)).replace(/\n/g, "<br>");
      return `<div class="card"><div class="reading">${safe}</div></div>`;
    })();

    // --- build header FIRST, then query children safely ---
    main.innerHTML = `
        <div id="courseProgress" class="progress-wrap" style="margin:.5rem 0 1rem">
            <div class="progress-bar"><span style="width:0%"></span></div>
            <div class="progress-text muted"></div>
          </div>

        <div class="row" style="justify-content:space-between;align-items:center; gap:.5rem;">
          <h3 style="margin:0">${L.title || "Lesson"}</h3>
          <div class="row" style="gap:.5rem;align-items:center">
            <div id="certBtns"></div>   <!-- 👈 certificate/transcript buttons will appear here -->
            <button class="btn ghost" ${
              prev ? "" : "disabled"
            } data-nav="prev">← Prev</button>
            <button class="btn" ${
              next ? "" : "disabled"
            } data-nav="next" id="btnNext">Next →</button>
          </div>
        </div>

      ${readingHtml}

    
      <div class="row" style="gap:.5rem; margin:.25rem 0 1rem">
        <button class="btn small" id="btnMarkDone">Mark lesson complete</button>
        <span class="muted" id="markMsg"></span>
      </div>

      <div id="lessonBlocks" class="stack" style="margin-top:.5rem"></div>

      ${
        quiz
          ? `<div class="card" id="quizCard">
              <strong id="quizTitle">Quiz</strong>
              <p class="muted" id="quizMeta"></p>
              <div class="row" style="gap:.5rem;flex-wrap:wrap">
                <button class="btn" id="btnStartQuiz">Start Quiz</button>
                <span id="quizResult" class="muted"></span>
              </div>
              <div id="quizHost" style="margin-top:.5rem"></div>
            </div>`
          : ``
      }
    `;

    const btnNext = document.getElementById("btnNext");

    // အခုသင်ကြည့်နေတဲ့ lesson ပြီးပြီလား?
    const isDone = !!progress[lessonId];
    if (btnNext) btnNext.disabled = !isDone; // ❗ Quiz မပတ်လဲ မဖြတ်လမ်းနိုင်အောင်

    // nav buttons (ရှိပြီးသား code)
    btnNext?.addEventListener(
      "click",
      () =>
        next && (location.hash = `#/courses/${courseId}/lesson/${next.lsId}`)
    );

    // --- only after innerHTML is set, resolve nodes ---
    const lessonBlocks = main.querySelector("#lessonBlocks");
    if (!lessonBlocks) {
      console.warn(
        "[reader] #lessonBlocks not found; aborting render to avoid null error"
      );
      return;
    }

    // (optional) inline PDF preview
    if (isUrl(L.reading) && isPdf(L.reading)) {
      main.insertAdjacentHTML(
        "beforeend",
        `
        <div class="card" style="margin-top:.5rem">
          <div style="position:relative;padding-bottom:130%;height:0;overflow:hidden;border-radius:12px">
            <iframe src="${L.reading}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0"></iframe>
          </div>
        </div>
      `
      );
    }

    // --- render contents (guard again) ---
    try {
      lessonBlocks.innerHTML = contentsResolved
        .map((b) => {
          const cap = b.caption
            ? `<div class="muted" style="margin:.25rem 0 0">${escapeHtml(
                b.caption
              )}</div>`
            : "";
          const u = b.url || "";
          const t = (b.type || "").toLowerCase();
          const yid = getYouTubeId(u);
          if (t === "youtube" || yid) {
            return `<div class="card">
            <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px">
              <iframe src="https://www.youtube.com/embed/${yid}" allowfullscreen
                style="position:absolute;top:0;left:0;width:100%;height:100%;border:0"></iframe>
            </div>${cap}
          </div>`;
          }
          switch (t) {
            case "video":
              return `<div class="card"><video src="${u}" controls style="width:100%;border-radius:12px"></video>${cap}</div>`;
            case "audio":
              return `<div class="card"><audio src="${u}" controls style="width:100%"></audio>${cap}</div>`;
            case "image":
              return `<div class="card"><img src="${u}" alt="" style="max-width:100%;height:auto;border-radius:12px" />${cap}</div>`;
            case "text":
            default:
              return `<div class="card"><a href="${u}" target="_blank" rel="noopener">${escapeHtml(
                u
              )}</a>${cap}</div>`;
          }
        })
        .join("");
    } catch (e) {
      console.error("[reader/blocks]", e);
    }

    // helper: set Next button state (gray when disabled, blue when enabled)
    function setNextState(passed, isLast) {
      const btnNext = document.getElementById("btnNext");
      if (!btnNext) return;

      if (isLast) {
        // နောက်ဆုံးအခန်း—ရောက်ချင်း disabled (မခွင့်ပြု)
        btnNext.disabled = true;
        btnNext.classList.remove("primary");
        btnNext.title = "This is the last lesson";
        return;
      }

      btnNext.disabled = !passed; // Quiz မဖြတ်မချင်း မခွင့်ပြု
      btnNext.classList.toggle("primary", !!passed); // passed => ပြာရောင်
      btnNext.title = passed ? "" : "Complete the quiz to proceed";
    }

    // … header DOM တင်ပြီးနောက် (prev/next တွေတွက်ပြီး) —
    const isLastLesson = !next || !next.lsId;
    setNextState(!!progress[lessonId], isLastLesson);

    // ✦ normalize: JSON / Firestore မတူရောရင်လည်း အလွယ်တကူသုံးဖို့
    function normalizeQuiz(raw) {
      if (!raw) return null;
      const q = {
        id: raw.id || "",
        title: raw.title || "Quiz",
        shuffle: !!raw.shuffle,
        passPct: Number(raw.passPct ?? 70),
        questions: Array.isArray(raw.questions)
          ? raw.questions.map((x) => ({
              id: x.id || "",
              type:
                (x.type || "").toLowerCase() ||
                (Array.isArray(x.answerIndex) ? "mcq" : "scq"),
              text: x.text || "",
              choices: Array.isArray(x.choices) ? x.choices.slice() : [],
              answerIndex: Array.isArray(x.answerIndex)
                ? x.answerIndex.slice()
                : typeof x.answerIndex === "number"
                ? x.answerIndex
                : null,
              points: Number(x.points || 1),
              feedback: x.feedback || null,
              accept: Array.isArray(x.accept) ? x.accept.slice() : null,
            }))
          : [],
      };
      return q.questions.length ? q : null;
    }

    // ✦ fallback (A): lesson doc ထဲမှာ quiz inline ရှိရင်
    function getFallbackQuizFromLessonDoc(L) {
      // support L.quiz or L.quizJson
      if (L && L.quiz && Array.isArray(L.quiz.questions)) {
        return normalizeQuiz(L.quiz);
      }
      if (L && L.quizJson && Array.isArray(L.quizJson.questions)) {
        return normalizeQuiz(L.quizJson);
      }
      return null;
    }

    // ✦ fallback (B): lessonsUrl JSON ဖိုင်ကနေ ယူချင်ရင်
    async function getFallbackQuizFromUrl(url) {
      try {
        if (!url) return null;
        const res = await fetch(url, { cache: "no-cache" });
        if (!res.ok) return null;
        const j = await res.json();
        // support root { quiz: {...} } or quiz ကို root-level ထဲမှာတင်ရှိမှုနှစ်မျိုးလုံး
        const payload = j.quiz ? j.quiz : j;
        return normalizeQuiz(payload);
      } catch {
        return null;
      }
    }

    // --- after you set main.innerHTML (quizHost div already exists) ---
    const startBtn = document.getElementById("btnStartQuiz");
    const qHost = document.getElementById("quizHost");

    if (startBtn && qHost) {
      startBtn.onclick = async () => {
        startBtn.disabled = true;
        startBtn.textContent = "Loading quiz…";

        // 1) Firestore
        let quizObj = await loadLessonQuiz(courseId, chId, lessonId);

        // 2) Fallback (A): Lesson doc ထဲက inline quiz
        if (!quizObj) {
          quizObj = getFallbackQuizFromLessonDoc(L);
        }

        // 3) Fallback (B): lessonsUrl JSON (chapters.json/lesson JSON design အသုံးပြုတာနဲ့ကိုက်)
        if (!quizObj) {
          // L.lessonsUrl (သို့) L.quizUrl တစ်ခုခုရှိမရှိ စစ်ကြည့်
          const url = L.lessonsUrl || L.quizUrl || L.srcUrl;
          if (url) {
            quizObj = await getFallbackQuizFromUrl(url);
          }
        }

        if (!quizObj || !quizObj.questions?.length) {
          qHost.innerHTML = `<div class="muted">This lesson has no quiz yet.</div>`;
          startBtn.disabled = true;
          startBtn.textContent = "No quiz";
          return;
        }

        // header meta update
        const ttl = document.getElementById("quizTitle");
        const meta = document.getElementById("quizMeta");
        if (ttl) ttl.textContent = quizObj.title || "Quiz";
        if (meta)
          meta.textContent = `${quizObj.questions.length} questions · Pass ${
            quizObj.passPct ?? 70
          }%`;

        // pass-on complete callback
        quizObj.onSubmit = async ({ passed }) => {
          if (!passed) return;

          // save progress
          progress[lessonId] = true;
          if (enrRef) await setDoc(enrRef, { progress }, { merge: true });
          updateProgressUI(main, progress, totalCount);

          // Next button
          const isLastLesson = !next || !next.lsId;
          setNextState(true, isLastLesson);

          // အားလုံးပြီးပြီလား?
          const done = Object.values(progress).filter(Boolean).length;
          const allDone = totalCount > 0 && done >= totalCount;

          if (allDone) {
            // Quiz UI lock
            const qHost = document.getElementById("quizHost");
            disableQuizUI(qHost);

            // header cert buttons refresh
            await showCertButtonsIfEligible(courseId, enrRef);

            // modal ပြ
            showCongratsModal();
          }
        };

        // render!
        renderQuizUI(qHost, quizObj);

        startBtn.disabled = false;
        startBtn.textContent = "Restart";
      };
    }

    // === (B) Read lesson quiz+questions from Firestore ===
    async function loadLessonQuiz(courseId, chId, lessonId) {
      const quizCol = collection(
        db,
        "courses",
        courseId,
        "chapters",
        chId,
        "lessons",
        lessonId,
        "quizzes"
      );
      const qsnap = await getDocs(quizCol);
      if (qsnap.empty) return null;

      const qdoc = qsnap.docs[0];
      const qdata = qdoc.data() || {};

      const qsnCol = collection(
        db,
        "courses",
        courseId,
        "chapters",
        chId,
        "lessons",
        lessonId,
        "quizzes",
        qdoc.id,
        "questions"
      );
      const qsnSnap = await getDocs(qsnCol);
      const questions = qsnSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() || {}),
      }));

      return {
        id: qdoc.id,
        title: qdata.title || "Quiz",
        shuffle: !!qdata.shuffle,
        passPct: Number(qdata.passPct ?? 70),
        questions,
      };
    }

    async function afterLessonCompleted() {
      // 1) save progress already done (you do this today)
      // 2) if now all done -> inject final + rerender sidebar + maybe auto-nav

      const done = Object.values(progress).filter(Boolean).length;
      if (totalCount > 0 && done >= totalCount) {
        ensureFinalInjected(chapters);
        const flat2 = renderSidebarAndFlatList(courseId, chapters, lessonId);

        // if user is currently at the last normal lesson and there was no "next" before,
        // navigate to Final Exam directly
        const i = flat2.findIndex((x) => x.lsId === lessonId);
        const next = i >= 0 ? flat2[i + 1] : null;
        if (next && next.lsId === "__final__") {
          location.hash = `#/courses/${courseId}/lesson/__final__`;
        }
      }
    }

    // contents render (ensure host exists NOW)
    const host = document.getElementById("lessonBlocks");
    host.innerHTML = contentsResolved
      .map((b) => {
        const cap = b.caption
          ? `<div class="muted" style="margin:.25rem 0 0">${escapeHtml(
              b.caption
            )}</div>`
          : "";
        const u = b.url || "";
        const t = (b.type || "").toLowerCase();
        const yid = getYouTubeId(u);
        if (t === "youtube" || yid) {
          const id = yid;
          if (id) {
            return `<div class="card">
            <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px">
              <iframe src="https://www.youtube.com/embed/${id}" allowfullscreen
                style="position:absolute;top:0;left:0;width:100%;height:100%;border:0"></iframe>
            </div>${cap}
          </div>`;
          }
        }
        switch (t) {
          case "video":
            return `<div class="card"><video src="${u}" controls style="width:100%;border-radius:12px"></video>${cap}</div>`;
          case "audio":
            return `<div class="card"><audio src="${u}" controls style="width:100%"></audio>${cap}</div>`;
          case "image":
            return `<div class="card"><img src="${u}" alt="" style="max-width:100%;height:auto;border-radius:12px" />${cap}</div>`;
          case "text":
          default:
            return `<div class="card"><a href="${u}" target="_blank" rel="noopener">${escapeHtml(
              u
            )}</a>${cap}</div>`;
        }
      })
      .join("");

    // nav buttons
    main
      .querySelector('[data-nav="prev"]')
      ?.addEventListener(
        "click",
        () =>
          prev && (location.hash = `#/courses/${courseId}/lesson/${prev.lsId}`)
      );
    main
      .querySelector('[data-nav="next"]')
      ?.addEventListener(
        "click",
        () =>
          next && (location.hash = `#/courses/${courseId}/lesson/${next.lsId}`)
      );

    // mark manual complete
    document
      .getElementById("btnMarkDone")
      ?.addEventListener("click", async () => {
        progress[lessonId] = true;
        if (enrRef) await setDoc(enrRef, { progress }, { merge: true });
        updateProgressUI(main, progress, totalCount);
        await afterLessonCompleted(); // 👈 here
      });

    // initial progress render
    updateProgressUI(main, progress, totalCount);
  } catch (e) {
    console.error("[reader]", e);
    main.innerHTML = `<div class="card error">Failed to load lesson.</div>`;
  }
}

function showCongratsModal() {
  const html = `
    <div class="modal-overlay" id="congratsModal">
      <div class="modal-card">
        <img src="/img/congrats.png" alt="Congrats" onerror="this.style.display='none'">
        <h3 style="margin:.25rem 0 .5rem">ဂုဏ်ယူပါတယ်! 🎉</h3>
        <p class="muted">သင့်ရဲ့ ကြိုးစားမှုအတွက် ဂုဏ်ယူပါတယ်၊ ပျော်ရွင်ပါစေ</p>
        <div class="row" style="margin-top:.75rem">
          <button class="btn" id="btnOpenCert">Certificate</button>
          <button class="btn ghost" id="btnOpenTranscript">Transcript</button>
          <button class="btn ghost" id="btnCloseModal">Close</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML("beforeend", html);

  document.getElementById("btnCloseModal")?.addEventListener("click", () => {
    document.getElementById("congratsModal")?.remove();
  });
  document.getElementById("btnOpenCert")?.addEventListener("click", () => {
    const cid = document.querySelector("#courseReader")?.dataset?.cid;
    if (cid) renderCertificate(cid);
  });
  document
    .getElementById("btnOpenTranscript")
    ?.addEventListener("click", () => {
      renderTranscript(auth.currentUser?.uid);
    });
}

function disableQuizUI(scopeEl) {
  if (!scopeEl) return;
  scopeEl
    .querySelectorAll("input, textarea, button")
    .forEach((el) => (el.disabled = true));
}

function updateProgressUI(main, progress = {}, totalCount = 0) {
  const done = Object.values(progress).filter(Boolean).length;
  const pct = totalCount ? Math.round((done / totalCount) * 100) : 0;
  const bar = main.querySelector("#courseProgress .progress-bar > span");
  const txt = main.querySelector("#courseProgress .progress-text");
  if (bar) bar.style.width = `${pct}%`;
  if (txt)
    txt.textContent = `Progress: ${done}/${totalCount} lessons (${pct}%)`;
}

function shuffle(arr) {
  return arr
    .map((v) => [Math.random(), v])
    .sort((a, b) => a[0] - b[0])
    .map((x) => x[1]);
}

// === (A) QUIZ RENDERER: radio / checkbox / textarea ===
function renderQuizUI(hostEl, quiz) {
  if (!hostEl) return;
  if (!quiz || !Array.isArray(quiz.questions) || !quiz.questions.length) {
    hostEl.innerHTML = `<div class="muted">This lesson has no quiz yet.</div>`;
    return;
  }

  const qs = quiz.shuffle
    ? [...quiz.questions].sort(() => Math.random() - 0.5)
    : [...quiz.questions];

  const html = qs
    .map((q, qi) => {
      const name = `q_${qi}`;
      const rawType = String(q.type || "").toLowerCase();
      const isMCQ = rawType === "mcq" || Array.isArray(q.answerIndex);
      const type = isMCQ ? "mcq" : rawType || "scq";

      const choiceHtml = Array.isArray(q.choices)
        ? q.choices
            .map((c, ci) => {
              const input = isMCQ
                ? `<input type="checkbox" name="${name}" value="${ci}">`
                : `<input type="radio" name="${name}" value="${ci}">`;
              return `<label class="quiz-choice">${input}<span class="quiz-choice-text">${escapeHtml(
                String(c)
              )}</span></label>`;
            })
            .join("")
        : "";

      const saHtml =
        rawType === "sa"
          ? `<textarea name="${name}" rows="3" class="quiz-textarea" placeholder="Type your answer…"></textarea>`
          : "";

      return `
      <div class="quiz-q" data-type="${type}">
        <div class="quiz-qtext"><span class="q-num">${
          qi + 1
        }.</span> ${escapeHtml(q.text || "")}</div>
        <div class="quiz-choices">${choiceHtml || saHtml}</div>
        <div class="quiz-feedback" style="display:none"></div>
      </div>
    `;
    })
    .join("");

  hostEl.innerHTML = `
    <div class="quiz-wrap">
      ${html}
      <div class="row" style="gap:.5rem;margin-top:.75rem">
        <button class="btn" id="btnSubmitQuiz">Submit</button>
        <button class="btn ghost" id="btnResetQuiz">Reset</button>
        <span id="quizScore" class="muted" style="margin-left:auto"></span>
      </div>
    </div>
  `;

  const submitBtn = hostEl.querySelector("#btnSubmitQuiz");
  const resetBtn = hostEl.querySelector("#btnResetQuiz");

  submitBtn?.addEventListener("click", () => {
    let got = 0,
      total = 0;
    let firstWrong = null;

    hostEl.querySelectorAll(".quiz-q").forEach((wrap, i) => {
      const q = qs[i] || {};
      const rawType = String(q.type || "").toLowerCase();
      const isMCQ = rawType === "mcq" || Array.isArray(q.answerIndex);
      const type = isMCQ ? "mcq" : rawType || "scq";

      const fb = wrap.querySelector(".quiz-feedback");
      const pts = Number(q.points || 1);
      total += pts;

      let ok = false;
      let sel = [];

      if (type === "mcq") {
        sel = [...wrap.querySelectorAll('input[type="checkbox"]:checked')]
          .map((x) => Number(x.value))
          .sort();
        const ans = (Array.isArray(q.answerIndex) ? q.answerIndex : [])
          .map(Number)
          .sort();
        ok = JSON.stringify(sel) === JSON.stringify(ans);
      } else if (type === "scq") {
        const r = wrap.querySelector('input[type="radio"]:checked');
        sel = r ? [Number(r.value)] : [];
        ok = r && Number(r.value) === Number(q.answerIndex);
      } else if (rawType === "sa") {
        const v = (wrap.querySelector("textarea")?.value || "").trim();
        if (Array.isArray(q.accept)) {
          ok = q.accept.some(
            (a) => String(a).toLowerCase().trim() === v.toLowerCase()
          );
        } else {
          ok = !!v;
        }
      }

      if (ok) got += pts;
      else if (!firstWrong) firstWrong = wrap;

      // ===== feedback handling =====
      let msg = ok ? q.feedback?.correct?.text : q.feedback?.incorrect?.text;
      let color = ok
        ? q.feedback?.correct?.color
        : q.feedback?.incorrect?.color;

      // fallback if none found
      if (!msg && Array.isArray(q.feedback?.byChoice) && sel.length) {
        msg = q.feedback.byChoice[sel[0]];
      }

      fb.style.display = "block";
      fb.textContent = msg || (ok ? "မှန်ကန်ပါတယ် ✅" : "ထပ်ကြိုးစားပါ ❌");
      fb.classList.toggle("good", !!ok);
      fb.classList.toggle("bad", !ok);
      fb.style.color = color || "";

      wrap.querySelectorAll(".quiz-choice").forEach((lbl) => {
        const inp = lbl.querySelector("input");
        if (!inp) return;
        lbl.classList.remove("is-correct", "is-wrong");
        if (inp.checked) lbl.classList.add(ok ? "is-correct" : "is-wrong");
      });

      if (!ok && (type === "mcq" || type === "scq")) {
        const ansIdxs = Array.isArray(q.answerIndex)
          ? q.answerIndex.map(Number)
          : [Number(q.answerIndex)];
        wrap.querySelectorAll(".quiz-choice").forEach((lbl, ci) => {
          lbl.style.outline = ansIdxs.includes(ci)
            ? "2px dashed #28a74555"
            : "";
        });
      } else {
        wrap
          .querySelectorAll(".quiz-choice")
          .forEach((lbl) => (lbl.style.outline = ""));
      }
    });

    const pct = total ? Math.round((got / total) * 100) : 0;
    const need = Number(quiz.passPct ?? 70);
    const _scoreEl = hostEl.querySelector("#quizScore");
    if (_scoreEl) _scoreEl.textContent = `Score: ${got}/${total} (${pct}%)`;

    if (typeof quiz.onSubmit === "function") {
      quiz.onSubmit({ got, total, pct, passed: pct >= need });
    }

    firstWrong?.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  resetBtn?.addEventListener("click", () => {
    hostEl
      .querySelectorAll('input[type="radio"],input[type="checkbox"]')
      .forEach((i) => (i.checked = false));
    hostEl.querySelectorAll("textarea").forEach((t) => (t.value = ""));
    hostEl.querySelectorAll(".quiz-feedback").forEach((f) => {
      f.style.display = "none";
      f.textContent = "";
      f.style.color = "";
      f.classList.remove("good", "bad");
    });
    const _scoreEl2 = hostEl.querySelector("#quizScore");
    if (_scoreEl2) _scoreEl2.textContent = "";
    hostEl.querySelectorAll(".quiz-choice").forEach((l) => {
      l.classList.remove("is-correct", "is-wrong");
      l.style.outline = "";
    });
  });
}

// renderQuizUI(qHost, quizObj);

function gradeFromPct(pct) {
  if (pct >= 100) return "A+";
  if (pct >= 95) return "A";
  if (pct >= 85) return "B";
  if (pct >= 75) return "C";
  if (pct >= 65) return "D";
  return "F";
}

/* Fisher–Yates shuffle Helper 2 */
function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Load course-level final exam settings with defaults
async function getCourseExamSettings(courseId) {
  const s = await getDoc(doc(db, "courses", courseId));
  const c = s.exists() ? s.data() : {};
  return {
    passPct: typeof c.passPct === "number" ? c.passPct : 65, // default 65
    finalLimit: typeof c.finalLimit === "number" ? c.finalLimit : 12, // default 12
  };
}

// All lessons' quiz questions → one big pool
async function getAllLessonQuestions(courseId) {
  const pool = [];

  // chapters
  const chSnap = await getDocs(collection(db, "courses", courseId, "chapters"));
  for (const chDoc of chSnap.docs) {
    const chId = chDoc.id;

    // lessons
    const lsSnap = await getDocs(
      collection(db, "courses", courseId, "chapters", chId, "lessons")
    );
    for (const lsDoc of lsSnap.docs) {
      const lsId = lsDoc.id;

      // quizzes (သင်တန်းတစ်ခန်းမှာ quiz တစ်ခုထက်ပိုလို့ရ)
      const qzSnap = await getDocs(
        collection(
          db,
          "courses",
          courseId,
          "chapters",
          chId,
          "lessons",
          lsId,
          "quizzes"
        )
      );
      for (const qDoc of qzSnap.docs) {
        // questions
        const qsSnap = await getDocs(
          collection(
            db,
            "courses",
            courseId,
            "chapters",
            chId,
            "lessons",
            lsId,
            "quizzes",
            qDoc.id,
            "questions"
          )
        );
        for (const q of qsSnap.docs) {
          const raw = { id: q.id, ...q.data(), _lesson: lsId, _chapter: chId };
          let type = (raw.type || "").toLowerCase();
          let choices = raw.choices || [];
          let correct = null;

          if (!type) {
            // backward-compat
            if (Array.isArray(raw.answerIndexes)) type = "multi";
            else if (typeof raw.answerIndex === "number") type = "single";
            else if (raw.answerText) type = "short";
            else type = "single"; // assume single choice
          }

          if (type === "multi") {
            correct = Array.isArray(raw.answerIndexes) ? raw.answerIndexes : [];
          } else if (type === "short") {
            correct = raw.answerText || raw.accept || raw.answers || ""; // allow array
          } else {
            correct = typeof raw.answerIndex === "number" ? raw.answerIndex : 0;
          }

          pool.push({
            id: raw.id,
            text: raw.text || "",
            type,
            choices,
            correct,
          });
        }
      }
    }
  }

  return pool;
}

async function buildFinalExam(courseId, opts = {}) {
  const { passPct, finalLimit } = await getCourseExamSettings(courseId);
  const limit = typeof opts.limit === "number" ? opts.limit : finalLimit;

  const pool = await getAllLessonQuestions(courseId);
  if (!pool.length) {
    return { title: "Final Exam", passPct, questions: [] };
  }

  shuffleInPlace(pool);
  const picked = pool.slice(0, Math.max(1, limit));

  return {
    title: "Final Exam",
    passPct,
    questions: picked,
  };
}

/* ========= Course Reader 2 ========= */
async function renderFinalExamUI(courseId, quiz) {
  const main = document.getElementById("crsMain");
  if (!main) return;

  if (!quiz.questions || !quiz.questions.length) {
    main.innerHTML = `
      <div class="card">
        <h3>Final Exam</h3>
        <p class="muted">No questions available for this course.</p>
      </div>`;
    return;
  }

  // Render questions
  const qHtml = quiz.questions
    .map((q, i) => {
      const n = i + 1;
      if (q.type === "short") {
        return `
        <div class="card">
          <div><strong>${n}. ${escapeHtml(q.text)}</strong></div>
          <input class="input" name="q_${i}" placeholder="Your answer">
        </div>`;
      } else if (q.type === "multi") {
        const opts = (q.choices || [])
          .map(
            (c, idx) => `
        <label class="row" style="gap:.5rem">
          <input type="checkbox" name="q_${i}" value="${idx}">
          <span>${escapeHtml(c)}</span>
        </label>`
          )
          .join("");
        return `
        <div class="card">
          <div><strong>${n}. ${escapeHtml(q.text)}</strong></div>
          <div class="stack" style="margin-top:.5rem">${opts}</div>
        </div>`;
      } else {
        // single
        const opts = (q.choices || [])
          .map(
            (c, idx) => `
        <label class="row" style="gap:.5rem">
          <input type="radio" name="q_${i}" value="${idx}">
          <span>${escapeHtml(c)}</span>
        </label>`
          )
          .join("");
        return `
        <div class="card">
          <div><strong>${n}. ${escapeHtml(q.text)}</strong></div>
          <div class="stack" style="margin-top:.5rem">${opts}</div>
        </div>`;
      }
    })
    .join("");

  main.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content:space-between;align-items:center">
        <h3 style="margin:0">${escapeHtml(quiz.title || "Final Exam")}</h3>
        <span class="badge">Pass ≥ ${quiz.passPct}%</span>
      </div>
      <p class="muted">${quiz.questions.length} questions</p>
    </div>

    <form id="finalForm" class="stack" style="margin-top:.75rem">
      ${qHtml}
      <div class="row" style="gap:.5rem;justify-content:flex-end">
        <button class="btn ghost" type="button" id="btnCancelFinal">Back</button>
        <button class="btn" type="submit" id="btnSubmitFinal">Submit</button>
      </div>
    </form>

    <div id="finalResult"></div>
  `;

  document.getElementById("btnCancelFinal")?.addEventListener("click", () => {
    history.back();
  });

  const form = document.getElementById("finalForm");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    // grade
    let earned = 0;
    const total = quiz.questions.length;

    quiz.questions.forEach((q, i) => {
      if (q.type === "short") {
        const val = (
          form.querySelector(`input[name="q_${i}"]`)?.value || ""
        ).trim();
        if (!val) return;
        const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();
        if (Array.isArray(q.correct)) {
          if (q.correct.some((x) => norm(x) === norm(val))) earned += 1;
        } else {
          if (norm(q.correct || "") === norm(val)) earned += 1;
        }
      } else if (q.type === "multi") {
        const boxes = Array.from(
          form.querySelectorAll(`input[name="q_${i}"]:checked`)
        ).map((b) => Number(b.value));
        const correct = Array.isArray(q.correct) ? q.correct : [];
        // strict compare: same set
        const sameLen = boxes.length === correct.length;
        const allIn = boxes.every((v) => correct.includes(v));
        if (sameLen && allIn) earned += 1;
      } else {
        // single
        const sel = form.querySelector(`input[name="q_${i}"]:checked`);
        if (!sel) return;
        const idx = Number(sel.value);
        if (idx === Number(q.correct)) earned += 1;
      }
    });

    const pct = Math.round((earned / Math.max(1, total)) * 100);
    const letter = gradeFromPct(pct);
    const passed = pct >= Number(quiz.passPct || 65);

    const box = document.getElementById("finalResult");
    box.innerHTML = `
      <div class="card ${passed ? "success" : "error"}">
        <strong>Result:</strong>
        <p>${earned}/${total} correct → <strong>${pct}%</strong> (Grade <strong>${letter}</strong>)</p>
        <p class="muted">${passed ? "You passed ✅" : "Not passed ❌"}</p>
        <div class="row" style="gap:.5rem;justify-content:flex-end;margin-top:.5rem">
          <button class="btn ghost" id="btnBackCourse">Back to Course</button>
          <button class="btn" id="btnSaveAttempt">Save Result</button>
        </div>
      </div>`;

    // wire actions
    document
      .getElementById("btnBackCourse")
      ?.addEventListener("click", (ev) => {
        ev.preventDefault();
        location.hash = `#/courses/${courseId}`;
      });

    document
      .getElementById("btnSaveAttempt")
      ?.addEventListener("click", async (ev) => {
        ev.preventDefault();
        if (!auth.currentUser) {
          alert("Please sign in.");
          return;
        }
        try {
          await addDoc(
            collection(db, "users", auth.currentUser.uid, "attempts"),
            { courseId, pct, letter, passed, ts: serverTimestamp() }
          );
          alert("Saved ✔");
        } catch (err) {
          console.error("[attempt save]", err);
          alert("Failed to save.");
        }
      });
  });
}

// gs:// , /relative, http(s):// — အကုန် handle
// put this near other helpers (global)
async function resolveMediaUrl(u) {
  if (!u) return "";
  try {
    // If it's a Firebase Storage gs:// URL -> get HTTPS download URL
    if (u.startsWith("gs://")) {
      // 'sref' is your alias of firebase/storage 'ref'
      const r = sref(storage, u);
      return await getDownloadURL(r);
    }
    // Already http(s) → return as-is
    return u;
  } catch (e) {
    console.warn("[media] resolve failed:", u, e);
    return "";
  }
}

// DOM builder with graceful fallback
function mediaCard({ type, url, caption }) {
  const cap = caption
    ? `<div class="muted" style="margin-top:.25rem">${escapeHtml(
        caption
      )}</div>`
    : "";
  const wrap = document.createElement("div");
  wrap.className = "card";

  const fail = (msg) => {
    wrap.innerHTML = `<div class="error">${msg}</div>${cap}`;
  };

  if (type === "image") {
    const img = new Image();
    img.style.maxWidth = "100%";
    img.style.height = "auto";
    img.style.borderRadius = "12px";
    img.src = url;
    img.addEventListener("error", () => fail("Image unavailable."));
    wrap.appendChild(img);
    if (cap) wrap.insertAdjacentHTML("beforeend", cap);
    return wrap;
  }

  if (type === "video") {
    const v = document.createElement("video");
    v.controls = true;
    v.style.width = "100%";
    v.style.borderRadius = "12px";
    v.src = url;
    v.addEventListener("error", () => fail("Video unavailable."));
    wrap.appendChild(v);
    if (cap) wrap.insertAdjacentHTML("beforeend", cap);
    return wrap;
  }

  if (type === "audio") {
    const a = document.createElement("audio");
    a.controls = true;
    a.style.width = "100%";
    a.src = url;
    a.addEventListener("error", () => fail("Audio unavailable."));
    wrap.appendChild(a);
    if (cap) wrap.insertAdjacentHTML("beforeend", cap);
    return wrap;
  }

  // default: link/text
  wrap.innerHTML = `<a href="${url}" target="_blank" rel="noopener">${escapeHtml(
    url
  )}</a>${cap}`;
  return wrap;
}

// Render one lesson (reading + contents + quiz CTA)
async function renderLesson(courseId, lessonId) {
  const main = document.getElementById("courseMain");
  if (!main) return;

  // find which chapter contains this lesson
  // (cheap scan)
  let found = null,
    chId = null;
  const chSnap = await getDocs(collection(db, "courses", courseId, "chapters"));
  for (const chDoc of chSnap.docs) {
    const lsRef = doc(
      db,
      "courses",
      courseId,
      "chapters",
      chDoc.id,
      "lessons",
      lessonId
    );
    const lsSnap = await getDoc(lsRef);
    if (lsSnap.exists()) {
      found = { id: lsSnap.id, ...lsSnap.data() };
      chId = chDoc.id;
      break;
    }
  }

  if (!found) {
    main.innerHTML = `<div class="card error">Lesson not found.</div>`;
    return;
  }

  const lesson = found;

  // contents
  const ctSnap = await getDocs(
    query(
      collection(
        db,
        "courses",
        courseId,
        "chapters",
        chId,
        "lessons",
        lessonId,
        "contents"
      ),
      orderBy("order", "asc")
    )
  );
  const contents = [];
  ctSnap.forEach((d) => contents.push({ id: d.id, ...d.data() }));

  // quizzes (optional)
  const qSnap = await getDocs(
    collection(
      db,
      "courses",
      courseId,
      "chapters",
      chId,
      "lessons",
      lessonId,
      "quizzes"
    )
  );
  const quizzes = [];
  qSnap.forEach((d) => quizzes.push({ id: d.id, ...d.data() }));

  // UI
  main.innerHTML = `
    <article class="card">
      <h2>${lesson.order ?? ""} ${lesson.title || "Lesson"}</h2>
      ${
        lesson.reading
          ? `<p><a class="btn small" href="${lesson.reading}" target="_blank" rel="noopener">Open reading (PDF)</a></p>`
          : ""
      }

      <div class="stack" style="margin-top:.75rem">
        ${contents.map(renderContentBlock).join("")}
      </div>

      ${
        quizzes.length
          ? `
        <div class="row" style="margin-top:1rem; gap:.5rem">
          ${quizzes
            .map(
              (q) =>
                `<button class="btn" data-quiz="${q.id}">Start “${
                  q.title || "Quiz"
                }”</button>`
            )
            .join("")}
        </div>`
          : ""
      }
    </article>
    <div class="row" style="justify-content:space-between; margin-top:.75rem">
      <button class="btn ghost" id="btnPrev">← Prev</button>
      <button class="btn" id="btnNext">Next →</button>
    </div>
  `;

  // (optional) Prev/Next wiring — you can compute neighbors by reusing chapter/lesson order list
}

function renderContentBlock(ct) {
  const cap = ct.caption
    ? `<div class="muted" style="margin:.25rem 0 0">${escapeHtml(
        ct.caption
      )}</div>`
    : "";
  if (ct.type === "video")
    return `<div class="card"><video src="${ct.url}" controls style="width:100%;border-radius:12px"></video>${cap}</div>`;
  if (ct.type === "audio")
    return `<div class="card"><audio src="${ct.url}" controls style="width:100%"></audio>${cap}</div>`;
  if (ct.type === "image")
    return `<div class="card"><img src="${ct.url}" alt="" style="width:100%;height:auto;border-radius:12px;display:block" />${cap}</div>`;
  if (ct.type === "text")
    return `<div class="card"><a href="${
      ct.url
    }" target="_blank" rel="noopener">${escapeHtml(ct.url)}</a>${cap}</div>`;
  return `<div class="card muted">Unknown block: ${escapeHtml(
    ct.type || ""
  )}</div>`;
}

async function importAnyJson(json) {
  // catalog.json
  if (Array.isArray(json.courses)) {
    console.log("[importer] catalog, courses:", json.courses.length);
    for (const c of json.courses) {
      const id = c.id || crypto.randomUUID();
      const data = { ...c };
      delete data.chaptersUrl;
      await setDoc(doc(db, "courses", id), data, { merge: true });

      // optional: auto-follow chaptersUrl
      if (c.chaptersUrl) {
        try {
          const r = await fetch(c.chaptersUrl, { cache: "no-store" });
          if (r.ok) await importAnyJson(await r.json());
        } catch (_) {}
      }
    }
    return;
  }

  // chapters.json
  if (Array.isArray(json.chapters) && json.course?.id) {
    const cid = json.course.id;
    console.log("[importer] chapters for", cid, "count:", json.chapters.length);
    for (const ch of json.chapters) {
      const chid = ch.id || crypto.randomUUID();
      await setDoc(
        doc(db, "courses", cid, "chapters", chid),
        {
          title: ch.title || "",
          order: ch.order ?? 1,
          summary: ch.summary || "",
        },
        { merge: true }
      );

      // follow lessonsUrl if provided (single-lesson JSON file)
      if (ch.lessonsUrl) {
        try {
          const r = await fetch(ch.lessonsUrl, { cache: "no-store" });
          if (r.ok)
            await importAnyJson({
              ...(await r.json()),
              _cid: cid,
              _chid: chid,
            });
        } catch (_) {}
      }
    }
    return;
  }

  // lesson.json (expects: lesson + reading + contents + quiz)
  if (json.lesson && (json._cid || json.courseId)) {
    const cid = json._cid || json.courseId;
    const chid = json._chid || json.chapterId || "c1";
    console.log(
      "[importer] lesson for",
      cid,
      chid,
      "title:",
      json.lesson?.title
    );
    const l = json.lesson;
    const lid = l.id || crypto.randomUUID();

    await setDoc(
      doc(db, "courses", cid, "chapters", chid, "lessons", lid),
      {
        title: l.title || "",
        order: l.order ?? 1,
        reading: json.reading || "",
      },
      { merge: true }
    );

    // contents
    for (const ct of json.contents || []) {
      const id = crypto.randomUUID();
      await setDoc(
        doc(
          db,
          "courses",
          cid,
          "chapters",
          chid,
          "lessons",
          lid,
          "contents",
          id
        ),
        {
          type: ct.type,
          url: ct.url,
          caption: ct.caption || "",
          order: ct.order ?? 1,
        }
      );
    }

    // quiz
    if (json.quiz) {
      const qid = crypto.randomUUID();
      await setDoc(
        doc(
          db,
          "courses",
          cid,
          "chapters",
          chid,
          "lessons",
          lid,
          "quizzes",
          qid
        ),
        {
          title: json.quiz.title || "Quiz",
          shuffle: !!json.quiz.shuffle,
          passPct: json.quiz.passPct ?? 70,
        }
      );
      for (const q of json.quiz.questions || []) {
        const id = crypto.randomUUID();
        await setDoc(
          doc(
            db,
            "courses",
            cid,
            "chapters",
            chid,
            "lessons",
            lid,
            "quizzes",
            qid,
            "questions",
            id
          ),
          {
            text: q.text,
            choices: q.choices,
            answerIndex: q.answerIndex,
            points: q.points ?? 1,
          }
        );
      }
    }
    return;
  }

  throw new Error("JSON shape not recognized.");
}

async function loadCourseTree(courseId) {
  const chapters = [];
  const chSnap = await getDocs(
    query(
      collection(db, "courses", courseId, "chapters"),
      orderBy("order", "asc")
    )
  );
  for (const ch of chSnap.docs) {
    const lessons = [];
    const lsSnap = await getDocs(
      query(
        collection(db, "courses", courseId, "chapters", ch.id, "lessons"),
        orderBy("order", "asc")
      )
    );
    lsSnap.forEach((d) => lessons.push({ id: d.id, ...d.data() }));
    chapters.push({ id: ch.id, ...ch.data(), lessons });
  }
  return chapters;
}

async function openCourseEditor(id) {
  const ref = doc(db, "courses", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    alert("Course not found");
    return;
  }
  const c = snap.data();

  // တည်ရှိနေတဲ့ admin card အတွင်းက editor panel ကိုပြ
  const host = document.getElementById("adminEditor");
  host.innerHTML = `
    <div class="card">
      <h3>Edit: ${escapeHtml(c.title || "")}</h3>
      <label>Title <input id="editTitle" value="${escapeHtml(
        c.title || ""
      )}"></label>
      <label>Level <input id="editLevel" type="number" min="0" max="3" value="${
        c.level ?? 0
      }"></label>
      <label>Credits <input id="editCredits" type="number" min="0" max="100" value="${
        c.credits ?? 0
      }"></label>
      <label>Summary <textarea id="editSummary">${escapeHtml(
        c.summary || ""
      )}</textarea></label>
      <div class="row" style="gap:.5rem">
        <button class="btn" id="btnSaveCourse">Save</button>
        <button class="btn ghost" id="btnCancelEdit">Cancel</button>
      </div>
    </div>
  `;

  document.getElementById("btnCancelEdit")?.addEventListener("click", () => {
    host.innerHTML = "";
  });

  document
    .getElementById("btnSaveCourse")
    ?.addEventListener("click", async () => {
      await updateDoc(ref, {
        title: document.getElementById("editTitle").value.trim(),
        level: Number(document.getElementById("editLevel").value || 0),
        credits: Number(document.getElementById("editCredits").value || 0),
        summary: document.getElementById("editSummary").value.trim(),
      });
      alert("Saved");
      host.innerHTML = "";
      renderAdmin(); // refresh list
    });
}

// Certificate Template (with PDF export)
async function renderCertificate(courseId, uidOpt, mode = "view") {
  const cid = (courseId || "").trim();
  if (!cid) return alert("Choose a course first.");
  const uid = (uidOpt || auth.currentUser?.uid || "").trim();
  if (!uid) return alert("No UID (login first).");

  // read course + user
  const cSnap = await getDoc(doc(db, "courses", cid));
  const course = cSnap.exists()
    ? { id: cSnap.id, ...cSnap.data() }
    : { id: cid, title: cid };
  let displayName = uid;
  try {
    const uSnap = await getDoc(doc(db, "users", uid));
    if (uSnap.exists())
      displayName = uSnap.data().name || uSnap.data().displayName || uid;
  } catch {}

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("l", "pt", "a4"); // landscape
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 40;

  // left-top logo
  try {
    const logo = await imgToDataURL("/icons/icon-192.png");
    pdf.addImage(logo, "PNG", M, M, 64, 64);
  } catch {}

  // right-top certificate no
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text(`Certificate No: ${genCertNo(uid, course.id)}`, W - M, M + 12, {
    align: "right",
  });

  // title + body
  pdf.setFont("times", "bold");
  pdf.setFontSize(42);
  pdf.text("Certificate of Completion", W / 2, H / 2 - 60, { align: "center" });
  pdf.setFont("times", "normal");
  pdf.setFontSize(18);
  pdf.text("This certifies that", W / 2, H / 2 - 20, { align: "center" });
  pdf.setFont("times", "bold");
  pdf.setFontSize(28);
  pdf.text(displayName, W / 2, H / 2 + 10, { align: "center" });
  pdf.setFont("times", "normal");
  pdf.setFontSize(18);
  pdf.text("has successfully completed the course", W / 2, H / 2 + 40, {
    align: "center",
  });
  pdf.setFont("times", "bold");
  pdf.setFontSize(24);
  pdf.text(course.title || course.id, W / 2, H / 2 + 75, { align: "center" });

  const today = new Date().toLocaleDateString();
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(12);
  pdf.text(`Date: ${today}`, M, H - M);
  pdf.line(W - 220, H - M - 10, W - M, H - M - 10);
  pdf.text("Authorized Signature", W - 110, H - M + 5, { align: "center" });

  if (mode === "download") {
    pdf.save(`certificate-${course.id}.pdf`);
  } else {
    pdf.output("dataurlnewwindow"); // view only
  }
}

// convenience wrappers
const viewCertificate = (cid, uid) => renderCertificate(cid, uid, "view");
const downloadCertificate = (cid, uid) =>
  renderCertificate(cid, uid, "download");

async function getCourseStatus(uid, courseId) {
  try {
    const ref = doc(db, "users", uid, "enrollments", courseId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return "In progress";

    const enrollment = snap.data() || {};

    // enrollment data ပြန်ဖတ်ထားတဲ့နေရာမှာ ကိုယ်ရှိပြီးသား e/progress ထဲက သုံး
    const isAllDone = (() => {
      const prog = enrollment.progress || {};
      const total = Object.keys(prog).length;
      const done = Object.values(prog).filter(Boolean).length;
      return total > 0 && done >= total;
    })();

    const passed = !!enrollment.finalPassed || isAllDone;

    // before: const status = item.status || 'In progress';
    const status = passed ? "Success" : "In progress";
    return status;
  } catch (err) {
    console.warn("[getCourseStatus]", err);
    return "In progress";
  }
}

// Transcript Template (with PDF export)
// ===== helpers =====
const LEVEL_NAMES = { 0: "Beginner", 1: "Intermediate", 2: "Advanced" };
function toLevelName(v) {
  if (typeof v === "string" && isNaN(Number(v))) return v; // already label
  const n = Number(v);
  return LEVEL_NAMES[n] || "Beginner";
}

async function renderTranscript(uidOpt, mode = "view") {
  const uid = (uidOpt || auth.currentUser?.uid || "").trim();
  if (!uid) return alert("No UID (login first).");

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("l", "pt", "a4"); // landscape
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 48;

  // logo (optional)
  try {
    const logo = await imgToDataURL("/icons/icon-192.png");
    pdf.addImage(logo, "PNG", W - M - 56, M, 56, 56);
  } catch {}

  pdf.setFont("times", "bold");
  pdf.setFontSize(28);
  pdf.text("Academic Transcript", M, M + 24);

  // student block
  let name = uid;
  try {
    const uSnap = await getDoc(doc(db, "users", uid));
    if (uSnap.exists())
      name = uSnap.data().name || uSnap.data().displayName || uid;
  } catch {}
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(12);
  pdf.text(`Name: ${name}`, M, M + 60);
  pdf.text(`UID: ${uid}`, M, M + 76);
  pdf.text(`Generated: ${new Date().toLocaleString()}`, M, M + 92);

  // table head
  let y = M + 130;
  pdf.setFont("helvetica", "bold");
  pdf.text("Course", M, y);
  pdf.text("Level", M + 360, y);
  pdf.text("Credits", M + 430, y);
  pdf.text("Status", M + 510, y);
  pdf.setLineWidth(0.5);
  pdf.line(M, y + 6, W - M, y + 6);
  y += 26;
  pdf.setFont("helvetica", "normal");

  // enrollments
  const es = await getDocs(
    query(collection(db, "users", uid, "enrollments"), orderBy("ts", "desc"))
  );
  if (es.empty) {
    pdf.text("(No enrollments)", M, y);
  } else {
    for (const d of es.docs) {
      const e = d.data();
      const courseId = e.courseId;
      let title = e.courseTitle || courseId;
      let level = "-";
      let credits = typeof e.credits === "number" ? e.credits : "-";

      try {
        const cs = await getDoc(doc(db, "courses", courseId));
        if (cs.exists()) {
          const c = cs.data();
          title = c.title || title;
          level = toLevelName(c.level); // ✅ map to label
          credits = typeof c.credits === "number" ? c.credits : credits;
        }
      } catch {}

      const status = await getCourseStatus(uid, courseId); // ✅ Success / In progress

      pdf.text(String(title), M, y);
      pdf.text(String(level), M + 360, y);
      pdf.text(String(credits), M + 430, y);
      pdf.text(String(status), M + 510, y);

      y += 22;
      if (y > H - M - 40) {
        pdf.addPage();
        y = M + 20;
      }
    }
  }

  if (mode === "download") {
    pdf.save("transcript.pdf");
  } else {
    pdf.output("dataurlnewwindow"); // view
  }
}

// (optional) simple wrappers
const viewTranscript = (uid) => renderTranscript(uid, "view");
const downloadTranscript = (uid) => renderTranscript(uid, "download");

// Certificate Example
const user = auth.currentUser;
const course = { title: "Pāli Beginner I" };
renderCertificate(user, course);

// Transcript Example
const records = [
  {
    courseTitle: "Pāli Beginner I",
    credits: 3,
    grade: "A",
    completedAt: Date.now(),
  },
  {
    courseTitle: "Pāli Beginner II",
    credits: 3,
    grade: "A-",
    completedAt: Date.now(),
  },
];
renderTranscript(user, records);

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

// Topbar search -> router
document.getElementById("searchForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = document.getElementById("searchInput")?.value?.trim() || "";
  location.hash = "#/search?q=" + encodeURIComponent(q);
});

function highlight(hay, needle) {
  if (!needle) return escapeHtml(hay || "");
  try {
    const re = new RegExp(
      "(" + needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")",
      "ig"
    );
    return escapeHtml(hay || "").replace(re, "<mark>$1</mark>");
  } catch {
    return escapeHtml(hay || "");
  }
}

async function renderSearch() {
  const params = new URLSearchParams(location.hash.split("?")[1] || "");
  const kw = (params.get("q") || "").trim();
  appEl.innerHTML = `
    <section class="card max">
      <h2>Search</h2>
      <p class="muted">Query: <strong>${escapeHtml(kw)}</strong></p>
      <div class="grid-2">
        <div>
          <h3>Posts</h3>
          <div id="searchPosts" class="stack"><div class="muted">Loading…</div></div>
        </div>
        <div>
          <h3>Courses</h3>
          <div id="searchCourses" class="course-grid"><div class="muted">Loading…</div></div>
        </div>
      </div>
    </section>
  `;

  // Fetch recent datasets then filter client-side
  try {
    const [ps, cs] = await Promise.all([
      getDocs(
        query(collection(db, "posts"), orderBy("ts", "desc"), limit(100))
      ),
      getDocs(
        query(collection(db, "courses"), orderBy("level", "asc"), limit(100))
      ),
    ]);

    const ql = kw.toLowerCase();
    const posts = [];
    ps.forEach((d) => posts.push({ id: d.id, ...d.data() }));
    const courses = [];
    cs.forEach((d) => courses.push({ id: d.id, ...d.data() }));

    const pFiltered = kw
      ? posts.filter(
          (p) =>
            (p.title || "").toLowerCase().includes(ql) ||
            (p.body || "").toLowerCase().includes(ql)
        )
      : posts;
    const cFiltered = kw
      ? courses.filter(
          (c) =>
            (c.title || "").toLowerCase().includes(ql) ||
            (c.summary || "").toLowerCase().includes(ql) ||
            (Array.isArray(c.benefits)
              ? c.benefits.join(" ").toLowerCase()
              : ""
            ).includes(ql)
        )
      : courses;

    const boxP = document.getElementById("searchPosts");
    boxP.innerHTML = pFiltered.length
      ? pFiltered
          .map((p) => {
            const mp = { ...p };
            mp.title = highlight(p.title || "", kw);
            mp.body = highlight(p.body || "", kw);
            return postCardHTML(mp);
          })
          .join("")
      : `<div class="card muted">No matching posts.</div>`;

    const boxC = document.getElementById("searchCourses");
    boxC.innerHTML = cFiltered.length
      ? cFiltered.map(courseCardHTML).join("")
      : `<div class="card muted">No matching courses.</div>`;

    // wire buttons in course cards
    boxC
      .querySelectorAll("[data-action='details']")
      .forEach((b) =>
        b.addEventListener("click", (e) =>
          openCourse(e.currentTarget.dataset.id)
        )
      );
    boxC
      .querySelectorAll("[data-action='enroll']")
      .forEach((b) =>
        b.addEventListener("click", (e) =>
          enrollCourse(e.currentTarget.dataset.id)
        )
      );
  } catch (e) {
    console.error("[search]", e);
    document.getElementById(
      "searchPosts"
    ).innerHTML = `<div class="card error">Failed to search posts.</div>`;
    document.getElementById(
      "searchCourses"
    ).innerHTML = `<div class="card error">Failed to search courses.</div>`;
  }
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
        </div>
      </div>

      <!-- ⬇️ Edit button moved to its own line -->
        <div style="margin-top:.75rem; text-align:right">
          <button class="btn" id="btnEditProfile">Edit</button>
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

async function renderCertificates() {
  if (!auth?.currentUser) {
    location.hash = "#/";
    return;
  }
  const uid = auth.currentUser.uid;

  const box = document.getElementById("app");
  box.innerHTML = `
    <section class="card max">
      <h2>Certificates</h2>
      <div id="certList">Loading…</div>
    </section>`;

  try {
    const q = query(
      collection(db, "users", uid, "completions"), // ✅ top-level
      where("userId", "==", uid),
      orderBy("ts", "desc")
    );
    const snap = await getDocs(q);
    const list = document.getElementById("certList");
    if (snap.empty) {
      list.innerHTML = `<div class="card muted">No certificates yet.</div>`;
      return;
    }
    list.innerHTML = "";
    snap.forEach((d) => {
      const c = d.data();
      list.insertAdjacentHTML(
        "beforeend",
        `
        <div class="card row-between">
          <div>
            <strong>${c.courseTitle || c.courseId}</strong>
            <div class="muted">Credits: ${c.credits ?? 0}</div>
          </div>
          <div class="row" style="gap:.5rem">
            <button class="btn small" onclick="makeCertPDF('${
              d.id
            }')">Download PDF</button>
          </div>
        </div>
      `
      );
    });
  } catch (err) {
    console.error("[certs]", err);
    document.getElementById(
      "certList"
    ).innerHTML = `<div class="card error">Can't load certificates (permissions?).</div>`;
  }
}
window.renderCertificates = renderCertificates;

async function renderTranscripts() {
  if (!auth?.currentUser) {
    location.hash = "#/";
    return;
  }
  const uid = auth.currentUser.uid;

  const box = document.getElementById("app");
  box.innerHTML = `
    <section class="card max">
      <h2>Transcripts</h2>
      <div id="txList">Loading…</div>
    </section>`;

  try {
    const q = query(
      collection(db, "users", uid, "attempts"), // ✅ top-level
      where("userId", "==", uid),
      orderBy("ts", "desc")
    );
    const snap = await getDocs(q);
    const list = document.getElementById("txList");
    if (snap.empty) {
      list.innerHTML = `<div class="card muted">No attempts yet.</div>`;
      return;
    }
    list.innerHTML = "";
    snap.forEach((d) => {
      const a = d.data();
      list.insertAdjacentHTML(
        "beforeend",
        `
        <div class="card">
          <div class="row-between">
            <strong>${a.courseTitle || a.courseId}</strong>
            <span>${a.score ?? 0}% ${a.pass ? "✅" : "❌"}</span>
          </div>
          <div class="muted">Lesson: ${a.lessonTitle || a.lessonId}</div>
        </div>
      `
      );
    });
  } catch (err) {
    console.error("[transcripts]", err);
    document.getElementById(
      "txList"
    ).innerHTML = `<div class="card error">Can't load transcripts (permissions?).</div>`;
  }
}
window.renderTranscripts = renderTranscripts;

// ====== Not Found ======
function renderNotFound() {
  app.innerHTML = `<section class="card"><h2>Not found</h2></section>`;
}

function priceBadgeHTML(c) {
  const p = Number(c.price ?? 0);
  if (p > 0) return `<span class="chip paid">$${p.toFixed(2)}</span>`;
  return `<span class="chip free">Free</span>`;
}

function levelLabel(c) {
  const L = Number(c.level ?? 0);
  return (
    ["Level: Beginner", "Level: Intermediate", "Level: Advanced", "Level: Pro"][
      L
    ] || `Level: ${L}`
  );
}

function normBenefits(b) {
  if (Array.isArray(b)) return b.filter(Boolean);
  return String(b || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function courseCardHTML(c) {
  const price = Number(c.price ?? 0);
  const isPaid = price > 0;
  const priceLabel = isPaid ? `$${price.toFixed(2)}` : "Free";

  const benefits = Array.isArray(c.benefits)
    ? c.benefits
    : String(c.benefits || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  const FALLBACK = "/img/placeholder.png";

  return `
    <article class="course-card" data-cid="${c.id}">
      <img class="cover"
           src="${(c.img || "").trim() || FALLBACK}"
           onerror="this.onerror=null; this.src='${FALLBACK}'" />
      <div class="body">
        <h3>${c.title || "Untitled Course"}</h3>

        ${c.summary ? `<p class="desc">${escapeHtml(c.summary)}</p>` : ""}

        ${
          benefits.length
            ? `
          <ul class="meta">
            ${benefits
              .slice(0, 3)
              .map((b) => `<li>${escapeHtml(b)}</li>`)
              .join("")}
          </ul>`
            : ""
        }

        <ul class="meta">
          <li>${levelLabel(c) || "Level 0"}</li>
          <li>Credits: ${c.credits ?? 0}</li>
        </ul>

        <div class="footer">
          <span class="badge ${
            isPaid ? "price-paid" : "price-free"
          }">${priceLabel}</span>
          <div class="actions">
            <button class="btn btn-details" data-act="details" data-cid="${
              c.id
            }">Details</button>
            <button class="btn ${isPaid ? "btn-buy" : "btn-enroll"}"
                    data-act="enroll" data-cid="${c.id}">
              ${isPaid ? "Buy" : "Enroll"}
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function wireCourseCardEvents(scope = "#courseGrid") {
  const host = document.querySelector(scope);
  if (!host || host.__wired) return;
  host.__wired = true;

  host.addEventListener("click", (e) => {
    const d = e.target.closest("button[data-act],a[data-act]");
    if (!d) return;
    const act = d.dataset.act;
    const cid = d.dataset.cid;
    if (!cid) return;

    if (act === "details") {
      openCourseDetails?.(cid);
    } else if (act === "enroll") {
      enrollCourse?.(cid);
    } else if (act === "buy") {
      openBuyDialog?.(cid);
    } else if (act === "open") {
      location.hash = `#/courses/${cid}`;
    }
  });
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

// ✅ boot point
window.addEventListener("load", () => {
  route(); // handles all navigation automatically
});