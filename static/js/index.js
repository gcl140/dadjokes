function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.startsWith(name + "=")) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

let contentItems = [];
let seen = new Set();
let currentIndex = 0;
let isFetchingMore = false;
let currentAudio = null;

const scrollContainer = document.getElementById("scrollContainer");
const currentUser = document.body.dataset.username;
const currentUserId = document.body.dataset.id;

// On page load. `?priority=<id>` (from a shared link or search result) puts
// that joke first, then the normal randomized feed continues underneath it
// so the user can keep scrolling seamlessly no matter how they arrived.
const urlParams = new URLSearchParams(window.location.search);
const priorityJokeId = urlParams.get("priority");

if (priorityJokeId) {
  loadPriorityJoke(priorityJokeId).then(() => {
    loadJokes();
  });
} else {
  loadJokes();
}

async function loadPriorityJoke(jokeId) {
  const res = await fetch(`/api/joke/${jokeId}/`);
  if (!res.ok) return;
  const joke = await res.json();

  contentItems.unshift({
    bg: "",
    text: joke.text,
    bgColor: joke.bg_color,
    textColor: joke.text_color,
    fontType: joke.font_type,
    username: joke.username,
    userId: joke.user_id,
    userProfile: joke.user_profile || "/static/images/default-profile.jpg",
    bgMusicName: joke.bg_musicName,
    bgMusicURL: joke.bg_musicURL,
    description: joke.description || "",
    likes_count: joke.likes_count,
    comments_count: joke.comments_count,
    is_liked_by_user: joke.is_liked_by_user,
    id: joke.id,
  });

  seen.add(joke.id);
}

// Initial batch of jokes. Renders the whole feed fresh, so it's only ever
// used before the user has scrolled (first load / priority-joke boot).
async function loadJokes() {
  const exclude = [...seen].join(",");
  const res = await fetch(`/api/jokes/?size=20&exclude=${exclude}`);
  const data = await res.json();

  data.jokes.forEach((j) => seen.add(j.id));
  contentItems.push(...data.jokes.map(mapJoke));

  initializeContent();
}

// Pulls more random jokes from the server and appends only the new DOM
// nodes, so scroll position and everything already on screen is untouched.
// Once every joke has been seen this session, it loops back around for a
// genuinely endless, randomized feed instead of dead-ending.
async function fetchMoreJokes() {
  if (isFetchingMore) return;
  isFetchingMore = true;

  try {
    let exclude = [...seen].join(",");
    let res = await fetch(`/api/jokes/?size=12&exclude=${exclude}`);
    let data = await res.json();

    if (data.jokes.length === 0 && seen.size > 0) {
      // Exhausted the pool - reshuffle and keep the feed going.
      seen.clear();
      res = await fetch(`/api/jokes/?size=12`);
      data = await res.json();
    }

    if (data.jokes.length === 0) return;

    data.jokes.forEach((j) => seen.add(j.id));

    const startIndex = contentItems.length;
    const newItems = data.jokes.map(mapJoke);
    contentItems.push(...newItems);

    newItems.forEach((item, i) => {
      const el = createVideoItem(item, startIndex + i);
      scrollContainer.appendChild(el);
      feedObserver.observe(el);
    });
  } finally {
    isFetchingMore = false;
  }
}

function mapJoke(j) {
  return {
    bg: "",
    text: j.text,
    bgColor: j.bg_color,
    textColor: j.text_color,
    fontType: j.font_type,
    username: j.username,
    userId: j.user_id,
    bgMusicName: j.bg_musicName,
    bgMusicURL: j.bg_musicURL,
    description: j.description || "",
    likes_count: j.likes_count,
    comments_count: j.comments_count,
    is_liked_by_user: j.is_liked_by_user,
    userProfile: j.user_profile || "/static/images/default-profile.jpg",
    id: j.id,
  };
}

