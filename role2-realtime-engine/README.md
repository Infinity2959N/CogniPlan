# ⚡ CogniPlan Role 2: Real-Time Sockets & WebRTC Engine

This folder contains the real-time collaboration gateway service for **CogniPlan**. It is built on Node.js, Express, and Socket.io, providing drawing packet broadcasts, synchronized study timers, presence lists, and **direct peer-to-peer WebRTC video signaling**.

---

## 🛠 Features

- **P2P WebRTC Signaling Gateway**: Bridges SDP offers, SDP answers, and ICE candidates between clients via the `webrtc_signal` socket event. This provides zero-cost peer-to-peer audio and video calls directly between students without external keys, credit cards, or SaaS SDK dependencies.
- **Real-Time Collaborative Whiteboard**: Broadcasts stroke drawings and clears canvas pages instantly. Stores a local `canvas_history` cache in memory to sync drawings for late-joining students.
- **Real-Time Shared Pomodoro Timer**: Runs room-wide countdown timers inside a synchronized background ticking thread, responding to `toggle_timer` and `reset_timer` socket inputs.
- **Roster & User presence**: Tracks active usernames and client connection IDs to push live list updates when users join or disconnect.

---

## 📂 Key Files & Events

### 1. `server.js` (Server Gateway Core)
Initializes Socket.io and Express. Listens for the following events:
- `join_room`: Joins a Room ID, registers the username, returns the current drawing history + active user list, and updates room peers.
- `draw_stroke`: Receives drawing strokes, saves them to in-memory history, and broadcasts them.
- `clear_canvas`: Wipes drawings in a room.
- `webrtc_signal`: Bridges P2P calls by piping WebRTC signaling data (`type: offer`, `answer`, or `ice-candidate`) directly to a target socket ID.
- `toggle_timer`: Toggles room-wide study ticking.
- `reset_timer`: Resets Pomodoro intervals.

### 2. `utils.js` (Throttler Helpers)
Contains standard rate-limiting helpers like `throttle(func, delay)` to compress frequent draw/movement broadcasts over WebSockets.

---

## ⚙️ Environment Settings (`.env`)

Configure the engine's network settings:
```env
PORT=3001
CLIENT_URL=http://localhost:3000
```

---

## 🚀 Local Run Quickstart

1. **Install Socket dependencies**:
```bash
npm install
```

2. **Run Sockets Engine**:
```bash
npm start
```
*WebRTC Signaling and Shared Sockets will begin on `http://localhost:3001`.*

3. **Development Mode with auto-reloads**:
```bash
npm run dev
```
