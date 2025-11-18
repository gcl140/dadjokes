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
let isScrolling = false;
let scrollTimeout;
let currentAudio = null;

const scrollContainer = document.getElementById("scrollContainer");
const currentUser = document.body.dataset.username;
const currentUserId = document.body.dataset.id;

// On page load
const urlParams = new URLSearchParams(window.location.search);
const priorityJokeId = urlParams.get("priority");

if (priorityJokeId) {
  loadPriorityJoke(priorityJokeId).then(() => {
    loadJokes(); // load the rest normally
  });
} else {
  loadJokes();
}

async function loadPriorityJoke(jokeId) {
  const res = await fetch(`/api/joke/${jokeId}/`);
  const joke = await res.json();

  // Prepend this joke to contentItems so it shows first
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
    is_liked_by_user: joke.is_liked_by_user,
    id: joke.id,
  });

  // Track it in `seen` to avoid fetching again
  seen.add(joke.id);

  initializeContent();
}

async function loadJokes() {
  const exclude = [...seen].join(",");
  const res = await fetch(`/api/jokes/?size=30&exclude=${exclude}`);
  const data = await res.json();

  data.jokes.forEach((j) => seen.add(j.id));

  // Append new jokes
  contentItems.push(
    ...data.jokes.map((j) => ({
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
      is_liked_by_user: j.is_liked_by_user,
      userProfile: j.user_profile || "/static/images/default-profile.jpg",
      id: j.id,
    }))
  );

  initializeContent();
}

// Refresh every 3 mins
setInterval(loadJokes, 3 * 60 * 1000);

