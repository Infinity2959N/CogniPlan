# 🚀 CogniPlan: Premium Collaborative Study Workspace

**CogniPlan** is a state-of-the-art, high-aesthetic study portal designed for spaced repetition preparation, individual deep-focus, and real-time collaborative group study. Built on a modular multi-role architecture, it features responsive Light/Dark styling, a real-time synchronized whiteboard, collaborative Pomodoro clocks, and **zero-cost, high-performance peer-to-peer WebRTC video/audio conferencing**.

---

## 📸 Key Features

### 1. Dynamic Spaced Repetition (SRS) Dashboard
- **Intelligent Recall Queue**: Dynamically schedules focus topics based on spaced repetition intervals.
- **Streak & Performance Analytics**: Keep track of daily prep with streak counts and interactive statistics.
- **Group Session Markers**: Distinctive purple markers indicate topics added during collaborative study.
- **Full Theme Support**: Sleek, Harmonious colors that transition between a gorgeous dark slate aesthetic and clean light mode.

### 2. Live Collaborative "War Room" Study Hub (`/room/[id]`)
- **Zero-Cost Native P2P WebRTC Video Call**: Built directly on native browser WebRTC using the existing WebSocket server for signaling. **No paid API keys, credit cards, or external services required.**
- **Mesh Multi-Video Grid & Sidebar Thumbnails**: Plays live feeds inside the central grid (Call focus) and embeds camera thumbnails inside the sidebar participant cards, featuring active voice-modulation wave meters.
- **Synchronized Shared Whiteboard**: Draw in real-time sync with Pencil, Lines, Rectangles, Circles, and dynamic Text tools. Includes a theme-agnostic composite eraser (`destination-out`) and high-end palette controls.
- **Synchronized Shared Pomodoro Timer**: Runs in absolute sync across all peers in the room using server ticks, featuring synchronized Play/Pause and Reset socket event bridges.
- **Centered Stage Focus Toggle**: Seamlessly switch screen focus between **Whiteboard** and **Focus on Call** via centered header tabs.
- **Compact Toolbar Integration**: Call controls (Mic mute, Camera toggle, Hang up) are neatly docked inside the bottom static tools bar to preserve screen drawing estate.

---

## 🏗 Project Architecture & Structure

The repository is organized into three specialized service components:

```
cogniplan/
├── role1-systems-logic/      # Backend Systems & Database API
├── role2-realtime-engine/     # Socket.io Real-Time & WebRTC Signaling Engine
└── role3-ux-experience/       # Next.js Frontend Portal Client Application
```

### 📦 Services Breakdown

*   **`role3-ux-experience` (Frontend Client)**:
    *   *Stack*: Next.js 16, TypeScript, Tailwind CSS, Framer Motion, Axios, React Query, Zustand.
    *   *Responsibility*: Renders the premium user interface, manages client-side query state caches, captures media streams, and renders WebRTC/whiteboard canvas elements.
*   **`role2-realtime-engine` (Real-Time Websocket & WebRTC Gateway)**:
    *   *Stack*: Node.js, Express, Socket.io.
    *   *Responsibility*: Broadcasts drawing paths, synchronizes room Pomodoro timer intervals, tracks active users, and bridges P2P WebRTC SDP/ICE candidate signals.
*   **`role1-systems-logic` (Core REST Systems API)**:
    *   *Stack*: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL.
    *   *Responsibility*: Manages user authentication, database read/writes for focus topics, spaced repetition calculations, and cron-like daily revision queue scans.

---

## ⚙️ Environment Configuration

To make deployment and staging seamless, all hardcoded server links have been replaced with configurable environment variables:

### 1. Frontend (`role3-ux-experience/.env`)
Create a `.env` or `.env.local` inside the frontend directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:4001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

### 2. Real-Time Engine (`role2-realtime-engine/.env`)
Create a `.env` inside the socket server directory:
```env
PORT=3001
CLIENT_URL=http://localhost:3000
```

### 3. Backend Database API (`role1-systems-logic/.env`)
Create a `.env` inside the systems directory:
```env
PORT=4001
CLIENT_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cogniplan
JWT_SECRET=super-secret-jwt-key
```

---

## 🚀 Local Quick Start

### Step 1: Run the Backend Database API
```bash
cd role1-systems-logic
npm install
npx prisma db push # Push schema to PostgreSQL database
npm run dev
```
*Service will start on `http://localhost:4001`*

### Step 2: Run the Socket Engine
```bash
cd role2-realtime-engine
npm install
npm start
```
*Service will start on `http://localhost:3001`*

### Step 3: Run the Frontend Client
```bash
cd role3-ux-experience
npm install
npm run dev
```
*Portal client will start on `http://localhost:3000`*
