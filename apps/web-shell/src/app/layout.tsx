"use client";

import React, { useState, useEffect, useCallback } from "react";
import "./globals.css";
import { 
  LayoutDashboard, 
  UserPlus, 
  Users, 
  Calendar, 
  CheckCircle, 
  FileText, 
  BookOpen, 
  CreditCard, 
  Library, 
  Home, 
  BarChart3, 
  Sparkles, 
  FileCheck, 
  Settings, 
  LogOut,
  Bell,
  Search,
  Menu,
  AlertCircle,
  ShieldCheck,
  GraduationCap,
  ClipboardCheck,
  Upload,
  MessageSquare,
  Moon,
  Sun,
  Briefcase
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SocketProvider } from "@/components/providers/SocketProvider";
import NotificationBell from "@/components/layout/NotificationBell";
import api from "@/lib/api";
import UserAvatar from "../components/ui/UserAvatar";
import { consumePortalNotice, getRoleHomePath, getSessionUser, isAccessAllowed, normalizeRole, setPortalNotice } from "@/lib/session";

const PASSWORD_CHANGE_ROLES = ['TEACHER', 'PARENT', 'STUDENT', 'LIBRARIAN', 'COLLEGE_ADMIN'];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalSettings, setGlobalSettings] = useState<any>(null);
  const [backendOnline, setBackendOnline] = useState(true);
  const [backendChecked, setBackendChecked] = useState(false);
  const [portalNotice, setPortalNoticeState] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const storedTheme = localStorage.getItem("portal_theme");
    const initialTheme = storedTheme === "dark" ? "dark" : "light";
    setTheme(initialTheme);
    document.documentElement.classList.toggle("theme-dark", initialTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("portal_theme", nextTheme);
    document.documentElement.classList.toggle("theme-dark", nextTheme === "dark");
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    setToken(token);
    const isLandingPage = pathname === "/";
    const isLoginPage = pathname === "/login";
    const isChangePasswordPage = pathname === "/change-password";
    const isAuthPage = isLoginPage || isChangePasswordPage;
    const sessionUser = getSessionUser();
    const role = normalizeRole(sessionUser?.role);

    const normalizedRole = role;
    const shouldForcePasswordChange =
      (Boolean(sessionUser?.mustChangePassword) && PASSWORD_CHANGE_ROLES.includes(normalizedRole)) ||
      (normalizedRole === 'COLLEGE_ADMIN' && Boolean(sessionUser?.isFirstLogin));

    if (token && !isAuthPage && !isAccessAllowed(role, pathname)) {
      setPortalNotice('You do not have access to this page');
      router.replace(getRoleHomePath(role));
      return;
    }

    if (!token && !isLoginPage && !isChangePasswordPage && !isLandingPage) {
      router.push("/login");
    } else if (token && isLoginPage) {
      router.push("/");
    } else if (token && !isAuthPage && !isLandingPage && role === 'SUPER_ADMIN' && !pathname.startsWith('/super-admin')) {
      router.replace('/super-admin/dashboard');
      return;
    } else if (token && !isAuthPage && !isLandingPage && role === 'COLLEGE_ADMIN' && pathname.startsWith('/super-admin')) {
      router.replace('/admin');
      return;
    }

    if (sessionUser) {
      setUser(sessionUser);
    } else {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    }

    setPortalNoticeState(consumePortalNotice());
    setLoading(false);
  }, [pathname, router]);

  useEffect(() => {
    const syncUserState = () => {
      const savedUser = localStorage.getItem('user');
      setUser(savedUser ? JSON.parse(savedUser) : null);
    };

    window.addEventListener('storage', syncUserState);
    window.addEventListener('user-updated', syncUserState as EventListener);
    return () => {
      window.removeEventListener('storage', syncUserState);
      window.removeEventListener('user-updated', syncUserState as EventListener);
    };
  }, []);

  const checkBackendConnectivity = useCallback(async () => {
    try {
      const response = await api.get('/settings/public');
      const settings = response.data?.data;
      if (settings) {
        setGlobalSettings(settings);
      }
      setBackendOnline(true);
    } catch {
      // Keep app functional with defaults if settings endpoint is unavailable.
      setBackendOnline(false);
    } finally {
      setBackendChecked(true);
    }
  }, []);

  useEffect(() => {
    checkBackendConnectivity();

    const intervalId = window.setInterval(() => {
      checkBackendConnectivity();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [checkBackendConnectivity]);

  useEffect(() => {
    if (pathname === '/login') return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const timeoutMinutes = Number(globalSettings?.session_timeout || 30);
    const timeoutMs = timeoutMinutes * 60 * 1000;
    let timer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        localStorage.clear();
        router.push('/login');
      }, timeoutMs);
    };

    const events: Array<keyof WindowEventMap> = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [globalSettings?.session_timeout, pathname, router]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore server logout failures and still clear the local session.
    } finally {
      const savedTheme = localStorage.getItem('portal_theme');
      localStorage.clear();
      if (savedTheme) localStorage.setItem('portal_theme', savedTheme);
      router.push('/login');
    }
  };

  const isLoginPage = pathname === "/login";
  const isChangePasswordPage = pathname === "/change-password";
  const isLandingPage = pathname === "/" && !token; // Only treat / as landing page if NOT logged in
  const isAuthPage = isLoginPage || isChangePasswordPage;
  const isPublicShellPage = isAuthPage || isLandingPage;
  const showBackendBanner = !isPublicShellPage && backendChecked && !backendOnline;
  const showAccessBanner = !isPublicShellPage && Boolean(portalNotice);
  const themeToggleTopClass = showBackendBanner && showAccessBanner
    ? "top-28"
    : showBackendBanner || showAccessBanner
      ? "top-16"
      : "top-24";

  const roleLabel: Record<string, string> = {
    SUPER_ADMIN:   'Super Admin',
    COLLEGE_ADMIN: 'College Admin',
    TEACHER:       'Teacher',
    STUDENT:       'Student',
    PARENT:        'Parent',
    LIBRARIAN:     'Librarian',
  };
  
  const roleColor: Record<string, string> = {
    SUPER_ADMIN:   'bg-purple-500/20 text-purple-300',
    COLLEGE_ADMIN: 'bg-indigo-500/20 text-indigo-300',
    TEACHER:       'bg-emerald-500/20 text-emerald-300',
    STUDENT:       'bg-amber-500/20 text-amber-300',
    PARENT:        'bg-slate-500/20 text-slate-300',
    LIBRARIAN:     'bg-teal-500/20 text-teal-300',
  };

  const isAdminRoute = pathname.startsWith("/admin");
  const isSuperAdminRoute = pathname.startsWith("/super-admin");
  const isPortalRoute = isAdminRoute || isSuperAdminRoute || pathname.startsWith("/librarian");

  return (
    <html lang="en">
      <body className={`bg-slate-50 text-slate-900 ${!isPublicShellPage ? "h-screen flex" : ""} ${showBackendBanner ? "pt-12" : ""}`}>
        <SocketProvider>
          {showBackendBanner && (
            <div className="fixed inset-x-0 top-0 z-100 flex items-center justify-between gap-3 bg-rose-600 px-4 py-2 text-white shadow-lg">
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle size={16} />
                <span>Backend API is unreachable at http://localhost:5005. Start backend from the backend folder using npm run dev.</span>
              </div>
              <button
                type="button"
                onClick={checkBackendConnectivity}
                className="rounded bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30"
              >
                Retry
              </button>
            </div>
          )}

          {showAccessBanner && (
            <div className={`fixed inset-x-0 ${showBackendBanner ? 'top-12' : 'top-0'} z-95 flex items-center justify-center bg-amber-50 border-b border-amber-200 px-4 py-2 text-amber-800 text-sm font-semibold shadow-sm`}>
              {portalNotice}
            </div>
          )}

          {/* Theme toggle removed from floating position - will be in navbar */}

          {loading ? (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50">
               <div className="w-2 h-6 bg-indigo-500 rounded-full animate-bounce" />
            </div>
          ) : isPublicShellPage ? (
            children
          ) : isPortalRoute ? (
            /* Specialized Portals (Admin/Teacher) handle their own sidebars */
            <div className="w-full h-full">
              {children}
            </div>
          ) : (
            <>
              {/* Dark Indigo Sidebar from Frontend */}
              <div className="w-64 bg-slate-900 text-white h-screen flex flex-col z-10 shadow-xl border-r border-slate-800">
                <div className="p-6 border-b border-slate-800">
                  <h1 className="text-2xl font-bold text-indigo-400">NgCMS ERP</h1>
                  <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-semibold">AI Powered ERP</p>
                </div>

                <nav className="flex-1 mt-4 px-3 space-y-0.5 overflow-y-auto custom-scrollbar">
                  <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" href="/" active={pathname === "/"} />
                  
                  {/* Administrative Section */}
                  <NavItem 
                    icon={<GraduationCap size={18} />} 
                    label="Admissions" 
                    href={['SUPER_ADMIN', 'COLLEGE_ADMIN'].includes(user?.role) ? "/admin/admissions" : "/admissions"} 
                    active={pathname.startsWith("/admissions") || pathname.startsWith("/admin/admissions")} 
                    roles={['SUPER_ADMIN', 'COLLEGE_ADMIN']}
                    currentUserRole={user?.role}
                  />
                  
                  <NavItem 
                    icon={<Users size={18} />} 
                    label="Students" 
                    href={['SUPER_ADMIN', 'COLLEGE_ADMIN'].includes(user?.role) ? "/admin/students" : user?.role === 'TEACHER' ? "/teacher/students" : "/students"} 
                    active={pathname.startsWith("/students") || pathname.startsWith("/admin/students") || pathname.includes("/teacher/students")} 
                    roles={['SUPER_ADMIN', 'COLLEGE_ADMIN', 'TEACHER']}
                    currentUserRole={user?.role}
                  />

                  {/* Academic Section */}
                  <div className="pt-4 pb-2 px-3">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-3">Academic Hub</p>
                  </div>
                  
                  <NavItem 
                    icon={<BookOpen size={18} />} 
                    label="Subjects & Materials" 
                    href={user?.role === 'TEACHER' ? "/teacher/uploads" : ['SUPER_ADMIN', 'COLLEGE_ADMIN'].includes(user?.role) ? "/admin/academics" : "/academics/materials"} 
                    active={pathname.startsWith("/academics") || pathname.startsWith("/admin/academics") || pathname === "/teacher/uploads"} 
                    roles={['SUPER_ADMIN', 'COLLEGE_ADMIN', 'TEACHER', 'STUDENT']}
                    currentUserRole={user?.role}
                  />
                  
                  <NavItem 
                    icon={<Calendar size={18} />} 
                    label={user?.role === 'TEACHER' || user?.role === 'STUDENT' ? 'My Timetable' : 'Schedule'} 
                    href={
                      user?.role === 'TEACHER' ? '/teacher/timetable' : 
                      user?.role === 'STUDENT' ? '/student/timetable' :
                      ['COLLEGE_ADMIN', 'SUPER_ADMIN'].includes(user?.role) ? '/admin/timetable' : 
                      '/timetable'
                    } 
                    active={pathname.includes("timetable")} 
                  />
                  
                  <NavItem 
                    icon={<ClipboardCheck size={18} />} 
                    label="Attendance"
                    href={
                      user?.role === 'STUDENT' ? '/student/attendance' :
                      user?.role === 'TEACHER' ? '/teacher/attendance' :
                      ['COLLEGE_ADMIN', 'SUPER_ADMIN'].includes(user?.role) ? '/admin/attendance' :
                      '/attendance'
                    }
                    active={pathname.includes("/attendance")} 
                  />
                  
                  <NavItem 
                    icon={<FileText size={18} />} 
                    label="Exams & Results" 
                    href={
                      user?.role === 'STUDENT' ? '/exams/results' : 
                      user?.role === 'TEACHER' ? '/teacher/marks' :
                      ['COLLEGE_ADMIN', 'SUPER_ADMIN'].includes(user?.role) ? '/admin/exams' : 
                      '/exams'
                    } 
                    active={pathname.includes("/exams") || pathname.includes("/marks")} 
                  />
                  
                  {user?.role === 'TEACHER' && (
                    <NavItem 
                      icon={<MessageSquare size={18} />} 
                      label="Communication" 
                      href="/teacher/communication" 
                      active={pathname.includes("/communication")} 
                    />
                  )}
                  
                  {user?.role === 'STUDENT' && (
                    <NavItem 
                      icon={<MessageSquare size={18} />} 
                      label="Communication" 
                      href="/communication" 
                      active={pathname.includes("/communication")} 
                    />
                  )}
                  
                  {/* Operations Section */}
                  <div className="pt-4 pb-2 px-3">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-3">Campus Life</p>
                  </div>

                  <NavItem 
                    icon={<Briefcase size={18} />} 
                    label="Placements" 
                    href="/student/placement" 
                    active={pathname.startsWith("/student/placement")} 
                    roles={['STUDENT']}
                    currentUserRole={user?.role}
                  />

                  <NavItem 
                    icon={<CreditCard size={18} />} 
                    label="Finance & Fees" 
                    href={['SUPER_ADMIN', 'COLLEGE_ADMIN'].includes(user?.role) ? "/admin/fees" : "/finance"} 
                    active={pathname.startsWith("/finance") || pathname.startsWith("/admin/fees")} 
                    roles={['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PARENT', 'STUDENT']}
                    currentUserRole={user?.role}
                  />
                  
                  <NavItem 
                    icon={<Library size={18} />} 
                    label="Digital Library" 
                    href="/library" 
                    active={pathname.startsWith("/library")} 
                    roles={['SUPER_ADMIN', 'COLLEGE_ADMIN', 'TEACHER', 'STUDENT', 'LIBRARIAN']}
                    currentUserRole={user?.role}
                  />
                  
                  <NavItem 
                    icon={<Settings size={18} />} 
                    label="Settings" 
                    href="/settings" 
                    active={pathname.startsWith("/settings")} 
                    roles={['SUPER_ADMIN', 'COLLEGE_ADMIN', 'TEACHER', 'STUDENT', 'PARENT']}
                    currentUserRole={user?.role}
                  />

                </nav>

                <div className="p-4 border-t border-slate-800">
                  {user ? (
                    <div className="flex items-center gap-3 mb-3">
                      <UserAvatar
                        name={user?.name}
                        imageUrl={user?.profilePicture}
                        size={36}
                        className="rounded-xl shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', roleColor[user?.role || 'STUDENT'])}>
                          {roleLabel[user?.role || 'STUDENT']}
                        </span>
                      </div>
                    </div>
                  ) : null}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-all text-sm font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                 {/* Unified Topbar */}
                 <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
                    <div className="flex items-center gap-4">
                       <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                          {pathname === "/" ? "Dashboard" : pathname.split('/').slice(-1)[0].replace('-', ' ')}
                       </h2>
                    </div>
                    <div className="flex items-center gap-6">
                       <div className="hidden md:flex flex-col items-end">
                          <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
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
                        {user ? (
                        <div className="hidden md:flex items-center gap-2">
                          <div className="text-right">
                           <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest truncate max-w-40">{user?.name || 'User'}</p>
                           <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{roleLabel[user?.role || 'STUDENT']}</p>
                          </div>
                          <UserAvatar name={user?.name} imageUrl={user?.profilePicture} size={34} />
                        </div>
                        ) : null}
                       <NotificationBell />
                    </div>
                 </header>

                 {/* Viewport Content */}
                 <main className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50">
                    {children}
                 </main>
              </div>
            </>
          )}
        </SocketProvider>
      </body>
    </html>
  );
}

function NavItem({ 
  icon, 
  label, 
  href, 
  active = false, 
  roles,
  currentUserRole 
}: { 
  icon: React.ReactNode, 
  label: string, 
  href: string, 
  active?: boolean,
  roles?: string[],
  currentUserRole?: string
}) {
  if (roles && currentUserRole && !roles.includes(currentUserRole)) {
    return null;
  }

  return (
    <Link 
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group',
        active
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      )}
    >
      <span className={cn('shrink-0', active ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400')}>
        {icon}
      </span>
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
}