// Function to create a video item
function createVideoItem(item, index) {
  const videoItem = document.createElement("div");
  videoItem.className =
    "h-screen w-full flex items-center justify-center snap-start relative bg-gradient-to-b from-black/60 via-black/40 to-black/60 scroll-item";
  videoItem.style.backgroundColor = item.bgColor;
  videoItem.dataset.index = index;
  videoItem.dataset.bgMusicUrl = item.bgMusicURL || null;
  videoItem.dataset.jokeId = item.id;

  videoItem.innerHTML = `
        <div class="text-white text-center">
            <h2 class="text-2xl font-bold mb-4 p-8" 
                style="color: ${item.textColor}; font-family: ${
    item.fontType
  };">
                <span class="${
                  item.textColor.toLowerCase() !== "#ffffff"
                    ? "bg-white"
                    : "bg-black"
                } p-1" style="line-height: 2;">
                ${item.text}
              </span>
            </h2>
        </div>
        <div class="absolute right-4 bottom-24 flex flex-col items-center space-y-6">
            <div class="flex flex-col items-center z-50 like-btn" 
                 id="like-btn-${item.id}" 
                 data-id="${item.id}">
                <div class="rounded-full p-3 items-center flex bg-[${
                  item.textColor
                }] bg-opacity-30 cursor-pointer">
                  ${
                    !currentUser
                      ? `<a href="/accounts/login/">
                       <i class="fa fa-heart ${
                         item.is_liked_by_user ? "text-red-500" : "text-white"
                       }"></i>
                     </a>`
                      : `<i class="fa fa-heart ${
                          item.is_liked_by_user ? "text-red-500" : "text-white"
                        }"></i>`
                  }
                </div>
                <span class="text-[${item.bgColor}] likes-count 
                ${
                  item.textColor.toLowerCase() !== "#ffffff"
                    ? "bg-white"
                    : "bg-black"
                }  
                px-2 text-xs mt-1">
                    ${item.likes_count}
                </span>
            </div>

            <div id="comments-btn-${
              item.id
            }" class="flex flex-col items-center z-50 cursor-pointer comments-container">
                <div class="bg-[${
                  item.textColor
                }] bg-opacity-30 rounded-full p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" 
                        class="h-6 w-6 text-white" 
                        fill="none" viewBox="0 0 24 24" 
                        stroke="currentColor">
                        <path stroke-linecap="round" 
                              stroke-linejoin="round" 
                              stroke-width="2" 
                              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </div>
                <span class="text-[${item.bgColor}] 
                        ${
                          item.textColor.toLowerCase() !== "#ffffff"
                            ? "bg-white"
                            : "bg-black"
                        }  
                px-2 text-xs mt-1">0</span>
            </div>

            <div class="flex flex-col items-center share-btn z-50" data-id="${
              item.id
            }">
                <div class="bg-[${
                  item.textColor
                }] bg-opacity-30 rounded-full p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                </div>
                <span class="text-[${item.bgColor}] 
                ${
                  item.textColor.toLowerCase() !== "#ffffff"
                    ? "bg-white"
                    : "bg-black"
                }  
                px-2 text-xs mt-1">Share</span>
            </div>
        </div>
        <div class="absolute bottom-24 left-4">
            <div class="text-[${item.textColor}]">
                <h3 class="font-bold text-base ${
                  item.textColor.toLowerCase() !== "#ffffff"
                    ? "bg-white"
                    : "bg-black"
                } 
                hover:underline py-1 px-2 cursor-pointer" style="width: fit-content">
                    <a href="javascript:void(0);" 
                      onclick="window.location.href='/accounts/profile/${
                        item.userId
                      }'" 
                      style="text-decoration: none">
                        <img 
                            src="${item.userProfile}" 
                            alt="${
                              item.username
                            }'s avatar"                         
                            class="w-6 h-6 rounded-full object-cover border-2 border-white shadow-md inline-block mr-1"
                        />
                        @${item.username}
                    </a>
                </h3>
                <p class="text-sm ${
                  item.textColor.toLowerCase() !== "#ffffff"
                    ? "bg-white"
                    : "bg-black"
                } 
                py-1 px-2 mt-1" style="width: fit-content">${
                  item.description
                }</p>
                <div class="flex items-center mt-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
                    </svg>
                    <span class="text-xs truncate overflow-hidden text-ellipsis max-w-[200px] block 
                    ${
                      item.textColor.toLowerCase() !== "#ffffff"
                        ? "bg-white"
                        : "bg-black"
                    }">
                        ${item.bgMusicName}
                    </span>
                </div>
            </div>
        </div>
    `;

  // Select the comments container
  const commentsContainer = videoItem.querySelector(
    `#comments-btn-${item.id} span`
  );

  // Fetch comments and update the count
  fetchComments(item.id).then((comments) => {
    const commentCount = comments.length;
    commentsContainer.textContent = commentCount;
  });

  const share = videoItem.querySelector(".share-btn");
  share.onclick = () => shareJoke(item.id, item.textColor, item.bgColor);

  const likeBtn = videoItem.querySelector(".like-btn");

  // Reusable toggle-like function
  async function toggleLike(item, likeBtn, videoItem) {
    const csrftoken = getCookie("csrftoken");
    const res = await fetch(`/toggle-like/${item.id}/`, {
      method: "POST",
      headers: { "X-CSRFToken": csrftoken },
    });
    const data = await res.json();

    const heart = likeBtn.querySelector("i");

    // Update heart color
    heart.classList.toggle("text-red-500", data.is_liked);
    heart.classList.toggle("text-white", !data.is_liked);

    // Update likes count
    videoItem.querySelector(".likes-count").textContent = data.likes_count;
  }

  // Normal click on heart
  likeBtn.onclick = () => toggleLike(item, likeBtn, videoItem);

  // Double-tap anywhere on the video item
  videoItem.ondblclick = () => toggleLike(item, likeBtn, videoItem);

  return videoItem;
}

function initializeContent() {
  scrollContainer.innerHTML = ""; // clear old content if needed

  contentItems.forEach((item, i) => {
    const el = createVideoItem(item, i);
    scrollContainer.appendChild(el);
    observer.observe(el);
  });
}

