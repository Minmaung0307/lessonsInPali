ဟုတ်ကဲ့၊ HTML, CSS, JavaScript (JS) code သုံးခုကို တစ်ဆင့်ပြီးတစ်ဆင့် ဘယ်လိုတည်ဆောက်ထားလဲ၊ ဘယ်အပိုင်းက ဘာလုပ်ဆောင်ပေးလဲဆိုတာကို beginner နားလည်အောင် ရှင်းပြပေးပါ့မယ်။ ဒီ code တွေက **"Mobile-First"** ချဉ်းကပ်မှုကို အသုံးပြုပြီး Flexbox ကို နားလည်အောင် သင်ကြားပေးတဲ့ ဝဘ်စာမျက်နှာတစ်ခုကို ဖန်တီးထားတာပါ။

ဒီလို HTML, CSS, JS သုံးမျိုးပေါင်းစပ်ပြီး ဝဘ်ဆိုဒ်တစ်ခုကို ဘယ်လိုတည်ဆောက်တယ်ဆိုတာကို နားလည်သွားအောင် ရှင်းပြပေးပါ့မယ်။

---

### အဆင့် ၁: HTML (ဝဘ်စာမျက်နှာရဲ့ ဖွဲ့စည်းပုံ)

HTML က ဝဘ်စာမျက်နှာရဲ့ **အရိုးစု** လိုပါပဲ။ စာသားတွေ၊ ပုံတွေ၊ ခလုတ်တွေ၊ လင့်ခ်တွေ စတာတွေကို ဘယ်နေရာမှာ ထားမယ်ဆိုတာကို သတ်မှတ်ပေးပါတယ်။ ဒီ code ရဲ့ အဓိက အစိတ်အပိုင်းတွေကို ကြည့်ရအောင်။

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Flexbox Masterclass (Mobile‑First)</title>
  <link rel="stylesheet" href="flexbox.css" />
</head>
<body>
  <!-- 1) Navbar (Mobile-first → Desktop) -->
  <header class="site-header">
    <div class="container nav">
      <a class="brand" href="#">FlexMaster</a>
      <button class="nav-toggle" aria-label="Toggle menu" aria-expanded="false">☰</button>
      <nav class="menu" data-collapsible="false">
        <a href="#intro">Intro</a>
        <!-- ... (menu links) ... -->
      </nav>
    </div>
  </header>

  <main class="container">
    <section id="intro" class="card">
      <h1>CSS Flexbox — Mobile‑First Masterclass</h1>
      <!-- ... (Flexbox Sandbox Controls) ... -->
      <div class="demo sandbox" id="sandbox" aria-live="polite">
        <div class="box a">A</div>
        <div class="box b">B</div>
        <div class="box c">C</div>
        <div class="box d">D</div>
      </div>
    </section>

    <!-- ... (Other sections like Cheat-Sheet, CTA Form, Login Form, Layouts, Exercises, Pitfalls) ... -->

  </main>

  <footer class="site-footer">
    <div class="container">
      <small>© 2025 FlexMaster • Built with Flexbox</small>
    </div>
  </footer>

  <script src="flexbox.js"></script>