function createVideoItem(item, index) {
  const videoItem = document.createElement("div");
  videoItem.className =
    "h-screen w-full flex items-center justify-center snap-start relative bg-gradient-to-b from-black/50 via-transparent to-black/60 scroll-item";
  videoItem.style.backgroundColor = item.bgColor;
  videoItem.dataset.index = index;
  videoItem.dataset.bgMusicUrl = item.bgMusicURL || "";
  videoItem.dataset.jokeId = item.id;

  // Caption/username/song plates follow the site's own light/dark theme
  // (not the joke's arbitrary background color) - canvas-raised/ink flip
  // polarity together, so it's a black plate with white text in dark mode
  // and a white plate with black text in light mode.
  const plateClass = "bg-canvas-raised/95 text-ink";

  // Seeded/placeholder jokes carry filler values ("Description for joke 12",
  // the "Original Sound" fallback) that aren't worth showing as if they were
  // real content the author wrote.
  const description = (item.description || "").trim();
  const showDescription = description && !/^description for joke\s*\d+$/i.test(description);
  const musicName = (item.bgMusicName || "").trim();
  const showMusic = musicName && musicName.toLowerCase() !== "original sound";

  videoItem.innerHTML = `
        <div class="text-center px-6 max-w-lg">
            <h2 class="text-2xl font-bold leading-snug"
                style="color: ${item.textColor}; font-family: ${item.fontType};">
                <span class="info-plate ${plateClass} px-4 py-3 shadow-lg" style="line-height: 1.5; border-radius: 20px;">
                ${item.text}
              </span>
            </h2>
        </div>
        <div class="absolute right-4 bottom-28 flex flex-col items-center space-y-5">
            <div class="flex flex-col items-center like-btn"
                 id="like-btn-${item.id}"
                 data-id="${item.id}">
                <div class="rail-btn cursor-pointer">
                  ${
                    !currentUser || currentUser === "None"
                      ? `<a href="/accounts/login/" class="flex items-center justify-center w-full h-full">
                       <i class="fa fa-heart ${
                         item.is_liked_by_user ? "text-red-500" : "text-ink"
                       }"></i>
                     </a>`
                      : `<i class="fa fa-heart ${
                          item.is_liked_by_user ? "text-red-500" : "text-ink"
                        }"></i>`
                  }
                </div>
                <span class="rail-count likes-count">${item.likes_count}</span>
            </div>

            <div id="comments-btn-${item.id}" class="flex flex-col items-center cursor-pointer comments-container">
                <div class="rail-btn">
                    <svg xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5 text-ink"
                        fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </div>
                <span class="rail-count comments-count">${item.comments_count}</span>
            </div>

            <div class="flex flex-col items-center share-btn" data-id="${item.id}">
                <div class="rail-btn cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                </div>
                <span class="rail-count">Share</span>
            </div>
        </div>
        <div class="absolute bottom-28 left-4 right-20 flex flex-col items-start gap-2">
                <h3 class="flex w-fit items-center gap-2 info-plate ${plateClass} hover:opacity-90 transition-opacity cursor-pointer">
                    <a href="/accounts/profile/${item.userId}" class="flex items-center gap-2 no-underline">
                        <img
                            src="${item.userProfile}"
                            alt="${item.username}'s avatar"
                            onerror="this.onerror=null; this.src='/static/images/default-profile.jpg';"
                            class="w-6 h-6 rounded-full object-cover border border-white/40"
                        />
                        <span class="font-bold text-sm">@${item.username}</span>
                    </a>
                </h3>
                ${
                  showDescription
                    ? `<p class="block w-fit info-plate ${plateClass} text-sm">${description}</p>`
                    : ""
                }
                ${
                  showMusic
                    ? `<div class="info-plate ${plateClass} text-xs flex w-fit items-center gap-1.5 max-w-[220px]">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
                    </svg>
                    <span class="truncate">${musicName}</span>
                </div>`
                    : ""
                }
        </div>
    `;

  videoItem.querySelector(".share-btn").onclick = () =>
    shareJoke(item.id, item.textColor, item.bgColor);

  const likeBtn = videoItem.querySelector(".like-btn");

  async function toggleLike() {
    const csrftoken = getCookie("csrftoken");
    const res = await fetch(`/toggle-like/${item.id}/`, {
      method: "POST",
      headers: { "X-CSRFToken": csrftoken },
    });
    const data = await res.json();

    const heart = likeBtn.querySelector("i");
    heart.classList.toggle("text-red-500", data.liked);
    heart.classList.toggle("text-ink", !data.liked);
    videoItem.querySelector(".likes-count").textContent = data.likes_count;
  }

  likeBtn.onclick = toggleLike;
  videoItem.ondblclick = toggleLike;

  return videoItem;
}

function initializeContent() {
  scrollContainer.innerHTML = "";

  contentItems.forEach((item, i) => {
    const el = createVideoItem(item, i);
    scrollContainer.appendChild(el);
    feedObserver.observe(el);
  });
}

// A single IntersectionObserver drives everything that used to require
// manual scroll-position math: which item is "current" (for keyboard/button
// nav), background music, and when to fetch more jokes. The browser's native
// CSS scroll-snap handles the actual swipe/scroll motion, so there's no JS
// fighting momentum scrolling - the feed just scrolls seamlessly.
const feedObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.6) return;

      currentIndex = parseInt(entry.target.dataset.index, 10);

      const musicUrl = entry.target.dataset.bgMusicUrl;
      if (musicUrl) playJokeMusic(musicUrl);

      if (contentItems.length - 1 - currentIndex <= 4) {
        fetchMoreJokes();
      }
    });
  },
  { threshold: [0.6] }
);

function playJokeMusic(url) {
  if (!url) return;

  if (!currentAudio) {
    currentAudio = new Audio();
    currentAudio.loop = true;
  }

  if (currentAudio.src === url) return;

  currentAudio.src = url;
  currentAudio.play().catch(() => {
    const playOnInteraction = () => {
      currentAudio.play();
      document.removeEventListener("click", playOnInteraction);
      document.removeEventListener("touchstart", playOnInteraction);
    };
    document.addEventListener("click", playOnInteraction, { once: true });
    document.addEventListener("touchstart", playOnInteraction, { once: true });
  });
}

// Scroll/keyboard navigation - native smooth-scroll to the target item,
// letting CSS scroll-snap settle it into place.
function scrollToIndex(index) {
  const target = scrollContainer.querySelector(`[data-index="${index}"]`);
  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown" || e.key === "PageDown") {
    scrollToIndex(currentIndex + 1);
  } else if (e.key === "ArrowUp" || e.key === "PageUp") {
    scrollToIndex(Math.max(0, currentIndex - 1));
  }
});

const scrollUpBtn = document.getElementById("scrollUp");
const scrollDownBtn = document.getElementById("scrollDown");

if (scrollUpBtn && scrollDownBtn) {
  scrollUpBtn.addEventListener("click", () => scrollToIndex(Math.max(0, currentIndex - 1)));
  scrollDownBtn.addEventListener("click", () => scrollToIndex(currentIndex + 1));
}

// Share function - always points back at the scrollable feed (with this
// joke pinned first via ?priority=), so anyone opening a shared link can
// keep scrolling to other jokes immediately instead of landing on a dead end.
async function shareJoke(jokeId, textColor, bgColor) {
  const url = `${window.location.origin}/?priority=${jokeId}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Check out this joke",
        text: "Look what I found!",
        url: url,
      });
    } catch (err) {
      console.log("Share cancelled or failed:", err);
    }
  } else {
    await navigator.clipboard.writeText(url);

    Toastify({
      text: "Link copied!",
      duration: 3000,
      gravity: "top",
      position: "right",
      close: true,
      style: {
        background: bgColor || "#10b981",
        color: textColor || "#ffffff",
      },
    }).showToast();
  }
}

