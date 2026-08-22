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
const moodSelect = document.getElementById("moodSelect");
const leaveBtn = document.getElementById("leaveBtn");

let currentRoomId = null;
let myLang = "en";
let aiMode = false;
const aiReplyQueue = [];
let aiReplyInProgress = false;
let aiReplyCount = 0;
let aiHandover = false;
let nesthamId = "";
const aiReplyIndexes = {};
const blockedWords = ["asshole", "bastard", "bitch", "bullshit", "fuck", "idiot", "motherfucker", "shit", "stupid"];

socket.on("connect", () => {
  statusEl.textContent = "Connected";
});

socket.on("disconnect", () => {
  statusEl.textContent = "Disconnected";
});

socket.on("connect_error", () => {
  statusEl.textContent = "Unable to connect to chat server";
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
  aiReplyCount = 0;
  aiHandover = false;
  Object.keys(aiReplyIndexes).forEach((key) => delete aiReplyIndexes[key]);
  nesthamId = `Nestham_${Math.floor(Math.random() * 900) + 100}`;
  myLang = langSelect.value;
  statusEl.textContent = "Aasara AI · listening privately";
  setupPanel.style.display = "none";
  messagesEl.style.display = "flex";
  chatInputEl.style.display = "flex";
  leaveBtn.hidden = false;
  addSystemMessage("You are talking with Aasara AI. Share what is real; after two replies, it can connect you with Nestham.");
  addMessage({
    isMe: false,
    text: createAiGreeting(moodSelect.value),
    senderLabel: "Aasara AI",
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
  leaveBtn.hidden = false;

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

socket.on("message_translation", ({ original, translated }) => {
  const messageBubble = [...messagesEl.querySelectorAll(".msg-row.them")]
    .reverse()
    .find((row) => row.querySelector(".msg-bubble")?.textContent === original);
  if (messageBubble) {
    messageBubble.querySelector(".msg-bubble").textContent = translated;
  }
});

socket.on("partner_left", () => {
  addSystemMessage("The other person has left the chat.");
  chatInputEl.style.display = "none";
});

socket.on("message_blocked", ({ reason }) => {
  addSystemMessage(reason);
});

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !currentRoomId) return;

  if (hasBlockedLanguage(text)) {
    addSystemMessage("Please keep this space respectful. Try saying what you feel without abusive language.");
    messageInput.value = "";
    return;
  }

  if (aiMode) {
    addMessage({ isMe: true, text, senderLabel: "You" });
    messageInput.value = "";
    aiReplyQueue.push({ text, from: aiHandover ? "Nestham" : "Aasara AI" });
    processAiReplyQueue();
    return;
  }

  socket.emit("send_message", { roomId: currentRoomId, text });
  messageInput.value = "";
}

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

leaveBtn.addEventListener("click", leaveConversation);

function leaveConversation() {
  if (!aiMode) socket.emit("leave_chat");
  currentRoomId = null;
  aiMode = false;
  aiReplyQueue.length = 0;
  aiReplyInProgress = false;
  aiReplyCount = 0;
  aiHandover = false;
  Object.keys(aiReplyIndexes).forEach((key) => delete aiReplyIndexes[key]);
  messagesEl.replaceChildren();
  messageInput.value = "";
  setupPanel.innerHTML = `<h2>Let's set you up anonymously</h2><p style="color:var(--muted); font-size:0.9rem;">No sign-up. No real name. Just pick a topic and your language.</p><select id="topicSelect"><option value="stress">Stress</option><option value="anxiety">Anxiety</option><option value="body-image">Body Image</option><option value="addiction">Addiction</option><option value="general">General Wellbeing</option></select><select id="langSelect"><option value="hi">Hindi</option><option value="ta">Tamil</option><option value="te">Telugu</option><option value="en">English</option></select><select id="moodSelect"><option value="unsure">I am not sure how I feel</option><option value="overwhelmed">Overwhelmed</option><option value="anxious">Anxious</option><option value="low">Low or lonely</option><option value="angry">Angry or frustrated</option><option value="okay">Okay, but I want to reflect</option></select><button class="btn-primary" id="findMatchBtn" style="cursor:pointer; border:none;">Find Someone to Talk To</button><div class="setup-divider"><span>or</span></div><button class="ai-entry-btn" id="aiCompanionBtn" type="button">Talk to Aasara AI <span aria-hidden="true">&#8599;</span></button><p class="ai-disclaimer">Aasara AI listens first, then can connect you with Nestham. It is not a therapist or emergency service.</p>`;
  window.location.reload();
}

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
    return "Please move away from danger and contact emergency services or someone trusted now. You deserve immediate support.";
  }
  const keyword = extractKeyword(lowerText);
  const replies = {
    exam: ["Exams feel heavy. Is preparation or pressure harder today?", "Your exam worry matters. What part feels least manageable right now?"],
    stress: ["Stress is taking up space. What could make today 1% lighter?", "Your stress sounds real. Which task feels heaviest right now?"],
    family: ["Family concerns can hurt deeply. Which conversation keeps returning?", "Your family situation matters. What do you wish they understood?"],
    sleep: ["Sleep and emotions connect. What usually keeps your mind awake?", "Your sleep sounds disrupted. What was on your mind last night?"],
    anxiety: ["Anxiety can make tomorrow feel immediate. What thought needs attention now?", "Your anxiety is speaking loudly. What is it predicting will happen?"],
    lonely: ["Feeling lonely is exhausting. Who feels safest to contact today?", "Your loneliness deserves care. When does it feel strongest?"],
    anger: ["Anger can protect something important. What felt unfair today?", "Your frustration makes sense. Which boundary was crossed?"],
    sad: ["That sadness matters. What made the feeling stronger today?", "Your sadness deserves space. What do you need most right now?"],
  };
  if (replies[keyword]) {
    const options = replies[keyword];
    const index = aiReplyIndexes[keyword] || 0;
    aiReplyIndexes[keyword] = (index + 1) % options.length;
    return options[index];
  }
  return `Tell me more about ${keyword}.`;
}

