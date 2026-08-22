const blockedWords = [
  "asshole",
  "bastard",
  "bitch",
  "bullshit",
  "fuck",
  "idiot",
  "motherfucker",
  "shit",
  "stupid",
];

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/(.)\1+/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function hasBlockedLanguage(text) {
  const normalized = normalizeText(text);
  return blockedWords.some((word) => new RegExp(`\\b${word}\\b`, "i").test(normalized));
}

module.exports = { hasBlockedLanguage };
