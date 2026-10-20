document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  function renderParticipants(activityCard, participants) {
    const participantsSection = activityCard.querySelector(".activity-participants");
    const participantsHeading = participantsSection.querySelector("h5");
    participantsHeading.textContent = `Participants (${participants.length})`;

    const participantsList = document.createElement("ul");
    participantsList.className = "participant-list";

    participants.forEach((participant) => {
      const participantItem = document.createElement("li");
      participantItem.className = "participant-item";
      participantItem.dataset.email = participant;

      const participantName = document.createElement("span");
      participantName.className = "participant-name";
      participantName.textContent = participant;
      participantItem.appendChild(participantName);

      const deleteButton = document.createElement("button");
      deleteButton.className = "delete-participant";
      deleteButton.type = "button";
      deleteButton.setAttribute("aria-label", `Unregister ${participant} from ${activityCard.dataset.activityName}`);
      deleteButton.title = "Unregister participant";

      const deleteIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      deleteIcon.setAttribute("viewBox", "0 0 24 24");
      deleteIcon.setAttribute("aria-hidden", "true");
      const deletePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      deletePath.setAttribute("d", "M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3");
      deletePath.setAttribute("fill", "none");
      deletePath.setAttribute("stroke", "currentColor");
      deletePath.setAttribute("stroke-linecap", "round");
      deletePath.setAttribute("stroke-linejoin", "round");
      deletePath.setAttribute("stroke-width", "1.8");
      deleteIcon.appendChild(deletePath);
      deleteButton.appendChild(deleteIcon);
      deleteButton.addEventListener("click", () => {
        unregisterParticipant(activityCard, participant, deleteButton);
      });
      participantItem.appendChild(deleteButton);
      participantsList.appendChild(participantItem);
    });

    if (participants.length > 0) {
      participantsSection.replaceChildren(participantsHeading, participantsList);
    } else {
      const emptyState = document.createElement("p");
      emptyState.className = "participants-empty";
      emptyState.textContent = "No participants yet";
      participantsSection.replaceChildren(participantsHeading, emptyState);
    }

    updateAvailability(activityCard, participants.length);
  }

  function updateAvailability(activityCard, participantCount) {
    const spotsLeft = Number(activityCard.dataset.maxParticipants) - participantCount;
    activityCard.querySelector(".activity-availability").textContent =
      `Availability: ${spotsLeft} spots left`;
  }

  async function unregisterParticipant(activityCard, email, deleteButton) {
    const activity = activityCard.dataset.activityName;
    deleteButton.disabled = true;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (!response.ok) {
        messageDiv.textContent = result.detail || "Unable to unregister participant";
        messageDiv.className = "error";
      } else {
        const remainingParticipants = Array.from(
          activityCard.querySelectorAll(".participant-item")
        )
          .map((participantItem) => participantItem.dataset.email)
          .filter((participantEmail) => participantEmail !== email);
        renderParticipants(activityCard, remainingParticipants);
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
      }
    } catch (error) {
      messageDiv.textContent = "Failed to unregister participant. Please try again.";
      messageDiv.className = "error";
      console.error("Error unregistering participant:", error);
    } finally {
      deleteButton.disabled = false;
      messageDiv.classList.remove("hidden");
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        activityCard.dataset.activityName = name;
        activityCard.dataset.maxParticipants = details.max_participants;

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="activity-availability">Availability: ${spotsLeft} spots left</p>
        `;

        const participantsSection = document.createElement("div");
        participantsSection.className = "activity-participants";

        const participantsHeading = document.createElement("h5");
        participantsSection.appendChild(participantsHeading);
        activityCard.appendChild(participantsSection);
        renderParticipants(activityCard, details.participants);
        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
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
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        const activityCard = Array.from(activitiesList.children).find(
          (card) => card.dataset.activityName === activity
        );
        if (activityCard) {
          const participants = Array.from(
            activityCard.querySelectorAll(".participant-item")
          ).map((participantItem) => participantItem.dataset.email);
          renderParticipants(activityCard, [...participants, email]);
        }

        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
