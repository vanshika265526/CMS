"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Library,
  Plus,
  Trash2,
  Edit2,
  X,
  CheckCircle2,
  AlertCircle,
  Mail,
  User,
  Hash,
  Shield,
  Search,
} from "lucide-react";
import {
  fetchLibrarians,
  createLibrarian,
  deleteLibrarian,
  updateLibrarian,
} from "@/lib/api/librarian";

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  employeeId: "",
  department: "",
};

export default function AdminLibrariansPage() {
  const [librarians, setLibrarians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchLibrarians();
      if (res.success) setLibrarians(res.data);
    } catch {
      showToast("Failed to load librarians", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (lib: any) => {
    setEditTarget(lib);
    setForm({
      name: lib.userId?.name || "",
      email: lib.userId?.email || "",
      password: "",
      employeeId: lib.employeeId || "",
      department: lib.department || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editTarget && (!form.name || !form.email || !form.password)) {
      showToast("Name, email and password are required", "error");
      return;
    }
    if (editTarget && !form.name) {
      showToast("Name is required", "error");
      return;
    }

    setSaving(true);
    try {
      if (editTarget) {
        await updateLibrarian(editTarget._id, {
          name: form.name,
          email: form.email || undefined,
          employeeId: form.employeeId || undefined,
          department: form.department || undefined,
        });
        showToast("Librarian updated");
      } else {
        await createLibrarian({
          name: form.name,
          email: form.email,
          password: form.password,
          employeeId: form.employeeId || undefined,
          department: form.department || undefined,
        });
        showToast("Librarian created successfully");
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Operation failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete librarian "${name}"? This cannot be undone.`)) return;
    try {
      await deleteLibrarian(id);
      showToast("Librarian deleted");
      load();
    } catch {
      showToast("Failed to delete librarian", "error");
    }
  };

  const filtered = librarians.filter((lib) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      lib.userId?.name?.toLowerCase().includes(q) ||
      lib.userId?.email?.toLowerCase().includes(q) ||
      lib.employeeId?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl font-semibold text-sm animate-in slide-in-from-top-4 ${
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            <span>Admin</span>
            <span>›</span>
            <span className="text-slate-900">Librarian Management</span>
          </nav>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Librarians</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create and manage librarian accounts with access to the Digital Library portal.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20"
        >
          <Plus size={16} /> Add Librarian
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center border border-teal-100">
            <Library size={20} />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{librarians.length}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Total Librarians
            </p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
            <Shield size={20} />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">
              {librarians.filter((l) => l.userId?.isActive !== false).length}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Active Accounts
            </p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4 col-span-2 md:col-span-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search librarian..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600/50 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Librarians Grid */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
            Loading librarians...
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-32 text-center bg-white border border-dashed border-slate-200 rounded-3xl">
          <Library size={48} className="text-slate-200 mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-400 uppercase tracking-widest">
            {search ? "No matching librarians" : "No librarians yet"}
          </p>
          <p className="text-sm text-slate-300 mt-2">
            {search ? "Try a different search." : "Create the first librarian account."}
          </p>
          {!search && (
            <button
              onClick={openCreate}
              className="mt-6 px-6 py-3 bg-teal-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20"
            >
              Add Librarian
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((lib) => {
            const user = lib.userId;
            const initials = user?.name
              ?.split(" ")
              .map((n: string) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase() || "LB";

            return (
              <div
                key={lib._id}
                className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm group hover:shadow-md transition-all duration-300"
              >
                {/* Avatar + Name */}
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-teal-600/20 shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 truncate">{user?.name}</h3>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-100">
                      LIBRARIAN
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2.5 mb-5">
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-slate-300 shrink-0" />
                    <span className="text-xs font-medium text-slate-600 truncate">
                      {user?.email}
                    </span>
                  </div>
                  {lib.employeeId && (
                    <div className="flex items-center gap-2">
                      <Hash size={13} className="text-slate-300 shrink-0" />
                      <span className="text-xs font-medium text-slate-600">{lib.employeeId}</span>
                    </div>
                  )}
                  {lib.department && (
                    <div className="flex items-center gap-2">
                      <User size={13} className="text-slate-300 shrink-0" />
                      <span className="text-xs font-medium text-slate-600">{lib.department}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Shield size={13} className="text-slate-300 shrink-0" />
                    <span
                      className={`text-xs font-bold ${
                        user?.isActive !== false ? "text-emerald-600" : "text-slate-400"
                      }`}
                    >
                      {user?.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mb-4">
                  Added{" "}
                  {lib.createdAt
                    ? new Date(lib.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
                  <button
                    onClick={() => openEdit(lib)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-100 hover:border-indigo-100 rounded-xl text-xs font-bold transition-all"
                  >
                    <Edit2 size={13} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(lib._id, user?.name)}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 border border-slate-100 hover:border-rose-100 rounded-xl text-xs font-bold transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-8 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editTarget ? "Edit Librarian" : "New Librarian"}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {editTarget
                    ? "Update account details"
                    : "Create a librarian account for the library portal"}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-5">
              {[
                {
                  label: "Full Name *",
                  field: "name",
                  placeholder: "e.g. Priya Sharma",
                  type: "text",
                },
                {
                  label: "Email Address *",
                  field: "email",
                  placeholder: "e.g. priya@college.edu",
                  type: "email",
                },
                ...(!editTarget
                  ? [
                      {
                        label: "Password *",
                        field: "password",
                        placeholder: "Min 8 characters",
                        type: "password",
                      },
                    ]
                  : []),
                {
                  label: "Employee ID",
                  field: "employeeId",
                  placeholder: "e.g. EMP-2024-001",
                  type: "text",
                },
                {
                  label: "Department",
                  field: "department",
                  placeholder: "e.g. Central Library",
                  type: "text",
                },
              ].map(({ label, field, placeholder, type }) => (
                <div key={field}>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    {label}
                  </label>
                  <input
                    type={type}
                    value={(form as any)[field]}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600/50 transition-all"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 p-8 pt-0">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold text-sm hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20 disabled:opacity-60"
              >
                {saving ? "Saving..." : editTarget ? "Update" : "Create Librarian"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
