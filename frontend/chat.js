const socket = io(BACKEND_URL);

const statusEl = document.getElementById("status");
const setupPanel = document.getElementById("setupPanel");
const messagesEl = document.getElementById("messages");
const chatInputEl = document.getElementById("chatInput");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const findMatchBtn = document.getElementById("findMatchBtn");
const aiCompanionBtn = document.getElementById("aiCompanionBtn");
const topicSelect = document.getElementById("topicSelect");
const langSelect = document.getElementById("langSelect");

let currentRoomId = null;
let myLang = "en";
let aiMode = false;

socket.on("connect", () => {
  statusEl.textContent = "Connected";
});

socket.on("disconnect", () => {
  statusEl.textContent = "Disconnected";
});

findMatchBtn.addEventListener("click", () => {
  aiMode = false;
  const topic = topicSelect.value;
  myLang = langSelect.value;

  socket.emit("join_queue", { topic, lang: myLang });
  setupPanel.innerHTML = `<h2>Looking for someone to talk to...</h2><p style="color:var(--muted); font-size:0.9rem;">This won't take long. You're anonymous the whole time.</p>`;
});

aiCompanionBtn.addEventListener("click", () => {
  aiMode = true;
  currentRoomId = "ai-companion";
  myLang = langSelect.value;
  statusEl.textContent = "Khulke AI · here with you";
  setupPanel.style.display = "none";
  messagesEl.style.display = "flex";
  chatInputEl.style.display = "flex";
  addSystemMessage("You are talking with Khulke AI. It is a private space for reflection, not a replacement for professional care.");
  addMessage({
    isMe: false,
    text: "Hey, I’m here with you. What has been taking up the most space in your mind today?",
    senderLabel: "Khulke AI",
  });
  addQuickPrompts();
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

  if (aiMode) {
    addMessage({ isMe: true, text, senderLabel: "You" });
    messageInput.value = "";
    sendBtn.disabled = true;
    window.setTimeout(() => {
      addMessage({ isMe: false, text: createAiReply(text), senderLabel: "Khulke AI" });
      sendBtn.disabled = false;
      messageInput.focus();
    }, 650);
    return;
  }

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

function addQuickPrompts() {
  const promptRow = document.createElement("div");
  promptRow.className = "quick-prompts";
  ["I feel overwhelmed", "Help me untangle my thoughts", "I just need to be heard"].forEach((prompt) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = prompt;
    button.addEventListener("click", () => {
      messageInput.value = prompt;
      messageInput.focus();
    });
    promptRow.appendChild(button);
  });
  messagesEl.appendChild(promptRow);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function createAiReply(text) {
  const lowerText = text.toLowerCase();
  if (/suicide|kill myself|self harm|hurt myself|end my life/.test(lowerText)) {
    return "I’m really sorry you’re carrying this. Please move away from anything you could use to hurt yourself and contact local emergency services or a crisis helpline now. If someone you trust is nearby, tell them plainly: “I might not be safe alone.”";
  }
  if (/anxious|anxiety|panic|worried|stress/.test(lowerText)) {
    return "That sounds heavy, and it makes sense that your mind feels on high alert. What feels strongest right now: the thoughts, the physical sensations, or what you fear might happen?";
  }
  if (/sad|lonely|alone|cry|empty/.test(lowerText)) {
    return "I’m glad you said it out loud. You do not have to solve everything in this moment. Would it help to name what happened today, or would you rather sit with the feeling for a minute?";
  }
  if (/angry|frustrated|mad/.test(lowerText)) {
    return "It sounds like something crossed a line for you. Before we unpack it, take one slow breath and tell me: what part felt most unfair?";
  }
  if (/thank|better|okay|good/.test(lowerText)) {
    return "I’m glad there is a little more room to breathe. What helped, even if it was something small?";
  }
  return "I hear you. Take your time. Can you tell me a little more about what that has been like for you?";
}
