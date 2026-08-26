(function () {
  var STORAGE_KEY = "yd-theme";

  function getPreferredTheme() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark") return stored;
    } catch (e) {}
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function syncToggleButtons(theme) {
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", theme === "dark");
    });
  }

  window.__ydTheme = {
    get: getPreferredTheme,
    set: function (theme) {
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch (e) {}
      document.documentElement.classList.toggle("dark", theme === "dark");
      syncToggleButtons(theme);
    },
    toggle: function () {
      var current = document.documentElement.classList.contains("dark") ? "dark" : "light";
      this.set(current === "dark" ? "light" : "dark");
    },
  };

  document.addEventListener("DOMContentLoaded", function () {
    syncToggleButtons(getPreferredTheme());
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        window.__ydTheme.toggle();
      });
    });
  });
})();
