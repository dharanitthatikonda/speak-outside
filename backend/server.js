require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const { translateText } = require("./services/translate");
const { generateAnonId } = require("./utils/anonId");
const { hasBlockedLanguage } = require("./utils/contentFilter");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }, // tighten this to your frontend URL in production
});

const PORT = process.env.PORT || 5000;

// ---- In-memory state (swap for Redis/DB for production scale) ----
// waitingQueue: { topic: [ { socketId, anonId, lang } ] }
const waitingQueue = {};
// activeRooms: { roomId: { users: [socketId1, socketId2] } }
const activeRooms = {};
// socket metadata
const userMeta = {}; // socketId -> { anonId, lang, topic, roomId }

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Khulke Bolo backend running" });
});

// REST endpoint for standalone translation testing
app.post("/api/translate", async (req, res) => {
  const { text, sourceLang, targetLang } = req.body;
  if (!text || !targetLang) {
    return res.status(400).json({ error: "text and targetLang are required" });
  }
  const translated = await translateText(text, sourceLang || "auto", targetLang);
  res.json({ translated });
});

io.on("connection", (socket) => {
  const anonId = generateAnonId();
  console.log(`User connected: ${socket.id} as ${anonId}`);

  // Step 1: user joins a topic + declares their language
  socket.on("join_queue", ({ topic, lang }) => {
    userMeta[socket.id] = { anonId, lang, topic, roomId: null };

    if (!waitingQueue[topic]) waitingQueue[topic] = [];

    // Try to match with someone already waiting on the same topic
    const matchIndex = waitingQueue[topic].findIndex(
      (u) => u.socketId !== socket.id
    );

    if (matchIndex !== -1) {
      const partner = waitingQueue[topic].splice(matchIndex, 1)[0];
      const roomId = uuidv4();

      activeRooms[roomId] = { users: [partner.socketId, socket.id] };
      userMeta[partner.socketId].roomId = roomId;
      userMeta[socket.id].roomId = roomId;

      socket.join(roomId);
      io.sockets.sockets.get(partner.socketId)?.join(roomId);

      io.to(partner.socketId).emit("matched", {
        roomId,
        partnerAnonId: anonId,
        topic,
      });
      io.to(socket.id).emit("matched", {
        roomId,
        partnerAnonId: partner.anonId,
        topic,
      });
    } else {
      waitingQueue[topic].push({ socketId: socket.id, anonId, lang });
      socket.emit("waiting", { topic });
    }
  });

  // Step 2: message sending with auto-translation
  socket.on("send_message", async ({ roomId, text }) => {
    const sender = userMeta[socket.id];
    if (!sender || !activeRooms[roomId]) return;

    if (!text || hasBlockedLanguage(text)) {
      socket.emit("message_blocked", {
        reason: "Please keep this supportive space respectful. Try saying what you feel without abusive language.",
      });
      return;
    }

    const partnerSocketId = activeRooms[roomId].users.find(
      (id) => id !== socket.id
    );
    const receiver = userMeta[partnerSocketId];
    if (!receiver) return;

    const translated = await translateText(text, sender.lang, receiver.lang);

    // Sender sees their own original message echoed back (for confirmation)
    io.to(socket.id).emit("receive_message", {
      from: "me",
      original: text,
      translated: text,
      lang: sender.lang,
    });

    // Receiver gets the translated version
    io.to(partnerSocketId).emit("receive_message", {
      from: sender.anonId,
      original: text,
      translated,
      lang: receiver.lang,
    });
  });

  socket.on("leave_chat", () => {
    cleanupUser(socket.id);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    cleanupUser(socket.id);
  });

  function cleanupUser(socketId) {
    const meta = userMeta[socketId];
    if (!meta) return;

    // Remove from any waiting queue
    if (waitingQueue[meta.topic]) {
      waitingQueue[meta.topic] = waitingQueue[meta.topic].filter(
        (u) => u.socketId !== socketId
      );
    }

    // Notify partner if in an active room
    if (meta.roomId && activeRooms[meta.roomId]) {
      const partnerSocketId = activeRooms[meta.roomId].users.find(
        (id) => id !== socketId
      );
      if (partnerSocketId) {
        io.to(partnerSocketId).emit("partner_left");
      }
      delete activeRooms[meta.roomId];
    }

    delete userMeta[socketId];
  }
});

server.listen(PORT, () => {
  console.log(`Khulke Bolo backend listening on port ${PORT}`);
});
