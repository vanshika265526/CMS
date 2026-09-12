import api from '@/lib/api';

export const fetchTimetableSlots = async () => {
  const response = await api.get('/timetable/slots');
  return response.data;
};

export const fetchSectionsByBatch = async (batchId: string) => {
  const response = await api.get(`/timetable/batch/${batchId}/sections`);
  return response.data;
};

export const fetchTimetableBySection = async (sectionId: string) => {
  const response = await api.get(`/timetable/section/${sectionId}`);
  return response.data;
};

export const fetchTimetableByTeacher = async (teacherId: string) => {
  const response = await api.get(`/timetable/teacher/${teacherId}`);
  return response.data;
};

export const createTimetableEntry = async (payload: Record<string, unknown>) => {
  const response = await api.post('/timetable', payload);
  return response.data;
};

export const updateTimetableEntry = async (id: string, payload: Record<string, unknown>) => {
  const response = await api.put(`/timetable/${id}`, payload);
  return response.data;
};

export const deleteTimetableEntry = async (id: string) => {
  const response = await api.delete(`/timetable/${id}`);
  return response.data;
};