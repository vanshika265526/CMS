import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import Book from '../../models/Book.js';
import LibraryTransaction from '../../models/LibraryTransaction.js';
import Student from '../../models/Student.js';
import User from '../../models/User.js';
import { paginate, toObjectId } from '../helpers.js';
import { success, error } from '../types.js';
import { LIBRARY_LOAN_PERIOD_DAYS, LIBRARY_FINE_PER_DAY } from '../config.js';

export function registerLibraryTools(server: McpServer) {

  // ─── book_list ──────────────────────────────────────────────────
  server.tool(
    'book_list',
    'List and filter library books. Fields: title, author, isbn, category, totalCopies, availableCopies, location.',
    {
      category: z.string().optional().describe('Filter by book category'),
      collegeId: z.string().optional().describe('Filter by college ObjectId'),
      search: z.string().optional().describe('Search by book title, author, or ISBN'),
      page: z.number().optional(),
      limit: z.number().optional(),
    },
    async (params) => {
      try {
        const filter: any = {};
        if (params.category) filter.category = params.category;
        if (params.collegeId) filter.collegeId = toObjectId(params.collegeId, 'collegeId');
        if (params.search) {
          const regex = new RegExp(params.search, 'i');
          filter.$or = [{ title: regex }, { author: regex }, { isbn: regex }];
        }

        const query = Book.find(filter).sort({ title: 1 });
        const countQuery = Book.countDocuments(filter);

        const result = await paginate(query as any, countQuery as any, params);
        return success(result);
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── book_get ───────────────────────────────────────────────────
  server.tool(
    'book_get',
    'Get a single book by _id or ISBN.',
    {
      id: z.string().optional().describe('Book _id (ObjectId)'),
      isbn: z.string().optional().describe('Book ISBN string'),
    },
    async (params) => {
      try {
        if (!params.id && !params.isbn) {
          return error('Provide either id or isbn');
        }
        const filter = params.id
          ? { _id: toObjectId(params.id, 'id') }
          : { isbn: params.isbn };

        const book = await Book.findOne(filter).lean();
        if (!book) return error('Book not found');
        return success(book);
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── book_create ────────────────────────────────────────────────
  server.tool(
    'book_create',
    'Create/catalog a new book in the library. Requires title, author, isbn, category, collegeId, and totalCopies.',
    {
      title: z.string().describe('Book title'),
      author: z.string().describe('Author name'),
      isbn: z.string().describe('Unique ISBN code'),
      category: z.string().describe('Category/genre'),
      collegeId: z.string().describe('College ObjectId'),
      totalCopies: z.number().describe('Total copies cataloged'),
      location: z.string().optional().describe('Shelf location (e.g. Rack A-3)'),
    },
    async (params) => {
      try {
        const existing = await Book.findOne({ isbn: params.isbn, collegeId: toObjectId(params.collegeId, 'collegeId'), isDeleted: false });
        if (existing) return error(`Book with ISBN "${params.isbn}" already exists in this college library`);

        const book = await Book.create({
          ...params,
          collegeId: toObjectId(params.collegeId, 'collegeId'),
          availableCopies: params.totalCopies, // initially all copies are available
        });

        return success({
          message: '✅ Book cataloged successfully',
          bookId: book._id,
          isbn: book.isbn,
        });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── book_update ────────────────────────────────────────────────
  server.tool(
    'book_update',
    'Update a book record. Adjusting totalCopies automatically recalculates availableCopies.',
    {
      id: z.string().describe('Book _id (ObjectId)'),
      updates: z.record(z.any()).describe('Key-value updates (e.g., "location": "Rack B-2", "totalCopies": 10)'),
    },
    async (params) => {
      try {
        const bookId = toObjectId(params.id, 'id');
        const book = await Book.findById(bookId);
        if (!book) return error('Book not found');

        const updates = { ...params.updates };

        if (updates.totalCopies !== undefined) {
          const difference = updates.totalCopies - book.totalCopies;
          updates.availableCopies = book.availableCopies + difference;
          if (updates.availableCopies < 0) {
            return error(`Cannot decrease totalCopies. Currently ${Math.abs(book.availableCopies)} copies are lent out.`);
          }
        }

        const updatedBook = await Book.findByIdAndUpdate(
          bookId,
          { $set: updates },
          { new: true, runValidators: true }
        ).lean();

        return success({ message: '✅ Book updated successfully', book: updatedBook });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── book_delete ────────────────────────────────────────────────
  server.tool(
    'book_delete',
    'Delete a book. Implements safety count+reject: prevents deletion if there are active loans (issued/overdue copies). Default: soft-delete. Pass hard=true for permanent.',
    {
      id: z.string().describe('Book _id (ObjectId)'),
      hard: z.boolean().optional().describe('If true, permanently delete. Default: soft-delete'),
    },
    async (params) => {
      try {
        const bookId = toObjectId(params.id, 'id');
        const book = await Book.findById(bookId);
        if (!book) return error('Book not found');

        // Check if there are any outstanding loans (status is issued or overdue)
        const activeLoansCount = await LibraryTransaction.countDocuments({
          bookId,
          status: { $in: ['issued', 'overdue'] },
        });

        if (activeLoansCount > 0) {
          return error(`Cannot delete book. There are currently ${activeLoansCount} outstanding active loans (issued/overdue) for this book.`);
        }

        if (params.hard) {
          await Book.deleteOne({ _id: bookId });
          return success({ message: `⚠️ Book "${book.title}" permanently deleted from catalog` });
        } else {
          await Book.updateOne({ _id: bookId }, { $set: { isDeleted: true } });
          return success({ message: `✅ Book "${book.title}" soft-deleted` });
        }
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── library_issue_book ──────────────────────────────────────────
  server.tool(
    'library_issue_book',
    'Issue a book to a student. Decrements availableCopies and schedules a due date in 14 days.',
    {
      bookId: z.string().describe('Book ObjectId'),
      studentId: z.string().describe('Student ObjectId'),
      issuedBy: z.string().describe('Librarian User ObjectId issuing the book'),
      collegeId: z.string().describe('College ObjectId'),
    },
    async (params) => {
      try {
        const bookId = toObjectId(params.bookId, 'bookId');
        const studentId = toObjectId(params.studentId, 'studentId');
        const issuedBy = toObjectId(params.issuedBy, 'issuedBy');
        const collegeId = toObjectId(params.collegeId, 'collegeId');

        // 1. Verify student and book
        const student = await Student.findOne({ _id: studentId, isDeleted: false });
        if (!student) return error(`Active Student ${params.studentId} not found`);

        const book = await Book.findOne({ _id: bookId, isDeleted: false });
        if (!book) return error('Book not found or is deleted');

        // 2. Check copies available
        if (book.availableCopies <= 0) {
          return error(`Issue failed: No copies of "${book.title}" are currently available in the library`);
        }

        // 3. Check if student already has this book issued currently
        const alreadyIssued = await LibraryTransaction.findOne({
          studentId,
          bookId,
          status: { $in: ['issued', 'overdue'] },
        });
        if (alreadyIssued) {
          return error(`Issue failed: Student already has an active loan for "${book.title}"`);
        }

        // 4. Record transaction and decrement copies
        const issueDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(issueDate.getDate() + LIBRARY_LOAN_PERIOD_DAYS);

        const transaction = await LibraryTransaction.create({
          bookId,
          studentId,
          issuedBy,
          collegeId,
          issueDate,
          dueDate,
          status: 'issued',
          fine: 0,
        });

        // Decrement copies
        await Book.updateOne({ _id: bookId }, { $inc: { availableCopies: -1 } });

        return success({
          message: `✅ Book "${book.title}" issued successfully to ${student.personalInfo.firstName}`,
          transactionId: transaction._id,
          dueDate: dueDate.toISOString().split('T')[0],
        });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── library_return_book ─────────────────────────────────────────
  server.tool(
    'library_return_book',
    'Return a borrowed book. Calculates any overdue fine automatically (₹5/day) and increments availableCopies.',
    {
      transactionId: z.string().optional().describe('LibraryTransaction _id. If not provided, supply bookId and studentId.'),
      bookId: z.string().optional().describe('Book ObjectId (optional if transactionId provided)'),
      studentId: z.string().optional().describe('Student ObjectId (optional if transactionId provided)'),
    },
    async (params) => {
      try {
        let transaction;

        if (params.transactionId) {
          transaction = await LibraryTransaction.findById(toObjectId(params.transactionId, 'transactionId'));
        } else if (params.bookId && params.studentId) {
          transaction = await LibraryTransaction.findOne({
            bookId: toObjectId(params.bookId, 'bookId'),
            studentId: toObjectId(params.studentId, 'studentId'),
            status: { $in: ['issued', 'overdue'] },
          });
        }

        if (!transaction) return error('Active borrowing transaction not found');
        if (transaction.status === 'returned') return error('This book has already been returned');

        // Calculate fine
        const returnDate = new Date();
        let fine = 0;

        if (transaction.dueDate && returnDate > transaction.dueDate) {
          const diffTime = Math.abs(returnDate.getTime() - transaction.dueDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          fine = diffDays * LIBRARY_FINE_PER_DAY;
        }

        // Update transaction
        transaction.status = 'returned';
        transaction.returnDate = returnDate;
        transaction.fine = fine;
        await transaction.save();

        // Increment copies
        await Book.updateOne({ _id: transaction.bookId }, { $inc: { availableCopies: 1 } });

        const book = await Book.findById(transaction.bookId);

        return success({
          message: `✅ Book "${book?.title || 'Unknown'}" returned successfully`,
          fineApplied: fine,
          returnDate: returnDate.toISOString().split('T')[0],
          overdue: fine > 0,
        });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── library_transaction_list ────────────────────────────────────
  server.tool(
    'library_transaction_list',
    'List/filter library transactions. Fields: bookId, studentId, issuedBy, issueDate, dueDate, returnDate, status, fine.',
    {
      studentId: z.string().optional().describe('Filter by Student ObjectId'),
      bookId: z.string().optional().describe('Filter by Book ObjectId'),
      status: z.enum(['issued', 'returned', 'overdue', 'reserved']).optional().describe('Filter by transaction status'),
      collegeId: z.string().optional().describe('Filter by college ObjectId'),
      page: z.number().optional(),
      limit: z.number().optional(),
    },
    async (params) => {
      try {
        const filter: any = {};
        if (params.studentId) filter.studentId = toObjectId(params.studentId, 'studentId');
        if (params.bookId) filter.bookId = toObjectId(params.bookId, 'bookId');
        if (params.status) filter.status = params.status;
        if (params.collegeId) filter.collegeId = toObjectId(params.collegeId, 'collegeId');

        const query = LibraryTransaction.find(filter)
          .populate('bookId', 'title author isbn')
          .populate('studentId', 'uniqueStudentId personalInfo.firstName personalInfo.lastName')
          .populate('issuedBy', 'name email')
          .sort({ issueDate: -1 });
        const countQuery = LibraryTransaction.countDocuments(filter);

        const result = await paginate(query as any, countQuery as any, params);
        return success(result);
      } catch (err: any) {
        return error(err.message);
      }
    }
  );
}
