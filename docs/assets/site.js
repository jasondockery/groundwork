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
    var navButtons = Array.prototype.slice.call(document.querySelectorAll("[data-nav-toggle]"));
    function setNav(open) {
      if (sidebar) sidebar.classList.toggle("open", open);
      if (scrim) scrim.classList.toggle("show", open);
      navButtons.forEach(function (btn) {
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
    navButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        setNav(!(sidebar && sidebar.classList.contains("open")));
      });
    });
    if (scrim) scrim.addEventListener("click", function () {
      setNav(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && sidebar && sidebar.classList.contains("open")) {
        setNav(false);
        navButtons.forEach(function (btn) { btn.blur(); });
      }
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
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        btn.disabled = true;
        btn.textContent = "no clipboard";
        btn.title = "Clipboard API is unavailable in this browser/context.";
      }
      btn.addEventListener("click", function () {
        var text = pre.innerText.replace(/^\s*\$\s?/gm, "");
        navigator.clipboard.writeText(text).then(function () {
          btn.textContent = "copied"; btn.classList.add("done");
          setTimeout(function () { btn.textContent = "copy"; btn.classList.remove("done"); }, 1400);
        }).catch(function () {
          btn.textContent = "failed";
          setTimeout(function () { btn.textContent = "copy"; }, 1400);
        });
      });
      if (bar) { btn.classList.add("copy"); var holder = document.createElement("span"); holder.className = "copy-wrap"; holder.style.marginLeft = "auto"; holder.appendChild(btn); bar.appendChild(holder); }
    });
  });
})();
