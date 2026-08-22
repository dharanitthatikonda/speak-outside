# Khulke Bolo — Anonymous Multilingual Health Chat

An anonymous chat platform where people can talk about sensitive health topics
(stress, anxiety, body image, addiction) without revealing their identity —
with real-time AI translation so users can speak in Hindi, Tamil, Telugu,
Hinglish, or English and still understand each other.

## Project Structure

```
khulke-bolo/
├── frontend/          # Static HTML/CSS/JS client
│   ├── index.html     # Landing page
│   ├── chat.html      # Anonymous chat room
│   ├── style.css      # Shared styles
│   ├── chat.js         # Socket.io client logic
│   └── config.js       # Backend URL config
│
├── backend/           # Node.js + Express + Socket.io server
│   ├── server.js       # Main server, matching + messaging logic
│   ├── services/
│   │   └── translate.js  # Translation API integration
│   ├── utils/
│   │   └── anonId.js     # Anonymous display name generator
│   ├── package.json
│   └── .env.example
│
└── README.md
```

## How It Works

1. User opens the chat page, picks a **topic** (stress, anxiety, etc.) and
   their **preferred language** — no sign-up, no personal info.
2. The backend generates a random anonymous ID (e.g. `CalmRiver42`) and
   matches them with another anonymous user on the same topic.
3. When either user sends a message, the backend translates it into the
   recipient's chosen language before delivering it, using LibreTranslate
   (free) or Google Translate (optional, paid) — configurable via `.env`.
4. Neither user ever sees the other's real identity, device info, or chat
   history after the session ends (in-memory only, nothing persisted).

## Running Locally

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
npm start
```

Server runs on `http://localhost:5000` by default.

### 2. Frontend

Just open `frontend/index.html` in a browser, or serve it with any static
server:

```bash
cd frontend
npx serve .
```

Make sure `frontend/config.js` points to your backend URL (defaults to
`http://localhost:5000`).

## Translation Setup

By default this uses the free public [LibreTranslate](https://libretranslate.com)
API. For better accuracy in production, set `TRANSLATION_PROVIDER=google` in
`.env` and add a `GOOGLE_TRANSLATE_API_KEY`.

## Planned / Suggested Features to Add

- [ ] Voice message support with speech-to-text + translation
- [ ] AI-based crisis-keyword detection to surface helpline resources
- [ ] Optional "verified listener" role for trained volunteers
- [ ] Rate limiting / abuse reporting per anonymous session
- [ ] Persistent but anonymized chat logs (opt-in) for continuity of support
- [ ] Mobile app wrapper (React Native / Flutter)

## Tech Stack

- **Frontend:** HTML, CSS, vanilla JS, Socket.io client
- **Backend:** Node.js, Express, Socket.io
- **Translation:** LibreTranslate / Google Cloud Translate API

## Disclaimer

This platform is a peer-support tool and is **not a substitute for
professional medical or mental health care**. If you or someone you know is
in crisis, please contact a local emergency service or helpline.
