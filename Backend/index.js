const express = require("express");
// load .env when available
require("dotenv").config();
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);

// Configure Socket.io with CORS so your React app can connect
// Read allowed origins from env CORS_ORIGINS (comma-separated) or fallback to dev ports
const allowedOrigins = (
  process.env.CORS_ORIGINS ||
  "http://localhost:5173,http://localhost:5174,http://localhost:5175"
)
  .split(",")
  .map((s) => s.trim());
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

// --- SERVER STATE ---
// We need to store the drawing history so new users see the existing drawing.
// In a real production app, you might store this in a database (Redis/MongoDB).
let drawingHistory = [];

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // 1. INITIAL LOAD: Send existing drawing history to the NEW user only
  // We loop through the history and send it so their canvas matches everyone else's.
  if (drawingHistory.length > 0) {
    socket.emit("load-canvas", drawingHistory);
  }

  // 2. LISTENING FOR DRAWING EVENTS
  // We expect 'data' to look like: { prevPoint: {x, y}, currentPoint: {x, y}, color: 'red', width: 5 }
  socket.on("draw-line", (data) => {
    // A. Add this line to our history (server memory)
    drawingHistory.push(data);

    // keep history bounded to avoid memory blowup
    const MAX_HISTORY = 20000; // arbitrary cap for dev usage
    if (drawingHistory.length > MAX_HISTORY) {
      drawingHistory.splice(0, drawingHistory.length - MAX_HISTORY);
    }

    // B. Broadcast this specific line to everyone else (excluding the sender)
    socket.broadcast.emit("draw-line", data);
  });

  // 3. HANDLE CLEAR CANVAS
  socket.on("clear-canvas", () => {
    // A. Clear the server memory
    drawingHistory = [];

    // B. Tell everyone (including the sender) to wipe their canvas
    io.emit("clear-canvas");
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Simple HTTP endpoint to inspect current drawing history (useful for debugging)
app.get("/history", (req, res) => {
  res.json({ count: drawingHistory.length, history: drawingHistory });
});
