import api from "@/lib/api";

const BASE = "/attendance";

export const markBulkAttendance = async (data: any): Promise<any> => {
  const res = await api.post(`${BASE}/bulk`, data);
  return res.data;
};

export const getAttendanceStats = async (batchId: string): Promise<any> => {
  const res = await api.get(`${BASE}/stats/${batchId}`);
  return res.data;
};

export const getHubStats = async (): Promise<any> => {
  const res = await api.get(`${BASE}/hub-stats`);
  return res.data;
};