</body>
</html>
```

**ဒီ Code က ဘာကို တည်ဆောက်ထားတာလဲ။**

1.  **အခြေခံဖွဲ့စည်းပုံ (`<!DOCTYPE html>`, `<html>`, `<head>`, `<body>`):**
    *   ဝဘ်စာမျက်နှာတိုင်းမှာ ပါဝင်တဲ့ အခြေခံအကျဆုံး အစိတ်အပိုင်းတွေပါ။
    *   `<head>` ထဲမှာ စာမျက်နှာအကြောင်း အချက်အလက်တွေ (ဥပမာ - `title`, `meta` tags) နဲ့ `flexbox.css` ဆိုတဲ့ CSS file ကို ချိတ်ဆက်ထားတာ တွေ့ရပါမယ်။ (ဒါက စာမျက်နှာကို လှပအောင် အလှဆင်ဖို့အတွက်ပါ)
    *   `<body>` ထဲမှာတော့ စာမျက်နှာပေါ်မှာ မြင်ရမယ့် အကြောင်းအရာအားလုံးကို ထည့်သွင်းထားပါတယ်။

2.  **`Header` (ခေါင်းစီး) အပိုင်း:**
    *   `<header class="site-header">` နဲ့ `<div class="container nav">` ထဲမှာ ဝဘ်ဆိုဒ်ရဲ့ ခေါင်းစီး (Navigation Bar) ကို ထည့်ထားပါတယ်။
    *   **`FlexMaster` (`<a class="brand" ...>`)**: ဝဘ်ဆိုဒ်ရဲ့ အမှတ်တံဆိပ် (Brand Name) ပါ။
    *   **`☰` (`<button class="nav-toggle" ...>`)**: ဒါက Mobile ဖုန်းတွေမှာ Menu ကို ပေါ်လိုက်/ဖျောက်လိုက် လုပ်ဖို့အတွက် ခလုတ်လေးပါ။ (Menu Icon လေးပေါ့)
    *   **`Menu` (`<nav class="menu" ...>`)**: ဝဘ်စာမျက်နှာရဲ့ ကဏ္ဍအသီးသီးကို သွားဖို့ လင့်ခ်တွေ (Intro, Cheat-Sheet, CTA Form စတာတွေ) ပါဝင်ပါတယ်။
        *   `data-collapsible="false"` လို attribute တွေကို JavaScript ကနေ ပြောင်းလဲပြီး Menu ကို ထိန်းချုပ်ဖို့ သုံးထားပါတယ်။

3.  **`Main Content` (အဓိက အကြောင်းအရာ) အပိုင်း:**
    *   `<main class="container">` ထဲမှာ ဝဘ်စာမျက်နှာရဲ့ အဓိက အကြောင်းအရာတွေကို `<section>` တွေနဲ့ ခွဲပြီး ထည့်ထားပါတယ်။
    *   **`#intro` Section:**
        *   `<h1>` ခေါင်းစဉ်နဲ့ စာပိုဒ်တွေ ပါဝင်ပါတယ်။
        *   `controls-row` ဆိုတာ Flexbox properties တွေကို ပြောင်းလဲကြည့်ဖို့ `select` box တွေနဲ့ `range` slider တွေ ထည့်ထားတဲ့ နေရာပါ။
        *   **`demo sandbox` (`<div class="demo sandbox" id="sandbox">`)**: ဒါက Flexbox ရဲ့ အလုပ်လုပ်ပုံကို စမ်းသပ်ပြဖို့ အကွက်လေးတွေ (A, B, C, D) ကို ထည့်ထားတဲ့နေရာပါ။ ဒီနေရာကို JavaScript ကနေ ထိန်းချုပ်ပြပါမယ်။
    *   **`#cheatsheet` Section:** Flexbox ရဲ့ အခြေခံအချက်အလက်တွေကို စာရင်းလိုက် ဖော်ပြထားပါတယ်။
    *   **`#cta` Form:** အချက်အလက်ဖြည့်ဖို့ ဖောင်တစ်ခု (Name, Email, Role, Message) ပါဝင်ပါတယ်။
    *   **`#login` Form:** Login လုပ်ဖို့ ဖောင်တစ်ခု (Email, Password) ပါဝင်ပါတယ်။ `Show/Hide` ဆိုတဲ့ ခလုတ်လည်း ပါပါတယ်။
    *   **`#layouts` Section:** အသုံးများတဲ့ Flexbox layout ပုံစံတွေကို ဥပမာပြထားပါတယ်။ (ဥပမာ - Responsive Navbar, Equal-Height Cards Grid, Media Object)
    *   **`#exercises` Section:** လေ့ကျင့်ခန်းတွေ ပေးထားပါတယ်။
    *   **`#pitfalls` Section:** Flexbox သုံးတဲ့အခါ မှားတတ်တဲ့အချက်တွေကို ဖော်ပြထားပါတယ်။

4.  **`Footer` (အောက်ခြေမှတ်စု) အပိုင်း:**
    *   `<footer class="site-footer">` ထဲမှာ ဝဘ်ဆိုဒ်ရဲ့ အောက်ခြေမှတ်စု (ဥပမာ - Copyright) ကို ထည့်ထားပါတယ်။

5.  **JavaScript ချိတ်ဆက်ခြင်း (`<script src="flexbox.js"></script>`):**
    *   `</body>` ပိတ်ခါနီးမှာ `flexbox.js` ဆိုတဲ့ JavaScript file ကို ချိတ်ဆက်ထားပါတယ်။ ဒါမှ စာမျက်နှာပေါ်က element တွေကို JavaScript ကနေ ထိန်းချုပ်နိုင်မှာပါ။

