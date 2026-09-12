import api from "@/lib/api";
import axios from "axios";

// All endpoints in this file are prefixed with /admin as per the backend mount
const BASE = "/admin";

const getAdminApiCandidates = () => {
  const candidates = new Set<string>();

  const configured = String(process.env.NEXT_PUBLIC_API_URL || "").trim();
  if (configured) candidates.add(configured.replace(/\/$/, ""));

  if (typeof window !== "undefined") {
    const host = window.location.hostname || "localhost";
    candidates.add(`http://${host}:5005/api`);
  }

  candidates.add("http://localhost:5005/api");
  candidates.add("http://127.0.0.1:5005/api");

  return Array.from(candidates);
};

const adminGetWithFallback = async (path: string, params: any = {}) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  let lastError: any = null;

  for (const base of getAdminApiCandidates()) {
    try {
      const response = await axios.get(`${base}${path}`, {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      lastError = error;
    }
  }

  throw lastError;
};

// --- Admissions ---
export const fetchEnquiries = async () => {
  const response = await api.get(`${BASE}/enquiries`);
  return response.data;
};

export const createEnquiry = async (data: any) => {
  const response = await api.post(`${BASE}/enquiries`, data);
  return response.data;
};

export const updateEnquiryStatus = async (id: string, status: string) => {
  const response = await api.put(`${BASE}/enquiries/${id}`, { status });
  return response.data;
};

export const fetchApplications = async () => {
  const response = await api.get(`${BASE}/applications`);
  return response.data;
};

export const updateApplicationStatus = async (id: string, status: string, rejectionReason?: string) => {
  const response = await api.put(`${BASE}/applications/${id}`, { status, rejectionReason });
  return response.data;
};

export const enrollStudent = async (data: { applicationId: string; batchId: string; section: string; rollNumber: string }) => {
  const response = await api.post(`${BASE}/applications/enroll`, data);
  return response.data;
};

export const fetchAdmissionReports = async () => {
  const response = await api.get(`${BASE}/admissions/reports`);
  return response.data;
};

// --- SIS (Student Information System) ---
export const fetchStudents = async (filters: any = {}) => {
  const response = await api.get(`${BASE}/students`, { params: filters });
  return response.data;
};

export const fetchStudentById = async (id: string) => {
  const response = await api.get(`${BASE}/students/${id}`);
  return response.data;
};

export const updateStudent = async (id: string, data: any) => {
  const response = await api.put(`${BASE}/students/${id}`, data);
  return response.data;
};

export const updateStudentEnrollmentId = async (id: string, enrollmentId: string) => {
  const response = await api.put(`${BASE}/students/${id}/enrollment-id`, { enrollmentId });
  return response.data;
};

export const createStudent = async (data: any) => {
  const response = await api.post(`${BASE}/students`, data);
  return response.data;
};

export const deleteStudent = async (id: string) => {
  const response = await api.delete(`${BASE}/students/${id}`);
  return response.data;
};

export const bulkImportStudents = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post(`${BASE}/students/bulk-import`, formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return response.data;
};

export const resetStudentPasswords = async (payload: {
  emails?: string[];
  studentIds?: string[];
  newPassword?: string;
}) => {
  const response = await api.post(`${BASE}/students/reset-passwords`, payload);
  return response.data;
};

// --- Faculty Management ---
export const fetchFaculties = async (filters: any = {}) => {
  const response = await api.get(`${BASE}/faculty`, { params: filters });
  return response.data;
};

export const fetchFacultyById = async (id: string) => {
  const response = await api.get(`${BASE}/faculty/${id}`);
  return response.data;
};

export const createFaculty = async (data: any) => {
  const response = await api.post(`${BASE}/faculty`, data);
  return response.data;
};

export const updateFaculty = async (id: string, data: any) => {
  const response = await api.put(`${BASE}/faculty/${id}`, data);
  return response.data;
};

export const deleteFaculty = async (id: string) => {
  const response = await api.delete(`${BASE}/faculty/${id}`);
  return response.data;
};

export const assignFacultySubjects = async (id: string, subjectIds: string[]) => {
  const response = await api.put(`${BASE}/faculty/${id}/assign`, { subjectIds });
  return response.data;
};

export const fetchFacultyAttendanceStats = async (id: string) => {
  const response = await api.get(`${BASE}/faculty/${id}/attendance-stats`);
  return response.data;
};

// --- Academics (Courses, Subjects, Batches) ---
export const fetchCourses = async () => {
  const response = await api.get(`${BASE}/courses`);
  return response.data;
};

export const createCourse = async (data: any) => {
  const response = await api.post(`${BASE}/courses`, data);
  return response.data;
};

export const fetchSubjects = async (filters: any = {}) => {
  const response = await api.get(`${BASE}/subjects`, { params: filters });
  return response.data;
};

export const createSubject = async (data: any) => {
  const response = await api.post(`${BASE}/subjects`, data);
  return response.data;
};

export const fetchBatches = async (filters: any = {}) => {
  const response = await api.get(`${BASE}/batches`, { params: filters });
  return response.data;
};

export const createBatch = async (data: any) => {
  const response = await api.post(`${BASE}/batches`, data);
  return response.data;
};

export const updateBatch = async (id: string, data: any) => {
  const response = await api.put(`${BASE}/batches/${id}`, data);
  return response.data;
};

// --- Attendance ---
export const fetchAttendanceOverview = async () => {
  const response = await api.get(`${BASE}/attendance/overview`);
  return response.data;
};

export const fetchShortageList = async (threshold: number = 75) => {
  const response = await api.get(`${BASE}/attendance/shortage`, { params: { threshold } });
  return response.data;
};

export const fetchAttendanceReports = async (query: any) => {
  const response = await api.get(`${BASE}/attendance/reports`, { params: query });
  return response.data;
};

export const fetchStudentWiseAttendance = async (query: any) => {
  const response = await api.get(`${BASE}/attendance/student-wise`, { params: query });
  return response.data;
};

export const fetchStudentAttendanceDetail = async (studentId: string) => {
  const response = await api.get(`${BASE}/attendance/student/${studentId}`);
  return response.data;
};

export const adminOverrideAttendance = async (data: any) => {
  const response = await api.put(`${BASE}/attendance/override`, data);
  return response.data;
};

// --- Exams & Results ---
export const fetchExams = async (filters: any = {}) => {
  const response = await api.get(`${BASE}/exams`, { params: { ...filters, _ts: Date.now() } });
  return response.data;
};

export const fetchExamStats = async () => {
  const response = await api.get(`${BASE}/exams/stats`, { params: { _ts: Date.now() } });
  return response.data;
};

export const createExam = async (data: any) => {
  const response = await api.post(`${BASE}/exams`, data);
  return response.data;
};

export const publishExamResults = async (examId: string) => {
  const response = await api.post(`${BASE}/exams/${examId}/publish`);
  return response.data;
};

export const fetchExamAnalysis = async (examId: string) => {
  const response = await api.get(`${BASE}/exams/reports/analysis`, { params: { examId } });
  return response.data;
};

// --- Fee Management ---
export const fetchFeeStructures = async () => {
  const response = await api.get(`${BASE}/fees/structures`);
  return response.data;
};

export const createFeeStructure = async (data: any) => {
  const response = await api.post(`${BASE}/fees/structures`, data);
  return response.data;
};

export const updateFeeStructure = async (id: string, data: any) => {
  const response = await api.put(`${BASE}/fees/structures/${id}`, data);
  return response.data;
};

export const deleteFeeStructure = async (id: string) => {
  const response = await api.delete(`${BASE}/fees/structures/${id}`);
  return response.data;
};

export const fetchPayments = async (filters: any = {}) => {
  const response = await api.get(`${BASE}/fees/payments`, { params: filters });
  return response.data;
};

export const fetchScholarships = async () => {
  const response = await api.get(`${BASE}/fees/scholarships`);
  return response.data;
};

export const createScholarship = async (data: any) => {
  const response = await api.post(`${BASE}/fees/scholarships`, data);
  return response.data;
};

export const updateScholarship = async (id: string, data: any) => {
  const response = await api.put(`${BASE}/fees/scholarships/${id}`, data);
  return response.data;
};

export const deleteScholarship = async (id: string) => {
  const response = await api.delete(`${BASE}/fees/scholarships/${id}`);
  return response.data;
};

export const fetchFeeAdjustments = async (filters: any = {}) => {
  const response = await api.get(`${BASE}/fees/adjustments`, { params: filters });
  return response.data;
};

export const createFeeAdjustment = async (data: any) => {
  const response = await api.post(`${BASE}/fees/adjustments`, data);
  return response.data;
};

export const recordPayment = async (data: any) => {
  const response = await api.post(`${BASE}/fees/payments`, data);
  return response.data;
};

export const fetchFinancialSummary = async () => {
  const response = await api.get(`${BASE}/fees/summary`);
  return response.data;
};

export const fetchStudentFeeLedger = async (filters: any = {}) => {
  const response = await api.get(`${BASE}/fees/ledger`, { params: filters });
  return response.data;
};

// --- Communication & Notifications ---
export const fetchAnnouncements = async (filters: any = {}) => {
  const response = await api.get(`${BASE}/communication/announcements`, { params: filters });
  return response.data;
};

export const createAnnouncement = async (data: any) => {
  const response = await api.post(`${BASE}/communication/announcements`, data);
  return response.data;
};

export const fetchMessages = async () => {
  const response = await api.get(`${BASE}/communication/messages`, { params: { _ts: Date.now() } });
  return response.data;
};

export const fetchConversationHistory = async (otherUserId: string) => {
  const response = await api.get(`${BASE}/communication/messages/${otherUserId}`, { params: { _ts: Date.now() } });
  return response.data;
};

export const sendMessage = async (data: any) => {
  const response = await api.post(`${BASE}/communication/messages`, data);
  return response.data;
};

export const uploadMessageAttachment = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`${BASE}/communication/messages/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

// --- NAAC & Compliance ---
export const fetchNaacDocuments = async (filters: any = {}) => {
  const response = await api.get(`${BASE}/naac/documents`, { params: filters });
  return response.data;
};

export const uploadNaacDocument = async (data: any) => {
  const response = await api.post(`${BASE}/naac/documents`, data);
  return response.data;
};

export const updateNaacStatus = async (id: string, status: string) => {
  const response = await api.put(`${BASE}/naac/documents/${id}/status`, { status });
  return response.data;
};

export const fetchNaacStats = async () => {
  const response = await api.get(`${BASE}/naac/stats`);
  return response.data;
};

// --- General Dashboard Stats ---
export const fetchDashboardStats = async () => {
  try {
    return await adminGetWithFallback(`${BASE}/stats`, { _ts: Date.now() });
  } catch {
    const response = await api.get(`${BASE}/stats`, { params: { _ts: Date.now() } });
    return response.data;
  }
};

export const fetchEnrollmentActivity = async () => {
  try {
    return await adminGetWithFallback(`${BASE}/dashboard/enrollment-activity`, { _ts: Date.now() });
  } catch {
    const response = await api.get(`${BASE}/dashboard/enrollment-activity`, { params: { _ts: Date.now() } });
    return response.data;
  }
};

// --- Academic Assignments ---
export const fetchAssignments = async () => {
  const response = await api.get(`${BASE}/assignments`);
  return response.data;
};

export const assignTeacher = async (payload: { teacherId: string; subjectId: string; batchId: string }) => {
  const response = await api.post(`${BASE}/assign-teacher`, payload);
  return response.data;
};

export const removeTeacherAssignment = async (payload: { teacherId: string; subjectId: string; batchId: string }) => {
  const response = await api.delete(`${BASE}/assign-teacher`, { data: payload });
  return response.data;
};

export const assignStudentToBatch = async (payload: { studentId: string; batchId: string }) => {
  const response = await api.post(`${BASE}/assign-student-batch`, payload);
  return response.data;
};

// --- Admin Settings ---
export const fetchAuthProfile = async () => {
  const response = await api.get('/auth/profile');
  return response.data;
};

export const updateAdminProfile = async (data: any) => {
  const response = await api.patch(`${BASE}/profile`, data);
  return response.data;
};

export const changeMyPassword = async (payload: { currentPassword: string; newPassword: string }) => {
  const response = await api.post('/auth/change-password', payload);
  return response.data;
};

export const fetchActiveSessions = async () => {
  const response = await api.get('/auth/sessions', { params: { _ts: Date.now() } });
  return response.data;
};

export const revokeActiveSession = async (sessionId: string) => {
  const response = await api.delete(`/auth/sessions/${sessionId}`);
  return response.data;
};

export const logoutAllDevices = async () => {
  const response = await api.post('/auth/sessions/logout-all');
  return response.data;
};

export const uploadSettingsAsset = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/auth/upload-file', formData);
  return response.data;
};