// Improved scroll handling
function handleScroll() {
  if (isScrolling) return;

  isScrolling = true;
  clearTimeout(scrollTimeout);

  const scrollTop = scrollContainer.scrollTop;
  const windowHeight = window.innerHeight;
  const newIndex = Math.round(scrollTop / windowHeight);

  // Only update if index actually changed
  if (newIndex !== currentIndex) {
    currentIndex = newIndex;

    // Snap to the nearest item with improved behavior
    requestAnimationFrame(() => {
      scrollContainer.scrollTo({
        top: currentIndex * windowHeight,
        behavior: "smooth",
      });
    });

    // Load more content if we're near the end
    const totalItems = scrollContainer.children.length;
    if (currentIndex >= totalItems - 3) {
      loadMoreContent();
    }
  }

  scrollTimeout = setTimeout(() => {
    isScrolling = false;
  }, 150);
}

function loadMoreContent() {
  const lastItemIndex = parseInt(scrollContainer.lastChild.dataset.index);
  const currentTotal = contentItems.length;

  for (let i = 1; i <= 2; i++) {
    const newIndex = lastItemIndex + i;
    if (newIndex < currentTotal) {
      const item = contentItems[newIndex];
      const newElement = createVideoItem(item, newIndex);
      scrollContainer.appendChild(newElement);
      observer.observe(newElement);
    }
  }
}

// Improved scroll event listener with throttling
let scrollThrottleTimeout;
scrollContainer.addEventListener("scroll", () => {
  if (scrollThrottleTimeout) return;

  scrollThrottleTimeout = setTimeout(() => {
    handleScroll();
    scrollThrottleTimeout = null;
  }, 100);
});

// Improved touch handling
let touchStartY = 0;
let touchEndY = 0;

scrollContainer.addEventListener("touchstart", (e) => {
  touchStartY = e.changedTouches[0].screenY;
});

scrollContainer.addEventListener("touchend", (e) => {
  touchEndY = e.changedTouches[0].screenY;
  handleTouchSwipe();
});

function handleTouchSwipe() {
  const swipeThreshold = 50;
  const swipeDistance = touchStartY - touchEndY;

  if (Math.abs(swipeDistance) < swipeThreshold) return;

  const totalItems = scrollContainer.children.length;

  if (swipeDistance > swipeThreshold && currentIndex < totalItems - 1) {
    // Swipe up - next item
    currentIndex++;
  } else if (swipeDistance < -swipeThreshold && currentIndex > 0) {
    // Swipe down - previous item
    currentIndex--;
  }

  scrollContainer.scrollTo({
    top: currentIndex * window.innerHeight,
    behavior: "smooth",
  });
}

// Improved keyboard navigation
document.addEventListener("keydown", (e) => {
  if (isScrolling) return;

  const totalItems = scrollContainer.children.length;
  let newIndex = currentIndex;

  if (e.key === "ArrowDown" || e.key === "PageDown") {
    if (currentIndex < totalItems - 1) {
      newIndex = currentIndex + 1;
    }
  } else if (e.key === "ArrowUp" || e.key === "PageUp") {
    if (currentIndex > 0) {
      newIndex = currentIndex - 1;
    }
  } else {
    return;
  }

  if (newIndex !== currentIndex) {
    currentIndex = newIndex;
    isScrolling = true;

    scrollContainer.scrollTo({
      top: currentIndex * window.innerHeight,
      behavior: "smooth",
    });

    setTimeout(() => {
      isScrolling = false;
    }, 300);
  }
});

// Improved audio handling
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.intersectionRatio > 0.7) {
        const musicUrl = entry.target.dataset.bgMusicUrl;
        if (musicUrl) playJokeMusic(musicUrl);
      }
    });
  },
  {
    threshold: [0.7],
    rootMargin: "0px",
  }
);

