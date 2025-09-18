// ===============================
// app.js - StudyMate Backend
// ===============================

const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const passport = require("passport");
const path = require("path"); // Required for serving frontend files
const http = require("http");

// Load environment variables
dotenv.config();

const app = express();

// ===============================
// Middleware
// ===============================
app.use(express.json()); // Parse JSON requests
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../frontend/public")));

// Initialize Passport for authentication
app.use(passport.initialize());
require("./middleware/passport"); // Passport strategies

// ===============================
// Routes
// ===============================
const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const roomsRoutes = require("./routes/rooms");
const chatRoutes = require("./routes/chat");

// Redirect root URL to dashboard
app.get("/", (req, res) => {
  res.redirect("/dashboard.html"); // dashboard.html should be in frontend/public
});

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/rooms", roomsRoutes);
app.use("/api/chat", chatRoutes);

// ===============================
// MongoDB Connection
// ===============================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// ===============================
// Start Server with Socket.io
// ===============================
const server = http.createServer(app);
const { initSocket } = require("./socket"); // Socket logic separated
initSocket(server); // Pass server instance

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
