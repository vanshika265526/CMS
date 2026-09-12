"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import {
  fetchMyAnnouncements,
  fetchTeachersForRole,
  fetchConversation,
  sendDirectMessage,
  fetchUnreadCount,
  markMessageAsRead,
} from "@/lib/api/communication";
import {
  MessageSquare,
  Bell,
  Send,
  User,
  Clock,
  Megaphone,
  Search,
  ArrowLeft,
  CheckCheck,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Users,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { useSocket } from "@/components/providers/SocketProvider";

function CommunicationPageContent() {
  const { socket } = useSocket();
  const [user, setUser] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"announcements" | "messages">("announcements");
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const searchParams = useSearchParams();

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(savedUser);
    fetchData();
    loadUnreadCount();

    // Handle initial navigation from query parameters
    const tabParam = searchParams.get("tab");
    const teacherIdParam = searchParams.get("teacherId");

    if (tabParam === "messages" || tabParam === "announcements") {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  // Sync selected teacher once teachers list is loaded if teacherId is in URL
  useEffect(() => {
    const teacherIdParam = searchParams.get("teacherId");
    if (teacherIdParam && teachers.length > 0) {
      const teacher = teachers.find(t => 
        (t.userId?._id || t.userId) === teacherIdParam || t._id === teacherIdParam
      );
      if (teacher) {
        setSelectedTeacher(teacher);
        setActiveTab("messages");
      }
    }
  }, [teachers, searchParams]);

  // Real-time message listener
  useEffect(() => {
    if (socket) {
      const handleMsg = (data: any) => {
        const senderId = data.from?._id;
        const selectedId = selectedTeacher?.userId?._id || selectedTeacher?.userId;

        // If we're viewing this conversation, add the message
        if (selectedTeacher && senderId === selectedId) {
          setMessages((prev) => [...prev, data.message]);
          scrollToBottom();
          // Mark as read in backend
          markMessageAsRead(data.message._id);
        } else {
          // Increment unread count for the sender in the teachers list
          setTeachers(prev => prev.map(t => {
            const tId = t.userId?._id || t.userId;
            if (tId === senderId) {
              return { ...t, unreadCount: (t.unreadCount || 0) + 1 };
            }
            return t;
          }));
        }
        loadUnreadCount();
      };
      socket.on("newMessage", handleMsg);
      return () => {
        socket.off("newMessage", handleMsg);
      };
    }
  }, [socket, selectedTeacher]);

  useEffect(() => {
    if (selectedTeacher) {
      const teacherUserId = selectedTeacher.userId?._id || selectedTeacher.userId;
      loadConversation(teacherUserId);
    }
  }, [selectedTeacher]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [annRes, teachRes] = await Promise.all([
        fetchMyAnnouncements(),
        fetchTeachersForRole(),
      ]);
      if (annRes.success) setAnnouncements(annRes.data);
      if (teachRes.success) setTeachers(teachRes.data);
    } catch (err) {
      console.error("Failed to load communication data", err);
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (teacherUserId: string) => {
    try {
      const res = await fetchConversation(teacherUserId);
      if (res.success) {
        setMessages(res.data);
        // Clear unread count for this teacher locally
        setTeachers(prev => prev.map(t => {
          const tId = t.userId?._id || t.userId;
          if (tId === teacherUserId) {
            return { ...t, unreadCount: 0 };
          }
          return t;
        }));
      }
    } catch (err) {
      console.error("Failed to load conversation", err);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const res = await fetchUnreadCount();
      if (res.success) setUnreadCount(res.data.count);
    } catch {
      // Silently fail
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTeacher || sending) return;

    const teacherUserId = selectedTeacher.userId?._id || selectedTeacher.userId;
    setSending(true);

    try {
      const res = await sendDirectMessage(teacherUserId, newMessage.trim());
      if (res.success) {
        setMessages((prev) => [...prev, res.data]);
        setNewMessage("");
        scrollToBottom();
      }
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setSending(false);
    }
  };

  const filteredTeachers = teachers.filter(
    (t) =>
      t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const roleLabel = user?.role === "PARENT" ? "Parent" : "Student";
  const getTeacherInitials = (name: string) =>
    name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "T";

  const priorityStyle: Record<string, string> = {
    Normal: "bg-slate-50 text-slate-500 border-slate-100",
    Important: "bg-amber-50 text-amber-600 border-amber-100",
    Urgent: "bg-red-50 text-red-600 border-red-100",
  };

  if (loading)
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-10 w-72 bg-slate-200 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-[600px] bg-slate-100 rounded-3xl" />
          <div className="h-[600px] bg-slate-100 rounded-3xl" />
        </div>
      </div>
    );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 max-w-7xl mx-auto w-full pb-12">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Communication Hub</h1>
        <p className="text-sm text-slate-500 mt-1">Institutional announcements and direct messaging.</p>
      </header>

      <div className="flex items-center p-1 bg-slate-100/50 rounded-2xl w-fit border border-slate-200/60 shadow-sm backdrop-blur-sm">
        <button
          onClick={() => setActiveTab('announcements')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black tracking-widest transition-all duration-300",
            activeTab === 'announcements' 
              ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10" 
              : "text-slate-500 hover:text-slate-900"
          )}
        >
          <Bell size={14} className={activeTab === 'announcements' ? "animate-bounce" : ""} />
          ANNOUNCEMENTS
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={cn(
            "relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black tracking-widest transition-all duration-300",
            activeTab === 'messages' 
              ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10" 
              : "text-slate-500 hover:text-slate-900"
          )}
        >
          <MessageSquare size={14} className={activeTab === 'messages' ? "animate-pulse" : ""} />
          MESSAGING
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'announcements' ? (
        <AnnouncementsView 
          announcements={announcements} 
          priorityStyle={priorityStyle} 
          roleLabel={roleLabel} 
        />
      ) : (
        <MessagingView 
          teachers={filteredTeachers}
          selectedTeacher={selectedTeacher}
          setSelectedTeacher={setSelectedTeacher}
          messages={messages}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          handleSendMessage={handleSendMessage}
          sending={sending}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          user={user}
          getTeacherInitials={getTeacherInitials}
          messagesEndRef={messagesEndRef}
          chatContainerRef={chatContainerRef}
        />
      )}
    </div>
  );
}

