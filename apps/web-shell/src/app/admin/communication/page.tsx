"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  createAnnouncement,
  fetchAnnouncements,
  fetchBatches,
  fetchConversationHistory,
  fetchFaculties,
  fetchMessages,
  fetchStudents,
  sendMessage,
  uploadMessageAttachment,
} from "@/lib/api/admin";
import AnnouncementList from "@/components/admin/AnnouncementList";
import { AlertCircle, Download, History, Loader2, Mail, MessageSquare, Paperclip, Plus, Search, Send, Users, X } from "lucide-react";
import { useSocket } from "@/components/providers/SocketProvider";

export default function CommunicationPage() {
  const { socket } = useSocket();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyTab, setHistoryTab] = useState<"messages" | "announcements">("messages");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [threads, setThreads] = useState<any[]>([]);
  const [threadSearch, setThreadSearch] = useState("");
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [conversation, setConversation] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMessage, setHistoryMessage] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    body: "",
    targetClass: "all",
    targetAudience: "all",
    priority: "Normal",
  });
  const [messageForm, setMessageForm] = useState({
    receiverId: "",
    content: "",
  });

  useEffect(() => {
    loadCommunications();
  }, []);

  useEffect(() => {
    if (!showHistoryModal) return;

    loadHistory();
    const interval = window.setInterval(loadHistory, 5000);
    return () => window.clearInterval(interval);
  }, [showHistoryModal]);

  useEffect(() => {
    if (!socket) return;
    const onNewMessage = () => {
      if (showHistoryModal) {
        loadHistory();
      }
    };
    socket.on("newMessage", onNewMessage);
    return () => {
      socket.off("newMessage", onNewMessage);
    };
  }, [socket, showHistoryModal]);

  const loadCommunications = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [annRes, batchRes, studentRes, facultyRes] = await Promise.all([
        fetchAnnouncements(),
        fetchBatches(),
        fetchStudents(),
        fetchFaculties(),
      ]);

      if (annRes.success) setAnnouncements(annRes.data);
      if (batchRes.success) setBatches(Array.isArray(batchRes.data) ? batchRes.data : []);
      if (studentRes.success) setStudents(Array.isArray(studentRes.data) ? studentRes.data : []);
      if (facultyRes.success) setFaculties(Array.isArray(facultyRes.data) ? facultyRes.data : []);
    } catch (err) {
      console.error(err);
      setLoadError("Failed to load communication data");
    } finally {
      setLoading(false);
    }
  };

  const recipientOptions = useMemo(() => {
    const studentOptions = students
      .map((student) => ({
        value: String(student?.userId?._id || student?.userId || student?._id || ""),
        label: `${student?.personalInfo?.firstName || ""} ${student?.personalInfo?.lastName || ""}`.trim() || student?.personalInfo?.email || "Student",
        group: "Student",
      }))
      .filter((item) => item.value);

    const facultyOptions = faculties
      .map((faculty) => ({
        value: String(faculty?.userId?._id || faculty?.userId || faculty?._id || ""),
        label: faculty?.userId?.name || faculty?.name || faculty?.personalInfo?.name || faculty?.userId?.email || "Faculty",
        group: "Faculty",
      }))
      .filter((item) => item.value);

    return [...studentOptions, ...facultyOptions];
  }, [students, faculties]);

  const handleAnnouncementSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      setFeedback(null);
      await createAnnouncement({
        title: announcementForm.title,
        body: announcementForm.body,
        content: announcementForm.body,
        targetClass: announcementForm.targetClass,
        targetAudience: announcementForm.targetAudience,
        priority: announcementForm.priority,
        type: announcementForm.priority.toLowerCase(),
      });
      setAnnouncementForm({ title: "", body: "", targetClass: "all", targetAudience: "all", priority: "Normal" });
      setShowAnnouncementModal(false);
      setFeedback("Announcement posted successfully.");
      await loadCommunications();
    } catch (err: any) {
      setFeedback(err?.response?.data?.message || "Failed to post announcement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMessageSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      setFeedback(null);
      await sendMessage({
        receiverId: messageForm.receiverId,
        content: messageForm.content,
      });
      setMessageForm({ receiverId: "", content: "" });
      setShowMessageModal(false);
      setFeedback("Direct message sent successfully.");
    } catch (err: any) {
      setFeedback(err?.response?.data?.message || "Failed to send message");
    } finally {
      setSubmitting(false);
    }
  };

  const resolveParticipant = (message: any, currentUserId: string) => {
    const sender = message?.senderId;
    const receiver = message?.receiverId;
    const senderId = String(sender?._id || sender || "");
    const receiverId = String(receiver?._id || receiver || "");
    return senderId === currentUserId ? receiver : sender;
  };

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const currentUserId = String(user?.id || user?._id || "");
      if (!currentUserId) return;

      const allMessagesRes = await fetchMessages();
      if (!allMessagesRes?.success || !Array.isArray(allMessagesRes.data)) return;

      const grouped = new Map<string, any>();
      allMessagesRes.data.forEach((msg: any) => {
        const participant = resolveParticipant(msg, currentUserId);
        const participantId = String(participant?._id || participant || "");
        if (!participantId) return;

        const existing = grouped.get(participantId);
        const unreadIncrement = String(msg?.receiverId?._id || msg?.receiverId || "") === currentUserId && !msg?.isRead ? 1 : 0;

        if (!existing || new Date(msg.createdAt).getTime() > new Date(existing.lastMessageAt).getTime()) {
          grouped.set(participantId, {
            participant,
            participantId,
            lastMessage: msg,
            lastMessageAt: msg.createdAt,
            unreadCount: (existing?.unreadCount || 0) + unreadIncrement,
          });
        } else {
          existing.unreadCount += unreadIncrement;
        }
      });

      const list = Array.from(grouped.values()).sort(
        (a: any, b: any) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );

      setThreads(list);

      if (selectedThread?.participantId) {
        const convRes = await fetchConversationHistory(selectedThread.participantId);
        if (convRes?.success) {
          setConversation(convRes.data || []);
        }
      }
    } catch (err) {
      console.error("Failed to load communication history", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openThread = async (thread: any) => {
    setSelectedThread(thread);
    try {
      const convRes = await fetchConversationHistory(thread.participantId);
      if (convRes?.success) {
        setConversation(convRes.data || []);
      }
    } catch (err) {
      console.error("Failed to open thread", err);
    }
  };

  const sendHistoryMessage = async () => {
    if (!selectedThread?.participantId) return;
    if (!historyMessage.trim() && !attachmentFile) return;

    try {
      setSubmitting(true);
      let attachmentPayload: any = {};

      if (attachmentFile) {
        if (attachmentFile.size > 10 * 1024 * 1024) {
          setFeedback("Attachment exceeds 10MB limit");
          return;
        }
        const uploadRes = await uploadMessageAttachment(attachmentFile);
        if (uploadRes?.success) {
          attachmentPayload = uploadRes.data;
        }
      }

      await sendMessage({
        receiverId: selectedThread.participantId,
        content: historyMessage.trim(),
        ...attachmentPayload,
      });

      setHistoryMessage("");
      setAttachmentFile(null);
      await openThread(selectedThread);
      await loadHistory();
    } catch (err: any) {
      setFeedback(err?.response?.data?.message || "Failed to send message");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredThreads = threads.filter((thread: any) => {
    const name = String(thread?.participant?.name || thread?.participant?.email || "").toLowerCase();
    return name.includes(threadSearch.toLowerCase());
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase font-sans">Communication Hub</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Institutional Engagement & Information Control</p>
        </div>

        <div className="flex items-center gap-3">
        <button onClick={() => setShowMessageModal(true)} className="px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2">
              <Mail size={14} /> Direct Message
           </button>
          <button onClick={() => setShowHistoryModal(true)} className="px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2">
              <History size={14} /> History
            </button>
        <button onClick={() => setShowAnnouncementModal(true)} className="px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all flex items-center gap-2">
              <Plus size={14} /> New Announcement
           </button>
        </div>
      </div>

    {feedback && (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 flex items-center gap-2">
       <AlertCircle size={16} className="text-amber-500" />
       <span>{feedback}</span>
      </div>
    )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Main Feed */}
         <div className="lg:col-span-2">
           {loading ? (
             <div className="h-96 flex flex-col items-center justify-center gap-4">
                <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fetching Global Feed...</p>
             </div>
           ) : loadError ? (
             <div className="h-96 flex flex-col items-center justify-center gap-4 rounded-2xl border border-rose-100 bg-rose-50/50">
               <p className="text-sm font-black uppercase tracking-widest text-rose-600">{loadError}</p>
               <button onClick={loadCommunications} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800">
                 Retry
               </button>
             </div>
           ) : (
             <AnnouncementList announcements={announcements} />
           )}
         </div>

         {/* Sidebar Tools */}
         <div className="space-y-8">
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                  <Users size={60} />
               </div>
               <h3 className="text-xs font-black uppercase tracking-widest mb-4">Targeted Blast</h3>
               <p className="text-[10px] font-medium text-slate-400 leading-relaxed mb-6">Send urgent SMS or Email notifications to specific student cohorts or faculty departments.</p>
              <button onClick={() => setShowAnnouncementModal(true)} className="w-full py-4 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">
                  Launch Campaign
               </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
               <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-6">System Health</h3>
               <div className="space-y-4">
                  <HealthItem label="Email Gateway" status="Operational" />
                  <HealthItem label="SMS API" status="Operational" />
                  <HealthItem label="Push Notifications" status="Operational" />
               </div>
            </div>
         </div>
      </div>

      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-stretch justify-end" onClick={() => setShowHistoryModal(false)}>
          <div className="w-full max-w-6xl h-full bg-white border-l border-slate-200 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${historyTab === 'messages' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
                  onClick={() => setHistoryTab('messages')}
                >
                  Direct Messages
                </button>
                <button
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${historyTab === 'announcements' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
                  onClick={() => setHistoryTab('announcements')}
                >
                  Announcements
                </button>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900">
                <X size={16} />
              </button>
            </div>

            {historyTab === 'messages' ? (
              <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3">
                <div className="border-r border-slate-200 flex flex-col min-h-0">
                  <div className="p-4 border-b border-slate-100">
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                      <Search size={14} className="text-slate-400" />
                      <input
                        value={threadSearch}
                        onChange={(e) => setThreadSearch(e.target.value)}
                        placeholder="Search recipient..."
                        className="w-full bg-transparent text-sm outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {historyLoading ? (
                      <div className="p-4 text-xs text-slate-500">Loading threads...</div>
                    ) : filteredThreads.length === 0 ? (
                      <div className="p-4 text-xs text-slate-500">No threads found</div>
                    ) : filteredThreads.map((thread: any) => {
                      const participantName = thread?.participant?.name || thread?.participant?.email || 'Unknown';
                      const participantRole = String(thread?.participant?.role || '').replace('_', ' ');
                      const initial = String(participantName).charAt(0).toUpperCase();
                      return (
                        <button
                          key={thread.participantId}
                          onClick={() => openThread(thread)}
                          className={`w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 ${selectedThread?.participantId === thread.participantId ? 'bg-slate-50' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex gap-3">
                              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center shrink-0">{initial}</div>
                              <div className="min-w-0">
                              <p className={`text-sm truncate ${thread.unreadCount > 0 ? 'font-black text-slate-900' : 'font-semibold text-slate-700'}`}>{participantName}</p>
                              <p className="text-[10px] uppercase tracking-widest text-slate-400">{participantRole}</p>
                              <p className="text-xs text-slate-500 truncate mt-1">{String(thread?.lastMessage?.content || thread?.lastMessage?.attachmentName || '').slice(0, 40)}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[10px] text-slate-400">{new Date(thread.lastMessageAt).toLocaleString()}</p>
                              {thread.unreadCount > 0 && (
                                <span className="inline-flex mt-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black">{thread.unreadCount}</span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="md:col-span-2 flex flex-col min-h-0">
                  {selectedThread ? (
                    <>
                      <div className="px-4 py-3 border-b border-slate-200">
                        <p className="text-sm font-black text-slate-900">{selectedThread?.participant?.name || selectedThread?.participant?.email || 'Recipient'}</p>
                        <p className="text-[10px] uppercase tracking-widest text-slate-400">
                          {String(selectedThread?.participant?.role || '').replace('_', ' ')}
                          {selectedThread?.participant?.department ? ` • ${selectedThread?.participant?.department}` : ''}
                        </p>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                        {conversation.map((msg: any) => {
                          const me = JSON.parse(localStorage.getItem('user') || '{}');
                          const myId = String(me?.id || me?._id || '');
                          const isSent = String(msg?.senderId?._id || msg?.senderId || '') === myId;
                          return (
                            <div key={msg._id} className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[70%] rounded-2xl px-3 py-2 ${isSent ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-800'}`}>
                                {msg.content ? <p className="text-sm whitespace-pre-wrap">{msg.content}</p> : null}
                                {msg.attachmentUrl ? (
                                  String(msg.attachmentType || '').startsWith('image/') ? (
                                    <a href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5005'}${msg.attachmentUrl}`} target="_blank" rel="noreferrer" className="block mt-2">
                                      <img
                                        src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5005'}${msg.attachmentUrl}`}
                                        alt={msg.attachmentName || 'attachment'}
                                        className="max-h-40 rounded-lg border border-white/20"
                                      />
                                    </a>
                                  ) : (
                                    <a href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5005'}${msg.attachmentUrl}`} target="_blank" rel="noreferrer" className="text-xs underline inline-flex items-center gap-1 mt-1">
                                      <Download size={12} /> {msg.attachmentName || 'Attachment'}
                                    </a>
                                  )
                                ) : null}
                                <div className={`text-[10px] mt-1 ${isSent ? 'text-indigo-100' : 'text-slate-500'} flex items-center gap-1 justify-end`}>
                                  <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                                  {isSent ? <span>{msg.deliveryStatus === 'read' ? '✓✓' : msg.deliveryStatus === 'delivered' ? '✓✓' : '✓'}</span> : null}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="p-4 border-t border-slate-200">
                        {attachmentFile ? (
                          <div className="mb-2 text-xs text-slate-600">Attachment: {attachmentFile.name}</div>
                        ) : null}
                        <div className="flex items-end gap-2">
                          <label className="p-2 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                            <Paperclip size={16} />
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png,.docx"
                              onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                            />
                          </label>
                          <textarea
                            value={historyMessage}
                            onChange={(e) => setHistoryMessage(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendHistoryMessage();
                              }
                            }}
                            placeholder="Type a message..."
                            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm min-h-12 max-h-32"
                          />
                          <button
                            type="button"
                            onClick={sendHistoryMessage}
                            disabled={submitting}
                            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest disabled:opacity-60"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-slate-500">Select a thread to view messages</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {announcements.length === 0 ? (
                  <p className="text-sm text-slate-500">No announcement history available</p>
                ) : announcements.map((ann: any) => (
                  <details key={ann._id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <summary className="cursor-pointer text-sm font-black text-slate-900 flex items-center justify-between gap-3">
                      <span>{ann.title || 'Announcement'}</span>
                      <span className="text-[10px] text-slate-400">{new Date(ann.createdAt).toLocaleString()}</span>
                    </summary>
                    <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{ann.body || ann.content}</div>
                  </details>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showAnnouncementModal && (
        <Modal title="New Announcement" onClose={() => setShowAnnouncementModal(false)}>
          <form className="space-y-4" onSubmit={handleAnnouncementSubmit}>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Title</label>
              <input
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                value={announcementForm.title}
                onChange={(event) => setAnnouncementForm((prev) => ({ ...prev, title: event.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Target Batch</label>
              <select
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                value={announcementForm.targetClass}
                onChange={(event) => setAnnouncementForm((prev) => ({ ...prev, targetClass: event.target.value }))}
              >
                <option value="all">All Classes</option>
                {batches.map((batch) => (
                  <option key={batch._id} value={batch._id}>{batch.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Audience</label>
              <select
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                value={announcementForm.targetAudience}
                onChange={(event) => setAnnouncementForm((prev) => ({ ...prev, targetAudience: event.target.value }))}
              >
                <option value="all">All Users</option>
                <option value="students">Students</option>
                <option value="parents">Parents</option>
                <option value="both">Students + Parents</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Priority</label>
              <select
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                value={announcementForm.priority}
                onChange={(event) => setAnnouncementForm((prev) => ({ ...prev, priority: event.target.value }))}
              >
                <option>Normal</option>
                <option>Important</option>
                <option>Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Message</label>
              <textarea
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 min-h-32"
                value={announcementForm.body}
                onChange={(event) => setAnnouncementForm((prev) => ({ ...prev, body: event.target.value }))}
                required
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowAnnouncementModal(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-widest">Cancel</button>
              <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest disabled:opacity-60 flex items-center gap-2">
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Post
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showMessageModal && (
        <Modal title="Direct Message" onClose={() => setShowMessageModal(false)}>
          <form className="space-y-4" onSubmit={handleMessageSubmit}>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Recipient</label>
              <select
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                value={messageForm.receiverId}
                onChange={(event) => setMessageForm((prev) => ({ ...prev, receiverId: event.target.value }))}
                required
              >
                <option value="">Select recipient</option>
                {recipientOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.group}: {option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Message</label>
              <textarea
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 min-h-32"
                value={messageForm.content}
                onChange={(event) => setMessageForm((prev) => ({ ...prev, content: event.target.value }))}
                required
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowMessageModal(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-widest">Cancel</button>
              <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest disabled:opacity-60 flex items-center gap-2">
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
                Send
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-4xl bg-white shadow-2xl border border-slate-100 p-6" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 flex items-center justify-center">
            <X size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function HealthItem({ label, status }: { label: string, status: string }) {
  return (
    <div className="flex items-center justify-between pb-4 border-b border-slate-50 last:border-0 last:pb-0">
       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
       <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{status}</span>
       </div>
    </div>
  );
}