function playJokeMusic(url) {
  if (!url) return;

  if (!currentAudio) {
    currentAudio = new Audio();
    currentAudio.loop = true;
    currentAudio.autoplay = true;
    currentAudio.muted = false;
  }

  if (currentAudio.src === url) return;

  currentAudio.src = url;
  currentAudio.play().catch((e) => {
    console.log("Autoplay blocked, waiting for user interaction");
    const playOnInteraction = () => {
      currentAudio.play();
      document.removeEventListener("click", playOnInteraction);
      document.removeEventListener("touchstart", playOnInteraction);
    };
    document.addEventListener("click", playOnInteraction, { once: true });
    document.addEventListener("touchstart", playOnInteraction, { once: true });
  });
}

// Improved scroll buttons
const scrollUpBtn = document.getElementById("scrollUp");
const scrollDownBtn = document.getElementById("scrollDown");

if (scrollUpBtn && scrollDownBtn) {
  scrollUpBtn.addEventListener("click", () => {
    if (isScrolling || currentIndex === 0) return;

    currentIndex--;
    isScrolling = true;

    scrollContainer.scrollTo({
      top: currentIndex * window.innerHeight,
      behavior: "smooth",
    });

    setTimeout(() => {
      isScrolling = false;
    }, 300);
  });

  scrollDownBtn.addEventListener("click", () => {
    const totalItems = scrollContainer.children.length;
    if (isScrolling || currentIndex >= totalItems - 1) return;

    currentIndex++;
    isScrolling = true;

    scrollContainer.scrollTo({
      top: currentIndex * window.innerHeight,
      behavior: "smooth",
    });

    setTimeout(() => {
      isScrolling = false;
    }, 300);
  });
}

// Share function
async function shareJoke(jokeId, textColor, bgColor) {
  const url = `${window.location.origin}/joke/${jokeId}`;

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

// Search functionality
const searchInput = document.getElementById("floatingSearch");
const suggestionsBox = document.getElementById("searchSuggestions");
let allItems = [];

async function fetchItems() {
  const res = await fetch("/api/jokes/");
  const data = await res.json();
  allItems = data.jokes;
}

fetchItems();

// Handle input
if (searchInput && suggestionsBox) {
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    suggestionsBox.innerHTML = "";

    if (!query) {
      suggestionsBox.classList.add("hidden");
      return;
    }

    const matches = allItems.filter((item) =>
      item.text.toLowerCase().includes(query)
    );

    if (matches.length === 0) {
      suggestionsBox.classList.add("hidden");
      return;
    }

    matches.forEach((item) => {
      const div = document.createElement("div");
      div.className =
        "px-4 py-2 hover:bg-gray-200 cursor-pointer text-gray-900 hover:bg-gray-400";
      div.textContent = item.text;
      div.onclick = () => {
        searchInput.value = item.text;
        suggestionsBox.classList.add("hidden");
        window.location.href = `/joke/${item.id}`;
      };
      suggestionsBox.appendChild(div);
    });

    suggestionsBox.classList.remove("hidden");
  });

  // Hide suggestions if clicked outside
  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
      suggestionsBox.classList.add("hidden");
    }
  });
}

// Comments functionality
const commentsModal = document.getElementById("comments-modal");
const commentsList = document.getElementById("comments-list");
const closeComments =
  document.getElementById("close-comments-full") ||
  document.getElementById("close-comments-top");
const commentInput = document.getElementById("comment-input");
const sendCommentBtn = document.getElementById("send-comment");

// Global click listener for comment buttons
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[id^='comments-btn-']");
  if (!btn) return;

  const jokeId = btn.id.replace("comments-btn-", "");
  openCommentsModal(jokeId);
});

async function fetchComments(jokeId) {
  const res = await fetch(`/fetch-comments/${jokeId}/`);
  const data = await res.json();
  return data.comments;
}

