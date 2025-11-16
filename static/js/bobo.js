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

  const item = document.getElementById(`notification-item-${notificationId}`);
  const btn = document.getElementById(`read-btn-${notificationId}`);
  const span = document.getElementById(`notification-badge`);

  item.classList.remove("fa-circle"); // remove unread icon");
  item.classList.add("fa-check", "text-gray-400", "mt-1"); // visually show it's read
  span.classList.add("hidden"); // visually show it's read

  return response.json();
}

window.markNotificationRead = markNotificationRead;