**အနှစ်ချုပ်:** HTML က စာမျက်နှာရဲ့ အကြောင်းအရာတွေကို အဓိပ္ပာယ်ရှိတဲ့ အပိုင်းတွေအဖြစ် ခွဲခြားပြီး အဆင့်ဆင့် စီစဉ်ထားပါတယ်။ `class` တွေ၊ `id` တွေ၊ `data-` attributes တွေကို CSS နဲ့ JavaScript ကနေ လှမ်းခေါ်သုံးနိုင်ဖို့ ထည့်ပေးထားပါတယ်။

---

### အဆင့် ၂: CSS (ဝဘ်စာမျက်နှာကို အလှဆင်ခြင်း)

CSS ကတော့ HTML နဲ့ တည်ဆောက်ထားတဲ့ **အရိုးစုကို အသားအရေနဲ့ အဝတ်အစားတွေ ဆင်မြန်းပေးတာ** ပါ။ အရောင်တွေ၊ ဖောင့်တွေ၊ နေရာချထားပုံတွေ၊ အရွယ်အစားတွေ စတာတွေကို သတ်မှတ်ပေးပါတယ်။ ဒီ code ရဲ့ အဓိက အစိတ်အပိုင်းတွေကို ကြည့်ရအောင်။

```css
:root {
  /* Colors & Gap Variable */
  --bg: #0f172a;
  /* ... other color variables ... */
  --gap: 12px;
}

* {
  box-sizing: border-box; /* Layout တွက်ချက်ရလွယ်အောင် */
}
body {
  margin: 0;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Sans",
    "Myanmar Sans Pro", sans-serif;
  background: var(--bg); /* background color */
  color: var(--text);   /* text color */
}

.container {
  width: min(1100px, 92%);
  margin-inline: auto; /* ဗဟိုမှာထားဖို့ */
}
.card {
  background: var(--card);
  border: 1px solid #1f2937;
  border-radius: 16px;
  padding: 16px;
  margin-block: 16px;
}

/* --- Navbar Styling --- */
.nav {
  display: flex;       /* Flexbox စသုံးပြီ! */
  align-items: center; /* ဒေါင်လိုက် ဗဟိုမှာထား */
  gap: 8px;            /* item တွေကြား နေရာခြား */
  padding: 10px 0;
}
.brand { /* FlexMaster စာသား */
  font-weight: 700;
  text-decoration: none;
  color: var(--text);
}
.menu {
  display: none;       /* Mobile မှာ Menu ကို ပုံမှန်အားဖြင့် ဖျောက်ထား */
  flex-direction: column; /* Mobile မှာ menu link တွေက အပေါ်အောက် တန်းစီနေမယ် */
  gap: 8px;
}
.nav-toggle {          /* Mobile Menu ခလုတ် */
  margin-left: auto;   /* brand | ... | [toggle] လိုဖြစ်အောင် ညာဘက်ကို တွန်းပို့ */
  /* ... styling for button ... */
}
.menu[data-open="true"] { /* JS က data-open="true" ဖြစ်အောင်ပြောင်းရင် */
  display: flex;         /* menu ပြန်ပေါ်လာမယ် */
}

/* --- Sandbox Styling --- */
.demo.sandbox {
  display: flex;
  flex-direction: column; /* မူလက အပေါ်အောက် တန်းစီထား */
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--gap);
  /* ... border, padding, min-height ... */
}
.box { /* A, B, C, D အကွက်လေးတွေ */
  background: #1e293b;
  /* ... other styling ... */
}

/* --- Forms Styling (CTA & Login) --- */
.cta .row,
.login .row {
  display: flex;
  flex-direction: column; /* Mobile မှာ label နဲ့ input တွေက အပေါ်အောက် တန်းစီနေမယ် */
  gap: 6px;
}
/* ... input/select/textarea styling ... */
.cta .actions,
.login .actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.cta .actions .btn.ghost {
  margin-left: auto; /* ညာဘက်ကို တွန်းပို့ */
}
.login .row.aux .forgot {
  margin-left: auto; /* 'Forgot password?' ကို ညာဘက်ကို တွန်းပို့ */
}

/* --- Responsive Layouts (Media Queries) --- */
@media (min-width: 768px) { /* မျက်နှာပြင် အကျယ် 768px နဲ့အထက်ဆိုရင် */
  .menu {
    display: flex !important; /* Menu ကို ပေါ်စေမယ် */
    flex-direction: row;     /* Menu link တွေ ဘေးတိုက် တန်းစီသွားမယ် */
    gap: 16px;
  }
  .nav-toggle {
    display: none; /* Mobile Menu ခလုတ်ကို ဖျောက်ထားမယ် */
  }

  .cta .row,
  .login .row {
    flex-direction: row;     /* Form တွေမှာ label နဲ့ input တွေ ဘေးတိုက် တန်းစီသွားမယ် */
    align-items: center;
  }
  .cta .row > label,
  .login .row > label {
    flex: 0 0 140px; /* Label ကို 140px အကျယ် သတ်မှတ် */
  }
}
```

