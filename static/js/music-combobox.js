// Async search combobox for a Background Music field - queries
// /api/music-search/ instead of shipping every JokeMusic row as <option>
// tags, so it scales as the song library grows. Shared by the create-joke
// form (content/templates/content/joke.html) and the profile edit-post
// modal (content/templates/partial/post_modal.html), which each mount
// their own instance against a different set of element ids.
function initMusicCombobox(opts) {
  var searchInput = document.getElementById(opts.searchInputId);
  var hiddenInput = document.getElementById(opts.hiddenInputId);
  var dropdown = document.getElementById(opts.dropdownId);
  var clearBtn = document.getElementById(opts.clearBtnId);
  if (!searchInput || !hiddenInput || !dropdown) return null;

  var searchUrl = opts.searchUrl;
  var debounceTimer = null;
  var results = [];
  var highlightedIndex = -1;
  var hasMore = false;
  var loadingMore = false;

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderResults() {
    if (!results.length) {
      dropdown.innerHTML = '<div class="p-3 text-sm text-ink-faint">No songs found.</div>';
      dropdown.classList.remove("hidden");
      return;
    }
    var html = results
      .map(function (song, i) {
        return (
          '<button type="button" data-index="' + i + '" title="' + escapeHtml(song.name) + '" ' +
          'class="bg-music-option block w-full truncate text-left px-3 py-2 text-sm text-ink hover:bg-surface-2 transition-colors' +
          (i === highlightedIndex ? " bg-surface-2" : "") + '">' +
          escapeHtml(song.name) + "</button>"
        );
      })
      .join("");

    // Only shown once there's an actual query - the empty/focus state is
    // a small random sample, not something worth paging through.
    if (hasMore) {
      html +=
        '<button type="button" class="bg-music-load-more w-full text-center px-3 py-2 text-sm font-medium text-accent-400 hover:bg-surface-2 transition-colors border-t border-hairline">' +
        (loadingMore ? "Loading…" : "Load more…") + "</button>";
    }

    dropdown.innerHTML = html;
    dropdown.classList.remove("hidden");
  }

  function closeDropdown() {
    dropdown.classList.add("hidden");
    highlightedIndex = -1;
  }

  function selectSong(song) {
    hiddenInput.value = song.id;
    searchInput.value = song.name;
    if (clearBtn) clearBtn.classList.remove("hidden");
    closeDropdown();
  }

  function clearSelection() {
    hiddenInput.value = "";
    searchInput.value = "";
    if (clearBtn) clearBtn.classList.add("hidden");
    searchInput.focus();
  }

  function fetchResults(query, append) {
    var url = searchUrl + "?q=" + encodeURIComponent(query);
    if (append) {
      url += "&offset=" + results.length;
      loadingMore = true;
      renderResults();
    }

    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        results = append ? results.concat(data.results || []) : data.results || [];
        hasMore = !!data.has_more;
        loadingMore = false;
        if (!append) highlightedIndex = -1;
        renderResults();
      })
      .catch(function () { loadingMore = false; });
  }

  searchInput.addEventListener("input", function () {
    // Typing invalidates whatever was previously selected until a fresh
    // pick is made, so the hidden id never drifts from the visible text.
    hiddenInput.value = "";
    if (clearBtn) clearBtn.classList.add("hidden");

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      fetchResults(searchInput.value.trim(), false);
    }, 250);
  });

  searchInput.addEventListener("focus", function () {
    if (!searchInput.value.trim()) fetchResults("", false);
    else if (results.length) renderResults();
  });

  dropdown.addEventListener("click", function (e) {
    if (e.target.closest(".bg-music-load-more")) {
      if (!loadingMore) fetchResults(searchInput.value.trim(), true);
      return;
    }
    var btn = e.target.closest(".bg-music-option");
    if (!btn) return;
    var song = results[parseInt(btn.dataset.index, 10)];
    if (song) selectSong(song);
  });

  if (clearBtn) clearBtn.addEventListener("click", clearSelection);

  searchInput.addEventListener("keydown", function (e) {
    if (dropdown.classList.contains("hidden")) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      highlightedIndex = Math.min(highlightedIndex + 1, results.length - 1);
      renderResults();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      highlightedIndex = Math.max(highlightedIndex - 1, 0);
      renderResults();
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && results[highlightedIndex]) {
        e.preventDefault();
        selectSong(results[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      closeDropdown();
    }
  });

  document.addEventListener("click", function (e) {
    if (!e.target.closest("#" + opts.searchInputId) && !e.target.closest("#" + opts.dropdownId)) {
      closeDropdown();
    }
  });

  // Exposed so the host page can pre-fill an existing selection (e.g. the
  // edit modal loading a post that already has background music set).
  return {
    setSelection: function (id, name) {
      if (id) {
        hiddenInput.value = id;
        searchInput.value = name || "";
        if (clearBtn) clearBtn.classList.remove("hidden");
      } else {
        hiddenInput.value = "";
        searchInput.value = "";
        if (clearBtn) clearBtn.classList.add("hidden");
      }
    },
  };
}

window.initMusicCombobox = initMusicCombobox;
