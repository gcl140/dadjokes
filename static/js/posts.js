(function () {
  function getCookie(name) {
    const match = document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(name + "="));
    return match ? decodeURIComponent(match.split("=")[1]) : null;
  }
  const csrftoken = getCookie("csrftoken");

  const postsList = document.getElementById("posts-list");
  const modal = document.getElementById("post-modal");
  if (!postsList || !modal) return;

  const canEdit = postsList.dataset.canEdit === "true";

  const viewMode = document.getElementById("post-view-mode");
  const editForm = document.getElementById("post-edit-form");
  const previewPlate = document.getElementById("post-preview-plate");
  const previewDescription = document.getElementById("post-preview-description");
  const previewLikes = document.getElementById("post-preview-likes");
  const previewComments = document.getElementById("post-preview-comments");
  const viewLink = document.getElementById("post-view-link");
  const editBtn = document.getElementById("post-edit-btn");
  const deleteBtn = document.getElementById("post-delete-btn");
  const cancelEditBtn = document.getElementById("post-cancel-edit-btn");
  const closeBtn = document.getElementById("post-modal-close");

  const editContent = document.getElementById("edit-content");
  const editDescription = document.getElementById("edit-description");
  const editBgColor = document.getElementById("edit-bg-color");
  const editTextColor = document.getElementById("edit-text-color");
  const editFontType = document.getElementById("edit-font-type");
  const editBgMusicId = document.getElementById("edit-bg-music-id");

  const musicCombobox = window.initMusicCombobox
    ? window.initMusicCombobox({
        searchInputId: "edit-bg-music-search",
        hiddenInputId: "edit-bg-music-id",
        dropdownId: "edit-bg-music-dropdown",
        clearBtnId: "edit-bg-music-clear",
        searchUrl: "/api/music-search/",
      })
    : null;

  // Only the profile owner can edit/delete their own posts.
  if (editBtn) editBtn.classList.toggle("hidden", !canEdit);
  if (deleteBtn) deleteBtn.classList.toggle("hidden", !canEdit);

  let currentJokeId = null;
  let currentRow = null;

  function openModal() {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  function closeModal() {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    showViewMode();
  }

  function showViewMode() {
    viewMode.classList.remove("hidden");
    editForm.classList.add("hidden");
  }

  function showEditMode() {
    viewMode.classList.add("hidden");
    editForm.classList.remove("hidden");
  }

  function renderPreview(data) {
    previewPlate.style.backgroundColor = data.bgColor;
    previewPlate.style.color = data.textColor;
    previewPlate.style.fontFamily = data.fontType;
    previewPlate.textContent = data.content;

    previewDescription.textContent = data.description || "";
    previewDescription.classList.toggle("hidden", !data.description);

    previewLikes.textContent = data.likes;
    previewComments.textContent = data.comments;
    viewLink.href = `/?priority=${data.id}`;
  }

  function openPost(row) {
    currentRow = row;
    currentJokeId = row.dataset.id;
    renderPreview({
      id: row.dataset.id,
      content: row.dataset.content,
      description: row.dataset.description,
      bgColor: row.dataset.bgColor,
      textColor: row.dataset.textColor,
      fontType: row.dataset.fontType,
      likes: row.dataset.likes,
      comments: row.dataset.comments,
    });
    showViewMode();
    openModal();
  }

  postsList.addEventListener("click", (e) => {
    const row = e.target.closest(".post-row");
    if (row) openPost(row);
  });

  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  if (editBtn) {
    editBtn.addEventListener("click", () => {
      editContent.value = currentRow.dataset.content;
      editDescription.value = currentRow.dataset.description;
      editBgColor.value = currentRow.dataset.bgColor;
      editTextColor.value = currentRow.dataset.textColor;
      editFontType.value = currentRow.dataset.fontType;
      if (musicCombobox) {
        musicCombobox.setSelection(currentRow.dataset.bgMusicId, currentRow.dataset.bgMusicName);
      }
      showEditMode();
    });
  }

  if (cancelEditBtn) cancelEditBtn.addEventListener("click", showViewMode);

  function toast(text, ok) {
    if (!window.Toastify) return;
    Toastify({
      text,
      duration: ok ? 2500 : 3500,
      gravity: "top",
      position: "right",
      close: true,
      style: ok
        ? { background: "#f2b134", color: "#1c1204" }
        : { background: "#f0553f", color: "#fff" },
    }).showToast();
  }

  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = editForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      try {
        const res = await fetch(`/edit-joke/${currentJokeId}/`, {
          method: "POST",
          headers: {
            "X-CSRFToken": csrftoken,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            content: editContent.value,
            description: editDescription.value,
            bg_color: editBgColor.value,
            text_color: editTextColor.value,
            font_type: editFontType.value,
            bg_music: editBgMusicId.value,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to save changes");

        currentRow.dataset.content = data.content;
        currentRow.dataset.description = data.description;
        currentRow.dataset.bgColor = data.bg_color;
        currentRow.dataset.textColor = data.text_color;
        currentRow.dataset.fontType = data.font_type;
        currentRow.dataset.bgMusicId = data.bg_music_id || "";
        currentRow.dataset.bgMusicName = data.bg_music_name || "";
        currentRow.querySelector(".post-row-text").textContent = data.content;
        const swatch = currentRow.querySelector(".post-row-swatch");
        swatch.style.backgroundColor = data.bg_color;
        swatch.style.color = data.text_color;

        renderPreview({
          id: data.id,
          content: data.content,
          description: data.description,
          bgColor: data.bg_color,
          textColor: data.text_color,
          fontType: data.font_type,
          likes: data.likes_count,
          comments: data.comments_count,
        });
        showViewMode();
        toast("Post updated", true);
      } catch (err) {
        toast(err.message, false);
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      if (!confirm("Delete this post? This can't be undone.")) return;

      try {
        const res = await fetch(`/delete-joke/${currentJokeId}/`, {
          method: "DELETE",
          headers: { "X-CSRFToken": csrftoken },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to delete post");

        currentRow.remove();
        closeModal();
        toast("Post deleted", true);
      } catch (err) {
        toast(err.message, false);
      }
    });
  }

  // Async "load more" pagination.
  function buildPostRow(j) {
    const row = document.createElement("div");
    row.className =
      "post-row bg-surface rounded-xl overflow-hidden border border-hairline flex items-center p-3 hover:border-hairline-strong transition cursor-pointer";
    row.dataset.id = j.id;
    row.dataset.content = j.content;
    row.dataset.description = j.description || "";
    row.dataset.bgColor = j.bg_color;
    row.dataset.textColor = j.text_color;
    row.dataset.fontType = j.font_type;
    row.dataset.bgMusicId = j.bg_music_id || "";
    row.dataset.bgMusicName = j.bg_music_name || "";
    row.dataset.likes = j.likes_count;
    row.dataset.comments = j.comments_count;
    row.innerHTML = `
      <div class="post-row-swatch w-10 h-10 rounded-lg flex-shrink-0 mr-3 flex items-center justify-center text-xs font-bold" style="background-color: ${j.bg_color}; color: ${j.text_color};">Aa</div>
      <div class="flex-1 min-w-0 text-left">
        <p class="post-row-text text-sm text-ink truncate">${j.content}</p>
        <p class="text-xs text-ink-faint mt-0.5"><i class="fas fa-heart mr-1"></i>${j.likes_count} <i class="fas fa-comment ml-2 mr-1"></i>${j.comments_count}</p>
      </div>
      <i class="fas fa-chevron-right text-ink-faint ml-2 flex-shrink-0"></i>
    `;
    return row;
  }

  const loadMoreBtn = document.getElementById("load-more-posts");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", async () => {
      const userId = postsList.dataset.userId;
      const nextPage = parseInt(postsList.dataset.page, 10) + 1;
      loadMoreBtn.disabled = true;
      loadMoreBtn.querySelector("span").textContent = "Loading...";

      try {
        const res = await fetch(`/api/user-jokes/${userId}/?page=${nextPage}`);
        const data = await res.json();
        data.jokes.forEach((j) => postsList.appendChild(buildPostRow(j)));
        postsList.dataset.page = data.page;

        if (!data.has_next) {
          loadMoreBtn.parentElement.removeChild(loadMoreBtn);
        } else {
          loadMoreBtn.disabled = false;
          loadMoreBtn.querySelector("span").textContent = "Load more";
        }
      } catch (err) {
        console.error(err);
        loadMoreBtn.disabled = false;
        loadMoreBtn.querySelector("span").textContent = "Load more";
      }
    });
  }
})();
