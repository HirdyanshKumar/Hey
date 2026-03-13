<p align="center">
  <img src="https://img.shields.io/badge/Hey-Chat-7dd3fc?style=for-the-badge&logo=messenger&logoColor=white" alt="Hey Chat" />
</p>

<h1 align="center">Hey — Real-Time Chat Application</h1>

<p align="center">
  A modern, full-stack real-time chat application built with React, Express, Socket.IO, and MongoDB.
  <br />
  Features AI-powered tools, voice notes, media sharing, group chats, and a sleek dark-mode UI.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express" />
  <img src="https://img.shields.io/badge/Socket.IO-4-010101?style=flat-square&logo=socket.io" />
  <img src="https://img.shields.io/badge/MongoDB-Prisma-47A248?style=flat-square&logo=mongodb" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss" />
  <img src="https://img.shields.io/badge/Gemini_AI-Powered-4285F4?style=flat-square&logo=google" />
</p>

---

## ✨ Features

### 💬 Real-Time Messaging
- **Instant delivery** via WebSocket rooms with Socket.IO
- **Read receipts** — sent, delivered, and read status indicators
- **Typing indicators** — see when someone is typing
- **Message editing** — edit messages within a 15-minute window
- **Message deletion** — delete for self or for everyone (1-hour window)
- **Reply to messages** — threaded reply with quoted preview
- **Emoji picker** — rich emoji selection with search

### 🎙️ Voice Notes
- **Record & send** voice messages directly from the chat
- **WhatsApp-style playback** — custom waveform player with play/pause, duration, and progress
- **WaveSurfer.js** visualization for audio waveforms

### 📎 Media Sharing
- **Image & video uploads** via Cloudinary (up to 50MB)
- **Lightbox viewer** — full-screen media preview
- **File type detection** — automatic categorization of images, videos, and audio

### 👥 Group Chats
- **Create groups** with name, description, and member selection
- **Role management** — admin and member roles
- **Add/remove members** — admins can manage group membership
- **Group info panel** — view members, update settings, leave or delete

### 🤖 AI-Powered Features (Google Gemini)
- **Smart replies** — context-aware reply suggestions
- **AI chat bot** — dedicated AI conversation partner
- **Chat summarization** — generate conversation summaries
- **Writing tools** — rephrase text in different tones (Professional, Casual, Friendly, Formal)
- **Real-time translation** — translate messages to preferred language

### 🔍 Search
- **Global message search** — search across all conversations
- **Filter by sender**, date range, and media type
- **Jump to message** — click search results to navigate to the original message

### 🔔 Notifications
- **WhatsApp-style unread badges** — per-conversation unread message counts
- **Toast notifications** — slide-in alerts for new messages with sender info
- **Notification sound** — audio ping for incoming messages
- **Bold highlighting** — unread conversations get accent-colored timestamps and bold names

### 🛡️ Privacy & Security
- **JWT authentication** with HTTP-only cookie support
- **User blocking** — block/unblock users, prevents messaging
- **Read receipt toggle** — users can disable read receipts
- **Password hashing** with bcrypt

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React, Tailwind CSS 4, Lucide Icons |
| **Backend** | Express, Node.js |
| **Database** | MongoDB with Prisma ORM |
| **Real-Time** | Socket.IO |
| **AI** | Google Gemini API (`@google/generative-ai`) |
| **Media** | Cloudinary (image, video, audio hosting) |
| **Audio** | WaveSurfer.js (waveform visualization) |
| **Auth** | JWT + bcryptjs |

---

## 📁 Project Structure

```
Hey/
├── backend/
│   ├── config/          # Prisma, Cloudinary, environment config
│   ├── controllers/     # Route handlers (auth, messages, conversations, groups, AI)
│   ├── middleware/       # JWT auth middleware
│   ├── prisma/           # Database schema
│   ├── routes/           # Express route definitions
│   ├── services/         # AI service layer (Gemini integration)
│   ├── socket/           # Socket.IO event handlers
│   ├── utils/            # Helper utilities
│   └── server.js         # App entry point
│
├── frontend/
│   ├── src/
│   │   ├── components/   # React components (ChatWindow, Sidebar, Modals, etc.)
│   │   ├── context/      # React contexts (Auth, Chat, Socket)
│   │   ├── pages/        # Page components (Login, Register, Profile, Chat)
│   │   ├── utils/        # API client, helpers
│   │   └── index.css     # Global styles & design tokens
│   └── vite.config.js
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **MongoDB** (Atlas or local instance)
- **Cloudinary** account (free tier works)
- **Google AI API Key** (for Gemini features)

### 1. Clone the repository

```bash
git clone https://github.com/HirdyanshKumar/Hey.git
cd Hey
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:

```env
PORT=3000
DATABASE_URL=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/hey_chat
JWT_SECRET=your_jwt_secret_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
GEMINI_API_KEY=your_gemini_api_key
```

Generate Prisma client and push the schema:

```bash
npx prisma generate
npx prisma db push
```

Start the development server:

```bash
npm run dev
```

### 3. Frontend setup

```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/`:

```env
VITE_API_URL=http://localhost:3000/api
```

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---