**ဒီ Code က ဘာကို လုပ်ဆောင်ပေးတာလဲ။**

1.  **Variables (`:root`)**: `--bg`, `--card`, `--accent` စတဲ့ အရောင်တွေ၊ နေရာလွတ်တွေအတွက် တန်ဖိုးတွေကို `variable` အဖြစ် သတ်မှတ်ထားပါတယ်။ ဒါမှ နောက်ပိုင်းမှာ အရောင်ပြောင်းချင်ရင် တစ်နေရာတည်းက ပြောင်းလို့ရတာပေါ့။
2.  **Global Styles (`*`, `body`):** ဝဘ်စာမျက်နှာတစ်ခုလုံးအတွက် အခြေခံဖောင့်၊ background color၊ text color စတာတွေကို သတ်မှတ်ပေးပါတယ်။ `box-sizing: border-box;` က Layout တွက်ချက်ရလွယ်ကူအောင် ကူညီပေးပါတယ်။
3.  **Layout Helpers (`.container`, `.card`):**
    *   `.container` က စာမျက်နှာရဲ့ အကြောင်းအရာတွေကို အလယ်ဗဟိုမှာ ထားပြီး ဘေးဘောင်လေးတွေ ချန်ပေးဖို့ပါ။
    *   `.card` က `section` တွေကို လှပတဲ့ card ပုံစံလေးတွေ ဖြစ်အောင် (background color, border, padding, border-radius) လုပ်ပေးပါတယ်။
4.  **Navigation Bar Styling (`.nav`, `.brand`, `.menu`, `.nav-toggle`):**
    *   **Mobile-First:** မူလအစက mobile ဖုန်းတွေအတွက် စီစဉ်ထားပါတယ်။
        *   `.nav` ကို `display: flex;` နဲ့ `align-items: center;` လုပ်ထားပြီး Brand နဲ့ Menu ခလုတ်ကို ဘေးတိုက်စီပါတယ်။
        *   `.nav-toggle` ခလုတ်ကို `margin-left: auto;` နဲ့ ညာဘက်ဆုံးကို တွန်းပို့ထားပါတယ်။
        *   `.menu` (Menu link တွေ) ကို `display: none;` နဲ့ ဖျောက်ထားပြီး၊ `flex-direction: column;` နဲ့ link တွေက အပေါ်အောက်တန်းစီနေအောင် လုပ်ထားပါတယ်။
        *   **`menu[data-open="true"]`**: JavaScript က `nav-toggle` ကို နှိပ်လိုက်လို့ `menu` element မှာ `data-open="true"` လို့ ဖြစ်သွားရင် `display: flex;` နဲ့ Menu ကို ပြန်ပေါ်လာအောင် လုပ်ထားပါတယ်။
5.  **Sandbox Styling (`.demo.sandbox`, `.box`):**
    *   `.demo.sandbox` ကို `display: flex;` နဲ့ `flex-direction: column;` (မူလက အပေါ်အောက်တန်းစီ) လုပ်ထားပြီး `gap: var(--gap);` နဲ့ item တွေကြား နေရာခြားပေးပါတယ်။ JavaScript က ဒီ CSS properties တွေကို ပြောင်းပေးမှာပါ။
    *   `.box` တွေကတော့ A, B, C, D အကွက်လေးတွေရဲ့ ပုံစံတွေပါ။
6.  **Form Styling (`.cta`, `.login`):**
    *   Mobile မှာ `label` နဲ့ `input` တွေက `flex-direction: column;` နဲ့ အပေါ်အောက် တန်းစီနေအောင် လုပ်ထားပါတယ်။
    *   `.actions` ထဲက ခလုတ်တွေကို `flex-wrap: wrap;` နဲ့ `gap` ပေးထားပါတယ်။
    *   `.cta .actions .btn.ghost` နဲ့ `.login .row.aux .forgot` တို့မှာ `margin-left: auto;` ကို သုံးပြီး သက်ဆိုင်ရာ ခလုတ်/လင့်ခ်ကို ညာဘက်ကို တွန်းပို့ထားပါတယ်။
