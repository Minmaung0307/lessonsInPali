// /public/js/app.js
import { auth, db } from "/firebase.js";
import {
  collection, collectionGroup, doc, getDoc, getDocs, setDoc, addDoc,
  query, where, orderBy, serverTimestamp, onSnapshot, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

// ====== Basic DOM ======
const $ = (s)=> document.querySelector(s);
const app = $("#app");
const navLinks = $("#navLinks");
const btnMenu = $("#btnMenu");
const btnLogin = $("#btnLogin");
const btnLogout = $("#btnLogout");
const authDlg = $("#authDlg");
const doLogin = $("#doLogin");
const doSignup = $("#doSignup");
const doForgot = $("#doForgot");
const closeAuth = $("#closeAuth");
const buyDlg = $("#buyDlg");
$("#closeBuy")?.addEventListener("click", ()=> buyDlg.close());

btnMenu?.addEventListener("click", ()=>{
  const o = navLinks.classList.toggle("open");
  btnMenu.setAttribute("aria-expanded", o?"true":"false");
});

btnLogin?.addEventListener("click", ()=> authDlg.showModal());
btnLogout?.addEventListener("click", ()=> signOut(auth));

doLogin?.addEventListener("click", async ()=>{
  const email = $("#authEmail").value.trim();
  const pass = $("#authPass").value;
  await signInWithEmailAndPassword(auth, email, pass);
  authDlg.close();
});
doSignup?.addEventListener("click", async ()=>{
  const email = $("#authEmail").value.trim();
  const pass = $("#authPass").value;
  await createUserWithEmailAndPassword(auth, email, pass);
  authDlg.close();
});
doForgot?.addEventListener("click", async ()=>{
  const email = $("#authEmail").value.trim();
  await sendPasswordResetEmail(auth, email);
  alert("Password reset email sent.");
});

// ====== Router ======
if (!window.__APP_ROUTER__){
  window.__APP_ROUTER__ = true;
  window.route = async function route(){
    const hash = location.hash.replace(/^#/, "") || "/";
    if (hash === "/") return renderHome();
    if (hash.startsWith("/courses")) return renderCourses();
    if (hash.startsWith("/dashboard")) return renderDashboard();
    if (hash.startsWith("/admin")) return renderAdmin();
    if (hash.startsWith("/certs")) return renderCertificates();
    if (hash.startsWith("/transcripts")) return renderTranscripts();
    return renderNotFound();
  };
  addEventListener("hashchange", route);
  addEventListener("load", route);
}

// ====== Auth gating ======
function applyAuthVisibility(user, role){
  document.querySelectorAll(".auth-only").forEach(el=> el.classList.toggle("hidden", !user));
  document.querySelectorAll(".admin-only").forEach(el=> el.classList.toggle("hidden", !(user && (role==='admin'||role==='ta'))));
  btnLogin?.classList.toggle("hidden", !!user);
  btnLogout?.classList.toggle("hidden", !user);
}
async function getUserRole(){
  const u = auth.currentUser;
  if (!u) return "guest";
  const snap = await getDoc(doc(db, "users", u.uid));
  return snap.exists() ? (snap.data().role || "student") : "student";
}

onAuthStateChanged(auth, async (u)=>{
  const role = await getUserRole();
  applyAuthVisibility(u, role);
  route();
});

// ====== Home/Courses ======
async function renderHome(){
  app.innerHTML = `
    <section class="card">
      <h2>Welcome 👋</h2>
      <p class="muted">Explore structured Pāli courses from Beginner to Pro.</p>
    </section>
  `;
  await renderCourseCards();
}

async function renderCourses(){ await renderCourseCards(); }

async function renderCourseCards(){
  const q = query(collection(db, "courses"), orderBy("level","asc"), orderBy("title","asc"));
  const snap = await getDocs(q);
  let html = `<section class="grid">`;
  snap.forEach(d=>{
    const c = d.data();
    html += `
      <article class="card">
        <div class="row" style="justify-content:space-between;align-items:baseline">
          <h3 style="margin:0">${c.title}</h3>
          <span class="badge">${["Beginner","Intermediate","Advanced","Pro"][c.level||0]}</span>
        </div>
        <p class="muted">${c.summary||""}</p>
        <div class="row">
          <button class="btn" data-buy="${d.id}" data-price="${(c.price||0).toFixed(2)}">Buy $${(c.price||0).toFixed(2)}</button>
          <a class="btn ghost" href="#/courses/${d.id}">Details</a>
        </div>
      </article>
    `;
  });
  html += `</section>`;
  app.innerHTML += html;

  // attach PayPal buy buttons on click
  app.querySelectorAll("button[data-buy]").forEach(btn=>{
    btn.addEventListener("click", ()=> openBuyDialog(btn.dataset.buy, btn.dataset.price));
  });
}

function openBuyDialog(courseId, price){
  $("#buyTitle").textContent = `Purchase course – $${price}`;
  buyDlg.showModal();
  const mount = $("#paypal-buttons");
  mount.innerHTML = "";
  // PayPal Buttons
  if (!window.paypal){ mount.innerHTML = "<p class='muted'>PayPal SDK not loaded.</p>"; return; }
  window.paypal.Buttons({
    style: { layout:"vertical", color:"gold", shape:"rect", label:"paypal" },
    createOrder(data, actions){
      return actions.order.create({
        purchase_units: [{ amount: { value: String(price) }, custom_id: courseId }]
      });
    },
    async onApprove(data, actions){
      const details = await actions.order.capture();
      // call Cloud Function to verify & enroll
      const u = auth.currentUser;
      await fetch("/verifyPayPal", {
        method:"POST",
        headers:{ "Content-Type":"application/json", "x-user-id": u?.uid || "" },
        body: JSON.stringify({ orderId: data.orderID, courseId })
      }).then(r=>r.json());
      alert("Payment verified. You're enrolled!");
      buyDlg.close();
      location.hash = "#/dashboard";
    },
    onError(err){ console.error(err); alert("PayPal error."); }
  }).render(mount);
}

// ====== Dashboard (progress, certs) ======
async function renderDashboard(){
  const u = auth.currentUser;
  if (!u) { authDlg.showModal(); return; }
  // enrolled courses
  const qEnr = query(collection(db,"enrollments"), where("userId","==",u.uid), orderBy("ts","desc"));
  const enr = await getDocs(qEnr);
  let html = `<section class="card"><h2>Your Dashboard</h2>`;
  html += `<div class="grid">`;
  for (const d of enr.docs){
    const e = d.data();
    const cs = await getDoc(doc(db,"courses", e.courseId));
    const c = cs.data()||{};
    html += `
      <article class="card">
        <h3>${c.title||"Course"}</h3>
        <p class="muted">Progress: ${(e.progress||0)}%</p>
        <div class="row">
          <a class="btn" href="#/courses/${e.courseId}">Continue</a>
          ${(e.passed ? `<button class="btn ghost" data-cert="${e.courseId}">Download Certificate</button>` : ``)}
        </div>
      </article>`;
  }
  html += `</div></section>`;
  app.innerHTML = html;

  // cert buttons
  app.querySelectorAll("button[data-cert]").forEach(btn=>{
    btn.addEventListener("click", ()=> makeCertPDF(btn.dataset.cert));
  });
}

// ====== Admin (add courses/lessons/quizzes) – minimal demo ======
async function renderAdmin(){
  const role = await getUserRole();
  if (!(auth.currentUser && (role==='admin' || role==='ta'))){
    app.innerHTML = `<section class="card"><h2>Admin only.</h2></section>`;
    return;
  }
  app.innerHTML = `
    <section class="card">
      <h2>Admin Console</h2>
      <div class="row-2">
        <form id="fCourse" class="card form">
          <h3>Add Course</h3>
          <label>Title <input name="title" required></label>
          <label>Level
            <select name="level">
              <option value="0">Beginner</option>
              <option value="1">Intermediate</option>
              <option value="2">Advanced</option>
              <option value="3">Pro</option>
            </select>
          </label>
          <label>Price (USD) <input name="price" type="number" step="0.01" value="0"></label>
          <label>Summary <textarea name="summary"></textarea></label>
          <button class="btn" type="submit">Save</button>
        </form>

        <form id="fQuiz" class="card form">
          <h3>Add Quiz Item</h3>
          <label>Lesson ID <input name="lessonId" placeholder="lessons/abc123 or id"></label>
          <label>Type
            <select name="type">
              <option>single</option>
              <option>multiple</option>
              <option>short</option>
            </select>
          </label>
          <label>Question <textarea name="text"></textarea></label>
          <label>Options (JSON array) <textarea name="options" placeholder='["A","B","C","D"]'></textarea></label>
          <button class="btn" type="submit">Save</button>
        </form>
      </div>
    </section>
  `;

  $("#fCourse")?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    body.level = Number(body.level||0);
    body.price = Number(body.price||0);
    await addDoc(collection(db,"courses"), { ...body, ts: serverTimestamp() });
    alert("Course saved."); location.hash="#/courses";
  });

  $("#fQuiz")?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    let opts = [];
    try{ opts = JSON.parse(body.options||"[]"); }catch{}
    await addDoc(collection(db,"quizzes"), {
      lessonId: body.lessonId, type: body.type, text: body.text, options: opts, ts: serverTimestamp()
    });
    alert("Quiz item saved.");
  });
}

