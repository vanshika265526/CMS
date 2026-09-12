import api from "@/lib/api";

/**
 * Fetch all librarians for the current college (Admin only)
 */
export const fetchLibrarians = async () => {
  const response = await api.get("/admin/librarians");
  return response.data;
};

/**
 * Create a new librarian (Admin only)
 */
export const createLibrarian = async (data: {
  name: string;
  email: string;
  password: string;
  employeeId?: string;
  department?: string;
}) => {
  const response = await api.post("/admin/librarians", data);
  return response.data;
};

/**
 * Update librarian profile (Admin only)
 */
export const updateLibrarian = async (
  id: string,
  data: { name?: string; email?: string; employeeId?: string; department?: string }
) => {
  const response = await api.put(`/admin/librarians/${id}`, data);
  return response.data;
};

/**
 * Delete a librarian (Admin only)
 */
export const deleteLibrarian = async (id: string) => {
  const response = await api.delete(`/admin/librarians/${id}`);
  return response.data;
};
