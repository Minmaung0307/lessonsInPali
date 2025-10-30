(function () {
  // Nav toggle
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.querySelector(".menu");
  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      console.log("hello");
      const open = menu.getAttribute('data-open') === 'true';
      menu.setAttribute("data-open", String(!open));
      toggle.setAttribute("aria-expanded", String(!open));
    });
  }

  // Sandbox controls
  const sandbox = document.getElementById("sandbox");
  const dir = document.getElementById("dir");
  const wrap = document.getElementById("wrap");
  const justify = document.getElementById("justify");
  const alignItems = document.getElementById("alignItems");
  const gap = document.getElementById("gap");

  function updateSandbox() {
    if (!sandbox) return;
    sandbox.style.display = "flex";
    sandbox.style.flexDirection = dir.value;
    sandbox.style.flexWrap = wrap.value;
    sandbox.style.justifyContent = justify.value;
    sandbox.style.alignItems = alignItems.value;
    sandbox.style.gap = gap.value + "px";
    document.documentElement.style.setProperty("--gap", gap.value + "px");
  }
  [dir, wrap, justify, alignItems, gap].forEach(
    (el) => el && el.addEventListener("input", updateSandbox)
  );
  updateSandbox();

  // CTA form: simple validation + clear
  const ctaForm = document.getElementById("ctaForm");
  const clearCTA = document.getElementById("clearCTA");
  if (ctaForm) {
    ctaForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!ctaForm.checkValidity()) {
        alert("Please fill the required fields properly.");
        return;
      }
      const data = Object.fromEntries(new FormData(ctaForm).entries());
      alert(
        "Thanks! We received your message: " + JSON.stringify(data, null, 2)
      );
      ctaForm.reset();
    });
  }
  if (clearCTA) {
    clearCTA.addEventListener("click", () => ctaForm && ctaForm.reset());
  }

  // Login form: show/hide password + basic validation
  const loginForm = document.getElementById("loginForm");
  const togglePass = document.getElementById("togglePass");
  const loginPass = document.getElementById("loginPass");
  if (togglePass && loginPass) {
    togglePass.addEventListener("click", () => {
      loginPass.type = loginPass.type === "password" ? "text" : "password";
    });
  }
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!loginForm.checkValidity()) {
        alert("Enter a valid email and a password (min 6 chars).");
        return;
      }
      alert("Logged in (demo).");
      loginForm.reset();
    });
  }
})();
