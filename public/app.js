import { api, auth, db } from './firebase.js';

// ---------- DOM helpers ----------
const $ = s => document.querySelector(s);
const app = $('#app');
const sidebar = $('#sidebar');
const btnMenu = $('#btnMenu');
const btnLogin = $('#btnLogin');
const btnLogout = $('#btnLogout');
const authDlg = $('#authDlg');
const yearEl = $('#year');
yearEl.textContent = new Date().getFullYear();

btnMenu.addEventListener('click',()=> sidebar.classList.toggle('open'));
$('#closeAuth')?.addEventListener('click', ()=> authDlg.close());

// ---------- Auth ----------
$('#doSignUp').addEventListener('click', async (e)=>{
  e.preventDefault();
  const email = $('#authEmail').value.trim();
  const pass = $('#authPass').value;
  try{
    await api.createUserWithEmailAndPassword(auth, email, pass);
    authDlg.close();
  }catch(err){ alert(err.message); }
});

$('#doSignIn').addEventListener('click', async (e)=>{
  e.preventDefault();
  const email = $('#authEmail').value.trim();
  const pass = $('#authPass').value;
  try{
    await api.signInWithEmailAndPassword(auth, email, pass);
    authDlg.close();
  }catch(err){ alert(err.message); }
});

btnLogin.addEventListener('click', ()=> authDlg.showModal());
btnLogout.addEventListener('click', ()=> api.signOut(auth));

let currentUser = null; let currentRole = 'guest';
api.onAuthStateChanged(auth, async (u)=>{
  currentUser = u;
  btnLogin.classList.toggle('hidden', !!u);
  btnLogout.classList.toggle('hidden', !u);
  document.querySelectorAll('.auth-only')
    .forEach(el=> el.classList.toggle('hidden', !u));
  await ensureUserDoc();
  const role = await getUserRole();
  currentRole = role;
  document.querySelectorAll('.admin-only')
    .forEach(el=> el.classList.toggle('hidden', !(u && (role==='admin' || role==='ta'))));
  route();
});

async function ensureUserDoc(){
  if(!currentUser) return;
  const ref = api.doc(db, 'users', currentUser.uid);
  const snap = await api.getDoc(ref);
  if(!snap.exists()){
    await api.setDoc(ref, {
      email: currentUser.email,
      displayName: currentUser.displayName||'',
      role: 'student',
      credits: 0,
      createdAt: api.serverTimestamp()
    });
  }
}

async function getUserRole(){
  if(!currentUser) return 'guest';
  const ref = api.doc(db, 'users', currentUser.uid);
  const snap = await api.getDoc(ref);
  return (snap.exists() && snap.data().role) || 'student';
}

// ---------- Router ----------
window.addEventListener('hashchange', route);
window.addEventListener('load', route);

const pages = {
  '#/home': renderHome,
  '#/courses': renderCourses,
  '#/course': renderCourse,
  '#/learn': renderLearn,
  '#/dashboard': renderDashboard,
  '#/shop': renderShop,
  '#/admin': renderAdmin
};

function route(){
  const hash = location.hash || '#/home';
  const [path, id] = hash.split('/').slice(0,3); // e.g. #/course/abc
  const key = id ? `#/`+path.replace('#/','') : hash;
  const fn = pages[key] || renderHome;
  fn(id);
  sidebar.classList.remove('open');
}

// ---------- Firestore helpers & data model ----------
// Collections: courses, lessons (courseId, index, content), quizzes (lessonId),
// attempts (userId, lessonId, score, pass), enrollments (userId, courseId, status),
// announcements, notes (userId,text,ts), shopItems, orders, messages

async function fetchAnnouncements(){
  const q = api.query(api.collection(db,'announcements'), api.orderBy('ts','desc'));
  const res = await api.getDocs(q); return res.docs.map(d=>({id:d.id,...d.data()}));
}
async function fetchCourses(){
  const q = api.query(api.collection(db,'courses'), api.orderBy('level','asc'));
  const res = await api.getDocs(q); return res.docs.map(d=>({id:d.id,...d.data()}));
}
async function fetchCourse(id){
  const ref = api.doc(db,'courses',id); const s = await api.getDoc(ref); return {id:s.id,...s.data()};
}
async function fetchLessons(courseId){
  const q = api.query(api.collection(db,'lessons'), api.where('courseId','==',courseId), api.orderBy('index','asc'));
  const res = await api.getDocs(q); return res.docs.map(d=>({id:d.id,...d.data()}));
}
async function fetchQuiz(lessonId){
  const q = api.query(api.collection(db,'quizzes'), api.where('lessonId','==',lessonId));
  const res = await api.getDocs(q); return res.docs.map(d=>({id:d.id,...d.data()}));
}
async function getEnrollment(courseId){
  if(!currentUser) return null;
  const q = api.query(api.collection(db,'enrollments'),
    api.where('userId','==',currentUser.uid), api.where('courseId','==',courseId));
  const res = await api.getDocs(q); return res.docs[0]? {id:res.docs[0].id, ...res.docs[0].data()} : null;
}
async function enroll(course){
  if(!currentUser) return authDlg.showModal();
  const exists = await getEnrollment(course.id);
  if(exists) return routeToLearn(course.id);
  await api.addDoc(api.collection(db,'enrollments'),{
    userId: currentUser.uid, courseId: course.id, status:'active', progress:0, ts: api.serverTimestamp()
  });
  routeToLearn(course.id);
}

