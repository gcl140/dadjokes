// Small top-right indicator for slow background jobs (currently: song
// search/download, which runs in a server-side thread and reports back
// over the notifications websocket - see content/views.py _run_song_search).
// Persisted in localStorage so the indicator survives navigating to a
// different page while the job is still running, and syncs across tabs
// via the "storage" event.
(function () {
  var STORAGE_KEY = "yd-bg-job";
  var indicator = document.getElementById("bg-job-indicator");
  var label = document.getElementById("bg-job-label");
  if (!indicator) return;

  function render() {
    var raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      raw = null;
    }

    if (!raw) {
      indicator.classList.add("hidden");
      indicator.classList.remove("flex");
      // Belt-and-suspenders: force it via inline style too, so this can't
      // silently no-op if some other stylesheet ever wins the cascade.
      indicator.style.display = "none";
      return;
    }

    var job;
    try {
      job = JSON.parse(raw);
    } catch (e) {
      job = null;
    }

    if (label) label.textContent = (job && job.text) || "Working…";
    indicator.title = (job && job.text) || "Working in the background…";
    indicator.classList.remove("hidden");
    indicator.classList.add("flex");
    indicator.style.display = "flex";
  }

  window.__ydBgJob = {
    start: function (text) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ text: text, startedAt: Date.now() }));
      } catch (e) {}
      render();
    },
    clear: function () {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
      render();
    },
  };

  window.addEventListener("storage", function (e) {
    if (e.key === STORAGE_KEY) render();
  });

  render();
})();
