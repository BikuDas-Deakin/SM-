document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  try {
    const res = await fetch("/api/dashboard", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Token invalid or expired");

    const data = await res.json();

    // User info
    document.getElementById("username").textContent = data.username || "User";

    // Stats
    document.getElementById("sessions").textContent = data.sessions || 0;
    document.getElementById("streak").textContent = data.streak || 0;
    document.getElementById("timeStudied").textContent = data.timeStudied || 0;

    // Recent rooms
    const roomsList = document.getElementById("recentRoomsList");
    roomsList.innerHTML = "";

    (data.recentRooms || []).forEach(room => {
      const div = document.createElement("div");
      div.className = "room-item";
      div.innerHTML = `
        <div>
          <strong>${room.name}</strong> (${room.participants} participants)
          <span class="${room.status === 'active' ? 'status-active' : 'status-ended'}">
            ${room.status === 'active' ? 'Active' : 'Ended'}
          </span>
        </div>
        ${room.status === 'active' ? `<button class="rejoin-btn">Rejoin</button>` : ''}
      `;
      roomsList.appendChild(div);
    });

    // Rejoin buttons
    document.querySelectorAll(".rejoin-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const roomName = btn.closest(".room-item").querySelector("strong").textContent;
        alert(`Rejoining: ${roomName}`);
      });
    });

    // Redirect to Create Room page
    document.getElementById("createRoomBtn").addEventListener("click", () => {
      window.location.href = "/createRoom.html";
    });


    // Join Room button
    document.getElementById("joinRoomBtn").addEventListener("click", () => {
      const roomCode = document.getElementById("roomCode").value.trim();
      if (!roomCode) return alert("Please enter a room code");
      alert(`Joining room: ${roomCode}`);
    });

  } catch (err) {
    console.error(err);
    alert("Session expired. Please log in again.");
    localStorage.removeItem("token");
    window.location.href = "/login.html";
  }
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "/login.html";
});
