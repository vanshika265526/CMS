// FILE: backend/src/routes/departments.ts
import express from "express";
import Department from "../models/Department.js";

const router = express.Router();

// --- CRUD ---
router.get("/", async (req, res) => {
  try {
    const depts = await Department.find();
    res.status(200).json({ success: true, data: depts, message: "Departments fetched" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const dept = new Department(req.body);
    await dept.save();
    res.status(201).json({ success: true, data: dept, message: "Department created" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
