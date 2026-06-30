// Groundwork — minimal interactivity (no dependencies, works from file://)
(function () {
  var root = document.documentElement;

  // Theme: saved pref, else OS preference, else Mocha (dark)
  var saved;
  try { saved = localStorage.getItem("fg-theme"); } catch (e) {}
  if (saved) {
    root.setAttribute("data-theme", saved);
  } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
    root.setAttribute("data-theme", "light");
  }

  function toggleTheme() {
    var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("fg-theme", next); } catch (e) {}
    updateThemeLabels();
  }
  function updateThemeLabels() {
    var light = root.getAttribute("data-theme") === "light";
    document.querySelectorAll("[data-theme-label]").forEach(function (el) {
      el.textContent = light ? "◐ Mocha" : "◑ Latte";
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    // Theme toggles
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.addEventListener("click", toggleTheme);
    });
    updateThemeLabels();

    // Mobile nav
    var sidebar = document.querySelector(".sidebar");
    var scrim = document.querySelector(".scrim");
    document.querySelectorAll("[data-nav-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (sidebar) sidebar.classList.toggle("open");
        if (scrim) scrim.classList.toggle("show");
      });
    });
    if (scrim) scrim.addEventListener("click", function () {
      sidebar.classList.remove("open");
      scrim.classList.remove("show");
    });

    // Copy buttons on terminal blocks
    document.querySelectorAll(".terminal").forEach(function (term) {
      var pre = term.querySelector("pre");
      if (!pre) return;
      var bar = term.querySelector(".bar");
      var btn = document.createElement("button");
      btn.className = "copy";
      btn.type = "button";
      btn.textContent = "copy";
      btn.addEventListener("click", function () {
        var text = pre.innerText.replace(/^\s*\$\s?/gm, "");
        navigator.clipboard.writeText(text).then(function () {
          btn.textContent = "copied"; btn.classList.add("done");
          setTimeout(function () { btn.textContent = "copy"; btn.classList.remove("done"); }, 1400);
        });
      });
      if (bar) { btn.classList.add("copy"); var holder = document.createElement("span"); holder.className = "copy-wrap"; holder.style.marginLeft = "auto"; holder.appendChild(btn); bar.appendChild(holder); }
    });
  });
})();
