// FILE: backend/src/controllers/studentsController.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import Student from "../models/Student.js";
import User from "../models/User.js";
import Parent from "../models/Parent.js";
import Department from "../models/Department.js";
import { generateStudentId } from "../utils/studentIdGenerator.js";
import { generateEnrollmentId, normalizeEnrollmentId } from "../utils/enrollmentId.js";
import { parseStudentCSV } from "../utils/csvImporter.js";
import Batch from "../models/Batch.js";
import Course from "../models/Course.js";
import FeeStructure from "../models/FeeStructure.js";
import Payment from "../models/Payment.js";
import { calculateStudentFee } from "../services/feeService.js";

const DEFAULT_STUDENT_PASSWORD = "Student@123";
const DEFAULT_PARENT_PASSWORD = "Parent@123";

const escapeRegexLiteral = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseBatchYears = (batchRaw: string) => {
  const currentYear = new Date().getFullYear();
  const matches = String(batchRaw || "").match(/(19|20)\d{2}/g) || [];
  const years = matches.map((year) => Number(year));

  if (years.length >= 2) {
    return { startYear: years[0], endYear: years[1] };
  }

  if (years.length === 1) {
    return { startYear: years[0], endYear: years[0] + 3 };
  }

  return { startYear: currentYear, endYear: currentYear + 3 };
};

const getCourseCode = (courseName: string, collegeId: any) => {
  const normalized = String(courseName || "GEN").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6) || "GEN";
  const scope = String(collegeId || "COL").slice(-4).toUpperCase();
  const stamp = Date.now().toString().slice(-6);
  return `${normalized}-${scope}-${stamp}`;
};

const ensureStudentUser = async (params: {
  email: string;
  fullName: string;
  collegeId: any;
}) => {
  const email = String(params.email || "").trim().toLowerCase();
  if (!email) {
    throw new Error("Student email is required");
  }

  let user = await User.findOne({ email });
  if (!user) {
    user = new User({
      name: params.fullName || email.split("@")[0],
      email,
      password: DEFAULT_STUDENT_PASSWORD,
      role: "STUDENT",
      collegeId: params.collegeId,
      isActive: true,
      mustChangePassword: true,
    });
    await user.save();
    return user;
  }

  let changed = false;
  if (String(user.role || "").toUpperCase() !== "STUDENT") {
    user.role = "STUDENT";
    changed = true;
  }
  if (!user.collegeId && params.collegeId) {
    user.collegeId = params.collegeId;
    changed = true;
  }
  if (!user.isActive) {
    user.isActive = true;
    changed = true;
  }
  if (params.fullName && user.name !== params.fullName) {
    user.name = params.fullName;
    changed = true;
  }

  if (changed) {
    await user.save();
  }

  return user;
};

const normalizeParentRelation = (value: string) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'father') return 'Father';
  if (normalized === 'mother') return 'Mother';
  return 'Guardian';
};

const ensureParentAccountAndLink = async (params: {
  email?: string;
  name?: string;
  phone?: string;
  relation?: string;
  studentId: any;
  collegeId: any;
}) => {
  const email = String(params.email || '').trim().toLowerCase();
  if (!email) return null;

  let user = await User.findOne({ email });
  if (!user) {
    user = new User({
      name: String(params.name || 'Parent').trim() || 'Parent',
      email,
      password: DEFAULT_PARENT_PASSWORD,
      role: 'PARENT',
      collegeId: params.collegeId,
      isActive: true,
      mustChangePassword: true,
    });
    await user.save();
  } else {
    let changed = false;
    if (String(user.role || '').toUpperCase() !== 'PARENT') {
      user.role = 'PARENT';
      changed = true;
    }
    if (!user.collegeId && params.collegeId) {
      user.collegeId = params.collegeId;
      changed = true;
    }
    if (!user.isActive) {
      user.isActive = true;
      changed = true;
    }
    if (params.name && user.name !== params.name) {
      user.name = String(params.name).trim();
      changed = true;
    }
    if (changed) await user.save();
  }

  let parentRecord = await Parent.findOne({ userId: user._id });
  if (!parentRecord) {
    parentRecord = await Parent.create({
      userId: user._id,
      students: [params.studentId],
      relation: normalizeParentRelation(String(params.relation || 'Guardian')),
      phone: String(params.phone || '0000000000').trim(),
      isActive: true,
    });
  } else {
    const existingStudents = new Set(parentRecord.students.map((id) => String(id)));
    if (!existingStudents.has(String(params.studentId))) {
      parentRecord.students.push(params.studentId as any);
    }

    let changed = false;
    const normalizedRelation = normalizeParentRelation(String(params.relation || parentRecord.relation || 'Guardian'));
    if (parentRecord.relation !== normalizedRelation) {
      parentRecord.relation = normalizedRelation;
      changed = true;
    }

    const nextPhone = String(params.phone || parentRecord.phone || '0000000000').trim();
    if (parentRecord.phone !== nextPhone) {
      parentRecord.phone = nextPhone;
      changed = true;
    }

    if (!parentRecord.isActive) {
      parentRecord.isActive = true;
      changed = true;
    }

    if (changed || !existingStudents.has(String(params.studentId))) {
      await parentRecord.save();
    }
  }

  return user;
};

