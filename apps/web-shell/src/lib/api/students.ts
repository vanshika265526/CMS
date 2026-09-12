import api from "@/lib/api";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

const BASE = "/students";

export const getStudents = async (params?: any): Promise<ApiResponse<any[]>> => {
  const response = await api.get(BASE, { params });
  return response.data;
};

export const getStudentById = async (id: string): Promise<ApiResponse<any>> => {
  const response = await api.get(`${BASE}/${id}`);
  return response.data;
};

export const getMyStudent = async (): Promise<ApiResponse<any>> => {
  const response = await api.get(`${BASE}/me`);
  return response.data;
};

export const createStudent = async (data: any): Promise<ApiResponse<any>> => {
  const response = await api.post(BASE, data);
  return response.data;
};

export const updateStudent = async (id: string, data: any): Promise<ApiResponse<any>> => {
  const response = await api.patch(`${BASE}/${id}`, data);
  return response.data;
};

export const uploadPhoto = async (id: string, formData: FormData): Promise<ApiResponse<any>> => {
  const response = await api.post(`${BASE}/${id}/photo`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return response.data;
};

export const bulkImportStudents = async (formData: FormData): Promise<ApiResponse<any>> => {
  const response = await api.post(`${BASE}/import`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return response.data;
};

export const getStudentStats = async (): Promise<ApiResponse<any>> => {
  const response = await api.get(`${BASE}/stats`);
  return response.data;
};

export const getDepartments = async (): Promise<ApiResponse<any[]>> => {
  const response = await api.get(`/departments`);
  return response.data;
};

export const uploadDocuments = async (formData: FormData): Promise<ApiResponse<any[]>> => {
  const response = await api.post(`${BASE}/upload-docs`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return response.data;
};
