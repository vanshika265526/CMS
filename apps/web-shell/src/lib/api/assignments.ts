import api from '../api';

// --- Assignment APIs ---
export const fetchAssignments = async () => {
  const res = await api.get('/assignments');
  return res.data;
};

export const fetchAssignmentDetail = async (id: string) => {
  const res = await api.get(`/assignments/${id}`);
  return res.data;
};

export const createAssignment = async (data: any) => {
  const res = await api.post('/assignments', data);
  return res.data;
};

// --- Submission APIs ---
export const submitAssignment = async (data: { 
  assignmentId: string; 
  fileUrl: string; 
  fileName: string; 
  textSubmission?: string; 
}) => {
  const res = await api.post('/assignments/submissions', data);
  return res.data;
};

export const fetchMySubmissions = async () => {
  const res = await api.get('/assignments/submissions/my');
  return res.data;
};

export const fetchAssignmentSubmissions = async (assignmentId: string) => {
  const res = await api.get(`/assignments/${assignmentId}/submissions`);
  return res.data;
};

export const gradeSubmission = async (submissionId: string, data: { marks: number; feedback: string }) => {
  const res = await api.patch(`/assignments/submissions/${submissionId}/grade`, data);
  return res.data;
};