function processAiReplyQueue() {
  if (aiReplyInProgress || aiReplyQueue.length === 0) return;

  aiReplyInProgress = true;
  const nextMessage = aiReplyQueue.shift();
  window.setTimeout(() => {
    if (aiHandover || nextMessage.from === "Nestham") {
      addMessage({ isMe: false, text: createNesthamReply(nextMessage.text), senderLabel: "Nestham" });
    } else {
      aiReplyCount += 1;
      addMessage({ isMe: false, text: createAiReply(nextMessage.text), senderLabel: "Aasara AI" });
      if (aiReplyCount === 2) {
        aiHandover = true;
        addSystemMessage(`I am connecting you to ${nesthamId} who faced the same issue.`);
      }
    }
    aiReplyInProgress = false;
    messageInput.focus();
    processAiReplyQueue();
  }, 350);
}

function extractKeyword(text) {
  const keywordRules = [
    ["exam", /exam|test|study|college|school|pariksha/],
    ["family", /family|mother|father|parent|brother|sister|parivar/],
    ["sleep", /sleep|insomnia|awake|night|neend/],
    ["anxiety", /anxious|anxiety|panic|worried|worry|chinta/],
    ["stress", /stress|stressed|pressure|overwhelmed|burnt out|burned out|tanav/],
    ["lonely", /lonely|alone|isolated/],
    ["anger", /angry|anger|frustrated|mad/],
    ["sad", /sad|cry|empty|low/],
  ];
  const match = keywordRules.find(([, pattern]) => pattern.test(text));
  return match ? match[0] : "your situation";
}

function createNesthamReply(text) {
  const keyword = extractKeyword(text.toLowerCase());
  return keyword === "your situation"
    ? "I faced something similar. You can share at your own pace; I am listening."
    : `I faced ${keyword} too. You are not alone; what helped you get through today?`;
}

function hasBlockedLanguage(text) {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/(.)\1+/g, "$1")
    .replace(/\s+/g, " ");
  return blockedWords.some((word) => new RegExp(`\\b${word}\\b`, "i").test(normalized));
}

function createAiGreeting(mood) {
  const greetings = {
    overwhelmed: "A lot is landing at once. What feels most urgent?",
    anxious: "What happened just before your anxiety grew stronger?",
    low: "Would you like to share what happened today or the feeling underneath?",
    angry: "What happened that still feels stuck in you?",
    okay: "What has been on your mind lately?",
    unsure: "What have you noticed in your mind or body today?",
  };
  return greetings[mood] || greetings.unsure;
}
