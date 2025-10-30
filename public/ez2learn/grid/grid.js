// IIFE to avoid globals
(function(){
  // Nav toggle
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.querySelector(".menu");
  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      const open = menu.getAttribute("data-open") === "true";
      menu.setAttribute("data-open", String(!open));
      toggle.setAttribute("aria-expanded", String(!open));
    });
  }

  // Sandbox controls
  const grid = document.getElementById("gridSandbox");
  const cols = document.getElementById("cols");
  const colsOut = document.getElementById("colsOut");
  const minw = document.getElementById("minw");
  const strategy = document.getElementById("strategy");
  const gap = document.getElementById("gap");
  const gapOut = document.getElementById("gapOut");
  const rows = document.getElementById("rows");
  const rowsOut = document.getElementById("rowsOut");
  const justifyItems = document.getElementById("justifyItems");
  const alignItems = document.getElementById("alignItems");

  function templateColumns(){
    const n = parseInt(cols.value, 10);
    const min = Math.max(0, parseInt(minw.value || "220", 10));
    const strat = strategy.value;
    if(strat === "fixed"){
      return `repeat(${n}, 1fr)`;
    } else if (strat === "auto-fill"){
      return `repeat(auto-fill, minmax(${min}px, 1fr))`;
    } else {
      return `repeat(auto-fit, minmax(${min}px, 1fr))`;
    }
  }

  function updateSandbox(){
    if(!grid) return;
    colsOut && (colsOut.textContent = cols.value);
    gapOut && (gapOut.textContent = gap.value);
    rowsOut && (rowsOut.textContent = rows.value);

    grid.style.display = "grid";
    grid.style.gap = gap.value + "px";
    grid.style.gridAutoRows = rows.value + "px";
    grid.style.gridTemplateColumns = templateColumns();
    grid.style.justifyItems = justifyItems.value;
    grid.style.alignItems = alignItems.value;
    document.documentElement.style.setProperty("--gap", gap.value + "px");
  }

  [cols, minw, strategy, gap, rows, justifyItems, alignItems].forEach(el => {
    el && el.addEventListener("input", updateSandbox);
    el && el.addEventListener("change", updateSandbox);
  });
  updateSandbox();

  // Form: validate + clear
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
      alert("Thanks! " + JSON.stringify(data, null, 2));
      ctaForm.reset();
    });
  }
  if (clearCTA) {
    clearCTA.addEventListener("click", () => ctaForm && ctaForm.reset());
  }
})();
