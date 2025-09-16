// ===============================
// room.js - StudyMate Frontend
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get("id");
    let username = "";
    let socket;
  
    const messagesEl = document.getElementById("chatMessages");
    const messageInput = document.getElementById("messageInput");
    const sendBtn = document.getElementById("sendBtn");
    const participantsEl = document.getElementById("participantsList");
    const participantsHeader = document.querySelector(".participants-section h5");
  
    if (!roomId) {
      alert("Invalid room URL");
      window.location.href = "/dashboard.html";
      return;
    }
  
    // Fetch logged-in user and connect socket
    async function fetchUserAndConnect() {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please login first");
        window.location.href = "/login.html";
        return;
      }
  
      try {
        const res = await fetch("/api/auth/profile", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
  
        if (!data.user || !data.user.username) throw new Error("No user data");
  
        username = data.user.username;
        console.log("[USER] Logged in as:", username);
  
        connectSocket(token);
      } catch (err) {
        console.error("[USER] Failed to fetch profile:", err);
        alert("Failed to fetch profile. Please login again.");
        window.location.href = "/login.html";
      }
    }
  
    function connectSocket(token) {
      socket = io({ auth: { token } });
  
      socket.on("connect", () => {
        console.log("[SOCKET] Connected:", socket.id);
        socket.emit("joinRoom", { roomId, token });
      });
  
      // ===============================
      // Update participant list
      // ===============================
      socket.on("participantsUpdate", ({ participants, adminId }) => {
        participantsEl.innerHTML = "";
        participants.forEach(p => {
          const div = document.createElement("div");
          div.className = "participant";
          const color = "#3B82F6";
          const initial = p.username?.[0] || "?";
          div.innerHTML = `
            <div class="participant-avatar" style="background:${color}">${initial}</div>
            <div class="participant-name">
              ${p.username || "Unknown"}${p.socketId === socket.id ? " (You)" : ""}${p.socketId === adminId ? " ★" : ""}
            </div>
          `;
          participantsEl.appendChild(div);
        });
        participantsHeader.textContent = `Participants (${participants.length})`;
      });
  
      // ===============================
      // System messages
      // ===============================
      socket.on("systemMessage", (text) => {
        const div = document.createElement("div");
        div.className = "system-message";
        div.textContent = text;
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      });
  
      // ===============================
      // New chat messages
      // ===============================
      socket.on("newMessage", ({ username: sender, message }) => {
        const initial = sender?.[0] || "?";
        const color = sender === username ? "#059669" : "#3B82F6";
        addUserMessage(sender, message, color, initial);
      });
  
      // ===============================
      // Load previous chat messages
      // ===============================
      socket.on("loadMessages", (messages) => {
        messagesEl.innerHTML = "";
        messages.forEach(m => {
          const initial = m.username?.[0] || "?";
          const color = m.username === username ? "#059669" : "#3B82F6";
          addUserMessage(m.username, m.message, color, initial);
        });
      });
    }
  
    function addUserMessage(sender, text, color, initial) {
      const div = document.createElement("div");
      div.className = "message";
      div.innerHTML = `
        <div class="message-avatar" style="background:${color}">${initial}</div>
        <div class="message-content">
          <div class="message-header">
            <span class="message-sender">${sender}</span>
            <span class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
          </div>
          <div class="message-text">${text}</div>
        </div>
      `;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  
    // ===============================
    // Sending messages
    // ===============================
    sendBtn?.addEventListener("click", () => {
      const token = localStorage.getItem("token");
      const message = messageInput.value.trim();
      if (!message || !socket) return;
      socket.emit("sendMessage", { roomId, message, token });
      messageInput.value = "";
    });
  
    messageInput?.addEventListener("keypress", e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendBtn.click();
      }
    });
  
    fetchUserAndConnect();
  });
  