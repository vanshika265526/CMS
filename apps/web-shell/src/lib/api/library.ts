import api from "@/lib/api";

/**
 * Fetch books with optional filtering
 */
export const fetchBooks = async (filters: { search?: string; category?: string; collegeId?: string } = {}) => {
  const response = await api.get("/library", { params: filters });
  return response.data;
};

/**
 * Add a new book (Librarian / Admin)
 */
export const addBook = async (data: any) => {
  const response = await api.post("/library", data);
  return response.data;
};

/**
 * Update a book (Librarian / Admin)
 */
export const updateBook = async (id: string, data: any) => {
  const response = await api.put(`/library/${id}`, data);
  return response.data;
};

/**
 * Delete a book (Librarian / Admin)
 */
export const deleteBook = async (id: string) => {
  const response = await api.delete(`/library/${id}`);
  return response.data;
};

/**
 * Get library dashboard stats (Librarian portal)
 */
export const fetchLibraryStats = async () => {
  const response = await api.get("/library/stats");
  return response.data;
};

/**
 * Get all transactions with optional filters
 */
export const fetchTransactions = async (filters: { status?: string; studentId?: string } = {}) => {
  const response = await api.get("/library/transactions", { params: filters });
  return response.data;
};

/**
 * Issue a book to a student
 */
export const issueBook = async (data: { bookId: string; studentId: string; dueDate: string }) => {
  const response = await api.post("/library/issue", data);
  return response.data;
};

/**
 * Get student's library transactions
 */
export const fetchMyLibraryTransactions = async (filters: { limit?: number } = {}) => {
  const response = await api.get("/library/my-transactions", { params: filters });
  return response.data;
};

/**
 * Return a book (marks transaction as returned, computes fine)
 */
export const returnBook = async (txId: string) => {
  const response = await api.put(`/library/return/${txId}`);
  return response.data;
};

/**
 * Lightweight student search for librarians
 */
export const searchStudentsForLibrary = async (q: string) => {
  const response = await api.get("/library/students/search", { params: { q } });
  return response.data;
};

/**
 * Reserve a book (Student)
 */
export const reserveBook = async (bookId: string) => {
  const response = await api.post(`/library/reserve/${bookId}`);
  return response.data;
};

/**
 * Approve a reservation (Librarian)
 */
export const approveReservation = async (txId: string) => {
  const response = await api.put(`/library/approve-reservation/${txId}`);
  return response.data;
};
