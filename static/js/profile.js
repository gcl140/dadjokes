// Edit Profile modal
const updateFormSection = document.getElementById("updateFormSection");
const toggleUpdateBtn = document.getElementById("toggleUpdate");
const closeUpdateBtn = document.getElementById("closeUpdate");

if (toggleUpdateBtn && updateFormSection) {
  toggleUpdateBtn.addEventListener("click", () => {
    updateFormSection.classList.remove("hidden");
    updateFormSection.classList.add("flex");
  });
}

if (closeUpdateBtn && updateFormSection) {
  closeUpdateBtn.addEventListener("click", () => {
    updateFormSection.classList.add("hidden");
    updateFormSection.classList.remove("flex");
  });
}

if (updateFormSection) {
  updateFormSection.addEventListener("click", (e) => {
    if (e.target === updateFormSection) {
      updateFormSection.classList.add("hidden");
      updateFormSection.classList.remove("flex");
    }
  });
}

// Async username availability check - blocks Save until a changed username
// is confirmed free (or reverted back to what it already was).
const usernameInput = document.getElementById("id_username");
const usernameStatus = document.getElementById("username-check-status");
const saveProfileBtn = document.getElementById("save-profile-btn");

if (usernameInput && usernameStatus && saveProfileBtn) {
  const originalUsername = usernameInput.value.trim();
  let debounceTimer = null;
  let requestId = 0;
  let usernameOk = true; // unchanged value is always fine to submit

  function setUsernameStatus(text, colorClass) {
    usernameStatus.textContent = text;
    usernameStatus.className = "text-xs mt-1" + (colorClass ? " " + colorClass : "");
  }

  function updateSaveState() {
    saveProfileBtn.disabled = !usernameOk;
  }

  usernameInput.addEventListener("input", () => {
    const value = usernameInput.value.trim();
    clearTimeout(debounceTimer);

    if (value === originalUsername) {
      usernameOk = true;
      setUsernameStatus("");
      updateSaveState();
      return;
    }

    if (!value) {
      usernameOk = false;
      setUsernameStatus("Username cannot be blank.", "text-danger");
      updateSaveState();
      return;
    }

    usernameOk = false;
    updateSaveState();
    setUsernameStatus("Checking availability…", "text-ink-faint");

    const thisRequest = ++requestId;
    debounceTimer = setTimeout(() => {
      fetch(`/accounts/api/check-username/?username=${encodeURIComponent(value)}`)
        .then((res) => res.json())
        .then((data) => {
          if (thisRequest !== requestId) return;
          usernameOk = !!data.available;
          setUsernameStatus(
            data.available ? "Username is available." : data.reason || "That username is already taken.",
            data.available ? "text-success" : "text-danger"
          );
          updateSaveState();
        })
        .catch(() => {
          if (thisRequest !== requestId) return;
          usernameOk = false;
          setUsernameStatus("Couldn't check availability, try again.", "text-danger");
          updateSaveState();
        });
    }, 400);
  });
}

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
