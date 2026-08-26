// Search functionality for the floating search bar - shared across every
// page via base.html (not just the feed), so it works on /create-joke/,
// /profile/, /bobo/, etc. too. Queries the server (debounced) instead of
// filtering a small random client-side sample, so it actually finds
// matches anywhere in the joke database as you type.
(function () {
  const searchInput = document.getElementById("floatingSearch");
  const suggestionsBox = document.getElementById("searchSuggestions");

  if (!searchInput || !suggestionsBox) return;

  let debounceTimer = null;
  let requestId = 0;

  function showMessage(text) {
    suggestionsBox.innerHTML = `<div class="px-4 py-6 text-center text-ink-faint text-sm">${text}</div>`;
    suggestionsBox.classList.remove("hidden");
  }

  function renderResults(jokes, query) {
    if (jokes.length === 0) {
      showMessage(`No jokes found for "${query}"`);
      return;
    }

    suggestionsBox.innerHTML = jokes
      .map(
        (item) => `
        <div class="search-result flex items-center gap-3 px-4 py-3 hover:bg-surface-2 cursor-pointer transition-colors" data-id="${item.id}">
          <span class="w-9 h-9 rounded-lg flex-shrink-0 border border-hairline" style="background-color: ${item.bg_color};"></span>
          <div class="min-w-0 flex-1">
            <p class="text-sm text-ink truncate">${item.text}</p>
            <p class="text-xs text-ink-faint truncate">@${item.username}</p>
          </div>
          <i class="fas fa-chevron-right text-ink-faint text-xs flex-shrink-0"></i>
        </div>
      `
      )
      .join("");

    suggestionsBox.querySelectorAll(".search-result").forEach((row) => {
      row.addEventListener("click", () => {
        suggestionsBox.classList.add("hidden");
        // Land back in the scrollable feed with this joke pinned first,
        // instead of a dead-end single-joke page.
        window.location.href = `/?priority=${row.dataset.id}`;
      });
    });

    suggestionsBox.classList.remove("hidden");
  }

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim();
    clearTimeout(debounceTimer);

    if (!query) {
      suggestionsBox.classList.add("hidden");
      suggestionsBox.innerHTML = "";
      return;
    }

    showMessage("Searching...");

    const thisRequest = ++requestId;
    debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (thisRequest !== requestId) return; // a newer keystroke already fired
        renderResults(data.jokes, query);
      } catch (err) {
        if (thisRequest !== requestId) return;
        showMessage("Something went wrong searching");
      }
    }, 250);
  });

  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
      suggestionsBox.classList.add("hidden");
    }
  });
})();
