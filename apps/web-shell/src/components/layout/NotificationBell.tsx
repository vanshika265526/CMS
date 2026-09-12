"use client";

import React, { useState, useEffect } from "react";
import { Bell, X, Info, CheckCircle, AlertTriangle, Book } from "lucide-react";
import { useSocket } from "@/components/providers/SocketProvider";
import { useRouter } from "next/navigation";
import { fetchNotifUnreadCount, fetchNotifications, markNotifAsRead, markAllNotifAsRead } from "@/lib/api/communication";
import { cn } from "@/lib/utils";

export default function NotificationBell() {
  const { socket } = useSocket();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [toast, setToast] = useState<{ title: string; message: string; type: string } | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(savedUser);
    loadNotifData();
  }, []);

  const loadNotifData = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;

    const [countRes, listRes] = await Promise.allSettled([
      fetchNotifUnreadCount(),
      fetchNotifications()
    ]);

    if (countRes.status === "fulfilled" && countRes.value?.success) {
      setUnreadCount(Number(countRes.value.data?.count || 0));
    } else {
      setUnreadCount(0);
    }

    if (listRes.status === "fulfilled" && listRes.value?.success) {
      setNotifications(listRes.value.data || []);
    }
  };

  useEffect(() => {
    if (socket) {
      const handleNotif = (data: any) => {
        // Avoid duplicates
        setNotifications(prev => {
          if (prev.some(n => n._id === data._id)) return prev;
          
          setUnreadCount(c => c + 1);
          setToast({
            title: data.title,
            message: data.message,
            type: data.type || "info"
          });
          // Auto-clear toast after 5 seconds
          setTimeout(() => setToast(null), 5000);
          
          return [data, ...prev].slice(0, 50);
        });
      };

      socket.on("notification", handleNotif);
      return () => {
        socket.off("notification", handleNotif);
      };
    }
  }, [socket]);

  const handleNotificationClick = async (notif: any) => {
    try {
      // Mark as read in backend
      await markNotifAsRead(notif._id);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      let targetUrl = notif.actionUrl;
      console.log("[NOTIF_DEBUG] Original ActionUrl:", targetUrl);

      // Legacy URL rewrite for stale notifications
      if (targetUrl?.includes('/communication/messages/')) {
        const parts = targetUrl.split('/');
        const id = parts[parts.length - 1];
        const prefix = user?.role === 'TEACHER' ? '/teacher' : '';
        const idParam = user?.role === 'TEACHER' ? 'studentUserId' : 'teacherId';
        targetUrl = `${prefix}/communication?tab=messages&${idParam}=${id}`;
        console.log("[NOTIF_DEBUG] Rewritten URL (Legacy Message):", targetUrl);
      } else if (targetUrl === '/communication/announcements') {
        const prefix = user?.role === 'TEACHER' ? '/teacher' : (user?.role?.includes('ADMIN') ? '/admin' : '');
        targetUrl = `${prefix}/communication?tab=announcements`;
        console.log("[NOTIF_DEBUG] Rewritten URL (Legacy Announcement):", targetUrl);
      } else if (targetUrl === '/academics/materials' && user?.role === 'TEACHER') {
        targetUrl = '/teacher/uploads';
      }

      // Ensure we have user data for correct role-based pathing
      if (!user?.role) {
        console.warn("[NOTIF_DEBUG] User role missing, fetching again...");
        const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
        if (!savedUser.role) {
          router.push(targetUrl); // Fallback to original
          setShowDropdown(false);
          return;
        }
        setUser(savedUser);
      }
      if (targetUrl) {
        router.push(targetUrl);
        setShowDropdown(false);
        return;
      }

      // 2. Flexible fallback navigation via metadata (Secondary)
      if (notif.metadata?.type === 'direct_message') {
        const prefix = user?.role === 'TEACHER' ? '/teacher' : '';
        const idParam = user?.role === 'TEACHER' ? 'studentUserId' : 'teacherId';
        const senderId = notif.senderUserId?._id || notif.senderUserId;
        router.push(`${prefix}/communication?tab=messages&${idParam}=${senderId}`);
        setShowDropdown(false);
      } else if (notif.metadata?.type === 'announcement') {
        const prefix = user?.role === 'TEACHER' ? '/teacher' : (user?.role?.includes('ADMIN') ? '/admin' : '');
        router.push(`${prefix}/communication?tab=announcements`);
        setShowDropdown(false);
      } else if (notif.metadata?.type === 'material') {
        router.push(user?.role === 'TEACHER' ? '/teacher/uploads' : '/academics/materials');
        setShowDropdown(false);
      }
    } catch (error) {
      console.error("Failed to handle notification click:", error);
    }
  };

  const handleClearAll = async () => {
    try {
      await markAllNotifAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to clear notification history", error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "library": return <Book className="text-amber-500" size={16} />;
      case "alert": return <AlertTriangle className="text-rose-500" size={16} />;
      case "personal": return <CheckCircle className="text-emerald-500" size={16} />;
      default: return <Info className="text-indigo-500" size={16} />;
    }
  };

  return (
    <div className="relative">
      {/* Toast Notification Popup */}
      {toast && (
        <div className="fixed top-20 right-8 z-100 animate-in slide-in-from-right-8 duration-500">
           <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-start gap-4 min-w-[320px] max-w-md">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center shrink-0">
                 <Bell className="text-indigo-400" size={20} />
              </div>
              <div className="flex-1 pt-0.5">
                 <h4 className="text-sm font-bold">{toast.title}</h4>
                 <p className="text-xs text-slate-400 mt-1 leading-relaxed">{toast.message}</p>
              </div>
              <button onClick={() => setToast(null)} className="text-slate-500 hover:text-white pt-1">
                 <X size={16} />
              </button>
           </div>
        </div>
      )}

      {/* Bell Icon & Dropdown */}
      <button 
        onClick={() => setShowDropdown(!showDropdown)}
        className={cn(
          "relative p-2 transition-colors rounded-xl",
          showDropdown ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-900"
        )}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-4 h-4 bg-indigo-600 text-[10px] font-black text-white rounded-full border-2 border-white flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          <div className="absolute right-0 mt-4 w-80 bg-white rounded-4xl border border-slate-100 shadow-ambient z-50 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Notifications</h3>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{unreadCount} New</span>
            </div>
            
            <div className="max-h-100 overflow-y-auto custom-scrollbar">
              {notifications.length > 0 ? (
                <div className="divide-y divide-slate-50">
                  {notifications.map((n) => (
                    <div 
                      key={n._id} 
                      className={cn(
                        "p-5 flex gap-4 hover:bg-slate-50 transition-colors cursor-pointer relative",
                        !n.isRead && "bg-indigo-50/20"
                      )}
                      onClick={() => handleNotificationClick(n)}
                    >
                      {!n.isRead && <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-indigo-600 rounded-full" />}
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center shrink-0 shadow-sm">
                        {getIcon(n.type)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 leading-tight">{n.title}</p>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{n.message}</p>
                        <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-tighter">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 px-6 text-center opacity-40">
                   <Bell size={32} className="mx-auto mb-4 text-slate-200" />
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Alerts Found</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-50 bg-slate-50/30 text-center">
              <button onClick={handleClearAll} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700">Clear All History</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
