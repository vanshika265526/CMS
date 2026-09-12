import api from "@/lib/api";

export const fetchHostels = async () => {
  const response = await api.get("/hostel");
  return response.data;
};

export const fetchHostelStats = async () => {
  const response = await api.get("/hostel/stats");
  return response.data;
};

export const createHostel = async (data: any) => {
  const response = await api.post("/hostel", data);
  return response.data;
};

export const fetchRooms = async (filters: { hostelId?: string; status?: string; floor?: number } = {}) => {
  const response = await api.get("/hostel/rooms", { params: filters });
  return response.data;
};

export const createRoom = async (data: any) => {
  const response = await api.post("/hostel/rooms", data);
  return response.data;
};

export const updateRoom = async (id: string, data: any) => {
  const response = await api.patch(`/hostel/rooms/${id}`, data);
  return response.data;
};

export const fetchAllocations = async (filters: { hostelId?: string; status?: string } = {}) => {
  const response = await api.get("/hostel/allocations", { params: filters });
  return response.data;
};

export const allocateBed = async (data: {
  studentId: string;
  roomId: string;
  bedNumber?: number;
  remarks?: string;
}) => {
  const response = await api.post("/hostel/allocations", data);
  return response.data;
};

export const vacateBed = async (allocationId: string) => {
  const response = await api.patch(`/hostel/allocations/${allocationId}/vacate`);
  return response.data;
};

export const fetchMyHostel = async () => {
  const response = await api.get("/hostel/me");
  return response.data;
};

export const fetchMessMenu = async (hostelId?: string) => {
  const response = await api.get("/hostel/mess-menu", { params: { hostelId } });
  return response.data;
};

export const saveMessMenu = async (data: any) => {
  const response = await api.post("/hostel/mess-menu", data);
  return response.data;
};

export const fetchGatePasses = async (filters: { hostelId?: string; status?: string } = {}) => {
  const response = await api.get("/hostel/gate-passes", { params: filters });
  return response.data;
};

export const createGatePass = async (data: any) => {
  const response = await api.post("/hostel/gate-passes", data);
  return response.data;
};

export const updateGatePassStatus = async (id: string, status: string, rejectionReason?: string) => {
  const response = await api.patch(`/hostel/gate-passes/${id}/status`, { status, rejectionReason });
  return response.data;
};
