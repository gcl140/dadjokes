(function () {
  const currentUser = document.body.dataset.userName;
  if (!currentUser || currentUser === "None") return;

  const badge = document.getElementById("notification-badge");
  const notificationsList = document.getElementById("notifications-list");

  function updateBadge(count) {
    if (!badge) return;
    badge.textContent = count;
    badge.classList.toggle("hidden", !count);
  }

  function iconFor(type) {
    switch (type) {
      case "like":
        return { icon: "fa-heart", color: "text-accent-500" };
      case "comment":
        return { icon: "fa-comments", color: "text-ink-muted" };
      case "success":
        return { icon: "fa-check-circle", color: "text-success" };
      case "warning":
        return { icon: "fa-exclamation-triangle", color: "text-danger" };
      case "error":
        return { icon: "fa-times-circle", color: "text-danger" };
      default:
        return { icon: "fa-info-circle", color: "text-ink-muted" };
    }
  }

  // Shared with bobo.js's "Load more" pagination, so a notification looks
  // identical whether it arrived via websocket push or a fetched page.
  function buildNotificationCard(data) {
    const { icon, color } = iconFor(data.message_type);
    const unread = !data.is_read;

    const readStatus = data.is_read
      ? `<i class="fas fa-check-double text-ink-faint text-sm"></i>`
      : `<button onclick="markNotificationRead && markNotificationRead(${data.id})"
                id="read-btn-${data.id}"
                aria-label="Mark as read"
                class="text-accent-400 hover:text-accent-500 tap-scale">
          <i class="fas fa-circle text-[10px]" id="notification-item-${data.id}"></i>
        </button>`;

    return `
      <div class="group p-4 rounded-xl border-l-2 flex items-start gap-4 transition-colors
          ${unread ? "bg-accent-400/5 border-l-accent-400 animate-fade-up" : "bg-surface-2 border-l-transparent"}">
        <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-surface flex items-center justify-center border border-hairline">
          <i class="fas ${icon} ${color} text-sm"></i>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-ink font-medium leading-relaxed text-[15px]">${data.message}</p>
          <p class="text-ink-faint text-xs font-medium mt-1.5 flex items-center gap-1.5">
            <i class="fas fa-clock"></i>
            ${data.created_at}
          </p>
        </div>
        <div class="flex-shrink-0 pt-1">${readStatus}</div>
      </div>
    `;
  }
  window.buildNotificationCard = buildNotificationCard;

  function prependNotification(data) {
    if (!notificationsList) return;

    const emptyState = notificationsList.querySelector(".text-center.py-14");
    if (emptyState) emptyState.remove();

    notificationsList.insertAdjacentHTML(
      "afterbegin",
      buildNotificationCard({ ...data, is_read: false })
    );
  }

  function connect() {
    const scheme = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${scheme}://${window.location.host}/ws/notifications/`);

    socket.addEventListener("message", (event) => {
      const data = JSON.parse(event.data);
      updateBadge(data.unread_count);
      prependNotification(data);

      // Every background job (currently: song search) reports its result
      // through this same pipe, so any notification arriving means
      // whatever the top-right spinner was waiting on just finished.
      if (window.__ydBgJob) window.__ydBgJob.clear();

      if (window.Toastify) {
        var toastColors = {
          success: { background: "#16a34a", color: "#f0fdf4" },
          error: { background: "#dc2626", color: "#fef2f2" },
        };
        var style = toastColors[data.message_type] || { background: "#f2b134", color: "#1c1204" };

        Toastify({
          text: data.message,
          duration: 4000,
          gravity: "top",
          position: "right",
          close: true,
          style: style,
        }).showToast();
      }
    });

    // Reconnect on drop (e.g. server restart) instead of silently going stale.
    socket.addEventListener("close", () => {
      setTimeout(connect, 3000);
    });
  }

  connect();
})();
