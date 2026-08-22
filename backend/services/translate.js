const axios = require("axios");

/**
 * Translates text from sourceLang to targetLang.
 * Supports LibreTranslate (free) or Google Translate (paid) via env config.
 * Falls back to returning original text if translation fails,
 * so the chat never breaks even if the API is down.
 */
async function translateText(text, sourceLang, targetLang) {
  if (!text || sourceLang === targetLang) return text;

  const provider = process.env.TRANSLATION_PROVIDER || "libretranslate";

  try {
    if (provider === "google" && process.env.GOOGLE_TRANSLATE_API_KEY) {
      const res = await axios.post(
        `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`,
        {
          q: text,
          source: sourceLang,
          target: targetLang,
          format: "text",
        },
        { timeout: 5000 }
      );
      return res.data.data.translations[0].translatedText;
    }

    // Default: LibreTranslate
    const res = await axios.post(
      process.env.LIBRETRANSLATE_URL || "https://libretranslate.com/translate",
      {
        q: text,
        source: sourceLang === "auto" ? "auto" : sourceLang,
        target: targetLang,
        format: "text",
        api_key: process.env.LIBRETRANSLATE_API_KEY || undefined,
      },
      { headers: { "Content-Type": "application/json" }, timeout: 5000 }
    );
    return res.data.translatedText;
  } catch (err) {
    console.error("Translation failed:", err.message);
    return text; // graceful fallback — original message still gets delivered
  }
}

module.exports = { translateText };
