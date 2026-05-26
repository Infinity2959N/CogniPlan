require('dotenv').config(); 
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const hmssdk = require('@100mslive/server-sdk');
const { throttle } = require('./utils');

const app = express();
app.use(cors());

// Initialize 100ms SDK using keys from your .env file
let sdk = null;
if (process.env.HMS_ACCESS_KEY && process.env.HMS_SECRET_KEY) {
    try {
        sdk = new hmssdk.SDK(process.env.HMS_ACCESS_KEY, process.env.HMS_SECRET_KEY);
        console.log("🔑 100ms SDK initialized successfully.");
    } catch (e) {
        console.error("⚠️ Failed to initialize 100ms SDK:", e.message);
    }
} else {
    console.warn("⚠️ 100ms keys not found in .env. Video tokens will be generated using mock values.");
}

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL || "http://localhost:3000", methods: ["GET", "POST"] }
});

// State: Store rooms, users, and DRAWING HISTORY
let rooms = {}; 

io.on('connection', (socket) => {
    
    // --- 1. ROOM JOINING LOGIC ---
    socket.on('join_room', ({ roomId, username }) => {
        socket.join(roomId);
        
        if (!rooms[roomId]) {
            rooms[roomId] = {
                room_id: roomId,
                active_users: [],
                canvas_history: [],
                timer: { is_running: false, seconds_left: 1500, type: "pomodoro" }
            };
        }

        const newUser = { id: socket.id, name: username, status: "watching" };
        rooms[roomId].active_users.push(newUser);

        // Sync: Send full state to the new user
        socket.emit('room_state_update', rooms[roomId]);
        
        // Update others in the room
        socket.to(roomId).emit('update_user_list', rooms[roomId].active_users);
        console.log(`👤 ${username} joined room: ${roomId}`);
    });

    // --- 2. WHITEBOARD DRAWING LOGIC ---
    socket.on('draw_stroke', ({ roomId, stroke }) => {
        if (rooms[roomId]) {
            const enrichedStroke = {
                ...stroke,
                userId: socket.id,
                timestamp: Date.now() 
            };

            rooms[roomId].canvas_history.push(enrichedStroke);
            socket.to(roomId).emit('receive_stroke', enrichedStroke);
        }
    });

    socket.on('clear_canvas', (roomId) => {
        if (rooms[roomId]) {
            rooms[roomId].canvas_history = [];
            io.to(roomId).emit('canvas_cleared');
        }
    });

    socket.on('request_video_token', async ({ roomId, role }) => {
        try {
            if (sdk) {
                // Using getManagementToken for the updated SDK version
                const token = await sdk.getManagementToken({
                    room_id: roomId, 
                    role: role || 'guest' 
                });
                socket.emit('video_token_received', { token });
                console.log(`🔑 Video Token generated for ${socket.id}`);
            } else {
                const mockToken = `mock-token-${Math.random().toString(36).substring(7)}`;
                socket.emit('video_token_received', { token: mockToken });
                console.log(`🔑 Mock Video Token generated for ${socket.id}`);
            }
        } catch (error) {
            console.error("❌ Video Token Error:", error);
            socket.emit('video_error', { message: "Token generation failed" });
        }
    });

    // --- WebRTC signaling bridge for zero-cost, high-performance video calls ---
    socket.on('webrtc_signal', ({ roomId, targetId, signal }) => {
        io.to(targetId).emit('webrtc_signal', {
            senderId: socket.id,
            signal
        });
    });

    socket.on('toggle_timer', (roomId) => {
        if (rooms[roomId] && rooms[roomId].timer) {
            rooms[roomId].timer.is_running = !rooms[roomId].timer.is_running;
            io.to(roomId).emit('room_state_update', rooms[roomId]);
        }
    });

    socket.on('reset_timer', (roomId) => {
        if (rooms[roomId] && rooms[roomId].timer) {
            rooms[roomId].timer.is_running = false;
            rooms[roomId].timer.seconds_left = rooms[roomId].timer.type === "pomodoro" ? 1500 : 300;
            io.to(roomId).emit('room_state_update', rooms[roomId]);
        }
    });

    // --- 4. DISCONNECT CLEANUP ---
    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            rooms[roomId].active_users = rooms[roomId].active_users.filter(u => u.id !== socket.id);
            io.to(roomId).emit('update_user_list', rooms[roomId].active_users);
        }
        console.log(`🔌 User disconnected: ${socket.id}`);
    });
});

// Tick timer for rooms
setInterval(() => {
    for (const roomId in rooms) {
        const room = rooms[roomId];
        if (room.timer && room.timer.is_running) {
            if (room.timer.seconds_left > 0) {
                room.timer.seconds_left--;
            } else {
                const nextType = room.timer.type === "pomodoro" ? "break" : "pomodoro";
                room.timer.type = nextType;
                room.timer.seconds_left = nextType === "pomodoro" ? 1500 : 300;
                room.timer.is_running = false;
            }
            io.to(roomId).emit('room_state_update', room);
        }
    }
}, 1000);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 ENGINE ACTIVE ON PORT ${PORT}`));