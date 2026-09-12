import api from "@/lib/api";

const BASE = "/exams";

export const createExam = async (data: any): Promise<any> => {
  try {
    const res = await api.post(BASE, data);
    return res.data;
  } catch (error: any) {
    const serverMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Failed to create exam";

    console.error("[API] Exam creation failed:", {
      status: error.response?.status,
      message: serverMessage,
      data: error.response?.data,
    });

    if (error.response?.data?.errors) {
      const errorDetails = error.response.data.errors
        .map((e: any) => `${e.path.join('.')}: ${e.message}`)
        .join(", ");
      throw new Error(`Validation failed: ${errorDetails}`);
    }

    throw new Error(serverMessage);
  }
};

export const getExams = async (params: any = {}): Promise<any> => {
  const res = await api.get(BASE, { params: { ...params, _ts: Date.now() } });
  return res.data;
};

export const getExamStats = async (): Promise<any> => {
  const res = await api.get(`${BASE}/stats`, { params: { _ts: Date.now() } });
  return res.data;
};

export const getExamById = async (examId: string): Promise<any> => {
  const res = await api.get(`${BASE}/${examId}`);
  return res.data;
};

export const updateExam = async (examId: string, data: any): Promise<any> => {
  const res = await api.put(`${BASE}/${examId}`, data);
  return res.data;
};

export const scheduleExam = async (examId: string): Promise<any> => {
  const res = await api.patch(`${BASE}/${examId}/schedule`);
  return res.data;
};

export const enterMarks = async (examId: string, data: any): Promise<any> => {
  const res = await api.post(`${BASE}/${examId}/marks`, data);
  return res.data;
};

export const getMarks = async (examId: string, params: any = {}): Promise<any> => {
  const res = await api.get(`${BASE}/${examId}/marks`, { params });
  return res.data;
};

export const bulkImportMarks = async (examId: string, data: any): Promise<any> => {
  const res = await api.post(`${BASE}/${examId}/marks/bulk-import`, data);
  return res.data;
};

export const publishResults = async (examId: string): Promise<any> => {
  const res = await api.post(`${BASE}/${examId}/publish`);
  return res.data;
};

export const getResults = async (params: any = {}): Promise<any> => {
  const res = await api.get(`${BASE}/results`, { params });
  return res.data;
};

export const getHallTicket = async (studentId: string, examId: string): Promise<any> => {
  const res = await api.get(`${BASE}/hall-tickets/${studentId}/${examId}`);
  return res.data;
};

export const generateExamAnalysis = async (examId: string): Promise<any> => {
  const res = await api.get(`${BASE}/reports/exam-analysis`, { params: { examId } });
  return res.data;
};
