// ===============================
// socket.js - Socket.io logic
// ===============================

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Chat = require("./models/Chat");

/**
 * Initialize Socket.io server
 * @param {http.Server} server - HTTP server instance from app.js
 */
function initSocket(server) {
  const io = new Server(server, { cors: { origin: "*" } });

  // Structure for rooms and participants
  const rooms = {};

  io.on("connection", (socket) => {
    console.log(`[SOCKET] Client connected: ${socket.id}`);

    // ===============================
    // Join Room
    // ===============================
    socket.on("joinRoom", async ({ roomId, token }) => {
      if (!token) return console.log("[JOIN] No token provided");

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        console.error("[JOIN] Invalid token:", err.message);
        return;
      }

      const userId = decoded.id;

      // Fetch user to get username
      let user;
      try {
        user = await User.findById(userId);
        if (!user) throw new Error("User not found");
      } catch (err) {
        console.error("[JOIN] Failed to get user:", err.message);
        return;
      }

      const username = user.username;
      socket.join(roomId);

      if (!rooms[roomId]) {
        rooms[roomId] = {
          participants: [],
          adminId: socket.id,
          timer: { timeLeft: 25 * 60, running: false, phase: "Study Time" },
          currentSession: 1,
          totalSessions: 4
        };
      }

      const room = rooms[roomId];

      // Load chat history
      try {
        const messages = await Chat.find({ roomId })
          .sort({ createdAt: 1 })
          .populate("senderId", "username");

        const formatted = messages.map(m => ({
          username: m.senderId.username,
          message: m.message,
          createdAt: m.createdAt
        }));

        socket.emit("loadMessages", formatted);
      } catch (err) {
        console.error("[JOIN] Failed to load chat messages:", err);
        socket.emit("loadMessages", []);
      }

      // Update participants list
      const existing = room.participants.find(p => p.userId === userId);
      if (!existing) {
        room.participants.push({ socketId: socket.id, username, userId });
      } else {
        existing.socketId = socket.id;
        existing.username = username;
      }

      io.to(roomId).emit("participantsUpdate", {
        participants: room.participants,
        adminId: room.adminId
      });

      io.to(roomId).emit("systemMessage", `${username} joined the room`);
      socket.emit("timerUpdate", room.timer);
      socket.emit("sessionUpdate", {
        currentSession: room.currentSession,
        totalSessions: room.totalSessions
      });
    });

    // ===============================
    // Timer Controls (Admin Only)
    // ===============================
    socket.on("toggleTimer", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room || socket.id !== room.adminId) return;

      room.timer.running = !room.timer.running;
      io.to(roomId).emit("timerUpdate", room.timer);
    });

    socket.on("resetTimer", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room || socket.id !== room.adminId) return;

      room.timer = { timeLeft: 25*60, running: false, phase: "Study Time" };
      room.currentSession = 1;
      io.to(roomId).emit("timerUpdate", room.timer);
      io.to(roomId).emit("sessionUpdate", {
        currentSession: room.currentSession,
        totalSessions: room.totalSessions
      });
    });

    socket.on("skipPhase", ({ roomId }) => {
      const room = rooms[roomId];
      if (!room || socket.id !== room.adminId) return;

      if (room.timer.phase === "Study Time") {
        room.timer.phase = "Break Time";
        room.timer.timeLeft = 5*60;
      } else {
        room.timer.phase = "Study Time";
        room.timer.timeLeft = 25*60;
        if (room.currentSession < room.totalSessions) room.currentSession++;
      }
      room.timer.running = false;

      io.to(roomId).emit("timerUpdate", room.timer);
      io.to(roomId).emit("sessionUpdate", {
        currentSession: room.currentSession,
        totalSessions: room.totalSessions
      });
    });

    // ===============================
    // Chat Messages
    // ===============================
    socket.on("sendMessage", async ({ roomId, message, token }) => {
      if (!token) return console.log("[CHAT] No token provided");

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        console.error("[CHAT] Invalid token:", err.message);
        return;
      }

      const senderId = decoded.id;

      let user;
      try {
        user = await User.findById(senderId);
        if (!user) throw new Error("User not found");
      } catch (err) {
        console.error("[CHAT] Failed to get user:", err.message);
        return;
      }

      const username = user.username;

      try {
        const chat = await Chat.create({ roomId, senderId, message });
        io.to(roomId).emit("newMessage", { username, message });
      } catch (err) {
        console.error("[CHAT] Failed to save message:", err);
      }
    });

    // ===============================
    // Disconnect
    // ===============================
    socket.on("disconnect", () => {
      for (const roomId in rooms) {
        const room = rooms[roomId];
        const idx = room.participants.findIndex(p => p.socketId === socket.id);
        if (idx !== -1) {
          const [leaving] = room.participants.splice(idx, 1);

          if (room.adminId === socket.id && room.participants.length > 0) {
            room.adminId = room.participants[0].socketId;
            io.to(roomId).emit("systemMessage",
              `${room.participants[0].username} is now the admin`);
          }

          io.to(roomId).emit("participantsUpdate", {
            participants: room.participants,
            adminId: room.adminId
          });
          io.to(roomId).emit("systemMessage", `${leaving.username} left the room`);
        }
      }
    });
  });

  // ===============================
  // Timer Tick (1 second interval)
  // ===============================
  setInterval(() => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.timer.running) {
        room.timer.timeLeft--;

        if (room.timer.timeLeft <= 0) {
          room.timer.running = false;
          if (room.timer.phase === "Study Time") {
            room.timer.phase = "Break Time";
            room.timer.timeLeft = 5*60;
          } else {
            room.timer.phase = "Study Time";
            room.timer.timeLeft = 25*60;
            if (room.currentSession < room.totalSessions) room.currentSession++;
          }

          io.to(roomId).emit("sessionUpdate", {
            currentSession: room.currentSession,
            totalSessions: room.totalSessions
          });
        }

        io.to(roomId).emit("timerUpdate", room.timer);
      }
    }
  }, 1000);
}

module.exports = { initSocket };