7.  **Responsive Layouts (`@media (min-width: 768px)`):**
    *   ဒါကို **Media Query** လို့ခေါ်ပါတယ်။ မျက်နှာပြင်ရဲ့ အကျယ် (width) က `768px` ဒါမှမဟုတ် ပိုကြီးလာရင် အောက်က CSS rules တွေ အလုပ်လုပ်မယ်။
    *   **Desktop Nav:** `menu` ကို `display: flex !important;` နဲ့ ပေါ်လာအောင် လုပ်ပြီး `flex-direction: row;` နဲ့ link တွေကို ဘေးတိုက်တန်းစီစေမယ်။ `nav-toggle` ခလုတ်ကို `display: none;` နဲ့ ဖျောက်ထားမယ်။
    *   **Form Layout:** Form တွေမှာလည်း `flex-direction: row;` နဲ့ `label` နဲ့ `input` တွေကို ဘေးတိုက်တန်းစီစေပြီး `label` ကို `flex: 0 0 140px;` နဲ့ 140px အကျယ် သတ်မှတ်ပေးပါတယ်။

**အနှစ်ချုပ်:** CSS က HTML element တွေကို အရောင်တွေ၊ နေရာချထားပုံတွေ၊ အမြင်အာရုံဆိုင်ရာ ပုံစံတွေ ပေးပါတယ်။ Flexbox ကို အဓိကအသုံးပြုပြီး Mobile-First ချဉ်းကပ်မှုနဲ့ (အရင် Mobile အတွက် ရေးပြီးမှ မျက်နှာပြင်ကျယ်ရင် ဘယ်လိုပြောင်းမလဲဆိုတာ Media Query နဲ့ ရေး) Responsive Design (စက်အမျိုးအစားမရွေး ကောင်းမွန်စွာ မြင်ရအောင်) ဖန်တီးထားတာကို တွေ့ရပါတယ်။

---

### အဆင့် ၃: JavaScript (ဝဘ်စာမျက်နှာရဲ့ အပြန်အလှန်တုံ့ပြန်မှု)

JavaScript ကတော့ HTML အရိုးစုနဲ့ CSS အလှဆင်ထားတဲ့ **ဝဘ်စာမျက်နှာကို အသက်ဝင်စေတာ** ပါ။ အသုံးပြုသူရဲ့ လုပ်ဆောင်ချက်တွေ (ခလုတ်နှိပ်တာ၊ စာဖြည့်တာ) ကို တုံ့ပြန်ပြီး စာမျက်နှာကို ပြောင်းလဲပေးပါတယ်။

