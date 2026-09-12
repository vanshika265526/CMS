"use client";

import React, { useEffect } from "react";
import {
  Users,
  UserCheck,
  GraduationCap,
  Calendar,
  ClipboardCheck,
  FileText,
  CreditCard,
  MessageSquare,
  ShieldCheck,
  LayoutDashboard,
  UserPlus,
  ArrowRightLeft,
  Sparkles,
  Search,
  Settings,
  LogOut,
  Layers,
  Moon,
  Sun,
  Globe,
  Briefcase
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import UserAvatar from "@/components/ui/UserAvatar";
import { getRoleHomePath, getSessionUser, setPortalNotice } from "@/lib/session";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", href: "/admin" },
  { icon: ArrowRightLeft, label: "Assignments", href: "/admin/assignments" },
  { icon: UserPlus, label: "Admissions", href: "/admin/admissions" },
  { icon: Users, label: "Students", href: "/admin/students" },
  { icon: UserCheck, label: "Faculty", href: "/admin/faculty" },
  { icon: GraduationCap, label: "Academics", href: "/admin/academics" },
  { icon: Layers, label: "Batches", href: "/admin/batches" },
  { icon: Calendar, label: "Schedule", href: "/admin/timetable" },
  { icon: ClipboardCheck, label: "Attendance", href: "/admin/attendance" },
  { icon: Briefcase, label: "Placements", href: "/admin/placement" },
  { icon: FileText, label: "Exams", href: "/admin/exams" },
  { icon: CreditCard, label: "Fees", href: "/admin/fees" },
  { icon: MessageSquare, label: "Communication", href: "/admin/communication" },
  { icon: Sparkles, label: "AI Imports", href: "/admin/ai-imports" },
  { icon: Globe, label: "AI Sources", href: "/admin/ai-sources" },
  { icon: Settings, label: "Settings", href: "/admin/settings" },
  { icon: ShieldCheck, label: "Governance", href: "/admin/naac" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [theme, setTheme] = React.useState<"light" | "dark">("light");

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("portal_theme", nextTheme);
    document.documentElement.classList.toggle("theme-dark", nextTheme === "dark");
  };

  React.useEffect(() => {
    const storedTheme = localStorage.getItem("portal_theme");
    const initialTheme = storedTheme === "dark" ? "dark" : "light";
    setTheme(initialTheme);
    document.documentElement.classList.toggle("theme-dark", initialTheme === "dark");
  }, []);

  const resolveAssetUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5005/api";
    const assetBase = apiUrl.replace(/\/api$/, "");
    return `${assetBase}${url}`;
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = getSessionUser();
    if (!token || !user?.role) {
      router.replace("/login");
    } else if (user.role === 'SUPER_ADMIN') {
      router.replace('/super-admin/dashboard');
    } else if ((user.mustChangePassword || user.isFirstLogin) && user.role === 'COLLEGE_ADMIN') {
      router.replace('/change-password');
    } else if (user.role !== 'COLLEGE_ADMIN') {
      setPortalNotice('You do not have access to this page');
      router.replace(getRoleHomePath(user.role));
    } else {
      setCurrentUser(user);
      setAuthorized(true);
    }
  }, [router, pathname]);

  useEffect(() => {
    const syncUser = () => {
      const raw = localStorage.getItem('user');
      setCurrentUser(raw ? JSON.parse(raw) : null);
    };

    window.addEventListener('storage', syncUser);
    window.addEventListener('user-updated', syncUser as EventListener);
    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('user-updated', syncUser as EventListener);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Best-effort server logout; always clear local state.
    } finally {
      const savedTheme = localStorage.getItem('portal_theme');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (savedTheme) localStorage.setItem('portal_theme', savedTheme);
      router.push('/login');
    }
  };

  if (!authorized) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Securing Administrative Environment...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans admin-shell">
      {/* ─── Premium Dark Sidebar ─── */}
      <aside className="w-64 bg-slate-950 text-slate-400 flex flex-col h-full shadow-2xl z-20 relative overflow-hidden group">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-50" />
        
        <div className="p-8 border-b border-white/5 flex items-center gap-4">
          {currentUser?.branding?.collegeLogo ? (
            <img
              src={resolveAssetUrl(currentUser.branding.collegeLogo)}
              alt={currentUser?.branding?.collegeDisplayName || currentUser?.name || 'College logo'}
              className="w-10 h-10 rounded-[1.25rem] object-cover bg-white shadow-lg shadow-indigo-600/20"
            />
          ) : (
            <div className="w-10 h-10 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:rotate-12 transition-transform duration-500">
              <ShieldCheck className="text-white" size={20} />
            </div>
          )}
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-tighter leading-none">
              {currentUser?.branding?.collegeDisplayName || currentUser?.name || 'Admin Portal'}
            </h2>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1.5 opacity-80">
              {currentUser?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'College Admin'}
            </p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-8 space-y-1.5 custom-scrollbar">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3.5 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 relative group/item overflow-hidden",
                  isActive 
                    ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20" 
                    : "text-slate-500 hover:bg-white/5 hover:text-white"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 w-1 h-full bg-white opacity-50" />
                )}
                <item.icon size={16} className={cn("transition-colors", isActive ? "text-white" : "text-slate-600 group-hover/item:text-indigo-400")} />
                <span>{item.label}</span>
                {isActive && <Sparkles size={10} className="ml-auto opacity-50 text-white" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer Area */}
        <div className="p-6 border-t border-white/5 space-y-4">
           <div className="flex items-center gap-3 px-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Core Engine Sync</span>
           </div>
           
           <div className="flex bg-white/5 p-4 rounded-2xl items-center gap-3 border border-white/5">
              <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
                 <Settings size={14} />
              </div>
              <div className="flex-1">
                 <p className="text-[10px] font-black text-white leading-none uppercase">v1.1.2-rc</p>
                 <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-1">LTS Instance</p>
              </div>
           </div>
           <button
             onClick={handleLogout}
             className="w-full flex items-center gap-3.5 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] text-rose-500 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20"
           >
             <LogOut size={16} />
             <span>Secure Sign Out</span>
           </button>
        </div>
      </aside>

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
        {/* Admin Topbar (Premium Glassmorphism) */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-10 flex items-center justify-between z-10 shrink-0 admin-topbar">
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] opacity-80">
              {currentUser?.branding?.collegeDisplayName || currentUser?.name || 'College Admin Portal'}
            </h3>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="hidden lg:flex items-center bg-slate-100 px-4 py-2.5 rounded-2xl gap-3 border border-slate-200/50 group admin-search-shell">
                <Search size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
               <input type="text" placeholder="STRATEGIC SEARCH..." className="bg-transparent border-none text-[9px] font-black focus:outline-none w-48 tracking-widest admin-search-input" />
             </div>

             <div className="h-10 w-px bg-slate-200 mx-2" />

             <button
               type="button"
               onClick={toggleTheme}
               className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center justify-center"
               aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
               title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
             >
               {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
             </button>

             <div className="h-10 w-px bg-slate-200 mx-2" />

             <div className="flex items-center gap-4">
                <div className="text-right">
                   <p className="text-[10px] font-black text-slate-900 leading-none uppercase tracking-tighter">{currentUser?.name || 'College Admin'}</p>
                   <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mt-1.5 border-r-2 border-indigo-500 pr-2 inline-block">{currentUser?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'College Admin'}</p>
                </div>
                 <UserAvatar
                  name={currentUser?.name || 'Admin User'}
                  imageUrl={currentUser?.profilePicture}
                  size={48}
                  className="rounded-2xl border-2 border-white shadow-xl rotate-3 hover:rotate-0 transition-all"
                 />
                <button 
                  onClick={handleLogout}
                  className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all border border-transparent hover:border-rose-100 group/logout"
                  title="Secure Logout"
                >
                   <LogOut size={18} className="group-hover/logout:-translate-x-0.5 transition-transform" />
                </button>
             </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-slate-50/50">
          <div className="max-w-7xl mx-auto h-full">
            {authorized ? children : null}
          </div>
        </main>
      </div>
    </div>
  );
}
