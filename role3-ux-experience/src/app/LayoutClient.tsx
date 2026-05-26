"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import AddTopicModal from "@/components/AddTopicModal";

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const isLoginPage = pathname === "/login";

    if (!token && !isLoginPage) {
      setAuthorized(false);
      setLoading(false);
      router.push("/login");
    } else {
      setAuthorized(true);
      setLoading(false);
    }
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-400 font-semibold text-sm animate-pulse">
        Checking workspace authorization...
      </div>
    );
  }

  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 overflow-y-auto">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          {authorized ? children : null}
        </main>
      </div>
      <AddTopicModal />
    </div>
  );
}
