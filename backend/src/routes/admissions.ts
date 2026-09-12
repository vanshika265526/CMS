// FILE: backend/src/routes/admissions.ts
import express from "express";
import {
  createEnquiry,
  getEnquiries,
  updateEnquiryStatus,
  submitApplication,
  getApplications,
  updateApplicationStatus,
  getSeatMatrix,
  configureSeats,
  getAdmissionsReport,
} from "../controllers/admissionsController.js";
import { uploadDocument } from "../utils/cloudinaryUploader.js";
// import { protect, authorize } from "../middleware/auth.js"; // Existing middleware

const router = express.Router();

// --- Enquiry Routes ---
router.post("/enquiries", createEnquiry);
router.get("/enquiries", getEnquiries);
router.patch("/enquiries/:id/status", updateEnquiryStatus);

// --- Application Routes ---
// Use uploadDocument middleware for multiple documents
router.post("/applications", uploadDocument.array("docs", 5), submitApplication);
router.get("/applications", getApplications);
router.patch("/applications/:id/status", updateApplicationStatus);

// --- Seat Routes ---
router.get("/seats", getSeatMatrix);
router.post("/seats/configure", configureSeats);

// --- Reports ---
router.get("/reports", getAdmissionsReport);

export default router;