function routeToLearn(courseId){ location.hash = `#/learn/${courseId}`; }

// ---------- Renderers ----------
async function renderHome(){
  const anns = await fetchAnnouncements();
  app.innerHTML = `
    <section class="grid cols-1 cols-2">
      <div class="card">
        <h2>Announcements</h2>
        ${anns.map(a=> `
          <article class="card" style="margin:.6rem 0">
            <div class="row" style="justify-content:space-between">
              <h4>${escapeHtml(a.title||'Update')}</h4>
              <span class="badge">${(a.level||'All')}</span>
            </div>
            <p class="muted">${escapeHtml(a.body||'')}</p>
          </article>
        `).join('')||'<p class="muted">No announcements yet.</p>'}
      </div>
      <div class="card">
        <h2>Why Pāli?</h2>
        <p>Pāli is an ancient language of the Theravāda canon. We make it engaging with interactive lessons, quizzes, and real‑world projects—earn credits and certificates as you progress.</p>
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

async function renderCourses(){
  const list = await fetchCourses();
  app.innerHTML = `
    <h2>All Courses</h2>
    <div class="grid cols-1 cols-2">
      ${list.map(c=> courseCard(c)).join('')}
    </div>
  `;
}

function courseCard(c){
  return `
  <article class="card course-card">
    <div class="cover">${emojiByLevel(c.level)}</div>
    <div>
      <h4>${escapeHtml(c.title)}</h4>
      <div class="meta">
        <span class="chip">${levelName(c.level)}</span>
        <span class="chip">${c.credits||1} credit(s)</span>
        <span class="chip">${(c.lessons||0)} lessons</span>
      </div>
      <p class="muted">${escapeHtml(c.summary||'')}</p>
      <div class="row">
        <button class="btn small" onclick="location.hash='#/course/${c.id}'">Details</button>
        <button class="btn small ghost" onclick='(${enroll}).call(null, ${JSON.stringify(c)})'>Enroll</button>
      </div>
    </div>
  </article>`;
}

async function renderCourse(id){
  const c = await fetchCourse(id);
  const enrolled = await getEnrollment(id);
  app.innerHTML = `
    <section class="card">
      <h2>${escapeHtml(c.title)}</h2>
      <div class="chips">
        <span class="chip">${levelName(c.level)}</span>
        <span class="chip">${c.credits||1} credit(s)</span>
      </div>
      <p>${escapeHtml(c.summary||'')}</p>
      <div class="row">
        <button class="btn" onclick='(${enroll}).call(null, ${JSON.stringify(c)})'>${enrolled?'Continue learning':'Enroll & Start'}</button>
        <button class="btn ghost" onclick="location.hash='#/courses'">Back</button>
      </div>
    </section>
  `;
}

async function renderLearn(courseId){
  if(!currentUser) return authDlg.showModal();
  const course = await fetchCourse(courseId);
  const lessons = await fetchLessons(courseId);
  app.innerHTML = `<section class="card"><h2>${escapeHtml(course.title)}</h2>
    ${lessons.map((l,i)=> lessonItem(l,i)).join('')||'<p class="muted">No lessons yet.</p>'}
  </section>`;
}

function lessonItem(l, idx){
  return `<article class="card" style="margin:.6rem 0">
    <div class="row" style="justify-content:space-between">
      <h4>Lesson ${idx+1}: ${escapeHtml(l.title)}</h4>
      <button class="btn small" onclick='(${openLesson}).call(null, ${JSON.stringify(l)})'>Open</button>
    </div>
  </article>`
}

async function openLesson(lesson){
  // Load content + quiz
  const quiz = await fetchQuiz(lesson.id); // array of questions
  app.innerHTML = `<section class="card">
    <h3>${escapeHtml(lesson.title)}</h3>
    <div class="card" style="margin:.6rem 0">${lesson.content||''}</div>
    ${renderQuiz(quiz)}
    <div class="row">
      <button class="btn" id="submitQuiz">Submit</button>
      <button class="btn ghost" onclick="history.back()">Back</button>
    </div>
    <p class="muted">You must pass (≥ 65%) to unlock the next lesson.</p>
  </section>`;
  $('#submitQuiz').addEventListener('click', ()=> gradeQuiz(lesson, quiz));
}

function renderQuiz(qs){
  if(!qs.length) return '<p class="muted">No quiz for this lesson yet.</p>';
  return `<ol>
    ${qs.map(q=> quizItem(q)).join('')}
  </ol>`
}

function quizItem(q){
  const id = q.id;
  if(q.type==='single'){
    return `<li class="card"><p><strong>${escapeHtml(q.text)}</strong></p>
      ${(q.options||[]).map((opt,i)=>`
        <label class="row"><input type="radio" name="q_${id}" value="${i}"> <span>${escapeHtml(opt)}</span></label>
      `).join('')}
    </li>`
  }else if(q.type==='multiple'){
    return `<li class="card"><p><strong>${escapeHtml(q.text)}</strong></p>
      ${(q.options||[]).map((opt,i)=>`
        <label class="row"><input type="checkbox" name="q_${id}" value="${i}"> <span>${escapeHtml(opt)}</span></label>
      `).join('')}
    </li>`
  }else{ // short
    return `<li class="card"><p><strong>${escapeHtml(q.text)}</strong></p>
      <input type="text" name="q_${id}" placeholder="Your answer" class="card" />
    </li>`
  }
}

async function gradeQuiz(lesson, qs){
  let correct = 0;
  for(const q of qs){
    if(q.type==='single'){
      const sel = document.querySelector(`input[name="q_${q.id}"]:checked`);
      if(sel && Number(sel.value)===Number(q.answer)) correct++;
    }else if(q.type==='multiple'){
      const checks = [...document.querySelectorAll(`input[name="q_${q.id}"]:checked`)].map(x=> Number(x.value)).sort();
      const ans = (q.answer||[]).map(Number).sort();
      if(JSON.stringify(checks)===JSON.stringify(ans)) correct++;
    }else{
      const v = document.querySelector(`input[name="q_${q.id}"]`).value.trim().toLowerCase();
      const ans = (q.answer||'').toString().trim().toLowerCase();
      if(v && v===ans) correct++;
    }
  }
  const score = qs.length? Math.round((correct/qs.length)*100) : 0;
  const pass = score>=65;
  alert(`Score: ${score}% — ${pass? 'PASS ✅':'RETRY ❌'}`);
  // record attempt
  if(currentUser){
    await api.addDoc(api.collection(db,'attempts'),{
      userId: currentUser.uid, lessonId: lesson.id, score, pass, ts: api.serverTimestamp()
    });
  }
  if(pass){
    // If last lesson in course, award certificate
    const courseLessons = await fetchLessons(lesson.courseId);
    const isLast = courseLessons[courseLessons.length-1]?.id === lesson.id;
    if(isLast){
      await awardCertificate(lesson.courseId);
    } else {
      history.back();
    }
  }
}

async function awardCertificate(courseId){
  const course = await fetchCourse(courseId);
  // save completion
  await api.addDoc(api.collection(db,'completions'),{
    userId: currentUser.uid, courseId, ts: api.serverTimestamp(), credits: course.credits||1
  });
  // generate certificate
  const url = await drawCertificate(currentUser.email||'Student', course.title);
  const a = document.createElement('a'); a.href=url; a.download=`Certificate - ${course.title}.png`; a.click();
  alert('Certificate ready! For a hard copy, place an order in Shop > Certificates.');
  location.hash = '#/dashboard';
}

async function renderDashboard(){
  if(!currentUser) return authDlg.showModal();
  // Enrollments
  const q = api.query(api.collection(db,'enrollments'), api.where('userId','==',currentUser.uid));
  const res = await api.getDocs(q);
  const list = res.docs.map(d=>({id:d.id,...d.data()}));
  // Notes
  const nq = api.query(api.collection(db,'notes'), api.where('userId','==',currentUser.uid), api.orderBy('ts','desc'));
  const nres = await api.getDocs(nq); const notes = nres.docs.map(d=>({id:d.id,...d.data()}));

  app.innerHTML = `
    <section class="grid cols-1 cols-2">
      <div class="card">
        <h3>Your Courses</h3>
        ${list.map(en=>`<div class="card row" style="justify-content:space-between">
          <div>
            <div class="muted">Course</div>
            <strong>${escapeHtml(en.courseId)}</strong>
          </div>
          <button class="btn small" onclick="location.hash='#/learn/${en.courseId}'">Open</button>
        </div>`).join('')||'<p class="muted">No enrollments yet.</p>'}
      </div>
      <div class="card">
        <h3>Notes</h3>
        <div id="notesList">${notes.map(n=> noteItem(n)).join('')}</div>
        <button class="btn small" id="addNote">+ New note</button>
      </div>
    </section>
  `;
  $('#addNote').addEventListener('click', async ()=>{
    const id = (await api.addDoc(api.collection(db,'notes'),{userId: currentUser.uid, text:'', ts: api.serverTimestamp()})).id;
    const snap = await api.getDoc(api.doc(db,'notes',id));
    $('#notesList').insertAdjacentHTML('afterbegin', noteItem({id, ...snap.data()}));
    bindNote(id);
  });
  notes.forEach(n=> bindNote(n.id));
}

function noteItem(n){
  return `<article class="note-item" id="note_${n.id}">
    <textarea placeholder="Write your note…">${escapeHtml(n.text||'')}</textarea>
    <div class="row" style="justify-content:space-between;margin-top:.4rem">
      <span class="muted">${new Date(n.ts?.toDate?.()||Date.now()).toLocaleString()}</span>
      <button class="btn small ghost" onclick='(${deleteNote}).call(null, "${n.id}")'>Delete</button>
    </div>
  </article>`
}

function bindNote(id){
  const el = document.querySelector(`#note_${id} textarea`);
  el.addEventListener('input', debounce(async ()=>{
    await api.updateDoc(api.doc(db,'notes',id), { text: el.value });
  }, 500));
}

