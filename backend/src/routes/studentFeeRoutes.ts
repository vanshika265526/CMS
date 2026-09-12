import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import { getStudentFeeCalculation } from "../controllers/feeController.js";

const router = express.Router();

router.use(protect);
router.get("/fee/:student_id", authorize("STUDENT", "PARENT", "COLLEGE_ADMIN", "SUPER_ADMIN"), getStudentFeeCalculation);

export default router;
