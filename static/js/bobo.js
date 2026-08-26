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
const csrftoken = getCookie("csrftoken");

// Flip one notification card + its "unread" dot button into the read
// (double-tick) state. Shared by the single mark-read click and "mark all".
function markCardRead(card) {
  if (!card) return;
  const btn = card.querySelector("[id^='read-btn-']");
  if (btn) {
    btn.outerHTML = '<i class="fas fa-check-double text-ink-faint text-sm"></i>';
  }
  card.classList.remove("bg-accent-400/5", "border-l-accent-400", "animate-fade-up");
  card.classList.add("bg-surface-2", "border-l-transparent");
}

export async function markNotificationRead(notificationId) {
  const response = await fetch(`/mark-notification-read/${notificationId}/`, {
    method: "POST",
    headers: {
      "X-CSRFToken": csrftoken,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    console.error("Failed to update notification.");
    return;
  }

  const btn = document.getElementById(`read-btn-${notificationId}`);
  if (btn) markCardRead(btn.closest(".group"));

  const badge = document.getElementById("notification-badge");
  if (badge) {
    const remaining = Math.max(0, parseInt(badge.textContent, 10) - 1);
    badge.textContent = remaining;
    badge.classList.toggle("hidden", remaining === 0);
  }

  const newBadge = document.querySelector("#bobo-new-badge");
  if (newBadge) {
    const remaining = Math.max(0, parseInt(newBadge.dataset.count, 10) - 1);
    newBadge.dataset.count = remaining;
    if (remaining === 0) {
      newBadge.remove();
    } else {
      newBadge.textContent = `${remaining} new`;
    }
  }

  return response.json();
}

window.markNotificationRead = markNotificationRead;

document.addEventListener("DOMContentLoaded", () => {
  // "Mark all as read" - one request, then flip every unread card to
  // double-ticks client-side once the server confirms it's done.
  const markAllBtn = document.getElementById("mark-all-read-btn");
  const notificationsList = document.getElementById("notifications-list");

  if (markAllBtn && notificationsList) {
    markAllBtn.addEventListener("click", async () => {
      markAllBtn.disabled = true;
      const label = markAllBtn.querySelector("span");
      const originalLabel = label.textContent;
      label.textContent = "Marking...";

      try {
        const res = await fetch("/mark-all-notifications-read/", {
          method: "POST",
          headers: { "X-CSRFToken": csrftoken },
        });
        if (!res.ok) throw new Error("Failed to mark all as read");

        notificationsList.querySelectorAll(".group").forEach(markCardRead);

        const badge = document.getElementById("notification-badge");
        if (badge) {
          badge.textContent = "0";
          badge.classList.add("hidden");
        }
        document.querySelector("#bobo-new-badge")?.remove();
        markAllBtn.closest("div").remove();

        if (window.Toastify) {
          Toastify({
            text: "All caught up",
            duration: 2500,
            gravity: "top",
            position: "right",
            style: { background: "#f2b134", color: "#1c1204" },
          }).showToast();
        }
      } catch (err) {
        console.error(err);
        markAllBtn.disabled = false;
        label.textContent = originalLabel;
        if (window.Toastify) {
          Toastify({
            text: "Couldn't mark everything as read - try again",
            duration: 3500,
            gravity: "top",
            position: "right",
            style: { background: "#f0553f", color: "#fff" },
          }).showToast();
        }
      }
    });
  }

  // Async "load more" pagination for the notifications list.
  const loadMoreBtn = document.getElementById("load-more-notifications");
  const container = loadMoreBtn ? loadMoreBtn.closest("[data-page]") : null;

  if (!loadMoreBtn || !container || !notificationsList) return;

  loadMoreBtn.addEventListener("click", async () => {
    const nextPage = parseInt(container.dataset.page, 10) + 1;
    loadMoreBtn.disabled = true;
    loadMoreBtn.querySelector("span").textContent = "Loading...";

    try {
      const res = await fetch(`/api/notifications/?page=${nextPage}`);
      const data = await res.json();

      data.notifications.forEach((note) => {
        notificationsList.insertAdjacentHTML(
          "beforeend",
          window.buildNotificationCard(note)
        );
      });

      container.dataset.page = data.page;

      if (!data.has_next) {
        loadMoreBtn.parentElement.remove();
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
});
