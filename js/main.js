(function(){
  "use strict";

  var toggle = document.getElementById("themeToggle");
  var mqLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)");
  function currentIsLight(){
    var explicit = document.documentElement.getAttribute("data-theme");
    if (explicit === "light") return true;
    if (explicit === "dark") return false;
    return !!(mqLight && mqLight.matches);
  }
  function syncToggleLabel(){
    var light = currentIsLight();
    toggle.textContent = light ? "Light" : "Dark";
    toggle.setAttribute("aria-pressed", light ? "true" : "false");
  }
  toggle.addEventListener("click", function(){
    var next = currentIsLight() ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
    syncToggleLabel();
  });
  syncToggleLabel();
})();
