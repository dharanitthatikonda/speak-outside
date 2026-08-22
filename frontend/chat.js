const socket = io(BACKEND_URL);

const statusEl = document.getElementById("status");
const setupPanel = document.getElementById("setupPanel");
const messagesEl = document.getElementById("messages");
const chatInputEl = document.getElementById("chatInput");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const findMatchBtn = document.getElementById("findMatchBtn");
const topicSelect = document.getElementById("topicSelect");
const langSelect = document.getElementById("langSelect");

let currentRoomId = null;
let myLang = "en";

socket.on("connect", () => {
  statusEl.textContent = "Connected";
});

socket.on("disconnect", () => {
  statusEl.textContent = "Disconnected";
});

findMatchBtn.addEventListener("click", () => {
  const topic = topicSelect.value;
  myLang = langSelect.value;

  socket.emit("join_queue", { topic, lang: myLang });
  setupPanel.innerHTML = `<h2>Looking for someone to talk to...</h2><p style="color:var(--muted); font-size:0.9rem;">This won't take long. You're anonymous the whole time.</p>`;
});

socket.on("waiting", ({ topic }) => {
  statusEl.textContent = `Waiting (${topic})`;
});

socket.on("matched", ({ roomId, partnerAnonId, topic }) => {
  currentRoomId = roomId;
  statusEl.textContent = `Chatting anonymously · ${topic}`;

  setupPanel.style.display = "none";
  messagesEl.style.display = "flex";
  chatInputEl.style.display = "flex";

  addSystemMessage(`You're now connected with ${partnerAnonId}. Say hello — you're both anonymous.`);
});

socket.on("receive_message", ({ from, original, translated, lang }) => {
  const isMe = from === "me";
  addMessage({
    isMe,
    text: isMe ? original : translated,
    original: isMe ? null : original,
    senderLabel: isMe ? "You" : from,
  });
});

socket.on("partner_left", () => {
  addSystemMessage("The other person has left the chat.");
  chatInputEl.style.display = "none";
});

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !currentRoomId) return;

  socket.emit("send_message", { roomId: currentRoomId, text });
  messageInput.value = "";
}

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

function addMessage({ isMe, text, original, senderLabel }) {
  const row = document.createElement("div");
  row.className = `msg-row ${isMe ? "me" : "them"}`;

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = text;

  const meta = document.createElement("div");
  meta.className = "msg-meta";
  meta.textContent = original
    ? `${senderLabel} · original: "${original}"`
    : senderLabel;

  row.appendChild(bubble);
  row.appendChild(meta);
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addSystemMessage(text) {
  const el = document.createElement("div");
  el.className = "system-msg";
  el.textContent = text;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
