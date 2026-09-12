"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  ArrowLeftRight,
  LogOut,
  Library,
  ChevronRight,
  Bell,
  Moon,
  Sun
} from "lucide-react";
import UserAvatar from "@/components/ui/UserAvatar";

export default function LibrarianLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("portal_theme", nextTheme);
    document.documentElement.classList.toggle("theme-dark", nextTheme === "dark");
  };

  useEffect(() => {
    const storedTheme = localStorage.getItem("portal_theme");
    const initialTheme = storedTheme === "dark" ? "dark" : "light";
    setTheme(initialTheme);
    document.documentElement.classList.toggle("theme-dark", initialTheme === "dark");
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (!token) {
      router.push("/login");
      return;
    }

    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed.role !== "LIBRARIAN") {
        router.push("/");
        return;
      }
      setUser(parsed);
    }
  }, [router]);

  useEffect(() => {
    const syncUser = () => {
      const savedUser = localStorage.getItem('user');
      setUser(savedUser ? JSON.parse(savedUser) : null);
    };

    window.addEventListener('storage', syncUser);
    window.addEventListener('user-updated', syncUser as EventListener);
    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('user-updated', syncUser as EventListener);
    };
  }, []);

  const handleLogout = () => {
    const savedTheme = localStorage.getItem('portal_theme');
    localStorage.clear();
    if (savedTheme) localStorage.setItem('portal_theme', savedTheme);
    router.push("/login");
  };

  const navItems = [
    {
      icon: <LayoutDashboard size={18} />,
      label: "Dashboard",
      href: "/librarian",
      active: pathname === "/librarian",
    },
    {
      icon: <BookOpen size={18} />,
      label: "Book Management",
      href: "/librarian/books",
      active: pathname.startsWith("/librarian/books"),
    },
    {
      icon: <ArrowLeftRight size={18} />,
      label: "Transactions",
      href: "/librarian/transactions",
      active: pathname.startsWith("/librarian/transactions"),
    },
  ];

  return (
    <div className="h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col z-10 shadow-2xl border-r border-slate-800">
        {/* Brand */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-600/20">
              <Library size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-none">Library Portal</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">
                Digital Library System
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 mt-4 px-3 space-y-0.5 overflow-y-auto">
          <div className="pb-2 px-3">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
              Main Menu
            </p>
          </div>

          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group",
                item.active
                  ? "bg-teal-600 text-white shadow-lg shadow-teal-600/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <span
                className={cn(
                  "shrink-0",
                  item.active ? "text-white" : "text-slate-500 group-hover:text-teal-400"
                )}
              >
                {item.icon}
              </span>
              <span className="font-medium text-sm">{item.label}</span>
              {item.active && <ChevronRight size={14} className="ml-auto opacity-60" />}
            </Link>
          ))}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-800">
          {user && (
            <div className="flex items-center gap-3 mb-3">
              <UserAvatar
                name={user?.name}
                imageUrl={user?.profilePicture}
                size={36}
                className="rounded-xl shrink-0 shadow-lg shadow-teal-600/20"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300">
                  Librarian
                </span>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-all text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
              {pathname === "/librarian"
                ? "Dashboard"
                : pathname.split("/").slice(-1)[0].replace("-", " ")}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                {new Date().toLocaleDateString("en-US", { weekday: "long" })}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                {new Date().toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="h-8 w-px bg-slate-100 mx-2" />
            <button
              type="button"
              onClick={toggleTheme}
              className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center justify-center"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="h-8 w-px bg-slate-100 mx-2" />
            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest truncate max-w-36">{user?.name || 'Librarian'}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Librarian</p>
                </div>
                <UserAvatar name={user?.name} imageUrl={user?.profilePicture} size={32} />
              </div>
            ) : null}
            <button className="relative p-2 text-slate-400 hover:text-slate-900 transition-colors">
              <Bell size={20} />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          {children}
        </main>
      </div>
    </div>
  );
}
