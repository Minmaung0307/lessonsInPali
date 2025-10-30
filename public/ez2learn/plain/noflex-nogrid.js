// IIFE to avoid globals
(function(){
  // Password toggle
  var togglePass = document.getElementById("togglePass");
  var loginPass  = document.getElementById("loginPass");
  if (togglePass && loginPass){
    togglePass.addEventListener("click", function(){
      loginPass.type = (loginPass.type === "password") ? "text" : "password";
      togglePass.textContent = (loginPass.type === "password") ? "Show" : "Hide";
    });
  }

  // Forms validation (page)
  var loginForm = document.getElementById("loginForm");
  if (loginForm){
    loginForm.addEventListener("submit", function(e){
      e.preventDefault();
      if (!loginForm.checkValidity()){ alert("Enter a valid email and 6+ char password."); return; }
      alert("Logged in (demo).");
      loginForm.reset();
    });
  }

  var ctaForm = document.getElementById("ctaForm");
  var clearCTA = document.getElementById("clearCTA");
  if (ctaForm){
    ctaForm.addEventListener("submit", function(e){
      e.preventDefault();
      if (!ctaForm.checkValidity()){ alert("Please complete the required fields."); return; }
      var data = Object.fromEntries(new FormData(ctaForm).entries());
      alert("Thanks! " + JSON.stringify(data, null, 2));
      ctaForm.reset();
    });
  }
  if (clearCTA){
    clearCTA.addEventListener("click", function(){ ctaForm && ctaForm.reset(); });
  }

  // Custom modal system (no flex/grid)
  function openModal(id){
    var modal = document.querySelector(id);
    if (!modal) return;
    modal.setAttribute("aria-hidden", "false");
    // basic focus trap start
    var firstInput = modal.querySelector("input, textarea, select, button");
    firstInput && firstInput.focus();
  }
  function closeModal(el){
    var modal = el.closest(".modal");
    if (!modal) return;
    modal.setAttribute("aria-hidden", "true");
  }

  // open buttons
  var openers = document.querySelectorAll("[data-open]");
  for (var i=0;i<openers.length;i++){
    openers[i].addEventListener("click", function(){
      openModal(this.getAttribute("data-open"));
    });
  }
  // close via [data-close] (X or backdrop)
  document.addEventListener("click", function(e){
    var t = e.target;
    if (t && t.hasAttribute("data-close")) closeModal(t);
  });
  // close on ESC
  document.addEventListener("keydown", function(e){
    if (e.key === "Escape"){
      var open = document.querySelector(".modal[aria-hidden='false']");
      open && open.setAttribute("aria-hidden", "true");
    }
  });
})();