```javascript
(function () {
  // --- Nav toggle (Menu ပေါ်လိုက်/ဖျောက်လိုက် လုပ်တာ) ---
  const toggle = document.querySelector(".nav-toggle"); // Menu ခလုတ်ကို ရွေး
  const menu = document.querySelector(".menu");       // Menu ကို ရွေး
  if (toggle && menu) { // နှစ်ခုလုံးရှိမှ ဆက်လုပ်
    toggle.addEventListener("click", () => { // ခလုတ်ကို နှိပ်ရင်
      const open = menu.getAttribute('data-open') === 'true'; // menu ပွင့်နေလား စစ်
      menu.setAttribute("data-open", String(!open));       // data-open တန်ဖိုးကို ပြောင်းပြန်လှန် (ပွင့်/ပိတ်)
      toggle.setAttribute("aria-expanded", String(!open)); // Accessibility အတွက် ပြောင်း
    });
  }

  // --- Sandbox controls (Flexbox ပုံစံပြောင်းတာ) ---
  const sandbox = document.getElementById("sandbox"); // A, B, C, D ရှိတဲ့ အကွက်ကြီးကို ရွေး
  const dir = document.getElementById("dir");         // Direction select box
  // ... (wrap, justify, alignItems, gap select/input တွေ) ...

  function updateSandbox() { // Sandbox ရဲ့ ပုံစံတွေကို ပြောင်းလဲပေးတဲ့ Function
    if (!sandbox) return; // Sandbox မရှိရင် မလုပ်တော့ဘူး
    sandbox.style.display = "flex"; // CSS display: flex; လို့ သတ်မှတ်
    sandbox.style.flexDirection = dir.value; // select box က တန်ဖိုးနဲ့ flexDirection ပြောင်း
    sandbox.style.flexWrap = wrap.value;     // select box က တန်ဖိုးနဲ့ flexWrap ပြောင်း
    // ... (အခြား properties များ ပြောင်းလဲခြင်း) ...
    document.documentElement.style.setProperty("--gap", gap.value + "px"); // CSS variable --gap ကိုပါ ပြောင်း
  }
  // dir, wrap, justify, alignItems, gap တို့ကို forEach နဲ့ လိုက်ပြီး
  [dir, wrap, justify, alignItems, gap].forEach(
    (el) => el && el.addEventListener("input", updateSandbox) // တန်ဖိုးပြောင်းရင် updateSandbox ကို ခေါ်
  );
  updateSandbox(); // စစချင်းမှာ တစ်ခါ ခေါ်ပြီး မူလတန်ဖိုးတွေနဲ့ ပုံစံချထား

  // --- CTA form (ဖောင် စစ်ဆေးတာနဲ့ ရှင်းလင်းတာ) ---
  const ctaForm = document.getElementById("ctaForm"); // CTA Form ကို ရွေး
  const clearCTA = document.getElementById("clearCTA"); // Clear ခလုတ်ကို ရွေး
  if (ctaForm) {
    ctaForm.addEventListener("submit", (e) => { // Form ကို submit လုပ်ရင်
      e.preventDefault(); // စာမျက်နှာ reload မဖြစ်အောင် တား
      if (!ctaForm.checkValidity()) { // Form အချက်အလက်တွေ မှန်မမှန် စစ်
        alert("Please fill the required fields properly."); // မမှန်ရင် alert ပြ
        return;
      }
      const data = Object.fromEntries(new FormData(ctaForm).entries()); // Form data ယူ
      alert(
        "Thanks! We received your message: " + JSON.stringify(data, null, 2) // Message ပြ
      );
      ctaForm.reset(); // Form ကို ရှင်းလင်း
    });
  }
  if (clearCTA) {
    clearCTA.addEventListener("click", () => ctaForm && ctaForm.reset()); // Clear ခလုတ်နှိပ်ရင် Form ရှင်း
  }

  // --- Login form (Password ပေါ်/ပျောက်တာနဲ့ validation) ---
  const loginForm = document.getElementById("loginForm"); // Login Form ကို ရွေး
  const togglePass = document.getElementById("togglePass"); // Show/Hide ခလုတ်
  const loginPass = document.getElementById("loginPass");   // Password input
  if (togglePass && loginPass) {
    togglePass.addEventListener("click", () => { // Show/Hide ခလုတ်နှိပ်ရင်
      // Password input ရဲ့ type ကို password ကနေ text, text ကနေ password ပြောင်း
      loginPass.type = loginPass.type === "password" ? "text" : "password";
    });
  }
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => { // Login Form submit လုပ်ရင်
      e.preventDefault();
      if (!loginForm.checkValidity()) { // Form validation
        alert("Enter a valid email and a password (min 6 chars).");
        return;
      }
      alert("Logged in (demo)."); // Logged in ဆိုတဲ့ message ပြ
      loginForm.reset(); // Form ရှင်းလင်း
    });
  }
})();
```

**ဒီ Code က ဘာကို လုပ်ဆောင်ပေးတာလဲ။**

1.  **IIFE (`(function () { ... })();`):** Code အားလုံးကို ဒီ Function ထဲမှာ ထည့်ထားပါတယ်။ ဒါက variable တွေ၊ function တွေ အချင်းချင်း conflict မဖြစ်အောင် ကာကွယ်ပေးတဲ့ နည်းလမ်းကောင်းတစ်ခုပါ။

