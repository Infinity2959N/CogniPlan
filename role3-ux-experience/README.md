# 💻 CogniPlan Role 3: Premium Frontend Portal Client

This folder contains the client web application portal for **CogniPlan**. It is a modern, high-aesthetic dashboard built on Next.js 16, TypeScript, Tailwind CSS, and Framer Motion, supporting full light/dark responsive theme pairs, spaced repetition queues, interactive whiteboards, and **P2P WebRTC multi-party video conferencing**.

---

## 🛠 Frontend Client Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS & Vanilla CSS Design Systems
- **Client Cache**: TanStack React Query v5
- **Socket Client**: Socket.io-client
- **HTTP Client**: Axios
- **Animations**: Framer Motion
- **Icons**: Lucide React

---

## 📸 Key Portal Spaces

### 1. Spaced Repetition Queue Dashboard (`/`)
- Schedules topics based on SM2 spaced repetition dates.
- Interactive statistics cards for daily due tasks, total mastered items, and streak counts.
- Dynamic Quick-Add bar and modal dialogues, updating the TanStack cache query state instantly for refresh-free list additions.
- Responsive design adapting perfectly between premium dark-theme look and clean light mode colors.

### 2. Live Collaborative Study Room (`/room/[id]`)
- **Zero-Cost P2P WebRTC Multi-Cam Calling**: Utilizes native WebRTC `RTCPeerConnection` for direct browser-to-browser streaming. Cameras are displayed inside the central meeting grid and embedded directly as dynamic participants thumbnails in the right sidebar.
- **Stage Focus Toggles**: Centered header tab toggle switch lets users focus on either the drawing whiteboard or classmates' video feeds.
- **Static Docked Controls**: Mic mute, camera toggles, and hang up are docked inside the bottom static tools bar to preserve whiteboard stage space.
- **Collaborative Whiteboard**: Draws strokes and writes text in live sockets sync. Eraser utilizes `destination-out` blending, maintaining correctness on both light and dark canvas backdrops.
- **Synchronized Timer**: Countdowns are synchronized across all peers in a room via background server ticks, including Play/Pause and Reset broadcast triggers.

---

## ⚙️ Environment Settings (`.env`)

To connect to your database APIs and socket engines in production, create a `.env` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:4001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

---

## 🚀 Local Run Quickstart

1. **Install Dependencies**:
```bash
npm install
```

2. **Run Portal Web Server**:
```bash
npm run dev
```
*Portal client will listen on `http://localhost:3000`.*

3. **Verify and Compile Next.js Build**:
```bash
npm run build
```
