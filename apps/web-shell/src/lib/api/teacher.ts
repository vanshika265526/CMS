import api from "@/lib/api";

const BASE = "/teacher";

/** Fetch teacher dashboard aggregated stats */
export const fetchTeacherDashboardStats = async () => {
  const response = await api.get(`${BASE}/dashboard`);
  return response.data;
};

/** Fetch only the batches this teacher is assigned to */
export const fetchMyBatches = async () => {
  const response = await api.get(`${BASE}/my-batches`);
  return response.data;
};

/** Fetch subjects for this teacher, optionally filtered by batchId */
export const fetchMySubjects = async (batchId?: string) => {
  const response = await api.get(`${BASE}/my-subjects`, { params: { batchId } });
  return response.data;
};

/** Fetch today's timetable */
export const fetchTodayTimetable = async () => {
  const response = await api.get(`${BASE}/timetable/today`);
  return response.data;
};
