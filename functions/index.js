// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

admin.initializeApp();

const db = admin.firestore();

// ----- Helper: course-wide grade letter
function gradeFromScore(score){
  if (score >= 100) return "A+";
  if (score >= 85) return "A";
  if (score >= 75) return "B";
  if (score >= 65) return "C";
  if (score >= 55) return "D";
  return "F";
}

// Trigger: when a lesson attempt is created, recompute course progress
exports.onAttemptCreate = functions.firestore
  .document("users/{uid}/attempts/{attemptId}")
  .onCreate(async (snap, ctx)=>{
    const a = snap.data();
    const uid = ctx.params.uid;
    const { courseId, courseTitle, score, pass } = a;

    // 1) Update enrollment progress (simple: last attempt score or count-based)
    const enrRef = db.collection("users").doc(uid).collection("enrollments").doc(courseId);
    const enrSnap = await enrRef.get();
    const base = enrSnap.exists ? enrSnap.data() : { userId: uid, courseId, progress: 0, passed: false, ts: admin.firestore.FieldValue.serverTimestamp() };

    // compute progress = (#passed lessons / total lessons)*100
    const lessonsRef = db.collection("lessons").where("courseId","==",courseId);
    const lessons = await lessonsRef.get();
    const totalLessons = lessons.size || 1;

    const attemptsRef = db.collection("users").doc(uid).collection("attempts")
      .where("courseId","==",courseId).where("pass","==",true);
    const passedCount = (await attemptsRef.get()).size;

    const progress = Math.min(100, Math.round((passedCount/totalLessons)*100));
    await enrRef.set({ ...base, progress }, { merge: true });

    // 2) If course finished -> create/update completion
    if (progress >= 100){
      // aggregate average score across lesson attempts
      const allAtt = await db.collection("users").doc(uid).collection("attempts")
        .where("courseId","==",courseId).get();
      const arr = [];
      allAtt.forEach(d => arr.push(d.data().score||0));
      const avg = arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : 0;
      const grade = gradeFromScore(avg);
      const passOverall = avg >= 65;

      if (passOverall){
        const compRef = db.collection("users").doc(uid).collection("completions").doc(courseId);
        await compRef.set({
          userId: uid, courseId, courseTitle: courseTitle || courseId,
          score: avg, grade, ts: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        await enrRef.set({ passed: true }, { merge: true });
      }
    }
  });

// HTTPS endpoint: verify PayPal order then enroll
// Set environment vars with:
// firebase functions:config:set paypal.client="YOUR_CLIENT" paypal.secret="YOUR_SECRET"
exports.verifyPayPal = functions.https.onRequest(async (req, res)=>{
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-user-id");
  if (req.method === "OPTIONS"){ return res.status(204).send(""); }

  try{
    const { orderId, courseId } = req.body || {};
    if (!orderId || !courseId) return res.status(400).json({ ok:false, error:"Missing orderId/courseId" });

    const client = functions.config().paypal?.client;
    const secret = functions.config().paypal?.secret;
    if (!client || !secret) return res.status(500).json({ ok:false, error:"PayPal keys not set" });

    // get access token
    const tokenResp = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": "Basic " + Buffer.from(`${client}:${secret}`).toString("base64") },
      body: "grant_type=client_credentials"
    });
    const token = await tokenResp.json();
    if (!token.access_token) throw new Error("No PayPal token");

    // verify order
    const orderResp = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}`, {
      headers: { "Authorization": `Bearer ${token.access_token}` }
    });
    const order = await orderResp.json();
    if (order.status !== "COMPLETED") throw new Error("Order not completed");

    // identify Firebase user from custom header (in production use auth)
    const uid = req.headers["x-user-id"];
    if (!uid) throw new Error("Missing x-user-id (bind your client auth uid)");

    // create enrollment doc
    await db.collection("users").doc(uid).collection("enrollments").doc(courseId).set({
      userId: uid, courseId, status: "enrolled", progress: 0, passed: false, ts: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    res.json({ ok:true });
  }catch(err){
    console.error(err);
    res.status(500).json({ ok:false, error: String(err.message||err) });
  }
});