function openCommentsModal(jokeId) {
  if (!commentInput) return;

  commentInput.dataset.jokeId = jokeId;

  commentsList.innerHTML = `<div class="p-3 bg-gray-100 rounded-lg">Loading comments...</div>`;
  commentsModal.classList.remove("hidden");
  commentsModal.classList.add("flex");

  fetchComments(jokeId).then((comments) => {
    if (comments.length === 0) {
      commentsList.innerHTML = `<div class="p-3 text-gray-500">No comments yet.</div>`;
      return;
    }

    commentsList.innerHTML = comments
      .map(
        (c) => `
          <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 group">
            <div class="flex justify-between items-start mb-2">
              <div class="flex items-center gap-2">
                <span class="font-bold text-gray-900 text-sm bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                  @${c.user}
                </span>
                ${
                  c.user === currentUser
                    ? `<span class="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">You</span>`
                    : ""
                }
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-gray-500 font-medium">${
                  c.created_at
                }</span>
                ${
                  c.user === currentUser
                    ? `<button class="delete-btn opacity-0 group-hover:opacity-100 transition-all duration-200 
                          text-red-500 hover:text-red-700 hover:bg-red-50 
                          p-1.5 rounded-lg text-xs font-medium" 
                          data-id="${c.id}">
                      <i class="fas fa-trash mr-1"></i>
                  </button>`
                    : ""
                }
              </div>
            </div>
            <p class="text-gray-800 text-sm leading-relaxed pl-1">${c.text}</p>
          </div>
        `
      )
      .join("");

    attachDeleteEvents();
  });
}

if (closeComments) {
  closeComments.addEventListener("click", () => {
    commentsModal.classList.add("hidden");
    commentsModal.classList.remove("flex");
  });
}

if (commentsModal) {
  commentsModal.addEventListener("click", (e) => {
    if (e.target === commentsModal) {
      commentsModal.classList.add("hidden");
      commentsModal.classList.remove("flex");
    }
  });
}

if (sendCommentBtn && commentInput) {
  sendCommentBtn.addEventListener("click", async () => {
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

      commentsList.innerHTML =
        `<div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 group">
          <div class="flex justify-between items-start mb-2">
            <div class="flex items-center gap-2">
              <span class="font-bold bg-clip-text text-black">
                @${data.user}
              </span>
              ${
                data.user === currentUser
                  ? `<span class="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">You</span>`
                  : ""
              }
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 font-medium">${
                data.created_at
              }</span>
              ${
                data.user === currentUser
                  ? `<button class="delete-btn opacity-0 group-hover:opacity-100 transition-all duration-200 
                        text-red-500 hover:text-red-700 hover:bg-red-50 
                        p-1.5 rounded-lg text-xs font-medium" 
                        data-id="${data.id}">
                    <i class="fas fa-trash mr-1"></i>
                </button>`
                  : ""
              }
            </div>
          </div>
          <p class="text-gray-800 text-sm leading-relaxed pl-1">${data.text}</p>
        </div>` + commentsList.innerHTML;

      commentInput.value = "";
      commentInput.focus();

      fetchComments(jokeId).then((comments) => {
        const commentCount = comments.length;
        const commentsContainer = document.querySelector(
          `#comments-btn-${jokeId} span`
        );
        if (commentsContainer) commentsContainer.textContent = commentCount;
      });
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });
}

function attachDeleteEvents() {
  const deleteBtns = document.querySelectorAll(".delete-btn");
  deleteBtns.forEach((btn) => {
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
          const commentCard = btn.closest(
            ".bg-white.rounded-xl.p-4.border.shadow-sm"
          );
          if (commentCard) commentCard.remove();

          fetchComments(jokeId).then((comments) => {
            const commentCount = comments.length;
            const commentsContainer = document.querySelector(
              `#comments-btn-${jokeId} span`
            );
            if (commentsContainer) commentsContainer.textContent = commentCount;
          });
        } else {
          alert(data.error || "Failed to delete comment");
        }
      } catch (err) {
        console.error(err);
      }
    };
  });
}

// Initialize on load
document.addEventListener("DOMContentLoaded", function () {
  initializeContent();
});
