
# Pāli Lessons LMS (Starter)

Mobile‑first LMS using **Firebase (Auth/Firestore/Storage)**, **PayPal**, and **EmailJS**.  
Features: courses with levels, lessons + quiz gate, enrollments, dashboard, announcements, messages, admin CRUD.

## Quick Start
1. Create Firebase project. Enable **Auth** (Email/Password + GitHub), **Firestore**, **Storage**.
2. Replace placeholders in `/public/js/firebase.js`:
   - `YOUR_API_KEY`, `YOUR_PROJECT_ID`, etc.
3. Deploy storage & firestore rules:
   ```bash
   firebase deploy --only firestore:rules,storage:rules
   ```
4. PayPal: replace `YOUR_PAYPAL_CLIENT_ID` in `index.html` query param.
5. EmailJS: replace `YOUR_EMAILJS_PUBLIC_KEY` in `app.js`.
6. Local preview (any static server):
   ```bash
   cd public
   python3 -m http.server 5173
   # open http://localhost:5173
   ```

## Notes
- Admin: set your user doc `role: "admin"` in Firestore to unlock the Admin console.
- Profile theme/font-size are applied via `data-theme` and `data-fs` attributes on `<html>`.

