// IIFE to isolate scope
(function(){
  // Nav toggle
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.querySelector(".menu");
  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      const open = menu.getAttribute('data-open') === 'true';
      menu.setAttribute('data-open', String(!open));
      toggle.setAttribute('aria-expanded', String(!open));
    });
  }

  // Flex controls
  const fBox = document.getElementById("flexSandbox");
  const f_dir = document.getElementById("f_dir");
  const f_wrap = document.getElementById("f_wrap");
  const f_justify = document.getElementById("f_justify");
  const f_align = document.getElementById("f_align");
  const f_gap = document.getElementById("f_gap");
  const f_gap_out = document.getElementById("f_gap_out");

  function updateFlex(){
    if(!fBox) return;
    fBox.style.display = "flex";
    fBox.style.flexDirection = f_dir.value;
    fBox.style.flexWrap = f_wrap.value;
    fBox.style.justifyContent = f_justify.value;
    fBox.style.alignItems = f_align.value;
    fBox.style.gap = f_gap.value + "px";
    f_gap_out && (f_gap_out.textContent = f_gap.value);
    document.documentElement.style.setProperty("--gap", f_gap.value + "px");
  }
  [f_dir, f_wrap, f_justify, f_align, f_gap].forEach(el=>{
    el && el.addEventListener("input", updateFlex);
    el && el.addEventListener("change", updateFlex);
  });
  updateFlex();

  // Grid controls
  const grid = document.getElementById("gridSandbox");
  const g_strategy = document.getElementById("g_strategy");
  const g_cols = document.getElementById("g_cols");
  const g_cols_out = document.getElementById("g_cols_out");
  const g_min = document.getElementById("g_min");
  const g_gap = document.getElementById("g_gap");
  const g_gap_out = document.getElementById("g_gap_out");
  const g_rows = document.getElementById("g_rows");
  const g_rows_out = document.getElementById("g_rows_out");
  const g_justify_items = document.getElementById("g_justify_items");
  const g_align_items = document.getElementById("g_align_items");

  function gridTemplateColumns(){
    const n = parseInt(g_cols.value,10);
    const min = Math.max(0, parseInt(g_min.value || "220",10));
    const strat = g_strategy.value;
    if (strat === "fixed") return `repeat(${n}, 1fr)`;
    if (strat === "auto-fill") return `repeat(auto-fill, minmax(${min}px, 1fr))`;
    return `repeat(auto-fit, minmax(${min}px, 1fr))`; // default
  }

  function updateGrid(){
    if(!grid) return;
    g_cols_out && (g_cols_out.textContent = g_cols.value);
    g_gap_out && (g_gap_out.textContent = g_gap.value);
    g_rows_out && (g_rows_out.textContent = g_rows.value);

    grid.style.display = "grid";
    grid.style.gridTemplateColumns = gridTemplateColumns();
    grid.style.gridAutoRows = g_rows.value + "px";
    grid.style.gap = g_gap.value + "px";
    grid.style.justifyItems = g_justify_items.value;
    grid.style.alignItems = g_align_items.value;
    document.documentElement.style.setProperty("--gap", g_gap.value + "px");
  }
  [g_strategy, g_cols, g_min, g_gap, g_rows, g_justify_items, g_align_items].forEach(el=>{
    el && el.addEventListener("input", updateGrid);
    el && el.addEventListener("change", updateGrid);
  });
  updateGrid();

  // Forms
  const loginForm = document.getElementById("loginForm");
  const togglePass = document.getElementById("togglePass");
  const loginPass = document.getElementById("loginPass");
  if (togglePass && loginPass) {
    togglePass.addEventListener("click", () => {
      loginPass.type = loginPass.type === "password" ? "text" : "password";
      togglePass.textContent = loginPass.type === "password" ? "Show" : "Hide";
    });
  }
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!loginForm.checkValidity()) { alert("Enter a valid email and 6+ char password."); return; }
      alert("Logged in (demo).");
      loginForm.reset();
    });
  }

  const ctaForm = document.getElementById("ctaForm");
  const clearCTA = document.getElementById("clearCTA");
  if (ctaForm) {
    ctaForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!ctaForm.checkValidity()) { alert("Please complete the required fields."); return; }
      const data = Object.fromEntries(new FormData(ctaForm).entries());
      alert("Thanks! " + JSON.stringify(data, null, 2));
      ctaForm.reset();
    });
  }
  if (clearCTA) {
    clearCTA.addEventListener("click", () => ctaForm && ctaForm.reset());
  }
})();