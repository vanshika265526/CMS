import api from "@/lib/api";

export interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

// --- Departments ---
export const getDepartments = async (): Promise<any> => {
  const res = await api.get("/departments");
  return res.data;
};

export const createDepartment = async (data: any): Promise<any> => {
  const res = await api.post("/departments", data);
  return res.data;
};

// --- Courses ---
export const getCourses = async (): Promise<any> => {
  const res = await api.get("/courses");
  return res.data;
};

export const createCourse = async (data: any): Promise<any> => {
  const res = await api.post("/courses", data);
  return res.data;
};

// --- Batches ---
export const getBatches = async (): Promise<any> => {
  const res = await api.get("/batches");
  return res.data;
};

export const createBatch = async (data: any): Promise<any> => {
  const res = await api.post("/batches", data);
  return res.data;
};
