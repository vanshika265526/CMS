"use client";

import React, { useState, useEffect, Suspense } from "react";
import AnnouncementComposer from "@/components/teacher/AnnouncementComposer";
import api from "@/lib/api";
import { MessageSquare, Bell, Send, User, RotateCcw, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { useSocket } from "@/components/providers/SocketProvider";
import { Trash2 } from "lucide-react";

function TeacherCommunicationContent() {
  const [announcements, setAnnouncements] = useState([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'announcements' | 'messages'>('announcements');
  const [pageMessage, setPageMessage] = useState("");

  const [user, setUser] = useState<any>(null);
  const searchParams = useSearchParams();
  const { socket } = useSocket();

  const fetchData = async () => {
    setLoading(true);
    try {
      const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
      setUser(savedUser);
      const [annRes, stuRes] = await Promise.all([
        api.get('/teacher/announcements'),
        api.get('/teacher/students')
      ]);
      setAnnouncements(annRes.data.data);
      setStudents(stuRes.data.data);
    } catch (err: any) {
      console.error("Failed to load data", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (studentUserId: string) => {
    try {
      const res = await api.get(`/teacher/messages/${studentUserId}`);
      setMessages(res.data.data);
      // Clear unread count for this student locally
      setStudents(prev => prev.map(s => {
        const sId = s.userId?._id || s.userId;
        if (sId === studentUserId) {
          return { ...s, unreadCount: 0 };
        }
        return s;
      }));
    } catch (err) {
      console.error("Failed to fetch messages");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time message listener
  useEffect(() => {
    if (socket) {
      const handleMsg = (data: any) => {
        const senderId = data.from?._id;
        const selectedId = selectedStudent?.userId?._id || selectedStudent?.userId;

        // If we're viewing this conversation, add the message
        if (selectedStudent && senderId === selectedId) {
          setMessages((prev) => [...prev, data.message]);
        } else {
          // Increment unread count for the sender in the students list
          setStudents(prev => prev.map(s => {
            const sId = s.userId?._id || s.userId;
            if (sId === senderId) {
              return { ...s, unreadCount: (s.unreadCount || 0) + 1 };
            }
            return s;
          }));
        }
      };
      socket.on("newMessage", handleMsg);
      return () => {
        socket.off("newMessage", handleMsg);
      };
    }
  }, [socket, selectedStudent]);

  // Handle deep-linking from query parameters
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const studentUserIdParam = searchParams.get("studentUserId");

    if (tabParam === "messages" || tabParam === "announcements") {
      setActiveTab(tabParam as any);
    }

    if (studentUserIdParam && students.length > 0) {
      const student = students.find(s => 
        (s.userId?._id || s.userId) === studentUserIdParam || s._id === studentUserIdParam
      );
      if (student) {
        setSelectedStudent(student);
        setActiveTab("messages");
      }
    }
  }, [searchParams, students]);

  useEffect(() => {
    if (selectedStudent) {
      const studentUserId = selectedStudent.userId?._id || selectedStudent.userId;
      fetchMessages(studentUserId);
      const interval = setInterval(() => fetchMessages(studentUserId), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedStudent]);

  const handlePostAnnouncement = async (data: any) => {
    await api.post('/teacher/announcements', data);
    fetchData();
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this announcement? This cannot be undone');
    if (!confirmed) return;

    try {
      await api.delete(`/teacher/announcements/${announcementId}`);
      setAnnouncements((prev: any[]) => prev.filter((a: any) => a._id !== announcementId));
      setPageMessage('Announcement deleted successfully');
    } catch (err: any) {
      setPageMessage(err?.response?.data?.message || 'Unable to delete announcement right now');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage || !selectedStudent) return;

    setPageMessage("");

    const studentUserId = selectedStudent.userId?._id || selectedStudent.userId;

    try {
      await api.post('/teacher/messages', {
        receiverId: studentUserId,
        content: newMessage
      });
      setNewMessage("");
      fetchMessages(studentUserId);
    } catch (err: any) {
      setPageMessage(err?.response?.data?.message || "Unable to send message right now");
    }
  };

  if (loading) return <div className="animate-pulse space-y-8 p-8">
     <div className="h-10 w-64 bg-slate-200 rounded-lg"></div>
     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-150 bg-slate-100 rounded-3xl"></div>
            <div className="h-150 bg-slate-100 rounded-3xl"></div>
     </div>
  </div>;

  return (
    <div className="space-y-8 p-8 max-w-400 mx-auto">
      {pageMessage ? (
        <div className="p-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm">{pageMessage}</div>
      ) : null}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Communication Hub</h1>
          <p className="text-slate-500 mt-1">Send announcements to classes or direct messages to students.</p>
        </div>
        
        <div className="flex items-center gap-2 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm">
           <button 
             onClick={() => setActiveTab('announcements')}
             className={cn("px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all", activeTab === 'announcements' ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10" : "text-slate-400 hover:text-slate-600")}
           >
              Announcements
           </button>
           <button 
             onClick={() => setActiveTab('messages')}
             className={cn("px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all", activeTab === 'messages' ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10" : "text-slate-400 hover:text-slate-600")}
           >
              Direct Messages
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {activeTab === 'announcements' ? (
           <>
              <div className="lg:col-span-2">
                 <AnnouncementComposer onPost={handlePostAnnouncement} />
              </div>
              <div className="space-y-6">
                 <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden sticky top-24">
                    <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                       <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Recent Sent</h3>
                       <RotateCcw size={16} className="text-slate-400" />
                    </div>
                    <div className="divide-y divide-slate-50 max-h-125 overflow-y-auto custom-scrollbar">
                       {announcements.map((ann: any) => (
                         <div key={ann._id} className="p-5 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center justify-between mb-1">
                               <span className={cn(
                                 "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter border",
                                 ann.priority === 'Urgent' ? "bg-red-50 text-red-600 border-red-100" : "bg-slate-50 text-slate-500 border-slate-100"
                               )}>
                                  {ann.priority}
                               </span>
                               <div className="flex items-center gap-2">
                                 <span className="text-[9px] text-slate-400 font-medium">{new Date(ann.createdAt).toLocaleDateString()}</span>
                                 {(ann?.senderId?._id || ann?.senderId) === (user?._id || user?.id) && (
                                   <button
                                     onClick={() => handleDeleteAnnouncement(ann._id)}
                                     className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                     title="Delete announcement"
                                   >
                                     <Trash2 size={14} />
                                   </button>
                                 )}
                               </div>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 mb-1">{ann.title}</h4>
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{ann.body}</p>
                         </div>
                       ))}
                       {announcements.length === 0 && (
                          <div className="p-12 text-center text-slate-400 text-xs italic">No announcements sent yet.</div>
                       )}
                    </div>
                 </div>
              </div>
           </>
        ) : (
           <>
              <div className="lg:col-span-1 space-y-4">
                 <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-150">
                    <div className="p-6 border-b border-slate-100">
                       <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Contacts</h3>
                       <div className="relative">
                          <input 
                            type="text" 
                            placeholder="Find student..."
                            className="w-full pl-4 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none"
                          />
                       </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-50">
                       {students.map((stu: any) => (
                         <button 
                           key={stu._id}
                           onClick={() => setSelectedStudent(stu)}
                           className={cn(
                             "w-full p-4 flex items-center gap-3 transition-all text-left",
                             selectedStudent?._id === stu._id ? "bg-slate-900 text-white" : "hover:bg-slate-50"
                           )}
                         >
                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold", selectedStudent?._id === stu._id ? "bg-white text-slate-900" : "bg-slate-100 text-slate-400")}>
                               {(stu.personalInfo?.firstName || '?')[0]}
                            </div>
                            <div className="min-w-0 flex-1">
                               <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-bold truncate">
                                     {`${stu.personalInfo?.firstName || ''} ${stu.personalInfo?.lastName || ''}`.trim()}
                                  </p>
                                  {stu.unreadCount > 0 && selectedStudent?._id !== stu._id && (
                                     <span className="w-2 h-2 bg-red-500 rounded-full shrink-0 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                  )}
                               </div>
                               <p className={cn("text-[10px] uppercase font-medium tracking-tighter truncate", selectedStudent?._id === stu._id ? "text-slate-400" : "text-slate-500")}>{stu.academicInfo?.rollNumber || 'N/A'}</p>
                            </div>
                         </button>
                       ))}
                    </div>
                 </div>
              </div>
              
              <div className="lg:col-span-2">
                 <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-150">
                    {selectedStudent ? (
                       <>
                          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black">
                                {(selectedStudent.personalInfo?.firstName || '?')[0]}
                             </div>
                             <div>
                                <h3 className="font-bold text-slate-900">{`${selectedStudent.personalInfo?.firstName || ''} ${selectedStudent.personalInfo?.lastName || ''}`.trim()}</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active Conversation</p>
                             </div>
                          </div>
                          
                          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/20">
                             {messages.map((msg: any) => {
                                const currentUserId = user?._id || user?.id;
                                const senderId = msg.senderId?._id || msg.senderId;
                                const isMine = senderId === currentUserId;
                                
                                return (
                                  <div key={msg._id} className={cn("flex flex-col max-w-[80%]", isMine ? "items-end ml-auto" : "items-start")}>
                                     <div className={cn(
                                        "p-4 rounded-3xl text-sm shadow-sm",
                                        isMine ? "bg-slate-900 text-white rounded-tr-none" : "bg-white text-slate-900 rounded-tl-none border border-slate-100"
                                     )}>
                                        {msg.content}
                                     </div>
                                     <span className="text-[10px] text-slate-400 mt-1 px-1">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                );
                             })}
                             {messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
                                   <MessageSquare size={48} />
                                   <p className="text-xs font-bold uppercase tracking-widest">Start a conversation</p>
                                </div>
                             )}
                          </div>

                          <form onSubmit={handleSendMessage} className="p-6 border-t border-slate-100 bg-white">
                             <div className="flex items-center gap-4">
                                <input 
                                  type="text" 
                                  value={newMessage}
                                  onChange={e => setNewMessage(e.target.value)}
                                  placeholder="Type your message here..."
                                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-slate-100 transition-all font-medium"
                                />
                                <button 
                                  type="submit"
                                  className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all"
                                >
                                   <Send size={20} />
                                </button>
                             </div>
                          </form>
                       </>
                    ) : (
                       <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-6">
                          <div className="p-8 rounded-full bg-slate-50">
                             <User size={64} />
                          </div>
                          <div className="text-center">
                             <h3 className="text-lg font-bold text-slate-400">Select a Contact</h3>
                             <p className="text-xs font-medium uppercase tracking-widest mt-1">to begin direct messaging</p>
                          </div>
                       </div>
                    )}
                 </div>
              </div>
           </>
        )}
      </div>
    </div>
  );
}

export default function CommunicationPage() {
  return (
    <Suspense fallback={<div className="p-8 animate-pulse text-slate-400 font-black uppercase tracking-widest">Loading teacher communication...</div>}>
      <TeacherCommunicationContent />
    </Suspense>
  );
}