async function deleteNote(id){
  await api.updateDoc(api.doc(db,'notes',id), { text: '' });
  document.querySelector('#note_'+id)?.remove();
}

async function renderShop(){
  const q = api.query(api.collection(db,'shopItems'), api.orderBy('ts','desc'));
  const res = await api.getDocs(q); const items = res.docs.map(d=>({id:d.id,...d.data()}));
  app.innerHTML = `<h2>Shop</h2>
    <div class="grid cols-1 cols-2">
      ${items.map(i=>`<article class="card">
        <h4>${escapeHtml(i.title)}</h4>
        <p class="muted">${escapeHtml(i.desc||'')}</p>
        <div class="row">
          <span class="chip">$${(i.price||0).toFixed?.(2)??i.price}</span>
          <button class="btn small" onclick='(${orderItem}).call(null, ${JSON.stringify(i)})'>Order</button>
        </div>
      </article>`).join('')||'<p class="muted">Coming soon.</p>'}
    </div>`;
}

async function orderItem(item){
  if(!currentUser) return authDlg.showModal();
  await api.addDoc(api.collection(db,'orders'),{
    userId: currentUser.uid, itemId: item.id, ts: api.serverTimestamp(), status:'requested'
  });
  alert('Order request submitted. We will contact you by email.');
}

