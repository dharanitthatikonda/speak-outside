const adjectives = ["Calm", "Brave", "Quiet", "Gentle", "Hopeful", "Steady", "Kind", "Bright", "Soft", "Free"];
const nouns = ["River", "Sky", "Leaf", "Star", "Moon", "Cloud", "Wave", "Breeze", "Petal", "Stone"];

/**
 * Generates a human-friendly anonymous display name like "CalmRiver42".
 * No real identity, device info, or personal data is ever used.
 */
function generateAnonId() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 90 + 10);
  return `${adj}${noun}${num}`;
}

module.exports = { generateAnonId };
