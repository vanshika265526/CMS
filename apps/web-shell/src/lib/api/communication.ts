import api from "@/lib/api";

const getRole = (): string => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.role || "STUDENT";
  } catch {
    return "STUDENT";
  }
};

/**
 * Get the base path for communication endpoints based on role
 */
const getCommPath = (): string => {
  const role = getRole();
  if (role === "PARENT") return `parent/me`;
  return `students`;
};

/**
 * Fetch announcements (batch-filtered for students, child-filtered for parents)
 */
export const fetchMyAnnouncements = async () => {
  const path = getCommPath();
  const response = await api.get(`${path}/announcements`);
  return response.data;
};

/**
 * Fetch the list of teachers assigned to the student's/child's batch
 */
export const fetchMyTeachers = async () => {
  const role = getRole();
  const path = role === "PARENT" ? `/parent/me` : `/students`;
  const response = await api.get(`${path}/teachers`);
  return response.data;
};

/**
 * Correctly routed teacher fetch
 */
export const fetchTeachersForRole = async () => {
  const role = getRole();
  let url: string;
  if (role === "PARENT") {
    url = `parent/me/teachers`;
  } else {
    url = `students/my-teachers`;
  }
  const response = await api.get(url);
  return response.data;
};

/**
 * Fetch conversation thread with a specific user
 */
export const fetchConversation = async (otherUserId: string) => {
  const path = getCommPath();
  const response = await api.get(`${path}/messages/${otherUserId}`);
  return response.data;
};

/**
 * Send a direct message
 */
export const sendDirectMessage = async (receiverId: string, content: string) => {
  const path = getCommPath();
  const response = await api.post(`${path}/messages`, { receiverId, content });
  return response.data;
};

/**
 * Get count of unread messages
 */
export const fetchUnreadCount = async () => {
  const path = getCommPath();
  const response = await api.get(`${path}/messages/unread-count`);
  return response.data;
};

/**
 * Mark a specific message as read
 */
export const markMessageAsRead = async (messageId: string) => {
  const path = getCommPath();
  const response = await api.put(`${path}/messages/${messageId}/read`, {});
  return response.data;
};

// ====================================================================
// GENERIC NOTIFICATIONS (Personal Alerts, Library, etc.)
// ====================================================================

/**
 * Fetch personal notifications for the logged-in user
 */
export const fetchNotifications = async () => {
  const response = await api.get(`/notifications`);
  return response.data;
};

/**
 * Fetch unread notification count
 */
export const fetchNotifUnreadCount = async () => {
  const response = await api.get(`/notifications/unread-count`);
  return response.data;
};

/**
 * Mark a specific notification as read
 */
export const markNotifAsRead = async (id: string) => {
  const response = await api.put(`/notifications/${id}/read`, {});
  return response.data;
};

export const markAllNotifAsRead = async () => {
  const response = await api.put(`/notifications/read-all`, {});
  return response.data;
};
