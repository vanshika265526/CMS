import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import * as libraryController from "../controllers/libraryController.js";

const router = express.Router();

router.use(protect);

// ─── Book Catalog (all authenticated users) ───────────────────────────────────
router.get("/", libraryController.getBooks);

// ─── Librarian + Admin: Book CRUD ────────────────────────────────────────────
router.post(
  "/",
  libraryController.addBook
);
router.put(
  "/:id",
  authorize("SUPER_ADMIN", "COLLEGE_ADMIN", "LIBRARIAN"),
  libraryController.updateBook
);
router.delete(
  "/:id",
  authorize("SUPER_ADMIN", "COLLEGE_ADMIN", "LIBRARIAN"),
  libraryController.deleteBook
);

// ─── Stats (librarian dashboard) ─────────────────────────────────────────────
router.get(
  "/stats",
  authorize("SUPER_ADMIN", "COLLEGE_ADMIN", "LIBRARIAN"),
  libraryController.getLibraryStats
);

// ─── Transactions ─────────────────────────────────────────────────────────────
router.get(
  "/transactions",
  authorize("SUPER_ADMIN", "COLLEGE_ADMIN", "LIBRARIAN"),
  libraryController.getTransactions
);

// ─── Issue a book ─────────────────────────────────────────────────────────────
router.post(
  "/issue",
  authorize("LIBRARIAN", "SUPER_ADMIN", "COLLEGE_ADMIN"),
  libraryController.issueBook
);

// ─── Return a book ───────────────────────────────────────────────────────────
router.put(
  "/return/:txId",
  authorize("LIBRARIAN", "SUPER_ADMIN", "COLLEGE_ADMIN"),
  libraryController.returnBook
);

// ─── Lightweight student search (librarian only, dedicated endpoint) ──────────
router.get(
  "/students/search",
  authorize("LIBRARIAN", "SUPER_ADMIN", "COLLEGE_ADMIN"),
  libraryController.searchStudents
);

// ─── Student Dashboard ────────────────────────────────────────────────────────
router.get(
  "/my-transactions",
  authorize("STUDENT"),
  libraryController.getStudentLibraryTransactions
);

// ─── Reservation System ───────────────────────────────────────────────────────
router.post(
  "/reserve/:bookId",
  authorize("STUDENT"),
  libraryController.reserveBook
);

router.put(
  "/approve-reservation/:txId",
  authorize("LIBRARIAN", "SUPER_ADMIN", "COLLEGE_ADMIN"),
  libraryController.approveReservation
);

export default router;
