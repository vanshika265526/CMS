import api from "@/lib/api";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

const BASE = "/admissions";

export const getEnquiries = async (params?: any): Promise<ApiResponse<any[]>> => {
  const response = await api.get(`${BASE}/enquiries`, { params });
  return response.data;
};

export const createEnquiry = async (data: any): Promise<ApiResponse<any>> => {
  const response = await api.post(`${BASE}/enquiries`, data);
  return response.data;
};

export const updateEnquiryStatus = async (id: string, status: string, note?: string): Promise<ApiResponse<any>> => {
  const response = await api.patch(`${BASE}/enquiries/${id}/status`, { status, note });
  return response.data;
};

export const getApplications = async (params?: any): Promise<ApiResponse<any[]>> => {
  const response = await api.get(`${BASE}/applications`, { params });
  return response.data;
};

export const submitApplication = async (formData: FormData): Promise<ApiResponse<any>> => {
  const response = await api.post(`${BASE}/applications`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return response.data;
};

export const updateApplicationStatus = async (id: string, status: string): Promise<ApiResponse<any>> => {
  const response = await api.patch(`${BASE}/applications/${id}/status`, { status });
  return response.data;
};

export const getSeats = async (): Promise<ApiResponse<any[]>> => {
  const response = await api.get(`${BASE}/seats`);
  return response.data;
};

export const configureSeats = async (data: any): Promise<ApiResponse<any>> => {
  const response = await api.post(`${BASE}/seats/configure`, data);
  return response.data;
};

export const getAdmissionsReport = async (): Promise<ApiResponse<any>> => {
  const response = await api.get(`${BASE}/reports`);
  return response.data;
};
