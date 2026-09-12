import api from "@/lib/api";

const BASE = "/students";

/**
 * Fetch the logged-in student's profile
 */
export const fetchMyProfile = async () => {
  const response = await api.get(`${BASE}/me`);
  return response.data;
};

/**
 * Fetch the logged-in student's attendance records
 */
export const fetchMyAttendance = async () => {
  const response = await api.get(`/attendance/me`);
  return response.data;
};

/**
 * Fetch the logged-in student's results
 */
export const fetchMyResults = async () => {
  const response = await api.get(`/exams/results`);
  return response.data;
};

/**
 * Fetch the logged-in student's full weekly timetable
 */
export const fetchMyTimetable = async () => {
  const response = await api.get(`${BASE}/timetable`);
  return response.data;
};

/**
 * Fetch the logged-in student's schedule for today
 */
export const fetchMyTodaySchedule = async () => {
  const response = await api.get(`${BASE}/timetable/today`);
  return response.data;
};

/**
 * Fetch the logged-in student's financial portfolio
 */
export const fetchMyFees = async () => {
  const response = await api.get(`${BASE}/fees`);
  return response.data;
};

/**
 * Fetch the logged-in student's academic materials (PDFs, Notes)
 */
export const fetchMyMaterials = async () => {
  const response = await api.get(`${BASE}/materials/me`);
  return response.data;
};

/**
 * Fetch the logged-in student's assignments specifically (tasks to be turned in)
 */
export const fetchMyAssignments = async () => {
  const response = await api.get(`/assignments`);
  return response.data;
};

/**
 * Submit a mock payment for a specific fee structure
 */
export const submitPayment = async (payload: { feeStructureId: string, amount: number, mode?: string }) => {
  const response = await api.post(`${BASE}/pay`, payload);
  return response.data;
};

/**
 * Fetch the logged-in student's active library transactions
 */
export const fetchMyLibraryTransactions = async (filters: { limit?: number } = {}) => {
  const response = await api.get(`/library/my-transactions`, { params: filters });
  return response.data;
};
