import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  getMyFeeCalculation,
} from "../controllers/feeController.js";

const router = express.Router();

router.use(protect);

router.get("/my", authorize("STUDENT", "PARENT", "COLLEGE_ADMIN", "SUPER_ADMIN"), getMyFeeCalculation);
router.post("/create-order", authorize("STUDENT", "PARENT", "COLLEGE_ADMIN", "SUPER_ADMIN"), createRazorpayOrder);
router.post("/verify-payment", authorize("STUDENT", "PARENT", "COLLEGE_ADMIN", "SUPER_ADMIN"), verifyRazorpayPayment);

export default router;
