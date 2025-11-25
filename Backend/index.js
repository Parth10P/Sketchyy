const express = require("express");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Configuration
const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : ["http://localhost:5173", "http://127.0.0.1:5173"];

// Enable CORS for HTTP requests
app.use(cors({ origin: ALLOWED_ORIGINS }));

// Start the HTTP server
const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// Setup Socket.IO for real-time communication
const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGINS },
});

// Store drawing history in memory
let drawingHistory = [];

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Send existing drawing history to the new user
  socket.emit("load-canvas", drawingHistory);

  // Listen for drawing events
  socket.on("draw-line", (line) => {
    drawingHistory.push(line); // Save the line to history

    // Limit history size to avoid memory issues
    if (drawingHistory.length > 20000) {
      drawingHistory.shift();
    }

    // Share the line with other users
    socket.broadcast.emit("draw-line", line);
  });

  // Listen for clear canvas events
  socket.on("clear-canvas", () => {
    drawingHistory = []; // Clear the history
    io.emit("clear-canvas"); // Notify all users
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// HTTP endpoint to view drawing history
app.get("/history", (req, res) => {
  res.json({ count: drawingHistory.length, history: drawingHistory });
});
