"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Layers,
  MapPin,
  ArrowUpRight,
  Users,
  Calendar,
} from "lucide-react";
import {
  fetchBooks,
  addBook,
  updateBook,
  deleteBook,
  issueBook,
  searchStudentsForLibrary,
} from "@/lib/api/library";

const CATEGORIES = [
  "Computer Science",
  "Business",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Humanities",
  "Law",
  "Medical",
  "Engineering",
  "General",
];

const SECTIONS = ["Section A", "Section B", "Section C", "Section D", "Section E"];
const ROWS = ["Row 1", "Row 2", "Row 3", "Row 4", "Row 5", "Row 6", "Row 7"];


const EMPTY_BOOK = {
  title: "",
  author: "",
  isbn: "",
  category: "General",
  totalCopies: 1,
  availableCopies: 1,
  section: "Section A",
  row: "Row 1",

};

const EMPTY_ISSUE = { studentQuery: "", selectedStudent: null as any, dueDate: "" };

export default function BooksPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  // Modal states
  const [showBookModal, setShowBookModal] = useState(false);
  const [editBook, setEditBook] = useState<any>(null);
  const [bookForm, setBookForm] = useState(EMPTY_BOOK);
  const [saving, setSaving] = useState(false);

  // Issue modal
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [issueForm, setIssueForm] = useState(EMPTY_ISSUE);
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [issuing, setIssuing] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchBooks({
        search,
        category: activeCategory === "All" ? undefined : activeCategory,
        collegeId: user?.collegeId,
      });
      if (res.success) setBooks(res.data);
    } catch {
      showToast("Failed to load books", "error");
    } finally {
      setLoading(false);
    }
  }, [search, activeCategory]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  // Student search for issue modal
  useEffect(() => {
    if (issueForm.studentQuery.length < 2) {
      setStudentResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await searchStudentsForLibrary(issueForm.studentQuery);
        if (res.success) setStudentResults(res.data);
      } catch {
        setStudentResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [issueForm.studentQuery]);

  const openAddModal = () => {
    setEditBook(null);
    setBookForm(EMPTY_BOOK);
    setShowBookModal(true);
  };

  const openEditModal = (book: any) => {
    setEditBook(book);
    const locParts = book.location?.split(', ') || [];
    setBookForm({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      category: book.category,
      totalCopies: book.totalCopies,
      availableCopies: book.availableCopies,
      section: locParts[0] || "Section A",
      row: locParts[1] || "Row 1",
    });
    setShowBookModal(true);
  };

  const handleSaveBook = async () => {
    if (!bookForm.title || !bookForm.author || !bookForm.isbn) {
      showToast("Title, Author, and ISBN are required", "error");
      return;
    }
    setSaving(true);

    const payload = {
      ...bookForm,
      location: `${(bookForm as any).section}, ${(bookForm as any).row}`,
      collegeId: user?.collegeId
    };
    delete (payload as any).section;
    delete (payload as any).row;

    try {
      if (editBook) {
        await updateBook(editBook._id, payload);
        showToast("Book updated successfully");
      } else {
        await addBook(payload);
        showToast("Book added to inventory");
      }
      setShowBookModal(false);
      loadBooks();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to save book", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!confirm("Are you sure you want to delete this book?")) return;
    try {
      await deleteBook(id);
      showToast("Book removed from library");
      loadBooks();
    } catch {
      showToast("Failed to delete book", "error");
    }
  };

  const openIssueModal = (book: any) => {
    setSelectedBook(book);
    setIssueForm(EMPTY_ISSUE);
    setStudentResults([]);
    setShowIssueModal(true);
  };

  const handleIssue = async () => {
    if (!issueForm.selectedStudent || !issueForm.dueDate) {
      showToast("Please select a student and set a due date", "error");
      return;
    }
    setIssuing(true);
    try {
      await issueBook({
        bookId: selectedBook._id,
        studentId: issueForm.selectedStudent._id,
        dueDate: issueForm.dueDate,
      });
      showToast(`"${selectedBook.title}" issued successfully`);
      setShowIssueModal(false);
      loadBooks();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to issue book", "error");
    } finally {
      setIssuing(false);
    }
  };

  const allCategories = ["All", ...CATEGORIES];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl font-semibold text-sm transition-all animate-in slide-in-from-top-4 ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Book Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage inventory, add new titles, and issue books to students.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20"
        >
          <Plus size={16} /> Add New Book
        </button>
      </div>

      {/* Search + Category Filter */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search title, author, or ISBN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600/50 shadow-sm transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all uppercase tracking-wider border ${
                activeCategory === cat
                  ? "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Books Grid */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
            Loading inventory...
          </p>
        </div>
      ) : books.length === 0 ? (
        <div className="py-32 text-center bg-white border border-dashed border-slate-200 rounded-3xl">
          <BookOpen size={48} className="text-slate-200 mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-400 uppercase tracking-widest">
            No books found
          </p>
          <p className="text-sm text-slate-300 mt-2">
            Add your first book to get started.
          </p>
          <button
            onClick={openAddModal}
            className="mt-6 px-6 py-3 bg-teal-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20"
          >
            Add Book
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => {
            const available = book.availableCopies > 0;
            return (
              <div
                key={book._id}
                className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="flex justify-between items-start mb-5">
                  <div className="w-12 h-16 bg-slate-50 border border-slate-100 rounded-lg flex flex-col items-center justify-center text-slate-300 relative overflow-hidden group-hover:border-teal-100 transition-colors">
                    <div
                      className={`absolute top-0 right-0 w-2 h-2 rounded-bl-lg ${
                        available ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    />
                    <BookOpen size={22} className="group-hover:text-teal-400 transition-colors" />
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      available
                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                        : "bg-rose-50 text-rose-600 border-rose-100"
                    }`}
                  >
                    {available ? `${book.availableCopies} Available` : "Out of Stock"}
                  </span>
                </div>

                <div className="space-y-1 mb-5">
                  <h3 className="text-base font-bold text-slate-900 leading-tight group-hover:text-teal-600 transition-colors line-clamp-2">
                    {book.title}
                  </h3>
                  <p className="text-sm text-slate-500 font-medium">{book.author}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 py-4 border-t border-slate-50 mb-5">
                  <div className="flex items-center gap-2">
                    <Layers size={13} className="text-slate-300 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase truncate">
                      {book.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-slate-300 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase truncate">
                      {book.location || "Shelf A-1"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <BookOpen size={13} className="text-slate-300 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      ISBN: {book.isbn}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={!available}
                    onClick={() => openIssueModal(book)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all ${
                      available
                        ? "bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-600/20"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    <Users size={13} /> Issue Book
                  </button>
                  <button
                    onClick={() => openEditModal(book)}
                    className="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-100 rounded-xl transition-all"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteBook(book._id)}
                    className="p-2.5 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-100 rounded-xl transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Book Modal */}
      {showBookModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-8 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editBook ? "Edit Book" : "Add New Book"}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {editBook ? "Update book details" : "Add a new title to the library"}
                </p>
              </div>
              <button
                onClick={() => setShowBookModal(false)}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-5 max-h-[60vh] overflow-y-auto">
              {[
                { label: "Book Title *", field: "title", placeholder: "e.g. Data Structures & Algorithms" },
                { label: "Author *", field: "author", placeholder: "e.g. Thomas H. Cormen" },
                { label: "ISBN *", field: "isbn", placeholder: "e.g. 978-0-262-03384-8" },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={(bookForm as any)[field]}
                    onChange={(e) => setBookForm((f) => ({ ...f, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600/50 transition-all"
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Section
                  </label>
                  <select
                    value={(bookForm as any).section}
                    onChange={(e) => setBookForm((f) => ({ ...f, section: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600/50 transition-all"
                  >
                    {SECTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Row
                  </label>
                  <select
                    value={(bookForm as any).row}
                    onChange={(e) => setBookForm((f) => ({ ...f, row: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600/50 transition-all"
                  >
                    {ROWS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Category *
                </label>
                <select
                  value={bookForm.category}
                  onChange={(e) => setBookForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600/50 transition-all"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Total Copies *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={bookForm.totalCopies}
                    onChange={(e) =>
                      setBookForm((f) => ({ ...f, totalCopies: parseInt(e.target.value) || 1 }))
                    }
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Available *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={bookForm.totalCopies}
                    value={bookForm.availableCopies}
                    onChange={(e) =>
                      setBookForm((f) => ({ ...f, availableCopies: parseInt(e.target.value) || 0 }))
                    }
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600/50 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-8 pt-0">
              <button
                onClick={() => setShowBookModal(false)}
                className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBook}
                disabled={saving}
                className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold text-sm hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20 disabled:opacity-60"
              >
                {saving ? "Saving..." : editBook ? "Update Book" : "Add Book"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Book Modal */}
      {showIssueModal && selectedBook && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-8 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Issue Book</h2>
                <p className="text-sm text-slate-400 mt-1 font-semibold truncate max-w-xs">
                  {selectedBook.title}
                </p>
              </div>
              <button
                onClick={() => setShowIssueModal(false)}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-5">
              {/* Stock info */}
              <div className="p-4 bg-teal-50 rounded-2xl border border-teal-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                    Available Copies
                  </span>
                  <span className="text-2xl font-black text-teal-700">
                    {selectedBook.availableCopies}
                  </span>
                </div>
              </div>

              {/* Student search */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Search Student *
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Name or roll number..."
                    value={issueForm.selectedStudent ? `${issueForm.selectedStudent.personalInfo?.firstName} ${issueForm.selectedStudent.personalInfo?.lastName}` : issueForm.studentQuery}
                    onChange={(e) => {
                      setIssueForm((f) => ({ ...f, studentQuery: e.target.value, selectedStudent: null }));
                    }}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600/50 transition-all"
                  />
                </div>
                {studentResults.length > 0 && !issueForm.selectedStudent && (
                  <div className="mt-2 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    {studentResults.map((s) => (
                      <button
                        key={s._id}
                        onClick={() => {
                          setIssueForm((f) => ({
                            ...f,
                            selectedStudent: s,
                            studentQuery: `${s.personalInfo?.firstName} ${s.personalInfo?.lastName}`,
                          }));
                          setStudentResults([]);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-teal-50 transition-colors text-left border-b border-slate-50 last:border-0"
                      >
                        <div className="w-8 h-8 bg-teal-100 text-teal-700 rounded-lg flex items-center justify-center font-bold text-xs shrink-0">
                          {s.personalInfo?.firstName?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {s.personalInfo?.firstName} {s.personalInfo?.lastName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">
                            {s.academicInfo?.rollNumber} · {s.academicInfo?.course}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Due Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="date"
                    value={issueForm.dueDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setIssueForm((f) => ({ ...f, dueDate: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600/50 transition-all"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Fine of ₹5/day will apply for returns after this date.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-8 pt-0">
              <button
                onClick={() => setShowIssueModal(false)}
                className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleIssue}
                disabled={issuing || !issueForm.selectedStudent || !issueForm.dueDate}
                className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold text-sm hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20 disabled:opacity-50"
              >
                {issuing ? "Issuing..." : "Confirm Issue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
