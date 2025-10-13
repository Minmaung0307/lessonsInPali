// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

admin.initializeApp();

exports.issueCertificate = functions.firestore
  .document('completions/{compId}')
  .onCreate(async (snap, ctx) => {
    const data = snap.data();
    const { userId, courseId, score=0 } = data;

    // Load user & course for display
    const user = (await admin.firestore().doc(`users/${userId}`).get()).data() || {};
    const course = (await admin.firestore().doc(`courses/${courseId}`).get()).data() || {};

    // 1) Build PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([842, 595]); // A4 landscape
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    page.drawRectangle({ x: 20, y: 20, width: 802, height: 555, color: rgb(0.96,0.92,0.84) });
    page.drawText('Certificate of Completion', { x: 70, y: 500, size: 30, font, color: rgb(0.2,0.2,0.2) });
    page.drawText(`${user.name || 'Student Name'}`, { x: 70, y: 440, size: 24, font });
    page.drawText(`has successfully completed`, { x: 70, y: 410, size: 16, font });
    page.drawText(`${course.title || courseId}`, { x: 70, y: 380, size: 20, font });

    page.drawText(`Score: ${score}%`, { x: 70, y: 340, size: 14, font });
    page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: 70, y: 315, size: 14, font });

    const pdfBytes = await pdfDoc.save();

    // 2) Upload to Storage
    const bucket = admin.storage().bucket();
    const path = `certs/${userId}/${courseId}-${Date.now()}.pdf`;
    const file = bucket.file(path);
    await file.save(Buffer.from(pdfBytes), { contentType: 'application/pdf' });

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000*60*60*24*365 // 1 year
    });

    // 3) Write certificates doc
    await admin.firestore().collection('certificates').add({
      userId, courseId, score, pdfUrl: url,
      ts: admin.firestore.FieldValue.serverTimestamp()
    });

    return true;
  });