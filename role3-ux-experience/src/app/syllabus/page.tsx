"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchSubjects } from "@/lib/mockApi";
import Badge from "@/components/ui/Badge";
import { TopicStatus } from "@/types";

interface SubjectRowProps {
  name: string;
  color: string;
  topicCount: number;
  masteredCount: number;
  children: React.ReactNode;
}

function SubjectRow({ name, color, topicCount, masteredCount, children }: SubjectRowProps) {
  const [open, setOpen] = useState(false);
  const pct = topicCount > 0 ? Math.round((masteredCount / topicCount) * 100) : 0;

  return (
    <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-800 transition-colors"
      >
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
        <span className="flex-1 text-sm font-semibold text-slate-200">{name}</span>
        <div className="hidden sm:flex items-center gap-2 w-40">
          <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-slate-400 tabular-nums w-8 text-right">{pct}%</span>
        </div>
        <span className="text-xs text-slate-500 shrink-0">{topicCount} topics</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={15} className="text-slate-500" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 px-4 pb-4 border-t border-slate-700/50 pt-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Syllabus() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["subjects"],
    queryFn: fetchSubjects,
    staleTime: 1000 * 60,
  });
  const subjects = data?.subjects ?? [];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
        <div className="h-10 w-48 rounded-2xl bg-slate-800/70 animate-pulse" />
        <div className="grid gap-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-28 rounded-3xl bg-slate-800/70 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="rounded-xl border border-red-500/20 bg-slate-800/80 p-6 text-center text-slate-200">
          <p className="text-lg font-semibold text-red-400">Unable to load syllabus</p>
          <p className="mt-2 text-sm text-slate-400">Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
      <div>
        <h1 className="text-lg font-bold text-slate-100">Syllabus</h1>
        <p className="text-sm text-slate-400 mt-0.5">All subjects and their topic breakdown.</p>
      </div>

      <div className="flex flex-col gap-3">
        {subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 rounded-xl border border-dashed border-slate-700 text-slate-500">
            <p className="text-sm font-semibold text-slate-400">No subjects available yet.</p>
            <p className="text-xs">Once the backend is connected, subjects and topics will appear here.</p>
          </div>
        ) : (
          subjects.map((subject: any) => (
            <SubjectRow
              key={subject.id}
              name={subject.name}
              color={subject.color}
              topicCount={subject.topics.length}
              masteredCount={subject.topics.filter((t: any) => t.status === "mastered").length}
            >
              {subject.topics.map((topic: any) => (
                <div key={topic.id} className="flex items-center gap-3 py-2 border-b border-slate-700/30 last:border-0">
                  <BookOpen size={13} className="text-slate-500 shrink-0" />
                  <span className="flex-1 text-sm text-slate-300 truncate">{topic.title}</span>
                  <Badge label={topic.status} variant={topic.status as TopicStatus} />
                </div>
              ))}
            </SubjectRow>
          ))
        )}
      </div>
    </div>
  );
}