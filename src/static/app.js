document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper to show an animated toast message
  function showMessage(text, type = "info", timeout = 5000) {
    messageDiv.textContent = text;
    messageDiv.classList.remove("hidden", "success", "error", "info", "toast", "show");
    messageDiv.classList.add("toast", type, "show");

    setTimeout(() => {
      messageDiv.classList.remove("show");
      setTimeout(() => messageDiv.classList.add("hidden"), 220);
    }, timeout);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and select options
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="availability"><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <p class="participants-label"><strong>Participants:</strong></p>
          <ul class="participants-list">
            ${details.participants.length
              ? details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="remove-participant" data-activity="${encodeURIComponent(
                        name
                      )}" data-email="${encodeURIComponent(email)}" aria-label="Remove ${email}">✕</button></li>`
                  )
                  .join("")
              : `<li class="empty-participants">No participants yet</li>`}
          </ul>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);

        // Attach delete handlers for this activity card
        activityCard.querySelectorAll(".remove-participant").forEach((button) => {
          button.addEventListener("click", async (event) => {
            event.preventDefault();
            const activityName = decodeURIComponent(button.dataset.activity);
            const email = decodeURIComponent(button.dataset.email);

            try {
              const response = await fetch(
                `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`,
                { method: "DELETE" }
              );

              const result = await response.json();
              if (response.ok) {
                // Optimistically remove the participant from the UI
                const li = button.closest("li");
                if (li) li.remove();

                // Update availability count
                const availP = activityCard.querySelector('.availability');
                if (availP) {
                  const match = availP.textContent.match(/(\d+)/);
                  const current = match ? parseInt(match[1], 10) : 0;
                  const updated = current + 1;
                  availP.innerHTML = `<strong>Availability:</strong> ${updated} spots left`;
                }

                // If no participants remain, show placeholder
                const participantsList = activityCard.querySelector('.participants-list');
                if (participantsList && participantsList.children.length === 0) {
                  participantsList.innerHTML = `<li class="empty-participants">No participants yet</li>`;
                }

                showMessage(result.message, 'success');
              } else {
                showMessage(result.detail || "Unable to remove participant.", 'error');
              }
            } catch (error) {
              showMessage("Failed to remove participant. Please try again.", 'error');
              console.error("Error removing participant:", error);
            }
          });
        });
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "POST" }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, 'success');
        signupForm.reset();
        // Refresh activities so the UI reflects the new signup immediately
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", 'error');
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", 'error');
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
