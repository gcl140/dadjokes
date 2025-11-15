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

function deleteJoke(jokeId) {
  if (!confirm("Are you sure you want to delete this joke?")) return;

  fetch(`/delete-joke/${jokeId}/`, {
    method: "DELETE",
    headers: {
      "X-CSRFToken": getCookie("csrftoken"),
      "Content-Type": "application/json",
    },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.message) {
        Toastify({
          text: data.message,
          duration: 3000,
          gravity: "top",
          position: "right",
          close: true,
          style: { background: "#10b981", color: "#fff" },
        }).showToast();
        location.reload();
      } else {
        Toastify({
          text: data.error,
          duration: 3000,
          gravity: "top",
          position: "right",
          close: true,
          style: { background: "#ef4444", color: "#fff" },
        }).showToast();
      }
    });
}

// Show update form
document.getElementById("toggleUpdate").addEventListener("click", () => {
  const formSection = document.getElementById("updateFormSection");
  formSection.classList.remove("hidden");
  formSection.scrollIntoView({ behavior: "smooth" });
});

// Close update form
document.getElementById("closeUpdate").addEventListener("click", () => {
  const formSection = document.getElementById("updateFormSection");
  formSection.classList.add("hidden");
  document
    .getElementById("scrollContainer")
    .scrollTo({ top: 0, behavior: "smooth" });
});

// Profile picture preview
const profileInput = document.getElementById("id_profile_picture");
if (profileInput) {
  profileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () =>
        (document.getElementById("previewImage").src = reader.result);
      reader.readAsDataURL(file);
    }
  });
}