2.  **Nav toggle (Menu ပေါ်လိုက်/ဖျောက်လိုက် လုပ်ခြင်း):**
    *   `nav-toggle` ခလုတ် (☰) နဲ့ `menu` element ကို ရွေးချယ်ထားပါတယ်။
    *   `nav-toggle` ခလုတ်ကို **ကလစ်နှိပ်တဲ့အခါ (`click` event)** မှာ `menu` ရဲ့ `data-open` attribute ရဲ့ တန်ဖိုးကို `true` ကနေ `false`၊ `false` ကနေ `true` ကို ပြောင်းပြန်လှန်ပေးပါတယ်။
    *   ဒီ `data-open` တန်ဖိုးပြောင်းသွားတာနဲ့ CSS ထဲက `menu[data-open="true"]` rule အလုပ်လုပ်ပြီး Menu ပေါ်လာတာ/ပျောက်သွားတာ ဖြစ်ပါတယ်။ (CSS အပိုင်းမှာ ရှင်းပြခဲ့သလိုပါပဲ)

3.  **Sandbox controls (Flexbox ပုံစံပြောင်းလဲခြင်း):**
    *   `sandbox` (A,B,C,D အကွက်တွေပါတဲ့ div) နဲ့ `dir`, `wrap`, `justify`, `alignItems`, `gap` ဆိုတဲ့ control တွေကို ရွေးချယ်ထားပါတယ်။
    *   `updateSandbox()` Function ထဲမှာ `sandbox` ရဲ့ CSS properties တွေကို control တွေက ရွေးချယ်ထားတဲ့ `value` အတိုင်း ပြောင်းလဲပေးပါတယ်။ ဥပမာ - `sandbox.style.flexDirection = dir.value;`
    *   control တွေထဲက တန်ဖိုးတစ်ခုခု **ပြောင်းသွားတဲ့အခါ (`input` event)** မှာ `updateSandbox()` Function ကို ခေါ်ပြီး `sandbox` ရဲ့ ပုံစံကို ချက်ချင်းပြောင်းပေးပါတယ်။
    *   `document.documentElement.style.setProperty("--gap", gap.value + "px");` ဆိုတာက CSS မှာ ကြေညာထားတဲ့ `--gap` variable ရဲ့ တန်ဖိုးကို JavaScript ကနေ ပြောင်းပေးတာပါ။

4.  **CTA Form (Form Validation နဲ့ Clear လုပ်ခြင်း):**
    *   `ctaForm` (ဖောင်) နဲ့ `clearCTA` (Clear ခလုတ်) ကို ရွေးချယ်ထားပါတယ်။
    *   `ctaForm` ကို **`submit` လုပ်တဲ့အခါ**၊ စာမျက်နှာ reload မဖြစ်အောင် `e.preventDefault()` လုပ်ထားပါတယ်။
    *   `ctaForm.checkValidity()` နဲ့ ဖောင်ထဲက အချက်အလက်တွေ မှန်မမှန် (ဥပမာ - `required` ဖြည့်ထားလား၊ email ပုံစံမှန်လား) စစ်ဆေးပါတယ်။
    *   မမှန်ရင် `alert()` message ပြပါတယ်။ မှန်ရင်တော့ Form ထဲက အချက်အလက်တွေကိုယူပြီး `alert()` နဲ့ ပြသပြီး `ctaForm.reset()` နဲ့ ဖောင်ကို ရှင်းလင်းပေးပါတယ်။
    *   `clearCTA` ခလုတ်ကို **`click` လုပ်တဲ့အခါ** `ctaForm.reset()` ကို ခေါ်ပြီး ဖောင်ကို ရှင်းလင်းပေးပါတယ်။

5.  **Login Form (Password ပေါ်/ပျောက်ခြင်းနဲ့ Validation):**
    *   `loginForm`၊ `togglePass` (Show/Hide ခလုတ်) နဲ့ `loginPass` (Password input) တို့ကို ရွေးချယ်ထားပါတယ်။
    *   `togglePass` ကို **`click` လုပ်တဲ့အခါ** `loginPass.type` attribute ကို `password` နဲ့ `text` ကို အလှည့်ကျ ပြောင်းလဲပေးပါတယ်။ (ဒါကို Ternary Operator နဲ့ လုပ်တာကို အရင်ရှင်းပြခဲ့ပြီးပါပြီ)
    *   `loginForm` ကို **`submit` လုပ်တဲ့အခါ** CTA Form လိုပဲ `checkValidity()` နဲ့ စစ်ဆေးပြီး `alert()` message ပြသကာ `loginForm.reset()` နဲ့ ဖောင်ကို ရှင်းလင်းပေးပါတယ်။