// ====== Certificates page (list) ======
async function renderCertificates(){
  const u = auth.currentUser; if (!u) { authDlg.showModal(); return; }
  const qComp = query(collectionGroup(db,"completions"), where("userId","==",u.uid), orderBy("ts","desc"));
  const snap = await getDocs(qComp);
  let html = `<section class="card"><h2>Certificates</h2><div class="grid">`;
  snap.forEach(d=>{
    const c = d.data();
    html += `<article class="card"><h3>${c.courseTitle||"Course"}</h3>
      <p class="muted">Grade: ${c.grade||"-"} | Score: ${c.score||0}%</p>
      <button class="btn" data-cert="${c.courseId}">Download PDF</button>
    </article>`;
  });
  html += `</div></section>`;
  app.innerHTML = html;
  app.querySelectorAll("button[data-cert]").forEach(btn=> btn.addEventListener("click", ()=> makeCertPDF(btn.dataset.cert)));
}

// ====== Transcripts page ======
async function renderTranscripts(){
  const u = auth.currentUser; if (!u) { authDlg.showModal(); return; }
  const qAtt = query(collectionGroup(db,"attempts"), where("userId","==",u.uid), orderBy("ts","desc"));
  const snap = await getDocs(qAtt);
  let html = `<section class="card"><h2>Transcripts</h2><table class="card" style="width:100%"><thead><tr>
    <th align="left">Course</th><th align="left">Lesson</th><th align="left">Score</th><th align="left">Passed</th><th align="left">Date</th>
  </tr></thead><tbody>`;
  snap.forEach(d=>{
    const a = d.data();
    html += `<tr><td>${a.courseTitle||"-"}</td><td>${a.lessonTitle||"-"}</td><td>${a.score||0}%</td><td>${a.pass?"✅":"❌"}</td><td>${a.ts?.toDate?.().toLocaleString?.() || ""}</td></tr>`;
  });
  html += `</tbody></table></section>`;
  app.innerHTML = html;
}

