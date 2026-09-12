"use client";

import React, { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import { 
  Search, 
  Book as BookIcon, 
  Filter, 
  ChevronRight, 
  MapPin, 
  Layers, 
  CheckCircle2, 
  Clock,
  ArrowUpRight,
  Plus
} from "lucide-react";
import { fetchBooks, reserveBook } from "@/lib/api/library";
import { fetchMyLibraryTransactions } from "@/lib/api/student";
import Link from "next/link";

const CATEGORIES = ["All", "Computer Science", "Business", "Mathematics", "Humanities", "Physics", "General"];

export default function LibraryPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [myTransactions, setMyTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [userRole, setUserRole] = useState<string>("");
  const [notice, setNotice] = useState("");
  const canAddBooks = ['LIBRARIAN', 'COLLEGE_ADMIN', 'SUPER_ADMIN', 'ADMIN'].includes(String(userRole || '').toUpperCase());

  const loadBooks = async () => {
    setLoading(true);
    try {
      const res = await fetchBooks({ 
        search: searchTerm, 
        category: activeCategory === 'All' ? undefined : activeCategory 
      });
      if (res.success) setBooks(res.data);
    } catch (err) {
      console.error("Failed to load library catalog", err);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const res = await fetchMyLibraryTransactions();
      if (res.success) setMyTransactions(res.data);
    } catch (err) {
      console.error("Failed to load student transactions", err);
    }
  };

  useEffect(() => {
    const role = JSON.parse(localStorage.getItem("user") || "{}").role;
    setUserRole(role || "");
    loadBooks();
    if (role === "STUDENT") {
      loadTransactions();
    }
  }, [searchTerm, activeCategory]);

  const handleReserve = async (bookId: string) => {
    if (userRole !== "STUDENT") return;
    setNotice("");
    try {
      const res = await reserveBook(bookId);
      if (res.success) {
        setNotice("Book reserved successfully. You can pick it up from the library.");
        loadBooks();
      }
    } catch (err: any) {
      setNotice(err.response?.data?.message || "Unable to reserve the book right now.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 max-w-7xl mx-auto w-full">
      {notice ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">{notice}</div>
      ) : null}

      {/* My Activity Section */}
      {myTransactions.length > 0 && (
        <section className="animate-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-2 mb-4">
             <Clock className="text-indigo-400" size={16} />
             <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">My Library Activity</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {myTransactions.map((tx) => {
              const isReserved = tx.status === "reserved";
              const isOverdue = tx.status === "overdue";
              return (
                <Card key={tx._id} className="p-4 bg-white border border-slate-100 shadow-sm rounded-2xl flex flex-col justify-between hover:shadow-md transition-all">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                       <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                         isReserved ? "bg-amber-50 text-amber-600 border-amber-100" :
                         isOverdue ? "bg-rose-50 text-rose-600 border-rose-100 animate-pulse" :
                         "bg-indigo-50 text-indigo-600 border-indigo-100"
                       }`}>
                         {tx.status}
                       </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 line-clamp-1">{tx.bookId?.title || "Unknown Book"}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{tx.bookId?.author}</p>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                     <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                        {isReserved ? (
                          <><span>Awaiting Collection</span></>
                        ) : (
                          <>
                            <Clock size={10} />
                            <span>Due: {tx?.dueDate ? new Date(tx.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBD"}</span>
                          </>
                        )}
                     </div>
                     <ArrowUpRight size={14} className="text-slate-300" />
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Header & Core Search */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex-1">
          <nav className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            <Link href="/" className="hover:text-indigo-600 transition-colors">Dashboard</Link>
            <ChevronRight size={10} />
            <span className="text-slate-900">Digital Library</span>
          </nav>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Resource Catalog</h1>
          <p className="text-sm text-slate-500 mt-1">Explore thousands of academic texts, journals, and digital assets.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search title, author, or ISBN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600/50 shadow-sm transition-all"
            />
          </div>
          {canAddBooks && (
            <button className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10">
              <Plus size={20} />
            </button>
          )}
        </div>
      </header>

      {/* Categories Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-6 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all uppercase tracking-wider border ${
              activeCategory === cat 
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20' 
              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Catalog Grid */}
      {loading ? (
        <div className="py-24 text-center">
            <Clock className="animate-spin text-indigo-400 mx-auto mb-4" size={48} />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Searching Archives...</p>
        </div>
      ) : books.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => (
            <BookCard
              key={book._id}
              book={book}
              canReserve={userRole === "STUDENT"}
              onReserve={() => handleReserve(book._id)}
            />
          ))}
        </div>
      ) : (
        <Card className="py-24 text-center bg-white border border-dashed border-slate-200 rounded-4xl shadow-sm">
          <BookIcon size={48} className="text-slate-200 mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-400 uppercase tracking-widest">No matching titles</p>
          <p className="text-sm text-slate-300 mt-2">Try adjusting your search filters or category.</p>
        </Card>
      )}
    </div>
  );
}

function BookCard({ book, onReserve, canReserve }: any) {
  const [reserving, setReserving] = useState(false);
  const isAvailable = book.availableCopies > 0;

  return (
    <Card className="p-6 border-none bg-white shadow-ambient rounded-3xl group hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
      <div className="flex justify-between items-start mb-6">
        <div className="w-12 h-16 bg-slate-50 border border-slate-100 rounded-lg flex flex-col items-center justify-center text-slate-300 relative overflow-hidden group-hover:border-indigo-100 transition-colors">
            <div className={`absolute top-0 right-0 w-2 h-2 rounded-bl-lg ${isAvailable ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <BookIcon size={24} className="group-hover:text-indigo-400 transition-colors" />
        </div>
        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
          isAvailable ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
        }`}>
          {isAvailable ? `${book.availableCopies} Available` : "Out of Stock"}
        </div>
      </div>

      <div className="space-y-1 mb-6">
        <h3 className="text-lg font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">{book.title}</h3>
        <p className="text-sm text-slate-500 font-medium">{book.author}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50 mb-8">
        <div className="flex items-center gap-2">
            <Layers size={14} className="text-slate-300" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{book.category}</span>
        </div>
        <div className="flex items-center gap-2">
            <MapPin size={14} className="text-slate-300" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{book.location || 'Shelf A-1'}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button 
          disabled={!canReserve || !isAvailable || reserving}
          onClick={async () => {
             if (!canReserve) return;
             setReserving(true);
             await onReserve();
             setReserving(false);
          }}
          className={`flex-1 py-3 rounded-xl font-bold text-xs transition-shadow shadow-lg shadow-slate-900/5 active:scale-95 ${
            canReserve && isAvailable ? 'bg-slate-900 text-white hover:bg-indigo-600' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {reserving ? 'Reserving...' : canReserve ? (isAvailable ? 'Reserve Book' : 'Notify Me') : 'Browse Only'}
        </button>
        <button className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-white border border-slate-100 rounded-xl transition-all shadow-sm">
           <ArrowUpRight size={18} />
        </button>
      </div>
    </Card>
  );
}