// Search functionality lives in static/js/search.js, loaded globally from
// base.html so it works on every page, not just this one.

// Comments functionality
const commentsModal = document.getElementById("comments-modal");
const commentsSheet = document.getElementById("comments-sheet");
const commentsList = document.getElementById("comments-list");
const commentsPagination = document.getElementById("comments-pagination");
const closeComments =
  document.getElementById("close-comments-full") ||
  document.getElementById("close-comments-top");
const commentInput = document.getElementById("comment-input");
const sendCommentBtn = document.getElementById("send-comment");

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[id^='comments-btn-']");
  if (!btn) return;

  const jokeId = btn.id.replace("comments-btn-", "");
  openCommentsModal(jokeId);
});

async function fetchComments(jokeId, page) {
  const url = page
    ? `/fetch-comments/${jokeId}/?page=${page}`
    : `/fetch-comments/${jokeId}/`;
  const res = await fetch(url);
  return res.json();
}

function commentCard(c) {
  return `
    <div class="bg-surface-2 rounded-xl px-3 py-2 border border-hairline group">
      <div class="flex justify-between items-baseline gap-2">
        <div class="flex items-baseline gap-1.5 min-w-0">
          <span class="font-bold text-ink text-sm truncate">@${c.user}</span>
          ${
            c.user === currentUser
              ? `<span class="px-1.5 py-0.5 bg-accent-400/20 text-accent-600 text-[10px] leading-none rounded-full font-medium flex-shrink-0">You</span>`
              : ""
          }
        </div>
        <div class="flex items-center gap-1.5 flex-shrink-0">
          <span class="text-[11px] text-ink-faint font-medium">${c.created_at}</span>
          ${
            c.user === currentUser
              ? `<button class="delete-btn tap-scale
                    text-danger hover:bg-danger/10
                    p-1 rounded-md text-xs font-medium"
                    aria-label="Delete comment"
                    data-id="${c.id}">
                <i class="fas fa-trash"></i>
            </button>`
              : ""
          }
        </div>
      </div>
      <p class="text-ink-muted text-sm leading-snug">${c.text}</p>
    </div>
  `;
}