export const getStudents = async (req: Request, res: Response) => {
  try {
    const { course, batch, batchId, department, status, search } = req.query;
    const user = (req as any).user;
    const role = String(user?.role || '').toUpperCase();
    const collegeId = user?.collegeId;

    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    if (!collegeId && role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Missing college scope' });
    }
    
    const andFilters: any[] = [];
    if (collegeId) andFilters.push({ collegeId });

    if (course) andFilters.push({ "academicInfo.course": course });
    if (batch) andFilters.push({ "academicInfo.batch": batch });
    if (batchId) {
      // Support both ObjectId-linked batches and legacy string batch labels.
      if (mongoose.Types.ObjectId.isValid(batchId as string)) {
        andFilters.push({
          $or: [
            { batchId },
            { "academicInfo.batch": { $regex: new RegExp(batchId as string, "i") } },
          ],
        });
      } else {
        andFilters.push({ "academicInfo.batch": batchId });
      }
    }
    if (department) andFilters.push({ "academicInfo.department": department });
    if (status) andFilters.push({ "academicInfo.status": status });
    if (search) {
      andFilters.push({
        $or: [
          { "personalInfo.firstName": { $regex: search, $options: "i" } },
          { "personalInfo.lastName": { $regex: search, $options: "i" } },
          { "personalInfo.email": { $regex: search, $options: "i" } },
          { uniqueStudentId: { $regex: search, $options: "i" } },
        ],
      });
    }

    const query = andFilters.length > 0 ? { $and: andFilters } : {};

    const students = await Student.find(query).populate("academicInfo.department").sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: students, message: "Students fetched successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStudentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const collegeId = (req as any).user.collegeId;
    const student = await Student.findOne({ uniqueStudentId: id, collegeId }).populate("academicInfo.department");
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });
    res.status(200).json({ success: true, data: student, message: "Student profile found" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get the student profile for the current logged in user (student or parent)
 */
export const getMyStudent = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (!user) return res.status(401).json({ success: false, message: "Not authorized" });

    let student;

    if (user.role === 'STUDENT') {
      // Build query with multi-tenant isolation
      const query: any = { userId: user._id };
      if (user.collegeId) query.collegeId = user.collegeId;

      student = await Student.findOne(query)
        .populate("academicInfo.department", "name")
        .populate({ path: "batchId", select: "name courseId startYear endYear", populate: { path: "courseId", select: "name code" } })
        .select("-documents"); // Exclude heavy documents array from dashboard payload

    } else if (user.role === 'PARENT') {
      // For parents, look up via parentInfo email (case-insensitive to handle legacy casing).
      const parentEmail = String(user.email || '').trim();
      const parentQuery: any = { "parentInfo.email": new RegExp(`^${escapeRegexLiteral(parentEmail)}$`, 'i') };
      if (user.collegeId) parentQuery.collegeId = user.collegeId;
      student = await Student.findOne(parentQuery)
        .populate("academicInfo.department", "name")
        .populate({ path: "batchId", select: "name courseId startYear endYear", populate: { path: "courseId", select: "name code" } })
        .select("-documents");
    }

    if (!student) {
      return res.status(404).json({ success: false, message: "Student profile not found. Please contact the administration." });
    }

    res.status(200).json({ success: true, data: student });
  } catch (error: any) {
    console.error("[GET_MY_STUDENT] Unexpected error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createStudent = async (req: Request, res: Response) => {
  try {
    const studentData = req.body;
    studentData.uniqueStudentId = await generateStudentId();
    const requestedCollegeId = studentData.collegeId;
    studentData.collegeId = (req as any).user?.collegeId || requestedCollegeId;

    if (!studentData.collegeId) {
      return res.status(400).json({ success: false, message: "collegeId is required" });
    }

    const enrollmentId = await generateEnrollmentId(String(studentData.collegeId), new Date());
    studentData.enrollmentId = enrollmentId;
    studentData.studentId = enrollmentId;

    studentData.personalInfo = studentData.personalInfo || {};
    studentData.parentInfo = studentData.parentInfo || {};
    studentData.academicInfo = studentData.academicInfo || {};

    const first = String(studentData?.personalInfo?.firstName || "").trim();
    const last = String(studentData?.personalInfo?.lastName || "").trim();
    const email = String(studentData?.personalInfo?.email || "").trim().toLowerCase();
    if (!email || !first) {
      return res.status(400).json({ success: false, message: "Student first name and email are required" });
    }

    // Backfill required fields so manual registration survives sparse forms.
    const fallbackPhone = String(studentData?.personalInfo?.phone || studentData?.parentInfo?.phone || "0000000000").trim();
    const fallbackAddress = String(studentData?.personalInfo?.address || "Not Provided").trim();
    const fallbackParentEmail = String(studentData?.parentInfo?.email || email).trim().toLowerCase();

    studentData.personalInfo.firstName = first;
    studentData.personalInfo.lastName = last;
    studentData.personalInfo.email = email;
    studentData.personalInfo.phone = fallbackPhone;
    studentData.personalInfo.address = fallbackAddress;

    studentData.parentInfo.name = String(studentData?.parentInfo?.name || `${first} ${last}`.trim() || "Guardian").trim();
    studentData.parentInfo.phone = String(studentData?.parentInfo?.phone || fallbackPhone).trim();
    studentData.parentInfo.email = fallbackParentEmail;
    studentData.parentInfo.relation = String(studentData?.parentInfo?.relation || "Guardian").trim();

    // Create or re-use a corresponding User account for the student.
    const newUser = await ensureStudentUser({
      email,
      fullName: `${first} ${last || ""}`.trim(),
      collegeId: studentData.collegeId,
    });
    
    studentData.userId = newUser._id;
    const student = new Student(studentData);
    await student.save();

    await ensureParentAccountAndLink({
      email: studentData?.parentInfo?.email,
      name: studentData?.parentInfo?.name,
      phone: studentData?.parentInfo?.phone,
      relation: studentData?.parentInfo?.relation,
      studentId: student._id,
      collegeId: studentData.collegeId,
    });
    
    res.status(201).json({ success: true, data: student, message: "Student enrolled successfully" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const collegeId = (req as any).user.collegeId;
    const student = await Student.findOneAndUpdate({ uniqueStudentId: id, collegeId }, req.body, { new: true });
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    const studentEmail = String(student?.personalInfo?.email || "").trim().toLowerCase();
    const fullName = `${student?.personalInfo?.firstName || ""} ${student?.personalInfo?.lastName || ""}`.trim();
    if (studentEmail) {
      const user = await ensureStudentUser({ email: studentEmail, fullName, collegeId });
      if (!student.userId || String(student.userId) !== String(user._id)) {
        student.userId = user._id as any;
        await student.save();
      }
    }

    await ensureParentAccountAndLink({
      email: student?.parentInfo?.email,
      name: student?.parentInfo?.name,
      phone: student?.parentInfo?.phone,
      relation: student?.parentInfo?.relation,
      studentId: student._id,
      collegeId,
    });

    res.status(200).json({ success: true, data: student, message: "Student profile updated" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateStudentEnrollmentId = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const collegeId = (req as any).user?.collegeId;
    const enrollmentId = normalizeEnrollmentId(String(req.body?.enrollmentId || ""));

    if (!enrollmentId) {
      return res.status(400).json({ success: false, message: "Please provide a valid enrollment ID" });
    }

    const duplicate = await Student.findOne({
      collegeId,
      enrollmentId,
      uniqueStudentId: { $ne: id }
    }).select("_id");

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "This enrollment ID is already taken. Please choose a different one"
      });
    }

    const student = await Student.findOneAndUpdate(
      { uniqueStudentId: id, collegeId },
      { enrollmentId, studentId: enrollmentId },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    return res.status(200).json({ success: true, data: student, message: "Enrollment ID updated successfully" });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const updateStudentRollNumber = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const collegeId = (req as any).user?.collegeId;
    const rollNumber = String(req.body?.rollNumber || "").trim().toUpperCase();

    if (!rollNumber) {
      return res.status(400).json({ success: false, message: "Please provide a valid roll number" });
    }

    const targetStudent = await Student.findOne({ uniqueStudentId: id, collegeId }).select("_id batchId academicInfo.batch academicInfo.section");
    if (!targetStudent) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const duplicateQuery: any = {
      collegeId,
      "academicInfo.rollNumber": rollNumber,
      uniqueStudentId: { $ne: id },
    };

    if (targetStudent.batchId) {
      duplicateQuery.batchId = targetStudent.batchId;
    } else if (targetStudent.academicInfo?.batch) {
      duplicateQuery["academicInfo.batch"] = targetStudent.academicInfo.batch;
    }

    if (targetStudent.academicInfo?.section) {
      duplicateQuery["academicInfo.section"] = targetStudent.academicInfo.section;
    }

    const duplicate = await Student.findOne(duplicateQuery).select("_id");
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "This roll number is already in use for the same batch/section",
      });
    }

    const student = await Student.findOneAndUpdate(
      { uniqueStudentId: id, collegeId },
      { $set: { "academicInfo.rollNumber": rollNumber } },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    return res.status(200).json({ success: true, data: student, message: "Roll number updated successfully" });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const bulkImportStudents = async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No CSV file uploaded" });

    const rawData = await parseStudentCSV(req.file.path);
    const importedStudents = [];
    const errors = [];

    const adminUser = (req as any).user;
    const collegeId = adminUser.collegeId;
    if (!collegeId) {
      return res.status(400).json({ success: false, message: "College context is required for import" });
    }
    
    // Fetch departments for lookup
    const departments = await Department.find({ collegeId });

    for (const row of rawData) {
      try {
        const uniqueId = await generateStudentId();
        const enrollmentId = await generateEnrollmentId(String(collegeId), new Date());
        
        // Helper to find value regardless of case/spaces in header
        const getVal = (keys: string[]) => {
          const foundKey = Object.keys(row).find(k => 
            keys.some(key => k.toLowerCase().replace(/\s/g, '') === key.toLowerCase().replace(/\s/g, ''))
          );
          return foundKey ? row[foundKey] : undefined;
        };

        // Resolve department
        const deptVal = getVal(["departmentId", "department", "dept"]);
        let deptId = mongoose.isValidObjectId(deptVal) ? deptVal : null;
        
        if (!deptId && deptVal) {
          const matchedDept = departments.find(d => 
            d.name.toLowerCase().includes(String(deptVal).toLowerCase())
          );
          
          if (matchedDept) {
            deptId = matchedDept._id;
          } else {
            // Auto-create department if not found (Demo fallback)
            const newDept = new Department({ name: deptVal, collegeId });
            await newDept.save();
            departments.push(newDept);
            deptId = newDept._id;
          }
        }

        // Final fallback: Use "General" or some existing dept
        if (!deptId) {
          const defaultDept = departments[0] || await Department.findOneAndUpdate(
            { name: "General", collegeId }, 
            { name: "General", collegeId }, 
            { upsert: true, new: true }
          );
          
          if (defaultDept) {
            deptId = defaultDept._id;
            if (departments.length === 0) departments.push(defaultDept);
          }
        }

        if (!deptId) {
          throw new Error("Critical Failure: Could not resolve or create any department ID.");
        }

        const courseName = String(getVal(["course", "program"]) || "General").trim();
        let course = await Course.findOne({ name: courseName, collegeId });
        if (!course) {
          course = await Course.create({
            name: courseName,
            code: getCourseCode(courseName, collegeId),
            duration: 4,
            department: deptId,
            collegeId,
            totalSeats: 60,
            description: "Auto-created during student CSV import",
          });
        }

        const batchRaw = String(getVal(["batch", "year"]) || "").trim() || `${new Date().getFullYear()}-${new Date().getFullYear() + 3}`;
        const { startYear, endYear } = parseBatchYears(batchRaw);
        const batchName = `${courseName} ${startYear}-${endYear}`;

        let batch = await Batch.findOne({ name: batchName, collegeId });
        if (!batch) {
          batch = await Batch.create({
            name: batchName,
            courseId: course._id,
            startYear,
            endYear,
            collegeId,
            status: "active",
            autoCreated: true,
          });
        }

        // Force a valid Date or fallback
        const dobStr = getVal(["dob", "date of birth", "birthday"]);
        const dob = (dobStr && !isNaN(Date.parse(dobStr))) ? new Date(dobStr) : new Date();

        // Create or re-use a corresponding User account first
        const studentEmail = getVal(["email", "email address"]);
        const firstName = getVal(["firstName", "first name", "name"]);
        const lastName = getVal(["lastName", "last name", "surname"]) || "N/A";

        if (!studentEmail || !firstName) {
          throw new Error("Missing required identity fields (Email or Name)");
        }

        const normalizedEmail = String(studentEmail).trim().toLowerCase();
        const newUser = await ensureStudentUser({
          email: normalizedEmail,
          fullName: `${firstName} ${lastName}`.trim(),
          collegeId,
        });

        // Map CSV row to Student Schema with fallbacks
        const parentEmail = String(getVal(["parentEmail", "parent email"]) || normalizedEmail).trim().toLowerCase();
        const parentName = String(getVal(["parentName", "guardian", "father name"]) || `${firstName} ${lastName}`).trim();
        const parentPhone = String(getVal(["parentPhone", "parent contact"]) || getVal(["phone", "mobile", "contact"]) || "0000000000").trim();
        const parentRelation = String(getVal(["relation", "relationship"]) || "Guardian").trim();

        const student = new Student({
          uniqueStudentId: uniqueId,
          enrollmentId,
          studentId: enrollmentId,
          userId: newUser._id,
          collegeId, // IMPORTANT: Link imported student to the current admin's college
          batchId: batch._id,
          personalInfo: {
            firstName,
            lastName,
            email: normalizedEmail,
            phone: getVal(["phone", "mobile", "contact"]) || "0000000000",
            gender: (getVal(["gender"]) || "other").toLowerCase(),
            dob,
            address: getVal(["address", "home address"]) || "N/A"
          },
          academicInfo: {
            course: courseName,
            batch: batchName,
            department: deptId,
            status: "active",
            semester: 1
          },
          parentInfo: {
            name: parentName || "N/A",
            phone: parentPhone || "0000000000",
            email: parentEmail,
            relation: parentRelation || "Guardian"
          },
          documents: []
        });
        await student.save();

        await ensureParentAccountAndLink({
          email: parentEmail,
          name: parentName,
          phone: parentPhone,
          relation: parentRelation,
          studentId: student._id,
          collegeId,
        });

        importedStudents.push(student);
      } catch (err: any) {
        console.error(`IMPORT ROW ERROR (Row ${importedStudents.length + errors.length + 1}):`, err.message);
        console.error("DATA:", JSON.stringify(row));
        errors.push({ row, error: err.message });
      }
    }

    res.status(201).json({ 
      success: true, 
      data: { imported: importedStudents.length, errors }, 
      message: `Import complete. ${importedStudents.length} success, ${errors.length} failed.` 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadStudentPhoto = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const collegeId = (req as any).user?.collegeId;
    if (!req.file && (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY)) {
      // If no file and no cloudinary, or just no cloudinary, we can return a dummy
      const student = await Student.findOneAndUpdate(
        { uniqueStudentId: id, ...(collegeId ? { collegeId } : {}) },
        { "personalInfo.photo": `http://${req.get('host')}/uploads/temp/demo-avatar.png` },
        { new: true }
      );
      if (!student) return res.status(404).json({ success: false, message: "Student not found" });
      return res.status(200).json({ success: true, data: student, message: "Demo mode: Dummy photo set" });
    }

    if (!req.file) return res.status(400).json({ success: false, message: "No photo uploaded" });

    const student = await Student.findOneAndUpdate(
      { uniqueStudentId: id, ...(collegeId ? { collegeId } : {}) },
      { "personalInfo.photo": req.file.path },
      { new: true }
    );
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    res.status(200).json({ success: true, data: student, message: "Photo uploaded successfully" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getStudentStats = async (req: Request, res: Response) => {
  try {
    const collegeId = (req as any).user?.collegeId;
    const scope: any = collegeId ? { collegeId } : {};

    const totalStudents = await Student.countDocuments(scope);
    const activeStudents = await Student.countDocuments({ ...scope, "academicInfo.status": "active" });
    const droppedStudents = await Student.countDocuments({ ...scope, "academicInfo.status": "dropped" });
    
    const newThisMonth = await Student.countDocuments({
      ...scope,
      createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
    });

    const dropoutRate = totalStudents > 0 ? (droppedStudents / totalStudents) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        totalStudents,
        activeStudents,
        newThisMonth,
        dropoutRate
      },
      message: "Student stats fetched successfully"
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
export const uploadDocs = async (req: Request, res: Response) => {
  try {
    if (!req.files || (req.files as any[]).length === 0) {
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }

    const files = req.files as any[];

    // Fallback if Cloudinary is not configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      console.warn("CLOUDINARY NOT CONFIGURED: Using dummy URLs for testing.");
      const docs = files.map(f => ({
        name: f.originalname,
        cloudinaryUrl: `http://${req.get('host')}/uploads/temp/${f.filename}`,
        uploadedAt: new Date()
      }));
      return res.status(200).json({ success: true, data: docs, message: "Demo mode: Files accepted (not stored)" });
    }

    const docs = files.map(f => ({
      name: f.originalname,
      cloudinaryUrl: f.path,
      uploadedAt: new Date()
    }));

    res.status(200).json({ success: true, data: docs, message: "Documents uploaded successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const softDeleteStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const collegeId = (req as any).user.collegeId;
    await Student.findOneAndUpdate({ uniqueStudentId: id, collegeId }, { "academicInfo.status": "dropped" });
    res.status(200).json({ success: true, message: "Student record archived" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateStudentStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const collegeId = (req as any).user.collegeId;
    await Student.findOneAndUpdate({ uniqueStudentId: id, collegeId }, { "academicInfo.status": status });
    res.status(200).json({ success: true, message: "Student status updated" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getMyFees = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const collegeId = (req as any).user.collegeId;

    const student = await Student.findOne({ userId, collegeId });
    if (!student) return res.status(404).json({ success: false, message: "Student profile not found" });

    let batchId = student.batchId;

    // FALLBACK: Lookup by name
    if (!batchId && student.academicInfo?.batch) {
       const resolvedBatch = await Batch.findOne({ name: student.academicInfo.batch, collegeId });
       if (resolvedBatch) batchId = resolvedBatch._id;
    }

    if (!batchId) {
      return res.status(400).json({ success: false, message: "Student is not assigned to a valid batch" });
    }

    const batch = await Batch.findById(batchId);
    if (!batch || !batch.courseId) {
       return res.status(400).json({ success: false, message: "Course mapping missing for batch" });
    }

    const courseId = batch.courseId;

    console.log(`[DEBUG] getMyFees: studentFound=${!!student}, batchId=${batchId}, courseId=${courseId}`);

    const [structures, payments] = await Promise.all([
      FeeStructure.find({ courseId }),
      Payment.find({ studentId: student._id }).populate("feeStructureId").sort({ createdAt: -1 })
    ]);

    console.log(`[DEBUG] getMyFees: structures=${structures.length}, payments=${payments.length}`);

    const totalPaid = payments.reduce((acc, p) => acc + (p.status === 'Paid' ? p.amountPaid : 0), 0);
    const totalDues = structures.reduce((acc, s) => {
       const components = s.components || [];
       return acc + components.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
    }, 0);

    res.status(200).json({
      success: true,
      data: {
        structures,
        payments,
        summary: {
           totalDues,
           totalPaid,
           balance: totalDues - totalPaid
        }
      }
    });

  } catch (error: any) {
    console.error(`[GET_MY_FEES_ERROR] userId=${(req as any).user?._id}:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Bulk reset student passwords for selected students/emails in the current college.
 */
export const resetStudentPasswordsBulk = async (req: Request, res: Response) => {
  try {
    const collegeId = (req as any).user?.collegeId;
    const { emails = [], studentIds = [], newPassword } = req.body || {};

    const targetPassword = String(newPassword || DEFAULT_STUDENT_PASSWORD);
    if (targetPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const studentQuery: any = { collegeId };
    const normalizedEmails = Array.isArray(emails)
      ? emails.map((email: any) => String(email || '').trim().toLowerCase()).filter(Boolean)
      : [];

    if (normalizedEmails.length > 0 || (Array.isArray(studentIds) && studentIds.length > 0)) {
      studentQuery.$or = [];
      if (normalizedEmails.length > 0) {
        studentQuery.$or.push({ 'personalInfo.email': { $in: normalizedEmails } });
      }
      if (Array.isArray(studentIds) && studentIds.length > 0) {
        studentQuery.$or.push({ uniqueStudentId: { $in: studentIds } });
      }
    }

    const students = await Student.find(studentQuery).select('userId personalInfo collegeId uniqueStudentId');

    let resetCount = 0;
    const failed: Array<{ studentId: string; email: string; reason: string }> = [];

    for (const student of students) {
      try {
        const email = String(student?.personalInfo?.email || '').trim().toLowerCase();
        const fullName = `${student?.personalInfo?.firstName || ''} ${student?.personalInfo?.lastName || ''}`.trim();
        if (!email) {
          failed.push({ studentId: String(student.uniqueStudentId || ''), email: '', reason: 'Missing student email' });
          continue;
        }

        const user = await ensureStudentUser({ email, fullName, collegeId: student.collegeId });
        user.password = targetPassword;
        user.isActive = true;
        user.authentication.failed_login_attempts = 0;
        user.authentication.account_locked_until = undefined;
        await user.save();

        if (!student.userId || String(student.userId) !== String(user._id)) {
          student.userId = user._id as any;
          await student.save();
        }

        resetCount += 1;
      } catch (error: any) {
        failed.push({
          studentId: String(student.uniqueStudentId || ''),
          email: String(student?.personalInfo?.email || ''),
          reason: error?.message || 'Reset failed',
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Student passwords reset completed.',
      data: {
        totalMatched: students.length,
        resetCount,
        failed,
        defaultPassword: targetPassword,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Handle a simulated payment for demo purposes
 */
export const processMockPayment = async (req: Request, res: Response) => {
  try {
    const { feeStructureId, amount, mode } = req.body;
    const userId = (req as any).user._id;
    const collegeId = (req as any).user.collegeId;

    const student = await Student.findOne({ userId, collegeId });
    if (!student) return res.status(404).json({ success: false, message: "Student profile not found" });

    // Validate fee structure exists
    const fee = await FeeStructure.findById(feeStructureId);
    if (!fee) return res.status(404).json({ success: false, message: "Fee structure not found" });

    const payment = await Payment.create({
      studentId: student._id,
      feeStructureId,
      amountPaid: amount,
      mode: mode || "online",
      status: "Paid",
      receiptNumber: `MOCK-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    });

    res.status(201).json({ 
      success: true, 
      data: payment, 
      message: "Payment processed successfully (Mock Transformation Complete)" 
    });
  } catch (error: any) {
    console.error("[MOCK_PAYMENT_ERROR]:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
