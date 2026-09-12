import api from "@/lib/api";

const BASE = "/subjects";

/**
 * Fetch all subjects associated with the logged-in student's batch
 */
export const fetchMySubjects = async () => {
  const response = await api.get(BASE);
  return response.data;
};

/**
 * Fetch list of subjects (filtered by course if provided)
 */
export const getSubjects = async (courseId?: string): Promise<any> => {
  const url = courseId ? `${BASE}?courseId=${courseId}` : BASE;
  const res = await api.get(url);
  return res.data;
};

/**
 * Create a new subject
 */
export const createSubject = async (data: any): Promise<any> => {
  const res = await api.post(BASE, data);
  return res.data;
};
