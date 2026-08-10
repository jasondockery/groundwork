// Groundwork · minimal interactivity (no dependencies, works from file://)
(function () {
  var root = document.documentElement;

  // Theme: saved preference, else OS preference, else Mocha (dark).
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

  function setInert(element, inert) {
    if (!element) return;
    if (inert) element.setAttribute("inert", "");
    else element.removeAttribute("inert");
  }

  document.addEventListener("DOMContentLoaded", function () {
    // Theme toggles.
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.addEventListener("click", toggleTheme);
    });
    updateThemeLabels();

    // Mobile navigation is a modal drawer. CSS hides the closed drawer before
    // JavaScript runs; inert keeps hidden or underlying controls out of the
    // sequential focus order once the behavior is active.
    var sidebar = document.querySelector(".sidebar");
    var scrim = document.querySelector(".scrim");
    var navButtons = Array.prototype.slice.call(document.querySelectorAll("[data-nav-toggle]"));
    var underlay = [
      document.querySelector(".skip-link"),
      document.querySelector(".topbar"),
      document.querySelector(".main")
    ];
    var mobile = window.matchMedia("(max-width: 900px)");
    var navOpener = null;

    function setButtonState(open) {
      navButtons.forEach(function (btn) {
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        if (btn.classList.contains("nav-close")) btn.setAttribute("aria-label", "Close navigation");
        else btn.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
      });
    }

    function setUnderlayInert(inert) {
      underlay.forEach(function (element) { setInert(element, inert); });
    }

    function closeNav(restoreFocus) {
      var opener = navOpener;
      if (sidebar) {
        sidebar.classList.remove("open");
        sidebar.setAttribute("aria-hidden", "true");
        setInert(sidebar, true);
      }
      if (scrim) scrim.classList.remove("show");
      setUnderlayInert(false);
      setButtonState(false);
      navOpener = null;
      if (restoreFocus && opener && opener.isConnected) opener.focus();
    }

    function openNav(opener) {
      if (!mobile.matches || !sidebar) return;
      navOpener = opener;
      sidebar.classList.add("open");
      sidebar.setAttribute("aria-hidden", "false");
      setInert(sidebar, false);
      if (scrim) scrim.classList.add("show");
      setUnderlayInert(true);
      setButtonState(true);
      window.requestAnimationFrame(function () {
        var closeButton = sidebar.querySelector(".nav-close");
        if (sidebar.classList.contains("open") && closeButton) closeButton.focus();
      });
    }

    function syncNavForViewport() {
      if (!sidebar) return;
      if (mobile.matches) {
        if (!sidebar.classList.contains("open")) closeNav(false);
        return;
      }
      sidebar.classList.remove("open");
      sidebar.removeAttribute("aria-hidden");
      setInert(sidebar, false);
      if (scrim) scrim.classList.remove("show");
      setUnderlayInert(false);
      setButtonState(false);
      navOpener = null;
    }

    navButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (sidebar && sidebar.classList.contains("open")) closeNav(true);
        else openNav(btn);
      });
    });
    if (scrim) scrim.addEventListener("click", function () { closeNav(true); });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && sidebar && sidebar.classList.contains("open")) {
        closeNav(true);
      }
    });
    if (mobile.addEventListener) mobile.addEventListener("change", syncNavForViewport);
    else mobile.addListener(syncNavForViewport);
    syncNavForViewport();

    // Copy buttons keep visual feedback on the button and announce a separate
    // polite status without moving focus.
    document.querySelectorAll(".terminal").forEach(function (term) {
      var pre = term.querySelector("pre");
      if (!pre) return;
      var bar = term.querySelector(".bar");
      var btn = document.createElement("button");
      var status = document.createElement("span");
      btn.className = "copy";
      btn.type = "button";
      btn.textContent = "copy";
      status.className = "sr-only";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      status.setAttribute("aria-atomic", "true");

      function announce(message) {
        status.textContent = "";
        window.requestAnimationFrame(function () { status.textContent = message; });
      }

      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        btn.disabled = true;
        btn.textContent = "no clipboard";
        btn.title = "Clipboard access is unavailable. Select and copy the command manually.";
      }
      btn.addEventListener("click", function () {
        var text = pre.innerText.replace(/^\s*\$\s?/gm, "");
        navigator.clipboard.writeText(text).then(function () {
          btn.textContent = "copied";
          btn.classList.add("done");
          announce("Command copied to the clipboard.");
          setTimeout(function () {
            btn.textContent = "copy";
            btn.classList.remove("done");
          }, 1400);
        }).catch(function () {
          btn.textContent = "failed";
          announce("Copy failed. Select and copy the command manually.");
          setTimeout(function () { btn.textContent = "copy"; }, 1400);
        });
      });
      if (bar) {
        var holder = document.createElement("span");
        holder.className = "copy-wrap";
        holder.style.marginLeft = "auto";
        holder.appendChild(btn);
        holder.appendChild(status);
        bar.appendChild(holder);
      }
    });
  });
})();
