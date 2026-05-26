"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, BookOpen, Users, BarChart2,
  LogOut, Moon, Sun, Zap, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/store/uiStore";
import { MOCK_USER } from "@/data/mockData";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/",         Icon: LayoutDashboard },
  { label: "Syllabus",  href: "/syllabus",  Icon: BookOpen        },
  { label: "War Room",  href: "/room/demo", Icon: Users           },
  { label: "Analytics", href: "/analytics", Icon: BarChart2       },
] as const;

export default function Sidebar() {
  const {
    isSidebarOpen, toggleSidebar,
    isGroupMode,   toggleGroupMode,
    isDarkMode,    toggleDarkMode,
  } = useUIStore();

  const pathname = usePathname();
  const router   = useRouter();

  function handleModeToggle() {
    toggleGroupMode();
    if (!isGroupMode) {
      router.push("/room/demo");
    } else {
      router.push("/");
    }
  }

  return (
    <motion.aside
      animate={{ width: isSidebarOpen ? 224 : 64 }}
      transition={{ duration: 0.22, ease: "easeInOut" }}
      className="flex flex-col h-full dark:bg-slate-900 bg-white border-r dark:border-slate-700/50 border-slate-200 overflow-hidden shrink-0"
    >
      {/* ── Logo + Collapse ── */}
      <div className="flex items-center justify-between p-4 dark:border-b dark:border-slate-700/50 border-b border-slate-200 h-16 shrink-0">
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 overflow-hidden"
            >
              <Zap size={18} className="text-blue-500 dark:text-blue-400 shrink-0" />
              <span className="font-bold dark:text-slate-100 text-slate-800 whitespace-nowrap tracking-tight">
                StudySync
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg dark:text-slate-400 text-slate-500 dark:hover:text-slate-200 hover:text-slate-800 dark:hover:bg-slate-800 hover:bg-slate-100 transition-colors shrink-0 ml-auto"
        >
          {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>
      </div>

      {/* ── Solo / Group mode toggle ── */}
      <div className="px-3 py-3 dark:border-b dark:border-slate-700/50 border-b border-slate-200">
        <button
          onClick={handleModeToggle}
          className={[
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold",
            "transition-all duration-150",
            isGroupMode
              ? "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/20 dark:border-blue-500/30"
              : "dark:bg-slate-800 bg-slate-50 dark:text-slate-400 text-slate-600 border dark:border-slate-700 border-slate-200 hover:border-slate-400 dark:hover:border-slate-500",
          ].join(" ")}
        >
          <Users size={14} className="shrink-0" />
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap"
              >
                {isGroupMode ? "Group Mode" : "Solo Mode"}
              </motion.span>
            )}
          </AnimatePresence>
          {isGroupMode && (
            <span className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
          )}
        </button>
      </div>

      {/* ── Nav links ── */}
      <nav className="flex flex-col gap-1 px-3 py-3 flex-1 overflow-y-auto">
        {NAV_ITEMS.map(({ label, href, Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                "transition-colors duration-150 border",
                isActive
                  ? "bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/20 dark:border-blue-500/25"
                  : "dark:text-slate-400 text-slate-600 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent",
              ].join(" ")}
            >
              <Icon size={16} className="shrink-0" />
              <AnimatePresence>
                {isSidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom controls ── */}
      <div className="flex flex-col gap-1 px-3 py-3 dark:border-t dark:border-slate-700/50 border-t border-slate-200">

        {/* Dark mode toggle — WORKING */}
        <button
          onClick={toggleDarkMode}
          className="flex items-center gap-3 px-3 py-2 rounded-lg dark:text-slate-400 text-slate-600 dark:hover:text-slate-200 hover:text-slate-900 dark:hover:bg-slate-800 hover:bg-slate-100 transition-colors"
        >
          {isDarkMode
            ? <Sun  size={15} className="shrink-0 text-yellow-400" />
            : <Moon size={15} className="shrink-0" />
          }
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap text-xs"
              >
                {isDarkMode ? "Light Mode" : "Dark Mode"}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Logout — WORKING */}
        <button
          onClick={() => router.push("/login")}
          className="flex items-center gap-3 px-3 py-2 rounded-lg dark:text-slate-400 text-slate-600 dark:hover:text-red-400 hover:text-red-500 dark:hover:bg-red-500/10 hover:bg-red-500/5 transition-colors"
        >
          <LogOut size={15} className="shrink-0" />
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap text-xs"
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* User strip */}
        <div className="flex items-center gap-3 px-3 py-2 mt-1">
          <div className="w-7 h-7 rounded-full bg-blue-500/20 dark:bg-blue-500/30 border border-blue-500/30 dark:border-blue-500/40 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-300 shrink-0">
            {MOCK_USER.name.charAt(0)}
          </div>
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col min-w-0"
              >
                <span className="text-xs font-semibold dark:text-slate-200 text-slate-800 truncate">
                  {MOCK_USER.name}
                </span>
                <span className="text-[10px] dark:text-slate-500 text-slate-500">
                  🔥 {MOCK_USER.streak}-day streak
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}