// ====== Not Found ======
function renderNotFound(){ app.innerHTML = `<section class="card"><h2>Not found</h2></section>`; }

// ====== Certificate PDF (client-side, simple) ======
async function makeCertPDF(courseId){
  const { jsPDF } = await import("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.es.min.js");
  const u = auth.currentUser;
  const compRef = doc(db, "users", u.uid, "completions", courseId);
  const compSnap = await getDoc(compRef);
  if (!compSnap.exists()){ alert("No certificate yet."); return; }
  const c = compSnap.data();
  const pdf = new jsPDF({orientation:"landscape"});
  pdf.setFontSize(28);
  pdf.text("Certificate of Completion", 148, 40, { align:"center" });
  pdf.setFontSize(16);
  pdf.text(`Awarded to ${u.displayName || u.email}`, 148, 60, { align:"center" });
  pdf.text(`Course: ${c.courseTitle||courseId}`, 148, 75, { align:"center" });
  pdf.text(`Score: ${c.score||0}% | Grade: ${c.grade||"-"}`, 148, 90, { align:"center" });
  pdf.text(`Date: ${(c.ts?.toDate?.()||new Date()).toLocaleDateString()}`, 148, 105, { align:"center" });
  pdf.save(`certificate_${courseId}.pdf`);
}