**အနှစ်ချုပ်:** JavaScript က HTML element တွေကို `document.querySelector()`/`getElementById()` နဲ့ ရွေးချယ်ပြီး အသုံးပြုသူရဲ့ `click`, `input`, `submit` စတဲ့ အဖြစ်အပျက်တွေကို `addEventListener()` နဲ့ နားစွင့်ပါတယ်။ အဲဒီအဖြစ်အပျက်တွေ ဖြစ်ပေါ်လာရင် သက်ဆိုင်ရာ Function တွေကို အလုပ်လုပ်စေပြီး HTML element တွေရဲ့ `style` တွေ၊ `attribute` တွေ၊ ဒါမှမဟုတ် `input value` တွေကို ပြောင်းလဲပေးခြင်းဖြင့် ဝဘ်စာမျက်နှာကို အပြန်အလှန်တုံ့ပြန်မှု (interactive) ရှိအောင် ဖန်တီးပေးပါတယ်။

---

### တစ်ခုလုံး ဘယ်လိုတည်ဆောက်သွားတာလဲဆိုတော့

1.  **အရိုးစုတည်ဆောက် (HTML):**
    *   ပထမဆုံးအနေနဲ့ ဝဘ်စာမျက်နှာပေါ်မှာ ဘာတွေပါမလဲ (Navigation bar, Form တွေ၊ စာသားတွေ၊ ခလုတ်တွေ၊ Flexbox စမ်းသပ်စရာနေရာ) ဆိုတာကို HTML နဲ့ အရင်ဆုံး တည်ဆောက်ပါတယ်။
    *   แต่ละ element ကို `class` တွေ၊ `id` တွေ၊ `data-` attributes တွေ ထည့်ပေးထားပြီး CSS နဲ့ JS ကနေ လှမ်းခေါ်သုံးဖို့ ပြင်ဆင်ထားပါတယ်။

2.  **အလှဆင်ခြင်း (CSS):**
    *   HTML နဲ့ တည်ဆောက်ထားတဲ့ အရာတွေကို လှပတဲ့ ဒီဇိုင်းတွေ ပေးပါတယ်။
    *   အရောင်တွေ၊ ဖောင့်တွေ၊ နေရာချထားပုံတွေကို သတ်မှတ်ပါတယ်။
    *   Flexbox ကို အဓိကအသုံးပြုပြီး Mobile-First နည်းလမ်းနဲ့ Responsive Design (ဖုန်း၊ တက်ဘလက်၊ ကွန်ပျူတာ အားလုံးမှာ လှအောင်) စနစ်တကျ ရေးသားပါတယ်။ `media queries` တွေနဲ့ မျက်နှာပြင်ကျယ်လာရင် ပုံစံပြောင်းလဲပုံကို သတ်မှတ်ပါတယ်။
    *   JavaScript က `data-open="true"` လို attribute ကို ပြောင်းလိုက်ရင် Menu ပေါ်လာအောင်၊ ဖျောက်ထားအောင် CSS က ကြိုတင်ပြင်ဆင်ထားပါတယ်။

3.  **အသက်သွင်းခြင်း (JavaScript):**
    *   HTML နဲ့ CSS နဲ့ လှပနေတဲ့ စာမျက်နှာကို အပြန်အလှန်တုံ့ပြန်မှုတွေ ထည့်သွင်းပေးပါတယ်။
    *   Navigation Menu ခလုတ်ကို နှိပ်ရင် Menu ပေါ်လာအောင်/ပျောက်သွားအောင် လုပ်ပေးပါတယ်။
    *   Flexbox Sandbox မှာ select box တွေ ပြောင်းလိုက်ရင် အကွက်လေးတွေရဲ့ နေရာချထားပုံတွေ ပြောင်းလဲသွားအောင် လုပ်ပေးပါတယ်။
    *   Form တွေမှာ အချက်အလက်တွေ မှန်မမှန် စစ်ဆေးပေးပြီး Submit လုပ်တဲ့အခါ message ပြတာ၊ Form ကို ရှင်းလင်းတာတွေ လုပ်ပေးပါတယ်။
    *   Password ကို ပေါ်လိုက်/ပျောက်လိုက် လုပ်တဲ့ feature ထည့်ပေးပါတယ်။

ဒီလို ၃-ခု ပေါင်းစပ်ပြီး အလုပ်လုပ်ခြင်းအားဖြင့် အသုံးပြုရလွယ်ကူပြီး လှပတဲ့ ဝဘ်စာမျက်နှာတစ်ခုကို တည်ဆောက်နိုင်တာ ဖြစ်ပါတယ်။