import api from "@/lib/api";

export const fetchTickets = async (
  filters: { status?: string; category?: string; priority?: string; search?: string } = {}
) => {
  const response = await api.get("/support/tickets", { params: filters });
  return response.data;
};

export const fetchTicketById = async (id: string) => {
  const response = await api.get(`/support/tickets/${id}`);
  return response.data;
};

export const createTicket = async (data: {
  subject: string;
  description: string;
  category: string;
  priority: string;
  attachmentUrl?: string;
}) => {
  const response = await api.post("/support/tickets", data);
  return response.data;
};

export const replyToTicket = async (id: string, message: string) => {
  const response = await api.post(`/support/tickets/${id}/replies`, { message });
  return response.data;
};

export const updateTicket = async (
  id: string,
  data: { status?: string; priority?: string; assignedTo?: string | null }
) => {
  const response = await api.patch(`/support/tickets/${id}`, data);
  return response.data;
};

export const fetchSupportStats = async () => {
  const response = await api.get("/support/stats");
  return response.data;
};
