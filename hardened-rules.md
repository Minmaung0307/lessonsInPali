rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {

    function authed() { return request.auth != null; }
    function role() {
      return authed() ? get(/databases/$(db)/documents/users/$(request.auth.uid)).data.role : "guest";
    }
    function isAdmin() { return role() == "admin"; }
    function isTA()    { return role() == "ta"; }
    function isAdminOrTA() { return isAdmin() || isTA(); }
    function isOwner(uid) { return authed() && uid == request.auth.uid; }

    // ---------- validators (basic schemas) ----------
    function hasKeys(allowedKeys) {
      return request.resource.data.keys().hasOnly(allowedKeys);
    }
    function nonEmptyString(f) {
      return request.resource.data[f] is string && request.resource.data[f].size() > 0
             && request.resource.data[f].size() <= 2000;
    }
    function numberInRange(f, min, max) {
      return request.resource.data[f] is number && request.resource.data[f] >= min && request.resource.data[f] <= max;
    }

    // ---------- users ----------
    match /users/{uid} {
      allow read: if authed();
      allow create: if authed() && request.auth.uid == uid
        && hasKeys(['email','displayName','role','credits','createdAt']);
      allow update: if request.auth.uid == uid
        && request.resource.data.diff(resource.data).changedKeys().hasOnly(['displayName'])
        || isAdminOrTA(); // only admin/TA can change role/credits
    }

    // ---------- announcements ----------
    match /announcements/{id} {
      allow read: if true;
      allow create, update, delete: if isAdminOrTA()
        && hasKeys(['title','level','body','ts'])
        && nonEmptyString('title') && nonEmptyString('body');
    }

    // ---------- catalog ----------
    match /courses/{id} {
      allow read: if true;
      allow create, update, delete: if isAdminOrTA()
        && hasKeys(['title','level','credits','summary','lessons','ts'])
        && nonEmptyString('title')
        && numberInRange('level',0,3)
        && numberInRange('credits',0,100);
    }
    match /lessons/{id} {
      allow read: if authed();
      allow create, update, delete: if isAdminOrTA()
        && hasKeys(['courseId','index','title','content','ts'])
        && nonEmptyString('courseId') && nonEmptyString('title');
    }

    // Quizzes: NO answers stored here (public view)
    match /quizzes/{id} {
      allow read: if authed();
      allow create, update, delete: if isAdminOrTA()
        && hasKeys(['lessonId','type','text','options','ts'])
        && nonEmptyString('lessonId') && nonEmptyString('type') && nonEmptyString('text');
    }

    // Answer keys: admin/TA only
    match /quizKeys/{lessonId} {
      allow read, write: if isAdminOrTA();
    }

    // ---------- learning state ----------
    match /enrollments/{id} {
      allow create: if authed()
        && request.resource.data.userId == request.auth.uid
        && hasKeys(['userId','courseId','status','progress','ts']);
      allow read: if authed() && (isOwner(resource.data.userId) || isAdminOrTA());
      allow update: if authed() && isOwner(resource.data.userId)
        && request.resource.data.diff(resource.data).changedKeys().hasOnly(['status','progress']);
      allow delete: if isAdminOrTA();
    }

    match /attempts/{id} {
      allow create: if authed()
        && request.resource.data.userId == request.auth.uid
        && hasKeys(['userId','lessonId','score','pass','ts'])
        && numberInRange('score',0,100);
      allow read: if authed() && (isOwner(resource.data.userId) || isAdminOrTA());
      allow update, delete: if false;
    }

    match /completions/{id} {
      // Ideally created by a Cloud Function after validating attempts.
      allow create: if isAdminOrTA() ||
        (authed() && request.resource.data.userId == request.auth.uid
         && hasKeys(['userId','courseId','credits','ts']));
      allow read: if authed() && (isOwner(resource.data.userId) || isAdminOrTA());
      allow update, delete: if false;
    }

    // ---------- private notes ----------
    match /notes/{id} {
      allow create: if authed()
        && request.resource.data.userId == request.auth.uid
        && hasKeys(['userId','text','ts'])
        && request.resource.data.text.size() <= 5000;
      allow read, update, delete: if authed() && isOwner(resource.data.userId);
    }

    // ---------- shop ----------
    match /shopItems/{id} {
      allow read: if true;
      allow write: if isAdminOrTA()
        && hasKeys(['title','desc','price','ts']);
    }
    match /orders/{id} {
      allow create: if authed()
        && request.resource.data.userId == request.auth.uid
        && hasKeys(['userId','itemId','ts','status'])
        && request.resource.data.status == 'requested';
      allow read: if authed() && (isOwner(resource.data.userId) || isAdminOrTA());
      allow update: if isAdminOrTA()
        && request.resource.data.status in ['requested','approved','fulfilled','rejected'];
      allow delete: if false;
    }

    // (optional) direct messages
    match /messages/{id} {
      allow create: if authed() && hasKeys(['from','to','text','ts']) && nonEmptyString('text');
      allow read: if authed() &&
        (resource.data.from == request.auth.uid || resource.data.to == request.auth.uid || isAdminOrTA());
      allow update, delete: if false;
    }
  }
}