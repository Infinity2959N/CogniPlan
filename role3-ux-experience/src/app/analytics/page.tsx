"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSubjects, fetchStats, fetchTopics } from "@/lib/mockApi";
import { TopicStatus } from "@/types";

// ─── Colour map ───────────────────────────────────────────────────────────────
const STATUS_COLOUR: Record<TopicStatus, string> = {
  critical: "#EF4444",
  due:      "#EAB308",
  learning: "#3B82F6",
  mastered: "#22C55E",
};

// ─── Fake 7-day review history ────────────────────────────────────────────────
const DAYS    = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const REVIEWS = [4, 7, 5, 9, 6, 8, 12];
const maxRev  = Math.max(...REVIEWS);

// ─── Heatmap data (last 35 days) ─────────────────────────────────────────────
const HEATMAP = Array.from({ length: 35 }, (_, i) => ({
  day:   i,
  count: Math.random() > 0.3 ? Math.floor(Math.random() * 10) : 0,
}));

function heatColour(count: number): string {
  if (count === 0) return "#1e293b";
  if (count < 3)  return "#164e63";
  if (count < 6)  return "#0284c7";
  if (count < 9)  return "#3B82F6";
  return "#93c5fd";
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Analytics() {
  const [activeTab, setActiveTab] = useState<"overview" | "subjects" | "heatmap">("overview");
  const { data: topicsData, isLoading: topicsLoading, isError: topicsError } = useQuery({
    queryKey: ["topics"],
    queryFn: fetchTopics,
  });
  const { data: subjectsData, isLoading: subjectsLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: fetchSubjects,
  });
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
  });

  const topics = topicsData?.topics ?? [];
  const subjects = subjectsData?.subjects ?? [];
  const statusCounts = {
    critical: topics.filter((t: any) => t.status === "critical").length,
    due:      topics.filter((t: any) => t.status === "due").length,
    learning: topics.filter((t: any) => t.status === "learning").length,
    mastered: topics.filter((t: any) => t.status === "mastered").length,
  };
  const total = topics.length;
  const loading = topicsLoading || subjectsLoading || statsLoading;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="space-y-3 w-full max-w-4xl">
          <div className="h-12 rounded-3xl bg-slate-800/70 animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-28 rounded-3xl bg-slate-800/70 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto w-full">

      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-slate-100">Analytics</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Your learning progress overview
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.entries(statusCounts) as [TopicStatus, number][]).map(([status, count]) => (
          <div key={status} className="flex flex-col gap-2 p-4 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLOUR[status] }} />
              <span className="text-xs text-slate-400 capitalize">{status}</span>
            </div>
            <span className="text-2xl font-bold text-slate-100">{count}</span>
            <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${(count / total) * 100}%`, background: STATUS_COLOUR[status] }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/60 rounded-lg p-1 border border-slate-700/50 w-fit">
        {(["overview", "subjects", "heatmap"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              "px-4 py-1.5 rounded-md text-xs font-semibold transition-all capitalize",
              activeTab === tab
                ? "bg-blue-500 text-white"
                : "text-slate-400 hover:text-slate-200",
            ].join(" ")}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-4">
          {/* Bar chart — reviews per day */}
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-5">
            <p className="text-sm font-semibold text-slate-200 mb-4">
              Reviews This Week
            </p>
            <div className="flex items-end gap-3 h-40">
              {DAYS.map((day, i) => (
                <div key={day} className="flex flex-col items-center gap-2 flex-1">
                  <span className="text-xs text-slate-400 tabular-nums">
                    {REVIEWS[i]}
                  </span>
                  <div className="w-full rounded-t-md transition-all duration-500"
                    style={{
                      height:     `${(REVIEWS[i] / maxRev) * 120}px`,
                      background: i === 6
                        ? "linear-gradient(to top, #3B82F6, #93c5fd)"
                        : "#1e3a5f",
                    }}
                  />
                  <span className="text-[10px] text-slate-500">{day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Donut chart — status breakdown */}
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-5">
            <p className="text-sm font-semibold text-slate-200 mb-4">
              Topic Status Breakdown
            </p>
            <div className="flex items-center gap-8">
              {/* SVG donut */}
              <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0">
                {(() => {
                  let offset = 0;
                  const r    = 45;
                  const circ = 2 * Math.PI * r;
                  return (Object.entries(statusCounts) as [TopicStatus, number][]).map(([st, count]) => {
                    const pct   = count / total;
                    const dash  = pct * circ;
                    const gap   = circ - dash;
                    const el = (
                      <circle
                        key={st}
                        cx="60" cy="60" r={r}
                        fill="none"
                        stroke={STATUS_COLOUR[st]}
                        strokeWidth="18"
                        strokeDasharray={`${dash} ${gap}`}
                        strokeDashoffset={-offset * circ / 1}
                        style={{ transform: "rotate(-90deg)", transformOrigin: "60px 60px" }}
                      />
                    );
                    offset += pct;
                    return el;
                  });
                })()}
                <text x="60" y="55" textAnchor="middle" className="fill-slate-100 text-sm font-bold" fontSize="14" fontWeight="700" fill="#e2e8f0">
                  {total}
                </text>
                <text x="60" y="70" textAnchor="middle" fontSize="9" fill="#64748b">
                  topics
                </text>
              </svg>

              {/* Legend */}
              <div className="flex flex-col gap-3">
                {(Object.entries(statusCounts) as [TopicStatus, number][]).map(([st, count]) => (
                  <div key={st} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: STATUS_COLOUR[st] }} />
                    <span className="text-xs text-slate-300 capitalize w-20">{st}</span>
                    <span className="text-xs text-slate-400 tabular-nums">
                      {count} ({Math.round((count / total) * 100)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Current Streak",  value: `${statsData?.stats.currentStreak ?? 0} days`, colour: "#EAB308" },
              { label: "Mastery Rate",    value: `${total === 0 ? 0 : Math.round((statusCounts.mastered / total) * 100)}%`, colour: "#22C55E" },
              { label: "Avg Ease Factor", value: `${total === 0 ? "0.00" : (topics.reduce((a: number, t: any) => a + t.easeFactor, 0) / total).toFixed(2)}`, colour: "#3B82F6" },
            ].map(s => (
              <div key={s.label} className="flex flex-col gap-1 p-4 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-xs text-slate-400">{s.label}</span>
                <span className="text-xl font-bold" style={{ color: s.colour }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Subjects tab ── */}
      {activeTab === "subjects" && (
        <div className="flex flex-col gap-3">
          {subjects.map((subject: any) => {
            const mas = subject.topics.filter((t: any) => t.status === "mastered").length;
            const tot = subject.topics.length;
            const pct = tot > 0 ? Math.round((mas / tot) * 100) : 0;
            return (
              <div key={subject.id} className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: subject.color }} />
                  <span className="text-sm font-semibold text-slate-200 flex-1">{subject.name}</span>
                  <span className="text-xs text-slate-400">{mas}/{tot} mastered</span>
                  <span className="text-xs font-bold" style={{ color: subject.color }}>{pct}%</span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: subject.color }}
                  />
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {subject.topics.map((t: any) => (
                    <span
                      key={t.id}
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: STATUS_COLOUR[t.status as TopicStatus] + "22",
                        color:      STATUS_COLOUR[t.status as TopicStatus],
                        border:     `1px solid ${STATUS_COLOUR[t.status as TopicStatus]}44`,
                      }}
                    >
                      {t.title.length > 20 ? t.title.slice(0, 20) + "…" : t.title}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Heatmap tab ── */}
      {activeTab === "heatmap" && (
        <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-5">
          <p className="text-sm font-semibold text-slate-200 mb-4">
            Review Activity — Last 35 Days
          </p>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
            {["M","T","W","T","F","S","S"].map((d, i) => (
              <div key={i} className="text-[10px] text-slate-500 text-center">{d}</div>
            ))}
            {HEATMAP.map(({ day, count }) => (
              <div
                key={day}
                title={`${count} reviews`}
                className="aspect-square rounded-sm transition-all hover:scale-110 cursor-default"
                style={{ background: heatColour(count) }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-4">
            <span className="text-[10px] text-slate-500">Less</span>
            {[0, 2, 5, 8, 10].map(c => (
              <div key={c} className="w-3 h-3 rounded-sm" style={{ background: heatColour(c) }} />
            ))}
            <span className="text-[10px] text-slate-500">More</span>
          </div>
        </div>
      )}
    </div>
  );
}