function paginationControls(data) {
  if (!commentsPagination) return;

  if (data.num_pages <= 1) {
    commentsPagination.innerHTML = "";
    return;
  }

  commentsPagination.innerHTML = `
    <div class="flex items-center justify-between px-6 py-3 border-t border-hairline">
      <button class="comments-prev-page tap-scale flex items-center gap-1.5 text-sm font-medium ${
        data.has_previous ? "text-ink hover:text-accent-500" : "text-ink-faint cursor-not-allowed"
      }" ${data.has_previous ? "" : "disabled"}>
        <i class="fas fa-chevron-left text-xs"></i> Previous
      </button>
      <span class="text-xs font-medium text-ink-faint">Page ${data.page} of ${data.num_pages}</span>
      <button class="comments-next-page tap-scale flex items-center gap-1.5 text-sm font-medium ${
        data.has_next ? "text-ink hover:text-accent-500" : "text-ink-faint cursor-not-allowed"
      }" ${data.has_next ? "" : "disabled"}>
        Next <i class="fas fa-chevron-right text-xs"></i>
      </button>
    </div>
  `;

  const prevBtn = commentsPagination.querySelector(".comments-prev-page");
  const nextBtn = commentsPagination.querySelector(".comments-next-page");
  if (prevBtn && data.has_previous) {
    prevBtn.onclick = () => loadCommentsPage(commentInput.dataset.jokeId, data.page - 1);
  }
  if (nextBtn && data.has_next) {
    nextBtn.onclick = () => loadCommentsPage(commentInput.dataset.jokeId, data.page + 1);
  }
}

let currentCommentsPage = 1;

function loadCommentsPage(jokeId, page) {
  currentCommentsPage = page;
  commentsList.innerHTML = `<div class="p-3 text-ink-muted text-sm">Loading comments...</div>`;
  commentsList.scrollTop = 0;

  return fetchComments(jokeId, page).then((data) => {
    if (data.comments.length === 0) {
      commentsList.innerHTML = `<div class="p-3 text-ink-faint text-sm">No comments yet. Say something!</div>`;
    } else {
      commentsList.innerHTML = data.comments.map(commentCard).join("");
      attachDeleteEvents();
    }
    paginationControls(data);

    const badge = document.querySelector(`#comments-btn-${jokeId} span`);
    if (badge) badge.textContent = data.total_count;

    return data;
  });
}

function openCommentsModal(jokeId) {
  if (!commentInput) return;

  commentInput.dataset.jokeId = jokeId;

  commentsModal.classList.remove("hidden");
  commentsModal.classList.add("flex");

  // Slide the sheet in on the next frame (mobile only - sm: overrides the
  // translate on desktop, so this is a no-op there, which is correct).
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      commentsSheet.classList.remove("translate-y-full");
    });
  });

  loadCommentsPage(jokeId, 1);
}

function closeCommentsModal() {
  commentsSheet.classList.add("translate-y-full");

  const finish = () => {
    commentsModal.classList.add("hidden");
    commentsModal.classList.remove("flex");
    commentsSheet.removeEventListener("transitionend", finish);
  };
  commentsSheet.addEventListener("transitionend", finish);
  // Fallback: on desktop the transform never actually changes (sm:translate-y-0
  // overrides it), so transitionend won't fire - close after the same duration anyway.
  setTimeout(finish, 320);
}

if (closeComments) {
  closeComments.addEventListener("click", closeCommentsModal);
}

if (commentsModal) {
  commentsModal.addEventListener("click", (e) => {
    if (e.target === commentsModal) closeCommentsModal();
  });
}

if (sendCommentBtn && commentInput) {
  async function sendComment() {
    const text = commentInput.value.trim();
    if (!text) return;

    const jokeId = commentInput.dataset.jokeId;
    const csrftoken = getCookie("csrftoken");

    try {
      const res = await fetch(`/post-comment/${jokeId}/`, {
        method: "POST",
        headers: {
          "X-CSRFToken": csrftoken,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ comment_text: text }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post comment");

      commentInput.value = "";
      commentInput.focus();

      // A new comment always lands on page 1 (most recent first).
      loadCommentsPage(jokeId, 1);

      // Keep the feed card's own badge in sync without a re-fetch.
      const railCount = document.querySelector(`#comments-btn-${jokeId} .comments-count`);
      if (railCount) railCount.textContent = String((parseInt(railCount.textContent, 10) || 0) + 1);
    } catch (err) {
      console.error(err);
      Toastify({
        text: err.message,
        duration: 3000,
        gravity: "top",
        position: "right",
        style: { background: "#f0553f", color: "#fff" },
      }).showToast();
    }
  }

  sendCommentBtn.addEventListener("click", sendComment);
  commentInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendComment();
    }
  });
}

function attachDeleteEvents() {
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.onclick = async () => {
      const commentId = btn.dataset.id;
      const jokeId = commentInput.dataset.jokeId;
      const csrftoken = getCookie("csrftoken");

      try {
        const res = await fetch(`/delete-comment/${commentId}/`, {
          method: "POST",
          headers: { "X-CSRFToken": csrftoken },
        });
        const data = await res.json();

        if (res.ok) {
          loadCommentsPage(jokeId, currentCommentsPage);
        } else {
          alert(data.error || "Failed to delete comment");
        }
      } catch (err) {
        console.error(err);
      }
    };
  });
}
