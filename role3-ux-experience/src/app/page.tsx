"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, Flame, Filter } from "lucide-react";
import { TopicStatus } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchStats, fetchTopics, submitReview } from "@/lib/mockApi";
import TopicCard from "@/components/TopicCard";
import StatCard from "@/components/StatsCard";
import Pomodoro from "@/components/Pomodoro";
import InputField from "@/components/ui/InputField";
import Button from "@/components/ui/Button";
import { useUIStore } from "@/store/uiStore";

// Define interfaces to replace 'any'
interface Topic {
  id: string;
  title: string;
  subject: string;
  status: TopicStatus;
  lastReviewed: Date;
  isGroup?: boolean;
}

interface TopicsData {
  topics: Topic[];
}

const FILTERS: { label: string; value: TopicStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Critical", value: "critical" },
  { label: "Due", value: "due" },
  { label: "Learning", value: "learning" },
  { label: "Mastered", value: "mastered" },
];

const STATUS_ORDER: Record<TopicStatus, number> = { critical: 0, due: 1, learning: 2, mastered: 3 };

export default function Dashboard() {
  const router = useRouter();
  const { isGroupMode } = useUIStore();
  const [roomCode, setRoomCode] = useState("");
  const [activeFilter, setActiveFilter] = useState<TopicStatus | "all">("all");
  const [newTopic, setNewTopic] = useState("");
  const [statusText, setStatusText] = useState("Add a topic to your queue.");
  const queryClient = useQueryClient();

  const { data: topicsData, isLoading: topicsLoading } = useQuery<TopicsData>({
    queryKey: ["topics"],
    queryFn: fetchTopics,
    staleTime: 1000 * 60,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    staleTime: 1000 * 60,
  });

  const topics = topicsData?.topics ?? [];

  const filtered = topics
    .filter(t => activeFilter === "all" || t.status === activeFilter)
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  const visibleTopics = filtered.slice(0, 5);

  const reviewMutation = useMutation({
    mutationFn: ({ id, score }: { id: string; score: number }) => submitReview(id, score),
    onSuccess: (_, variables) => {
      // Replaced 'any' with 'TopicsData | undefined'
      queryClient.setQueryData<TopicsData>(["topics"], (oldData) => {
        if (!oldData?.topics) return oldData as TopicsData;
        return {
          topics: oldData.topics.filter((topic: Topic) => topic.id !== variables.id),
        };
      });
      setStatusText(`Captured review for topic ${variables.id}.`);
    },
  });

  const handleAddTopic = () => {
    if (!newTopic.trim()) {
      setStatusText("Please enter a topic name before adding.");
      return;
    }
    const topicTitle = newTopic.trim();
    const created = {
      id: `t-added-${Date.now()}`,
      title: topicTitle,
      subject: "General",
      status: "learning" as const,
      lastReviewed: new Date(),
      nextReview: new Date(),
      easeFactor: 2.5,
      repetitions: 0,
      interval: 1,
      isGroup: isGroupMode,
    };

    queryClient.setQueryData<TopicsData>(["topics"], (oldData) => {
      if (!oldData?.topics) return { topics: [created] };
      return {
        topics: [created, ...oldData.topics],
      };
    });

    setStatusText(`Added "${topicTitle}" to your focus queue.`);
    setNewTopic("");
  };

  const handleReview = (id: string, score: number) => {
    reviewMutation.mutate({ id, score });
  };

  if (topicsLoading || statsLoading) {
    return (
      <div className="flex flex-col gap-4 p-6 max-w-6xl mx-auto w-full">
        <div className="h-24 rounded-3xl bg-slate-800/70 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-3xl bg-slate-800/70 animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 rounded-3xl bg-slate-800/70 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
      <section className="rounded-3xl dark:bg-slate-800/70 bg-white border dark:border-slate-700/50 border-slate-200 shadow-sm p-5 transition-colors">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest dark:text-slate-500 text-slate-400">Quick Add</p>
            <h1 className="mt-2 text-xl font-semibold dark:text-slate-100 text-slate-800">Jump into your focus queue</h1>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end w-full sm:w-auto">
            <InputField
              label="New topic"
              placeholder="e.g. CPU scheduling"
              value={newTopic}
              onChange={setNewTopic}
              className="flex-1 min-w-0"
            />
            <Button onClick={handleAddTopic} className="w-full sm:w-auto" label="Add Topic" />
          </div>
        </div>
        <p className="mt-3 text-sm dark:text-slate-400 text-slate-600">{statusText}</p>
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-widest dark:text-slate-500 text-slate-400 mb-3">Today&apos;s Overview</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard label="Due Today" value={statsData?.stats.dueToday ?? 0} accent="red" icon={<AlertCircle size={16} className="text-red-400" />} />
          <StatCard label="Total Mastered" value={statsData?.stats.totalMastered ?? 0} accent="green" icon={<CheckCircle2 size={16} className="text-green-400" />} />
          <StatCard label="Current Streak" value={`${statsData?.stats.currentStreak ?? 0} days`} accent="yellow" icon={<Flame size={16} className="text-yellow-400" />} />
        </div>
      </section>

      <div className="flex gap-6 items-start flex-col lg:flex-row">
        <section className="flex flex-col gap-4 flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest dark:text-slate-500 text-slate-400">Revision Queue</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={13} className="dark:text-slate-500 text-slate-400 shrink-0" />
            {FILTERS.map(({ label, value }) => (
              <button key={value} onClick={() => setActiveFilter(value)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${activeFilter === value ? "bg-blue-500 text-white shadow-sm" : "dark:bg-slate-800 bg-white dark:text-slate-400 text-slate-650 hover:text-slate-900 dark:hover:text-slate-200 border dark:border-slate-700 border-slate-200"}`}>
                {label}
              </button>
            ))}
          </div>
          <motion.div layout className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {visibleTopics.length === 0 ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center gap-3 py-16 rounded-xl border border-dashed dark:border-slate-700 border-slate-200 dark:text-slate-500 text-slate-400">
                  <CheckCircle2 size={32} className="text-green-500/50" />
                  <div className="text-center">
                    <p className="text-sm font-semibold dark:text-slate-400 text-slate-700">All caught up!</p>
                    <p className="text-xs">No topics in this category right now.</p>
                  </div>
                </motion.div>
              ) : (
                visibleTopics.map(topic => (
                  <TopicCard key={topic.id} title={topic.title} subject={topic.subject}
                    status={topic.status} lastReviewed={topic.lastReviewed}
                    isGroup={topic.isGroup}
                    onReview={(score) => handleReview(topic.id, score)} />
                ))
              )}
            </AnimatePresence>
          </motion.div>
        </section>

        <aside className="w-full lg:w-56 shrink-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Focus Timer</p>
          <Pomodoro />

          <div className="mt-6 rounded-xl dark:bg-slate-800/40 bg-white dark:border dark:border-slate-700/50 border border-slate-200 p-5 text-center w-full">
            <p className="text-xs font-semibold uppercase tracking-widest dark:text-slate-400 text-slate-600 mb-2.5">Study Room</p>
            <InputField
              placeholder="e.g. gate-prep"
              value={roomCode}
              onChange={setRoomCode}
              className="text-xs w-full text-center"
            />
            <Button onClick={() => roomCode.trim() && router.push(`/room/${roomCode.trim()}`)} className="w-full mt-3 text-xs" label="Join Room" />
          </div>
        </aside>
      </div>
    </div>
  );
}