async function renderAdmin(){
  if(!(currentUser && (currentRole==='admin' || currentRole==='ta'))) return app.innerHTML = `<div class="card"><p class="muted">Admins/TAs only.</p></div>`;
  app.innerHTML = `
    <section class="grid cols-1 cols-2">
      <form class="card" id="formCourse">
        <h3>Add Course</h3>
        <label>Title<input name="title" required /></label>
        <label>Level<select name="level">
          <option value="0">Beginner</option><option value="1">Intermediate</option><option value="2">Advanced</option><option value="3">Pro</option>
        </select></label>
        <label>Credits<input type="number" name="credits" value="1" min="0" step="1"/></label>
        <label>Summary<textarea name="summary"></textarea></label>
        <button class="btn">Save</button>
      </form>

      <form class="card" id="formLesson">
        <h3>Add Lesson</h3>
        <label>Course ID<input name="courseId" required placeholder="course doc id"/></label>
        <label>Index<input type="number" name="index" value="0"/></label>
        <label>Title<input name="title" required /></label>
        <label>Content (HTML)<textarea name="content" rows="6" placeholder="<p>Pāli intro…</p>"></textarea></label>
        <button class="btn">Save</button>
      </form>

      <form class="card" id="formQuiz">
        <h3>Add Question</h3>
        <label>Lesson ID<input name="lessonId" required placeholder="lesson doc id"/></label>
        <label>Type<select name="type">
          <option value="single">Single choice</option>
          <option value="multiple">Multiple choice</option>
          <option value="short">Short answer</option>
        </select></label>
        <label>Question<textarea name="text" rows="3"></textarea></label>
        <label>Options (JSON array)<textarea name="options" rows="3" placeholder='["A","B","C"]'></textarea></label>
        <label>Answer (index | [indexes] | text)<input name="answer" placeholder="0 or [0,2] or string"/></label>
        <button class="btn">Save</button>
      </form>

      <form class="card" id="formAnn">
        <h3>Announcement</h3>
        <label>Title<input name="title"/></label>
        <label>Level<select name="level"><option>All</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option><option>Pro</option></select></label>
        <label>Body<textarea name="body" rows="4"></textarea></label>
        <button class="btn">Post</button>
      </form>
    </section>
  `;
  $('#formCourse').addEventListener('submit',saveCourse);
  $('#formLesson').addEventListener('submit',saveLesson);
  $('#formQuiz').addEventListener('submit',saveQuiz);
  $('#formAnn').addEventListener('submit',saveAnn);
}