function AnnouncementsView({ announcements, priorityStyle, roleLabel }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        {announcements.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-16 flex flex-col items-center justify-center text-center">
            <div className="p-6 rounded-full bg-slate-50 mb-6">
              <Megaphone size={48} className="text-slate-200" />
            </div>
            <h3 className="text-lg font-bold text-slate-400 mb-2">No Announcements Yet</h3>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest max-w-sm">
              Your teachers haven't posted any announcements for your batch.
            </p>
          </div>
        ) : (
          announcements.map((ann: any) => (
            <div key={ann._id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 group hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-sm">
                    {ann.senderId?.name?.[0] || 'A'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{ann.senderId?.name || 'Faculty'}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      {new Date(ann.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className={cn("text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border", priorityStyle[ann.priority] || priorityStyle.Normal)}>
                  {ann.priority}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{ann.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{ann.body}</p>
            </div>
          ))
        )}
      </div>
      <div className="space-y-6">
        <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
          <Sparkles className="absolute -right-4 -bottom-4 text-white/5" size={120} />
          <h3 className="text-xs font-black uppercase tracking-widest mb-3">{roleLabel} Portal</h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">Stay updated with your institution.</p>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Live Updates
          </div>
        </div>
      </div>
    </div>
  );
}

function MessagingView({
  teachers,
  selectedTeacher,
  setSelectedTeacher,
  messages,
  newMessage,
  setNewMessage,
  handleSendMessage,
  sending,
  searchQuery,
  setSearchQuery,
  user,
  getTeacherInitials,
  messagesEndRef,
  chatContainerRef,
}: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[650px]">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Faculty Contacts</h3>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search teachers..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-50">
            {teachers.map((teacher: any) => {
              const teacherId = teacher.userId?._id || teacher.userId;
              const isSelected = (selectedTeacher?.userId?._id || selectedTeacher?.userId) === teacherId;
              return (
                <button
                  key={teacher._id}
                  onClick={() => setSelectedTeacher(teacher)}
                  className={cn("w-full p-4 flex items-center gap-3 transition-all", isSelected ? "bg-slate-900 text-white" : "hover:bg-slate-50")}
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm", isSelected ? "bg-indigo-600 shadow-lg" : "bg-indigo-50 text-indigo-600")}>
                    {getTeacherInitials(teacher.name)}
                  </div>
                  <div className="min-w-0 flex-1 relative">
                    <div className="flex items-center justify-between gap-2">
                       <p className="text-sm font-bold truncate">{teacher.name}</p>
                       {teacher.unreadCount > 0 && !isSelected && (
                          <span className="w-2 h-2 bg-red-500 rounded-full shrink-0 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                       )}
                    </div>
                    <p className="text-[10px] uppercase font-bold tracking-widest truncate text-slate-400">{teacher.department || 'Faculty'}</p>
                  </div>
                  <ChevronRight size={14} className={isSelected ? "text-slate-400" : "text-slate-200"} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="lg:col-span-2">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[650px]">
          {selectedTeacher ? (
            <>
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
                <button onClick={() => setSelectedTeacher(null)} className="lg:hidden p-2 text-slate-400"><ArrowLeft size={20} /></button>
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-lg">
                  {getTeacherInitials(selectedTeacher.name)}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900">{selectedTeacher.name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedTeacher.department || 'Faculty'}</p>
                </div>
              </div>
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/30">
                {messages.map((msg: any) => {
                  const isMine = (msg.senderId?._id || msg.senderId) === (user?._id || user?.id);
                  return (
                    <div key={msg._id} className={cn("flex flex-col max-w-[75%]", isMine ? "items-end ml-auto" : "items-start")}>
                      <div className={cn("px-4 py-3 rounded-2xl text-sm shadow-sm", isMine ? "bg-slate-900 text-white rounded-br-md" : "bg-white text-slate-900 rounded-bl-md border border-slate-100")}>
                        {msg.content}
                      </div>
                      <div className="flex items-center gap-1 mt-1 px-1">
                        <span className="text-[9px] text-slate-400">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMine && msg.isRead && <CheckCheck size={12} className="text-indigo-500" />}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-white flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                  disabled={sending}
                />
                <button type="submit" disabled={!newMessage.trim() || sending} className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg hover:bg-indigo-700 transition-all">
                  <Send size={18} />
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
               <div className="p-8 rounded-full bg-slate-50 mb-6"><User size={56} className="text-slate-200" /></div>
               <h3 className="text-lg font-bold text-slate-400">Select a Teacher</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CommunicationPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
      <CommunicationPageContent />
    </Suspense>
  );
}
