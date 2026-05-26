"use client";
import { useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Coffee } from "lucide-react";
import { usePomodoroStore } from "@/store/uiStore";

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function Pomodoro() {
  const { minutesLeft, secondsLeft, isRunning, isBreak, cyclesCompleted, tick, toggle, reset } = usePomodoroStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => tick(), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, tick]);

  const totalSeconds = isBreak ? 5 * 60 : 25 * 60;
  const elapsed      = totalSeconds - (minutesLeft * 60 + secondsLeft);
  const pct          = Math.max(0, 1 - elapsed / totalSeconds);
  const dashOffset   = CIRCUMFERENCE * (1 - pct);
  const timeStr      = `${String(minutesLeft).padStart(2,"0")}:${String(secondsLeft).padStart(2,"0")}`;

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl dark:bg-slate-800/60 bg-gray-100 dark:border dark:border-slate-700/50 border border-gray-200 p-6 text-center w-full">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest dark:text-slate-400 text-gray-600">
        {isBreak && <Coffee size={13} className="text-green-400" />}
        {isBreak ? "Break" : "Focus Session"}
        <span className="dark:text-slate-600 text-gray-400">·</span>
        <span className="dark:text-slate-500 text-gray-500">{cyclesCompleted} done</span>
      </div>
      <div className="relative flex items-center justify-center w-28 h-28 mx-auto">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth="8"/>
          <circle cx="50" cy="50" r={RADIUS} fill="none" stroke={isBreak ? "#22C55E" : "#3B82F6"} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dashOffset}
            style={{ transition:"stroke-dashoffset 0.9s linear" }}/>
        </svg>
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-2xl font-bold tabular-nums dark:text-slate-100 text-gray-900 flex items-center justify-center leading-none">{timeStr}</span>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={reset} className="p-2 rounded-lg dark:text-slate-500 text-gray-500 dark:hover:text-slate-300 hover:text-gray-700 dark:hover:bg-slate-700 hover:bg-gray-200 transition-colors">
          <RotateCcw size={15} />
        </button>
        <button onClick={toggle} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 active:scale-95 transition-all">
          {isRunning ? <Pause size={14} /> : <Play size={14} />}
          {isRunning ? "Pause" : "Start"}
        </button>
      </div>
    </div>
  );
}