async function saveCourse(e){
  e.preventDefault(); const f = e.target;
  await api.addDoc(api.collection(db,'courses'),{
    title: f.title.value, level: Number(f.level.value), credits: Number(f.credits.value||1), summary: f.summary.value,
    lessons: 0, ts: api.serverTimestamp()
  }); alert('Course added'); f.reset();
}
async function saveLesson(e){
  e.preventDefault(); const f = e.target;
  await api.addDoc(api.collection(db,'lessons'),{
    courseId: f.courseId.value, index: Number(f.index.value||0), title:f.title.value, content: f.content.value, ts: api.serverTimestamp()
  }); alert('Lesson added'); f.reset();
}
async function saveQuiz(e){
  e.preventDefault(); const f = e.target; let opts = [];
  try{ opts = f.options.value? JSON.parse(f.options.value): []; }catch{ alert('Options JSON invalid'); return; }
  const ans = parseAnswer(f.answer.value);
  await api.addDoc(api.collection(db,'quizzes'),{
    lessonId: f.lessonId.value, type: f.type.value, text: f.text.value, options: opts, answer: ans, ts: api.serverTimestamp()
  }); alert('Question added'); f.reset();
}
async function saveAnn(e){
  e.preventDefault(); const f = e.target;
  await api.addDoc(api.collection(db,'announcements'),{title:f.title.value, level:f.level.value, body:f.body.value, ts: api.serverTimestamp()});
  alert('Announcement posted'); f.reset();
}

function parseAnswer(v){
  if(!v) return '';
  if(v.trim().startsWith('[')) try{ return JSON.parse(v);}catch{ return v; }
  const num = Number(v); return isNaN(num)? v: num;
}

// ---------- Certificate drawing ----------
async function drawCertificate(name, course){
  const c = $('#certCanvas'); const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,c.width,c.height);
  // frame
  ctx.strokeStyle = '#0abf7f'; ctx.lineWidth = 16; ctx.strokeRect(24,24,c.width-48,c.height-48);
  ctx.fillStyle = '#0abf7f'; ctx.font = 'bold 64px system-ui'; ctx.fillText('Certificate of Completion', 120, 200);
  ctx.fillStyle = '#222'; ctx.font = '28px system-ui'; ctx.fillText('This certifies that', 120, 280);
  ctx.fillStyle = '#000'; ctx.font = 'bold 56px system-ui'; ctx.fillText(name, 120, 350);
  ctx.fillStyle = '#333'; ctx.font = '28px system-ui'; ctx.fillText('has successfully completed', 120, 420);
  ctx.fillStyle = '#000'; ctx.font = 'bold 44px system-ui'; ctx.fillText(course, 120, 480);
  ctx.fillStyle = '#333'; ctx.font = '24px system-ui'; ctx.fillText(`Date: ${new Date().toLocaleDateString()}`, 120, 560);
  ctx.fillStyle = '#0abf7f'; ctx.font = 'bold 28px system-ui'; ctx.fillText('Lessons in Pali', 120, 620);
  return c.toDataURL('image/png');
}

// ---------- Utils ----------
function emojiByLevel(l){ return ['🌱','🌿','🌳','🏔️'][Number(l)||0]; }
function levelName(l){ return ['Beginner','Intermediate','Advanced','Pro'][Number(l)||0]; }
function escapeHtml(s=''){ return s.replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }
function debounce(fn,ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); } }

// Expose for inline handlers
window.openLesson = openLesson; window.orderItem = orderItem; window.enroll = enroll; window.deleteNote = deleteNote;

// Register service worker (optional)
if('serviceWorker' in navigator){ navigator.serviceWorker.register('/service-worker.js'); }
