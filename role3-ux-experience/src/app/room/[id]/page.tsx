"use client";

// 1. Added "use" to the React imports
import { useState, useRef, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import {
  Users, Mic, MicOff, Video, VideoOff,
  Pencil, Eraser, Square, Circle, Minus,
  Trash2, Download, ZoomIn, ZoomOut,
  RotateCcw, ChevronUp, ChevronDown, Type,
  Play, Pause, PhoneOff, Monitor, Grid,
} from "lucide-react";
import Pomodoro from "@/components/Pomodoro";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tool = "pencil" | "eraser" | "line" | "rectangle" | "circle" | "text";

interface Point { x: number; y: number }

interface Stroke {
  id: string;
  tool: Tool;
  colour: string;
  width: number;
  points: Point[];
  opacity: number;
  text?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const COLOURS = [
  "#ffffff", "#3B82F6", "#22C55E", "#EF4444",
  "#EAB308", "#A855F7", "#EC4899", "#F97316",
];

const BRUSH_SIZES = [2, 4, 8, 14, 20];

const PARTICIPANTS = [
  { name: "You",   initials: "Y", colour: "#3B82F6" },
  { name: "Priya", initials: "P", colour: "#A855F7" },
  { name: "Rohan", initials: "R", colour: "#22C55E" },
  { name: "Sara",  initials: "S", colour: "#EC4899" },
];

// ─── Remote Video Component ──────────────────────────────────────────────────
function RemoteVideo({ stream }: { stream: MediaStream }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.error("Error playing remote video:", e));
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
// 2. Updated the type definition for params to be a Promise
export default function WarRoom({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  
  // 3. Unwrap the params using the use() hook
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  // ── Canvas refs ──
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const overlayRef    = useRef<HTMLCanvasElement>(null); 
  const containerRef  = useRef<HTMLDivElement>(null);

  // ── Drawing state ──
  const [tool,        setTool]        = useState<Tool>("pencil");
  const [colour,      setColour]      = useState("#ffffff");
  const [brushSize,   setBrushSize]   = useState(4);
  const [opacity,     setOpacity]     = useState(1);
  const [strokes,     setStrokes]     = useState<Stroke[]>([]);
  const [isDrawing,   setIsDrawing]   = useState(false);
  const currentStroke = useRef<Stroke | null>(null);
  const startPoint    = useRef<Point | null>(null);

  // ── Media state ──
  const [muted,    setMuted]    = useState(false);
  const [camOff,   setCamOff]   = useState(false);

  // ── UI state ──
  const [showPomodoro,  setShowPomodoro]  = useState(true);
  const [showParticipants, setShowPart]  = useState(true);
  const [zoom,          setZoom]          = useState(1);
  const [focusMode,     setFocusMode]     = useState<"whiteboard" | "call">("whiteboard");
  const [localStream,   setLocalStream]   = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // ── WebRTC Peer State ──
  const [remoteStreams, setRemoteStreams] = useState<{ [socketId: string]: MediaStream }>({});
  const peerConnections = useRef<{ [socketId: string]: RTCPeerConnection }>({});
  const localStreamRef = useRef<MediaStream | null>(null);

  const updateLocalStream = (stream: MediaStream | null) => {
    setLocalStream(stream);
    localStreamRef.current = stream;
  };
  
  // ── Sockets & Real-Time Sync State ──
  const socketRef = useRef<any>(null);
  const [participants, setParticipants] = useState<Array<{ id: string; name: string; initials: string; colour: string }>>([
    { id: "local", name: "You", initials: "Y", colour: "#3B82F6" }
  ]);
  const [roomTimer, setRoomTimer] = useState({ is_running: false, seconds_left: 1500, type: "pomodoro" });

  const createPeerConnection = useCallback((peerId: string, socket: any, stream: MediaStream) => {
    if (peerConnections.current[peerId]) {
      return peerConnections.current[peerId];
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ]
    });

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStreams(prev => ({
          ...prev,
          [peerId]: event.streams[0]
        }));
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc_signal", {
          roomId: id,
          targetId: peerId,
          signal: {
            type: "ice-candidate",
            candidate: event.candidate
          }
        });
      }
    };

    peerConnections.current[peerId] = pc;
    return pc;
  }, [id]);

  const initiateCall = useCallback(async (peerId: string, socket: any, stream: MediaStream) => {
    try {
      const pc = createPeerConnection(peerId, socket, stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc_signal", {
        roomId: id,
        targetId: peerId,
        signal: {
          type: "offer",
          sdp: offer
        }
      });
    } catch (err) {
      console.error("Failed to initiate WebRTC call:", err);
    }
  }, [createPeerConnection, id]);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    async function startWebcam() {
      if (!camOff) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: {
              echoCancellation: true,
              noiseSuppression: true
            } 
          });
          activeStream = stream;
          updateLocalStream(stream);
          
          // Apply initial mute state
          stream.getAudioTracks().forEach(track => {
            track.enabled = !muted;
          });
        } catch (err) {
          console.error("Failed to access webcam/mic:", err);
        }
      } else {
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(t => t.stop());
          updateLocalStream(null);
        }
      }
    }
    startWebcam();
    return () => {
      if (activeStream) activeStream.getTracks().forEach(t => t.stop());
    };
  }, [camOff]);

  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }, [muted]);

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
      videoRef.current.play().catch(e => console.error("Error playing video:", e));
    }
  }, [localStream]);

  // ─── Canvas setup ─────────────────────────────────────────────────────────
  const redrawAll = useCallback((canvas: HTMLCanvasElement, strokeList: Stroke[]) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokeList.forEach(s => drawStroke(ctx, s));
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas  = canvasRef.current;
    const overlay = overlayRef.current;
    const cont    = containerRef.current;
    if (!canvas || !overlay || !cont) return;

    const { width, height } = cont.getBoundingClientRect();
    canvas.width  = width;
    canvas.height = height;
    overlay.width = width;
    overlay.height = height;

    redrawAll(canvas, strokes);
  }, [strokes, redrawAll]);

  useEffect(() => {
    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [resizeCanvas]);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001");
    socketRef.current = socket;

    const username = localStorage.getItem("username") || "Teammate";
    socket.emit("join_room", { roomId: id, username });

    socket.on("room_state_update", (roomState: any) => {
      if (roomState.timer) {
        setRoomTimer(roomState.timer);
      }
      if (roomState.canvas_history) {
        setStrokes(roomState.canvas_history);
        if (canvasRef.current) {
          redrawAll(canvasRef.current, roomState.canvas_history);
        }
      }
      if (roomState.active_users) {
        const mappedUsers = roomState.active_users.map((u: any) => {
          const initials = u.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
          const colors = ["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#6366F1"];
          const hash = u.name.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
          const color = colors[hash % colors.length];
          return {
            id: u.id,
            name: u.id === socket.id ? "You" : u.name,
            initials: initials || "U",
            colour: color
          };
        });
        setParticipants(mappedUsers);
      }
    });

    socket.on("update_user_list", (users: any[]) => {
      const mappedUsers = users.map((u: any) => {
        const initials = u.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
        const colors = ["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#6366F1"];
        const hash = u.name.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
        const color = colors[hash % colors.length];
        return {
          id: u.id,
          name: u.id === socket.id ? "You" : u.name,
          initials: initials || "U",
          colour: color
        };
      });
      setParticipants(mappedUsers);

      // WebRTC mesh: Existing users initiate WebRTC offers to the new user who just joined
      if (localStreamRef.current) {
        mappedUsers.forEach(u => {
          if (u.id && u.id !== socket.id && !peerConnections.current[u.id]) {
            initiateCall(u.id, socket, localStreamRef.current!);
          }
        });
      }

      // Cleanup disconnected peers
      const currentIds = new Set(users.map(u => u.id));
      Object.keys(peerConnections.current).forEach(peerId => {
        if (!currentIds.has(peerId)) {
          if (peerConnections.current[peerId]) {
            peerConnections.current[peerId].close();
            delete peerConnections.current[peerId];
          }
          setRemoteStreams(prev => {
            const next = { ...prev };
            delete next[peerId];
            return next;
          });
        }
      });
    });

    socket.on("webrtc_signal", async ({ senderId, signal }) => {
      const stream = localStreamRef.current;
      if (!stream) return;

      let pc = peerConnections.current[senderId];

      if (signal.type === "offer") {
        pc = createPeerConnection(senderId, socket, stream);
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc_signal", {
          roomId: id,
          targetId: senderId,
          signal: {
            type: "answer",
            sdp: answer
          }
        });
      } else if (signal.type === "answer") {
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        }
      } else if (signal.type === "ice-candidate") {
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (err) {
            console.error("Error adding ice candidate:", err);
          }
        }
      }
    });

    socket.on("receive_stroke", (stroke: Stroke) => {
      setStrokes(prev => {
        const next = [...prev, stroke];
        if (canvasRef.current) {
          redrawAll(canvasRef.current, next);
        }
        return next;
      });
    });

    socket.on("canvas_cleared", () => {
      setStrokes([]);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    });

    return () => {
      socket.disconnect();
      // Cleanup WebRTC connections on component unmount
      Object.keys(peerConnections.current).forEach(peerId => {
        if (peerConnections.current[peerId]) {
          peerConnections.current[peerId].close();
        }
      });
      peerConnections.current = {};
      setRemoteStreams({});
    };
  }, [id, redrawAll, initiateCall, createPeerConnection]);

  function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    if (stroke.points.length === 0) return;
    ctx.save();
    ctx.globalAlpha   = stroke.opacity;
    
    if (stroke.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.colour;
    }
    
    ctx.lineWidth     = stroke.width;
    ctx.lineCap       = "round";
    ctx.lineJoin      = "round";

    if (stroke.tool === "pencil" || stroke.tool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      stroke.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    } else if (stroke.tool === "line" && stroke.points.length >= 2) {
      const last = stroke.points[stroke.points.length - 1];
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    } else if (stroke.tool === "rectangle" && stroke.points.length >= 2) {
      const p0   = stroke.points[0];
      const last = stroke.points[stroke.points.length - 1];
      ctx.strokeRect(p0.x, p0.y, last.x - p0.x, last.y - p0.y);
    } else if (stroke.tool === "circle" && stroke.points.length >= 2) {
      const p0   = stroke.points[0];
      const last = stroke.points[stroke.points.length - 1];
      const rx   = Math.abs(last.x - p0.x) / 2;
      const ry   = Math.abs(last.y - p0.y) / 2;
      const cx   = p0.x + (last.x - p0.x) / 2;
      const cy   = p0.y + (last.y - p0.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
    } else if (stroke.tool === "text" && stroke.text) {
      ctx.font = `${stroke.width * 2 + 14}px DM Sans, Inter, sans-serif`;
      ctx.fillStyle = stroke.colour;
      ctx.fillText(stroke.text, stroke.points[0].x, stroke.points[0].y);
    }
    ctx.restore();
  }

  function drawPreview(point: Point) {
    const overlay = overlayRef.current;
    const stroke  = currentStroke.current;
    if (!overlay || !stroke) return;

    const ctx = overlay.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const previewStroke: Stroke = {
      ...stroke,
      points: [stroke.points[0], point],
    };
    drawStroke(ctx, previewStroke);
  }

  function getPoint(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = getPoint(e);
    startPoint.current = point;

    if (tool === "text") {
      const text = prompt("Enter text to add to whiteboard:");
      if (text && text.trim()) {
        const textStroke: Stroke = {
          id: crypto.randomUUID(),
          tool: "text",
          colour,
          width: brushSize,
          points: [point],
          opacity,
          text: text.trim()
        };
        setStrokes(prev => {
          const next = [...prev, textStroke];
          if (socketRef.current) {
            socketRef.current.emit("draw_stroke", { roomId: id, stroke: textStroke });
          }
          if (canvasRef.current) {
            redrawAll(canvasRef.current, next);
          }
          return next;
        });
      }
      setIsDrawing(false);
      return;
    }

    const newStroke: Stroke = {
      id:       crypto.randomUUID(),
      tool,
      colour,
      width:   tool === "eraser" ? brushSize * 3 : brushSize,
      points:  [point],
      opacity,
    };
    currentStroke.current = newStroke;
    setIsDrawing(true);

    if (tool === "pencil" || tool === "eraser") {
      const canvas = canvasRef.current!;
      const ctx    = canvas.getContext("2d")!;
      ctx.save();
      ctx.globalAlpha = opacity;
      if (tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = colour;
      }
      ctx.lineWidth   = newStroke.width;
      ctx.lineCap     = "round";
      ctx.lineJoin    = "round";
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.restore();
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing || !currentStroke.current) return;
    const point = getPoint(e);

    if (tool === "pencil" || tool === "eraser") {
      const canvas = canvasRef.current!;
      const ctx    = canvas.getContext("2d")!;
      const prev   = currentStroke.current.points[currentStroke.current.points.length - 1];

      ctx.save();
      ctx.globalAlpha = opacity;
      if (tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = colour;
      }
      ctx.lineWidth   = currentStroke.current.width;
      ctx.lineCap     = "round";
      ctx.lineJoin    = "round";
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      ctx.restore();

      currentStroke.current.points.push(point);
    } else {
      drawPreview(point);
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing || !currentStroke.current) return;
    const point = getPoint(e);

    const finalStroke: Stroke = {
      ...currentStroke.current,
      points: [...currentStroke.current.points, point],
    };

    if (tool !== "pencil" && tool !== "eraser") {
      const canvas = canvasRef.current!;
      const ctx    = canvas.getContext("2d")!;
      drawStroke(ctx, finalStroke);

      const overlay = overlayRef.current!;
      overlay.getContext("2d")!.clearRect(0, 0, overlay.width, overlay.height);
    }

    setStrokes(prev => {
      const next = [...prev, finalStroke];
      if (socketRef.current) {
        socketRef.current.emit("draw_stroke", { roomId: id, stroke: finalStroke });
      }
      return next;
    });
    currentStroke.current = null;
    setIsDrawing(false);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setStrokes([]);
    if (socketRef.current) {
      socketRef.current.emit("clear_canvas", id);
    }
  }

  function undoLast() {
    const newStrokes = strokes.slice(0, -1);
    setStrokes(newStrokes);
    if (canvasRef.current) redrawAll(canvasRef.current, newStrokes);
  }

  function downloadCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link    = document.createElement("a");
    link.download = `studysync-warroom-${id}.png`;
    link.href     = canvas.toDataURL();
    link.click();
  }

  const cursorStyle = tool === "eraser" ? "cell" : "crosshair";

  return (
    <div className="flex flex-col h-full dark:bg-slate-950 bg-slate-50 text-slate-900 dark:text-slate-100 transition-colors">
      <div className="flex items-center gap-3 px-5 py-2.5 dark:bg-slate-900 bg-white border-b dark:border-slate-700/50 border-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-blue-500 dark:text-blue-400" />
          <span className="text-sm font-semibold dark:text-slate-200 text-slate-800">War Room</span>
          <span className="text-xs dark:text-slate-500 text-slate-400 font-mono">#{id}</span>
        </div>
        
        {/* Beautiful Centered Focus Toggle */}
        <div className="flex items-center justify-center flex-1">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border dark:border-slate-700 border-slate-200 shadow-xs">
            <button
              onClick={() => setFocusMode("whiteboard")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                focusMode === "whiteboard"
                  ? "bg-white dark:bg-slate-900 text-blue-500 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <Monitor size={12} />
              <span>Whiteboard</span>
            </button>
            <button
              onClick={() => setFocusMode("call")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                focusMode === "call"
                  ? "bg-white dark:bg-slate-900 text-blue-500 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <Grid size={12} />
              <span>Focus on Call</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-green-500 dark:text-green-400 font-medium">Live</span>
          <span className="text-slate-355 mx-2">·</span>
          <span className="text-xs dark:text-slate-400 text-slate-600">{participants.length} participants</span>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex flex-col flex-1 min-w-0 relative">
          <div ref={containerRef} className="flex-1 relative overflow-hidden dark:bg-slate-950 bg-slate-100" style={{ cursor: cursorStyle }}>
            
            {/* ── CENTRAL STAGE: WHITEBOARD OR CALL GRID ── */}
            {focusMode === "call" ? (
              <div className="absolute inset-0 flex items-center justify-center p-6 dark:bg-slate-950 bg-slate-100 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-4xl">
                  {/* Local video feed */}
                  <div className="relative rounded-2xl dark:bg-slate-900 bg-white dark:border-slate-800 border-slate-200 border overflow-hidden shadow-lg aspect-video flex flex-col items-center justify-center transition-all duration-300">
                    {!camOff && localStream ? (
                      <video 
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="relative flex items-center justify-center w-full h-full">
                        <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at center, #3B82F6, transparent)` }} />
                        <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-xl font-bold text-white shadow-md">
                          Y
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-md dark:bg-slate-950/80 bg-white/80 backdrop-blur-sm shadow-sm border dark:border-slate-800 border-slate-150">
                      <span className="text-xs font-semibold dark:text-slate-200 text-slate-800">You</span>
                      {muted && <MicOff size={11} className="text-red-500" />}
                    </div>
                  </div>

                  {/* Classmates video feeds */}
                  {participants.filter(p => p.name !== "You").map((p) => {
                    const remoteStream = remoteStreams[p.id];
                    return (
                      <div key={p.id || p.name} className="relative rounded-2xl dark:bg-slate-900 bg-white dark:border-slate-800 border-slate-200 border overflow-hidden shadow-lg aspect-video flex flex-col items-center justify-center transition-all duration-300">
                        {remoteStream ? (
                          <RemoteVideo stream={remoteStream} />
                        ) : (
                          <div className="relative flex items-center justify-center w-full h-full">
                            <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at center, ${p.colour}, transparent)` }} />
                            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-md" style={{ background: p.colour }}>
                              {p.initials}
                            </div>
                            {/* Speaker pulse animation */}
                            <span className="absolute w-20 h-20 rounded-full border border-green-500/40 animate-ping opacity-75" />
                          </div>
                        )}
                        <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-md dark:bg-slate-950/80 bg-white/80 backdrop-blur-sm shadow-sm border dark:border-slate-800 border-slate-150">
                          <span className="text-xs font-semibold dark:text-slate-200 text-slate-800">{p.name}</span>
                          <div className="flex items-end gap-px h-3 mb-0.5">
                            {[1, 2, 3, 2, 1].map((h, idx) => (
                              <div key={idx} className="w-0.5 bg-green-500 rounded-full" style={{ height: `${h * 2}px`, animation: `pulse ${0.3 + idx * 0.1}s ease-in-out infinite alternate` }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full"
                  style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerLeave={onPointerUp}
                />
                <canvas
                  ref={overlayRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
                />
                {strokes.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="flex flex-col items-center gap-2 dark:text-slate-700 text-slate-400">
                      <Pencil size={32} strokeWidth={1} />
                      <p className="text-sm">Start drawing to collaborate</p>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
                  <button onClick={() => setZoom(z => Math.min(z + 0.1, 3))} className="w-8 h-8 rounded-lg dark:bg-slate-800 bg-white border dark:border-slate-700 border-slate-200 dark:text-slate-400 text-slate-650 dark:hover:text-slate-200 hover:text-slate-900 flex items-center justify-center transition-colors shadow-sm">
                    <ZoomIn size={14} />
                  </button>
                  <button onClick={() => setZoom(1)} className="w-8 h-8 rounded-lg dark:bg-slate-800 bg-white border dark:border-slate-700 border-slate-200 dark:text-slate-500 text-slate-650 dark:hover:text-slate-200 hover:text-slate-900 flex items-center justify-center text-[10px] font-bold transition-colors shadow-sm">
                    {Math.round(zoom * 100)}%
                  </button>
                  <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.3))} className="w-8 h-8 rounded-lg dark:bg-slate-800 bg-white border dark:border-slate-700 border-slate-200 dark:text-slate-400 text-slate-650 dark:hover:text-slate-200 hover:text-slate-900 flex items-center justify-center transition-colors shadow-sm">
                    <ZoomOut size={14} />
                  </button>
                </div>
              </>
            )}

          </div>

          <div className="flex items-center gap-2 px-4 py-2.5 dark:bg-slate-900 bg-white border-t dark:border-slate-700/50 border-slate-200 flex-wrap shrink-0">
            
            {/* Call Controls Group */}
            <div className="flex items-center gap-1.5 dark:bg-slate-800 bg-slate-100 rounded-lg p-1 border dark:border-slate-700 border-slate-200 mr-2 shadow-xs">
              <button 
                onClick={() => setMuted(v => !v)}
                title={muted ? "Unmute Microphone" : "Mute Microphone"}
                className={`p-1.5 rounded-md transition-all active:scale-95 flex items-center justify-center ${
                  muted 
                    ? "bg-rose-500/20 text-rose-500 hover:bg-rose-500/30" 
                    : "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30"
                }`}
              >
                {muted ? <MicOff size={14} /> : <Mic size={14} />}
              </button>

              <button 
                onClick={() => setCamOff(v => !v)}
                title={camOff ? "Turn Camera On" : "Turn Camera Off"}
                className={`p-1.5 rounded-md transition-all active:scale-95 flex items-center justify-center ${
                  camOff 
                    ? "bg-rose-500/20 text-rose-500 hover:bg-rose-500/30" 
                    : "bg-indigo-500/20 text-indigo-500 hover:bg-indigo-500/30"
                }`}
              >
                {camOff ? <VideoOff size={14} /> : <Video size={14} />}
              </button>

              <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-0.5" />

              <button 
                onClick={() => router.push("/")}
                title="Leave Study Room"
                className="p-1.5 rounded-md bg-red-500 text-white hover:bg-red-650 active:scale-95 flex items-center justify-center transition-all"
              >
                <PhoneOff size={14} />
              </button>
            </div>

            <div className="flex items-center gap-1 dark:bg-slate-800 bg-slate-100 rounded-lg p-1 border dark:border-slate-700 border-slate-200">
              {([
                { t: "pencil",    Icon: Pencil,    label: "Pencil"    },
                { t: "eraser",    Icon: Eraser,    label: "Eraser"    },
                { t: "line",      Icon: Minus,     label: "Line"      },
                { t: "rectangle", Icon: Square,    label: "Rectangle" },
                { t: "circle",    Icon: Circle,    label: "Circle"    },
                { t: "text",      Icon: Type,      label: "Text"      },
              ] as const).map(({ t, Icon, label }) => (
                <button
                  key={t}
                  onClick={() => setTool(t)}
                  title={label}
                  disabled={focusMode === "call"}
                  className={[
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed",
                    tool === t ? "bg-blue-500 text-white shadow-sm" : "dark:text-slate-400 text-slate-650 dark:hover:text-slate-200 hover:text-slate-900 dark:hover:bg-slate-700 hover:bg-slate-200",
                  ].join(" ")}
                >
                  <Icon size={13} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 dark:bg-slate-800 bg-slate-100 rounded-lg p-1.5 border dark:border-slate-700 border-slate-200">
              {COLOURS.map(c => (
                <button
                  key={c}
                  onClick={() => setColour(c)}
                  style={{ background: c }}
                  disabled={focusMode === "call"}
                  className={[
                    "w-5 h-5 rounded-full transition-all hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed",
                    colour === c ? "ring-2 ring-offset-1 dark:ring-offset-slate-800 ring-offset-white ring-blue-400 scale-110" : "border dark:border-slate-600 border-slate-300",
                  ].join(" ")}
                />
              ))}
            </div>

            <div className="flex items-center gap-1 dark:bg-slate-800 bg-slate-100 rounded-lg p-1 border dark:border-slate-700 border-slate-200">
              {BRUSH_SIZES.map(s => (
                <button
                  key={s}
                  onClick={() => setBrushSize(s)}
                  disabled={focusMode === "call"}
                  className={[
                    "w-7 h-7 rounded-md flex items-center justify-center transition-all disabled:opacity-30",
                    brushSize === s ? "bg-blue-500 text-white" : "dark:text-slate-400 text-slate-650 dark:hover:bg-slate-750 hover:bg-slate-200",
                  ].join(" ")}
                >
                  <span
                    className="rounded-full bg-current"
                    style={{
                      width:  Math.max(2, s / 2),
                      height: Math.max(2, s / 2),
                      background: brushSize === s ? "white" : "#94a3b8",
                    }}
                  />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] dark:text-slate-500 text-slate-550 font-medium">Opacity</span>
              <input type="range" min="0.1" max="1" step="0.1" value={opacity} onChange={e => setOpacity(Number(e.target.value))} disabled={focusMode === "call"} className="w-20 accent-blue-500 disabled:opacity-30" />
              <span className="text-[10px] dark:text-slate-400 text-slate-600 w-6">{Math.round(opacity * 100)}%</span>
            </div>

            <div className="flex items-center gap-1 ml-auto">
              <button onClick={undoLast} disabled={strokes.length === 0 || focusMode === "call"} className="p-2 rounded-lg dark:text-slate-400 text-slate-550 dark:hover:text-slate-200 hover:text-slate-900 dark:hover:bg-slate-850 hover:bg-slate-100 disabled:opacity-30 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                <RotateCcw size={14} />
              </button>
              <button onClick={downloadCanvas} disabled={focusMode === "call"} className="p-2 rounded-lg dark:text-slate-400 text-slate-550 dark:hover:text-slate-200 hover:text-slate-900 dark:hover:bg-slate-850 hover:bg-slate-100 disabled:opacity-30 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                <Download size={14} />
              </button>
              <button onClick={clearCanvas} disabled={focusMode === "call"} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-500/10 hover:text-red-600 disabled:opacity-30 transition-colors border border-transparent hover:border-red-500/20 text-xs font-semibold">
                <Trash2 size={13} /> Clear
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col w-52 shrink-0 border-l dark:border-slate-700/50 border-slate-200 dark:bg-slate-900 bg-white overflow-y-auto">
          <div className="flex flex-col">
            <button onClick={() => setShowPart(v => !v)} className="flex items-center justify-between px-3 py-2.5 border-b dark:border-slate-700/50 border-slate-200 text-xs font-semibold dark:text-slate-400 text-slate-600 dark:hover:text-slate-200 hover:text-slate-950 transition-colors">
              <span className="flex items-center gap-1.5"><Users size={12} /> Participants ({participants.length})</span>
              {showParticipants ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {showParticipants && (
              <div className="flex flex-col gap-2 p-2">
                {participants.map((p, i) => {
                  const isLocal = i === 0;
                  const hasVideo = isLocal ? (!camOff && localStream) : remoteStreams[p.id];
                  return (
                    <div key={p.id || p.name} className="rounded-lg dark:bg-slate-800 bg-slate-50 border dark:border-slate-700 border-slate-200 overflow-hidden shadow-sm relative aspect-video flex flex-col justify-end">
                      {hasVideo ? (
                        isLocal ? (
                          <video 
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <RemoteVideo stream={remoteStreams[p.id]} />
                        )
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at center, ${p.colour}, transparent)` }} />
                          {isLocal && camOff ? (
                            <VideoOff size={16} className="text-slate-400 dark:text-slate-500" />
                          ) : (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm" style={{ background: p.colour }}>{p.initials}</div>
                          )}
                        </div>
                      )}
                      
                      {/* Control overlays */}
                      <div className="absolute bottom-1 left-2 right-2 flex items-center justify-between z-10 bg-slate-900/60 backdrop-blur-xs px-1.5 py-0.5 rounded-sm">
                        <span className="text-[9px] text-white font-semibold truncate max-w-[80px]">{p.name}</span>
                        {isLocal && muted ? (
                          <MicOff size={8} className="text-red-400 font-semibold" />
                        ) : (
                          <div className="flex items-end gap-px h-2">
                            {[1, 2, 1.5, 2.5, 1].map((h, j) => (
                              <div key={j} className="w-0.5 bg-green-400 rounded-full" style={{ height: `${h * 1.5}px`, animation: `pulse ${0.5 + j * 0.1}s ease-in-out infinite alternate` }} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex flex-col border-t dark:border-slate-700/50 border-slate-200">
            <button onClick={() => setShowPomodoro(v => !v)} className="flex items-center justify-between px-3 py-2.5 border-b dark:border-slate-700/50 border-slate-200 text-xs font-semibold dark:text-slate-400 text-slate-650 dark:hover:text-slate-200 hover:text-slate-950 transition-colors">
              <span>⏱ Shared Timer</span>
              {showPomodoro ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {showPomodoro && (
              <div className="p-4 flex flex-col items-center gap-4 text-center">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600">
                  {roomTimer.type === "break" ? (
                    <span className="text-green-500 dark:text-green-400 font-semibold">☕ Break</span>
                  ) : (
                    <span className="text-blue-500 dark:text-blue-400 font-semibold">🎯 Focus Session</span>
                  )}
                  <span className="dark:text-slate-600 text-slate-350">·</span>
                  <span className={roomTimer.is_running ? "text-green-500 dark:text-green-400 animate-pulse font-medium" : "text-slate-400 dark:text-slate-500 font-medium"}>
                    {roomTimer.is_running ? "Active" : "Paused"}
                  </span>
                </div>

                {(() => {
                  const totalSeconds = roomTimer.type === "break" ? 300 : 1500;
                  const pct = Math.max(0, roomTimer.seconds_left / totalSeconds);
                  const circumference = 2 * Math.PI * 44;
                  const dashOffset = circumference * (1 - pct);
                  const minutes = Math.floor(roomTimer.seconds_left / 60);
                  const seconds = roomTimer.seconds_left % 60;
                  const timeStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

                  return (
                    <div className="relative flex items-center justify-center w-28 h-28 mx-auto">
                      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="8"/>
                        <circle cx="50" cy="50" r="44" fill="none" stroke={roomTimer.type === "break" ? "#22C55E" : "#3B82F6"} strokeWidth="8"
                          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
                          style={{ transition: "stroke-dashoffset 0.9s linear" }}/>
                      </svg>
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-2xl font-bold tabular-nums dark:text-slate-100 text-slate-850 flex items-center justify-center leading-none">{timeStr}</span>
                    </div>
                  );
                })()}

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => socketRef.current?.emit("reset_timer", id)} 
                    title="Reset Room Timer"
                    className="p-2 rounded-lg dark:text-slate-500 text-slate-400 dark:hover:text-slate-300 hover:text-slate-650 dark:hover:bg-slate-800 hover:bg-slate-100 transition-all active:scale-95 border border-transparent dark:hover:border-slate-700 hover:border-slate-200"
                  >
                    <RotateCcw size={15} />
                  </button>
                  <button 
                    onClick={() => socketRef.current?.emit("toggle_timer", id)} 
                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 active:scale-95 transition-all shadow-sm"
                  >
                    {roomTimer.is_running ? <Pause size={14} /> : <Play size={14} />}
                    {roomTimer.is_running ? "Pause" : "Start"}
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="mt-auto px-3 py-2 border-t dark:border-slate-700/50 border-slate-200">
            <p className="text-[10px] dark:text-slate-500 text-slate-450">{strokes.length} stroke{strokes.length !== 1 ? "s" : ""} on canvas</p>
          </div>
        </div>
      </div>
    </div>
  );
}