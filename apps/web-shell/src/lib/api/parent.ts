import api from "@/lib/api";

const BASE = "/parent";

/**
 * Fetch the linked student's profile (from parent context)
 */
export const fetchMyStudentProfile = async () => {
  const response = await api.get(`${BASE}/me/student`);
  return response.data;
};

/**
 * Fetch the linked student's attendance (from parent context)
 */
export const fetchMyStudentAttendance = async () => {
  const response = await api.get(`${BASE}/me/attendance`);
  return response.data;
};

/**
 * Fetch the linked student's results (from parent context)
 */
export const fetchMyStudentResults = async () => {
  const response = await api.get(`${BASE}/me/results`);
  return response.data;
};

/**
 * Fetch the linked student's timetable (from parent context)
 */
export const fetchMyStudentTimetable = async () => {
  const response = await api.get(`${BASE}/me/timetable`);
  return response.data;
};

/**
 * Fetch the linked student's fees and payments (from parent context)
 */
export const fetchMyStudentFees = async () => {
  const response = await api.get(`${BASE}/me/fees`);
  return response.data;
};
