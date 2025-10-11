rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {

    function authed() { return request.auth != null; }
    function isAdmin() {
      return authed() &&
        get(/databases/$(db)/documents/users/$(request.auth.uid)).data.role == "admin";
    }
    function isTA() {
      return authed() &&
        get(/databases/$(db)/documents/users/$(request.auth.uid)).data.role == "ta";
    }
    function isAdminOrTA() { return isAdmin() || isTA(); }
    function isOwner(userIdField) { return authed() && userIdField == request.auth.uid; }

    // --- users ---
    match /users/{uid} {
      allow read: if authed();                 // allow students to read each other (show names)
      allow write: if authed() && request.auth.uid == uid;
    }

    // --- announcements (Homepage posts) ---
    match /announcements/{id} {
      allow read: if true;
      allow write: if isAdminOrTA();
    }

    // --- course catalog ---
    match /courses/{id} {
      allow read: if true;
      allow write: if isAdminOrTA();
    }
    match /lessons/{id} {
      allow read: if authed();                 // lessons visible to signed-in users
      allow write: if isAdminOrTA();
    }

    // ⚠️ Note: In your current app, quizzes include `answer` and are read client-side.
    // This means students can inspect correct answers. Keep for now; harden later (see v2 below).
    match /quizzes/{id} {
      allow read: if authed();
      allow write: if isAdminOrTA();
    }

    // --- learning state ---
    match /enrollments/{id} {
      allow create, read: if authed();
      allow update, delete: if authed() && isOwner(resource.data.userId);
    }

    match /attempts/{id} {
      allow create, read: if authed() && isOwner(request.resource.data.userId)
                           || isOwner(resource.data.userId);
      allow update, delete: if false;          // attempts are append-only
    }

    match /completions/{id} {
      allow create, read: if authed() && isOwner(request.resource.data.userId)
                           || isOwner(resource.data.userId)
                           || isAdminOrTA();
      allow update, delete: if false;
    }

    // --- notes (private sticky notes) ---
    match /notes/{id} {
      allow create: if authed() && request.resource.data.userId == request.auth.uid;
      allow read, update, delete: if authed() && isOwner(resource.data.userId);
    }

    // --- shop ---
    match /shopItems/{id} {
      allow read: if true;
      allow write: if isAdminOrTA();
    }
    match /orders/{id} {
      allow create: if authed() && request.resource.data.userId == request.auth.uid;
      allow read: if authed() && (isOwner(resource.data.userId) || isAdminOrTA());
      // only admins/TAs can change status/fulfill
      allow update: if isAdminOrTA();
      allow delete: if false;
    }
  }
}