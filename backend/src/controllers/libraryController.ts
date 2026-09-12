import { Request, Response } from "express";
import Book from "../models/Book.js";
import LibraryTransaction from "../models/LibraryTransaction.js";
import Student from "../models/Student.js";
import Notification from "../models/Notification.js";
import { emitToUser } from "../config/socket.js";
import mongoose from "mongoose";

interface AuthRequest extends Request {
  user?: any;
}

/**
 * Get all books with filtering and search
 */
export const getBooks = async (req: Request, res: Response) => {
  try {
    const { search, category, collegeId } = req.query;
    const query: any = {};

    if (collegeId && mongoose.Types.ObjectId.isValid(collegeId as string)) {
      query.collegeId = collegeId;
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
        { isbn: { $regex: search, $options: "i" } }
      ];
    }

    const books = await Book.find(query).sort({ title: 1 });
    res.status(200).json({ success: true, data: books });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Add a new book to the library
 */
export const addBook = async (req: AuthRequest, res: Response) => {
  try {
    const normalizedRole = String(req.user?.role || '').toUpperCase();
    if (!['LIBRARIAN', 'COLLEGE_ADMIN', 'SUPER_ADMIN', 'ADMIN'].includes(normalizedRole)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to add library resources'
      });
    }

    let collegeId = req.user?.collegeId || req.body.collegeId;
    if (!collegeId) {
      const college = await mongoose.model('College').findOne();
      collegeId = college?._id;
    }

    const book = new Book({
      ...req.body,
      collegeId
    });
    await book.save();
    res.status(201).json({ success: true, data: book });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Update book details or stock
 */
export const updateBook = async (req: AuthRequest, res: Response) => {
  try {
    let collegeId = req.user?.collegeId || req.body.collegeId;
    if (!collegeId) {
      const college = await mongoose.model('College').findOne();
      collegeId = college?._id;
    }

    const book = await Book.findOneAndUpdate(
      { _id: req.params.id, collegeId },
      req.body,
      { new: true }
    );
    if (!book) return res.status(404).json({ success: false, message: "Book not found" });
    res.status(200).json({ success: true, data: book });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Delete a book
 */
export const deleteBook = async (req: AuthRequest, res: Response) => {
  try {
    let collegeId = req.user?.collegeId || req.body.collegeId;
    if (!collegeId) {
      const college = await mongoose.model('College').findOne();
      collegeId = college?._id;
    }

    const book = await Book.findOneAndDelete({ _id: req.params.id, collegeId });
    if (!book) return res.status(404).json({ success: false, message: "Book not found" });
    res.status(200).json({ success: true, message: "Book deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/library/stats
 * Dashboard stats for the librarian portal
 */
export const getLibraryStats = async (req: AuthRequest, res: Response) => {
  try {
    let collegeId = req.user?.collegeId;
    if (!collegeId) {
      const college = await mongoose.model('College').findOne();
      collegeId = college?._id;
    }
    const query = { collegeId: new mongoose.Types.ObjectId(collegeId) };

    // Auto-update overdue statuses
    await LibraryTransaction.updateMany(
      { ...query, status: 'issued', dueDate: { $lt: new Date() } },
      { $set: { status: 'overdue' } }
    );

    const [totalBooks, totalCopies, issued, overdue, recentTx] = await Promise.all([
      Book.countDocuments(query),
      Book.aggregate([{ $match: query }, { $group: { _id: null, total: { $sum: '$totalCopies' } } }]),
      LibraryTransaction.countDocuments({ ...query, status: 'issued' }),
      LibraryTransaction.countDocuments({ ...query, status: 'overdue' }),
      LibraryTransaction.find(query)
        .populate('bookId', 'title author')
        .populate({ path: 'studentId', select: 'personalInfo.firstName personalInfo.lastName academicInfo.rollNumber' })
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalTitles: totalBooks,
        totalCopies: totalCopies[0]?.total || 0,
        issued,
        overdue,
        recentTransactions: recentTx,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/library/transactions
 * Full transaction list with filtering
 */
export const getTransactions = async (req: AuthRequest, res: Response) => {
  try {
    let collegeId = req.user?.collegeId;
    if (!collegeId) {
      const college = await mongoose.model('College').findOne();
      collegeId = college?._id;
    }
    const { status, studentId } = req.query;

    // Auto-update overdue statuses
    await LibraryTransaction.updateMany(
      { collegeId, status: 'issued', dueDate: { $lt: new Date() } },
      { $set: { status: 'overdue' } }
    );

    const filter: any = { collegeId };
    if (status && status !== 'all') filter.status = status;
    if (studentId) filter.studentId = studentId;

    const transactions = await LibraryTransaction.find(filter)
      .populate('bookId', 'title author isbn category')
      .populate({
        path: 'studentId',
        select: 'personalInfo.firstName personalInfo.lastName academicInfo.rollNumber',
      })
      .populate('issuedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: transactions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/library/issue
 * Issue a book to a student
 */
export const issueBook = async (req: AuthRequest, res: Response) => {
  const { bookId, studentId, dueDate } = req.body;
  const issuedBy = req.user?._id;
  let collegeId = req.user?.collegeId;
  if (!collegeId) {
    const college = await mongoose.model('College').findOne();
    collegeId = college?._id;
  }


  if (!bookId || !studentId || !dueDate) {
    return res.status(400).json({ success: false, message: 'bookId, studentId, and dueDate are required' });
  }

  try {
    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
    if (book.availableCopies <= 0) {
      return res.status(400).json({ success: false, message: 'No copies available for this book' });
    }

    // Check student doesn't already have this book issued
    const existing = await LibraryTransaction.findOne({ bookId, studentId, status: { $in: ['issued', 'overdue'] } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Student already has an active issue for this book' });
    }

    const transaction = await LibraryTransaction.create({
      bookId,
      studentId,
      issuedBy,
      issueDate: new Date(),
      dueDate: new Date(dueDate),
      status: 'issued',
      fine: 0,
      collegeId,
    });

    // Decrement available copies
    book.availableCopies -= 1;
    await book.save();

    const populated = await LibraryTransaction.findById(transaction._id)
      .populate('bookId', 'title author isbn')
      .populate({ path: 'studentId', select: 'personalInfo.firstName personalInfo.lastName academicInfo.rollNumber' });

    return res.status(201).json({ success: true, data: populated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/library/return/:txId
 * Return a book — compute fine if overdue
 */
export const returnBook = async (req: AuthRequest, res: Response) => {
  const { txId } = req.params;
  const FINE_PER_DAY = 5; // ₹5 per day

  try {
    const transaction = await LibraryTransaction.findById(txId);
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });
    if (transaction.status === 'returned') {
      return res.status(400).json({ success: false, message: 'Book already returned' });
    }

    const returnDate = new Date();
    let fine = 0;

    if (transaction.dueDate && returnDate > transaction.dueDate) {
      const diffMs = returnDate.getTime() - transaction.dueDate.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      fine = diffDays * FINE_PER_DAY;
    }

    transaction.returnDate = returnDate;
    transaction.status = 'returned';
    transaction.fine = fine;
    await transaction.save();

    // Increment available copies
    await Book.findByIdAndUpdate(transaction.bookId, { $inc: { availableCopies: 1 } });

    return res.status(200).json({ success: true, data: transaction });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/library/students/search
 * Lightweight student search for librarian — name, roll number only
 */
export const searchStudents = async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;
    let collegeId = req.user?.collegeId;
    if (!collegeId) {
      const college = await mongoose.model('College').findOne();
      collegeId = college?._id;
    }

    if (!q || (q as string).length < 2) {
      return res.status(200).json({ success: true, data: [] });
    }

    const students = await Student.find({
      collegeId,
      'academicInfo.status': 'active',
      $or: [
        { 'personalInfo.firstName': { $regex: q, $options: 'i' } },
        { 'personalInfo.lastName': { $regex: q, $options: 'i' } },
        { 'personalInfo.name': { $regex: q, $options: 'i' } },
        { 'academicInfo.rollNumber': { $regex: q, $options: 'i' } },
      ],
    })
      .select('personalInfo.firstName personalInfo.lastName academicInfo.rollNumber academicInfo.course')
      .limit(10);

    return res.status(200).json({ success: true, data: students });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/library/my-transactions
 * Get active transactions for the logged-in student (for Student Dashboard)
 */
export const getStudentLibraryTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const student = await mongoose.model("Student").findOne({ userId: req.user?._id });
    if (!student) {
      return res.status(404).json({ success: false, message: "Student profile not found" });
    }

    // Auto-update overdue statuses globally mapped to this student before fetching
    await LibraryTransaction.updateMany(
      { studentId: student._id, status: 'issued', dueDate: { $lt: new Date() } },
      { $set: { status: 'overdue' } }
    );

    let queryObj = LibraryTransaction.find({ 
      studentId: student._id,
      status: { $in: ['issued', 'overdue', 'reserved'] }
    })
      .populate('bookId', 'title author')
      .sort({ dueDate: 1 }); // Closest due dates first

    const limit = parseInt(req.query.limit as string);
    if (!isNaN(limit) && limit > 0) {
      queryObj = queryObj.limit(limit);
    }

    const transactions = await queryObj;
    return res.status(200).json({ success: true, data: transactions });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/library/reserve/:bookId
 * Student reserves an available book 
 */
export const reserveBook = async (req: AuthRequest, res: Response) => {
  try {
    const bookId = req.params.bookId;
    const student = await mongoose.model("Student").findOne({ userId: req.user?._id });
    if (!student) return res.status(404).json({ success: false, message: "Student profile required to reserve." });

    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ success: false, message: "Book not found." });

    if (book.availableCopies < 1) {
      return res.status(400).json({ success: false, message: "Book is currently out of stock." });
    }

    // Check if student already has a pending reservation or issued for this book
    const existing = await LibraryTransaction.findOne({
      studentId: student._id,
      bookId: book._id,
      status: { $in: ['reserved', 'issued', 'overdue'] }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: "You already have this book reserved or issued." });
    }

    // Create reservation (Stock is NOT decremented yet per requirements)
    const reservation = await LibraryTransaction.create({
      bookId: book._id,
      studentId: student._id,
      collegeId: book.collegeId,
      status: 'reserved',
      reservedBy: req.user?._id
    });

    return res.status(201).json({ success: true, message: "Book reserved successfully", data: reservation });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/library/approve-reservation/:txId
 * Librarian approves a reservation, decrementing stock and starting the clock.
 */
export const approveReservation = async (req: AuthRequest, res: Response) => {
  try {
    const txId = req.params.txId;
    const tx = await LibraryTransaction.findById(txId);
    if (!tx || tx.status !== 'reserved') {
      return res.status(404).json({ success: false, message: "Active reservation not found." });
    }

    // Safety lock: check stock again
    const book = await Book.findById(tx.bookId);
    if (!book || book.availableCopies < 1) {
      return res.status(400).json({ success: false, message: "Race condition safety: Book is no longer in stock." });
    }

    // Decrement stock now!
    book.availableCopies -= 1;
    await book.save();

    // Finalize issuance
    tx.status = 'issued';
    tx.issuedBy = req.user?._id;
    tx.issueDate = new Date();
    
    // Set 14 days due date
    const due = new Date();
    due.setDate(due.getDate() + 14);
    tx.dueDate = due;

    await tx.save();

    // --- NOTIFICATION LOGIC ---
    try {
      // Find the student to get the associated userId
      const student = await Student.findById(tx.studentId);
      if (student && student.userId) {
        const notif = await Notification.create({
          title: "Book Reservation Approved",
          message: `Your reservation for "${book.title}" has been approved! You can now collect it from the library.`,
          type: "library",
          recipientUserId: student.userId,
          senderUserId: req.user?._id, // The librarian
          collegeId: tx.collegeId,
          isRead: false,
        });

        // Emit real-time notification
        emitToUser(student.userId.toString(), "notification", {
          title: notif.title,
          message: notif.message,
          type: notif.type,
          id: notif._id,
        });
        
        // Also emit a specific library update event to trigger UI refreshes
        emitToUser(student.userId.toString(), "libraryUpdate", {
          transactionId: tx._id,
          status: "issued",
          bookTitle: book.title
        });
      }
    } catch (notifErr) {
      console.error("Non-critical error: Failed to send library notification", notifErr);
    }
    // -------------------------

    return res.status(200).json({ success: true, message: "Reservation approved and issued.", data: tx });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
