const express = require("express");
const { Server } = require("socket.io");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const app = express();
const prisma = new PrismaClient();

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

// Map to track socketId -> sessionId
const socketIdToSessionId = new Map();

const broadcastUserCount = () => {
    const uniqueSessions = new Set(socketIdToSessionId.values());
    const count = uniqueSessions.size;
    io.emit("user-count", count);
    console.log(`Unique users: ${count}`);
};

io.on("connection", async (socket) => {
  const sessionId = socket.handshake.query.sessionId;
  if (sessionId) {
    socketIdToSessionId.set(socket.id, sessionId);
    broadcastUserCount();
  }
  
  console.log(`User connected: ${socket.id}, Session: ${sessionId}`);

  // Send existing drawing history to the new user
  try {
    const drawingHistory = await prisma.drawEvent.findMany({
      orderBy: { createdAt: "asc" },
    });
    socket.emit("load-canvas", drawingHistory);
  } catch (error) {
    console.error("Error fetching drawing history:", error);
  }

  // Listen for drawing events
  socket.on("draw-line", (data) => {
    // Broadcast immediately to other users (optimistic UI)
    socket.broadcast.emit("draw-line", data);

    // Save to DB asynchronously
    if (Array.isArray(data)) {
        // Bulk insert
        const formattedData = data.map(line => ({
            prevPoint: line.prevPoint,
            currentPoint: line.currentPoint,
            color: line.color,
            width: line.width,
        }));

        prisma.drawEvent.createMany({
            data: formattedData
        }).catch((error) => {
            console.error("Error saving batch draw events:", error);
        });
    } else {
        // Single insert (backward compatibility)
        prisma.drawEvent.create({
            data: {
                prevPoint: data.prevPoint,
                currentPoint: data.currentPoint,
                color: data.color,
                width: data.width,
            },
        }).catch((error) => {
            console.error("Error saving draw event:", error);
        });
    }
  });

  // Listen for clear canvas events
  socket.on("clear-canvas", async () => {
    try {
      await prisma.drawEvent.deleteMany({});
      io.emit("clear-canvas"); // Notify all users
    } catch (error) {
      console.error("Error clearing canvas:", error);
    }
  });

  socket.on("disconnect", () => {
    socketIdToSessionId.delete(socket.id);
    broadcastUserCount();
    console.log(`User disconnected: ${socket.id}`);
  });
});

// HTTP endpoint to view drawing history
app.get("/history", async (req, res) => {
  try {
    const history = await prisma.drawEvent.findMany({
      orderBy: { createdAt: "asc" },
    });
    res.json({ count: history.length, history });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});
