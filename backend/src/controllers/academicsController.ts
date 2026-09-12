import { Request, Response } from "express";
import mongoose from "mongoose";
import Course from "../models/Course.js";
import Subject from "../models/Subject.js";
import Batch from "../models/Batch.js";
import Student from "../models/Student.js";
import Section from "../models/Section.js";
import User from "../models/User.js";
import Department from "../models/Department.js";
import { verifyCollegeOwnership } from "../middleware/collegeOwnership.js";

const resolveCollegeScope = (req: Request) => {
  const user = (req as any).user;
  const role = String(user?.role || "").toUpperCase();
  const userCollegeId = user?.collegeId;

  // Super Admin may access cross-college data only when explicitly filtered.
  if (role === "SUPER_ADMIN") {
    return (req.query.collegeId as string) || (req.body?.collegeId as string) || userCollegeId;
  }

  return userCollegeId;
};

// --- Courses ---

export const getCourses = async (req: Request, res: Response) => {
  try {
    const collegeId = (req as any).user?.collegeId;
    const query: any = {};
    if (collegeId) query.collegeId = collegeId;

    const courses = await Course.find(query)
      .populate("subjects")
      .populate("department", "name");
    res.status(200).json({ success: true, data: courses });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCourse = async (req: Request, res: Response) => {
  try {
    let collegeId = (req as any).user?.collegeId;
    
    // Fallback: inherit collegeId from the department if user is Super Admin
    if (!collegeId && req.body.department) {
      const dept = await Department.findById(req.body.department);
      if (dept) collegeId = dept.collegeId;
    }

    if (!collegeId) throw new Error("Missing institutional context (collegeId)");

    const duration = Number(req.body.duration);
    const totalSeatsInput = Number(req.body.totalSeats);
    const totalSeats = Number.isFinite(totalSeatsInput) && totalSeatsInput > 0 ? totalSeatsInput : 60;

    let departmentId = req.body.department;
    if (departmentId) {
      const departmentValue = String(departmentId).trim();
      if (!mongoose.Types.ObjectId.isValid(departmentValue)) {
        const departmentRegex = new RegExp(`^${departmentValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
        let departmentDoc = await Department.findOne({ collegeId, name: departmentRegex });

        if (!departmentDoc && departmentValue) {
          departmentDoc = await Department.create({
            collegeId,
            name: departmentValue,
            courses: []
          });
        }

        departmentId = departmentDoc?._id;
      }
    }

    if (!departmentId) {
      let generalDepartment = await Department.findOne({ collegeId, name: /^General$/i });
      if (!generalDepartment) {
        generalDepartment = await Department.create({ collegeId, name: "General", courses: [] });
      }
      departmentId = generalDepartment._id;
    }

    const courseData = {
      ...req.body,
      collegeId,
      duration: Number.isFinite(duration) && duration > 0 ? duration : 1,
      totalSeats,
      department: departmentId
    };
    
    const course = new Course(courseData);
    await course.save();
    res.status(201).json({ success: true, data: course });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateCourse = async (req: Request, res: Response) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: course });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// --- Subjects ---

export const getSubjects = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.query;
    const collegeId = (req as any).user?.collegeId;
    let query: any = {};
    
    if (collegeId) query.collegeId = collegeId;
    if (courseId) query.courseId = courseId;

    const subjects = await Subject.find(query).populate("courseId");
    res.status(200).json({ success: true, data: subjects });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createSubject = async (req: Request, res: Response) => {
  try {
    let collegeId = (req as any).user?.collegeId;
    
    // Fallback: inherit collegeId from the course if user is Super Admin
    if (!collegeId && req.body.courseId) {
      const course = await Course.findById(req.body.courseId);
      if (course) collegeId = course.collegeId;
    }

    if (!collegeId) throw new Error("Missing institutional context (collegeId)");

    const subjectData = { ...req.body, collegeId };

    const subject = new Subject(subjectData);
    await subject.save();
    
    // Add subject to Course's subject list
    await Course.findByIdAndUpdate(req.body.courseId, { $push: { subjects: subject._id } });
    
    res.status(201).json({ success: true, data: subject });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// --- Batches ---

export const getBatches = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.query;
    const collegeId = resolveCollegeScope(req);
    let query: any = {};

    if (collegeId) query.collegeId = collegeId;
    if (courseId) query.courseId = courseId;

    const batches = await Batch.find(query).populate("courseId").populate("students");
    res.status(200).json({ success: true, data: batches });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createBatch = async (req: Request, res: Response) => {
  try {
    let collegeId = (req as any).user?.collegeId;
    
    // Fallback: inherit collegeId from the course if user is Super Admin
    if (!collegeId && req.body.courseId) {
      const course = await Course.findById(req.body.courseId);
      if (course) collegeId = course.collegeId;
    }

    if (!collegeId) throw new Error("Missing institutional context (collegeId)");

    console.log("[DEBUG] createBatch: Resolved collegeId =", collegeId);
    console.log("[DEBUG] createBatch: Body =", req.body);
    const batchData = { ...req.body, collegeId };

    const batch = new Batch(batchData);
    await batch.save();
    res.status(201).json({ success: true, data: batch });
  } catch (error: any) {
    console.error("[DEBUG] createBatch: Validation Error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateBatch = async (req: Request, res: Response) => {
  try {
    const collegeId = resolveCollegeScope(req);
    const batch = await Batch.findById(req.params.id);

    if (!batch) return res.status(404).json({ success: false, message: "Batch not found" });
    if (!verifyCollegeOwnership(batch, collegeId)) {
      return res.status(403).json({ success: false, message: "Forbidden: Batch does not belong to your college" });
    }

    const updated = await Batch.findByIdAndUpdate(req.params.id, { ...req.body, collegeId: batch.collegeId }, { new: true });
    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const addBatchSection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { section } = req.body;
    const collegeId = resolveCollegeScope(req);
    if (!section) return res.status(400).json({ success: false, message: 'Section name is required' });

    const batch = await Batch.findById(id);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    if (!verifyCollegeOwnership(batch, collegeId)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Batch does not belong to your college' });
    }
    if (batch.sections.includes(section)) {
      return res.status(400).json({ success: false, message: 'Section already exists in this batch' });
    }

    batch.sections.push(section);
    await batch.save();
    res.status(200).json({ success: true, data: batch });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const removeBatchSection = async (req: Request, res: Response) => {
  try {
    const { id, section } = req.params;
    const collegeId = resolveCollegeScope(req);
    const batch = await Batch.findById(id);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    if (!verifyCollegeOwnership(batch, collegeId)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Batch does not belong to your college' });
    }

    batch.sections = batch.sections.filter((s: string) => s !== section);
    await batch.save();
    res.status(200).json({ success: true, data: batch });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBatchStudents = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const collegeId = resolveCollegeScope(req);
    const batch = await Batch.findById(id).populate({
      path: 'students',
      populate: { path: 'userId', select: 'name email' }
    });
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    if (!verifyCollegeOwnership(batch, collegeId)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Batch does not belong to your college' });
    }
    res.status(200).json({ success: true, data: batch.students });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const removeStudentFromBatch = async (req: Request, res: Response) => {
  try {
    const { id, studentId } = req.params;
    const collegeId = resolveCollegeScope(req);
    const batch = await Batch.findById(id);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    if (!verifyCollegeOwnership(batch, collegeId)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Batch does not belong to your college' });
    }

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (!verifyCollegeOwnership(student, collegeId)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Student does not belong to your college' });
    }

    batch.students = batch.students.filter((s: any) => s.toString() !== studentId) as any;
    await batch.save();

    await Student.findOneAndUpdate({ _id: studentId, collegeId: batch.collegeId }, { $unset: { batchId: 1 } });
    res.status(200).json({ success: true, message: 'Student removed from batch' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const assignStudentsToSection = async (req: Request, res: Response) => {
  try {
    const { id, section } = req.params;
    const { studentIds } = req.body;
    const collegeId = resolveCollegeScope(req);

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No students provided for assignment' });
    }

    const batch = await Batch.findById(id);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    if (!verifyCollegeOwnership(batch, collegeId)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Batch does not belong to your college' });
    }
    
    if (!batch.sections.includes(section as string)) {
      return res.status(400).json({ success: false, message: 'Section does not exist in this batch' });
    }

    // Explicit check requested by user: fail if any student is already in THAT section
    const alreadyInSection = await Student.find({
      _id: { $in: studentIds },
      collegeId: batch.collegeId,
      "academicInfo.section": section,
    });
    if (alreadyInSection.length > 0) {
      return res.status(400).json({ success: false, message: 'One or more selected students are already assigned to this section.' });
    }

    const students = await Student.find({ _id: { $in: studentIds }, collegeId: batch.collegeId }).select('_id academicInfo.rollNumber');
    if (students.length !== studentIds.length) {
      return res.status(403).json({ success: false, message: 'One or more students do not belong to your college' });
    }

    const existingSectionRolls = await Student.find({
      collegeId: batch.collegeId,
      batchId: batch._id,
      "academicInfo.section": section,
      "academicInfo.rollNumber": { $exists: true, $ne: "" },
    }).select("academicInfo.rollNumber");

    const usedRollNumbers = new Set(
      existingSectionRolls
        .map((item: any) => String(item?.academicInfo?.rollNumber || "").trim())
        .filter(Boolean)
    );

    const nextRollNumber = () => {
      let serial = usedRollNumbers.size + 1;
      while (true) {
        const candidate = `${String(section).toUpperCase()}${String(serial).padStart(3, '0')}`;
        if (!usedRollNumbers.has(candidate)) {
          usedRollNumbers.add(candidate);
          return candidate;
        }
        serial += 1;
      }
    };

    const bulkOps = students.map((student: any) => {
      const existingRoll = String(student?.academicInfo?.rollNumber || "").trim();
      const rollToPersist = existingRoll || nextRollNumber();

      return {
        updateOne: {
          filter: { _id: student._id, collegeId: batch.collegeId },
          update: {
            $set: {
              "academicInfo.section": section,
              "academicInfo.batch": batch.name,
              "academicInfo.rollNumber": rollToPersist,
              "batchId": batch._id,
              "collegeId": batch.collegeId,
            },
          },
        },
      };
    });

    if (bulkOps.length > 0) {
      await Student.bulkWrite(bulkOps);
    }

    res.status(200).json({ success: true, message: `Successfully assigned ${studentIds.length} students to Section ${section}` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const assignTeacherToSection = async (req: Request, res: Response) => {
  try {
    const { id, section } = req.params;
    const { teacherId, subjectId } = req.body;
    const collegeId = resolveCollegeScope(req);

    const batch = await Batch.findById(id);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    if (!verifyCollegeOwnership(batch, collegeId)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Batch does not belong to your college' });
    }

    if (!batch.sections.includes(section as string)) {
      return res.status(400).json({ success: false, message: 'Section does not exist in this batch' });
    }

    // Allow unassign by sending empty teacherId.
    if (!teacherId) {
      batch.sectionTeachers = (batch.sectionTeachers || []).filter((entry: any) => entry.section !== section) as any;
      await batch.save();
      return res.status(200).json({ success: true, message: `Teacher unassigned from Section ${section}`, data: batch });
    }

    const teacherUser = await User.findById(teacherId);
    if (!teacherUser || String(teacherUser.role || '').toUpperCase() !== 'TEACHER') {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    if (String(teacherUser.collegeId || '') !== String(batch.collegeId || '')) {
      return res.status(403).json({ success: false, message: 'Forbidden: Teacher does not belong to this college' });
    }

    // Validate subject if provided
    let validSubjectId: any = subjectId || null;
    if (subjectId) {
      const subject = await Subject.findById(subjectId);
      if (!subject) {
        return res.status(404).json({ success: false, message: 'Subject not found' });
      }
      if (String(subject.collegeId || '') !== String(batch.collegeId || '')) {
        return res.status(403).json({ success: false, message: 'Subject does not belong to this college' });
      }
      validSubjectId = subject._id;
    }

    const idx = (batch.sectionTeachers || []).findIndex((entry: any) => entry.section === section);
    if (idx >= 0) {
      (batch.sectionTeachers as any)[idx].teacherId = teacherUser._id;
      (batch.sectionTeachers as any)[idx].subjectId = validSubjectId;
    } else {
      (batch.sectionTeachers as any).push({ section, teacherId: teacherUser._id, subjectId: validSubjectId });
    }

    await batch.save();
    const updated = await Batch.findById(id)
      .populate('sectionTeachers.teacherId', 'name email')
      .populate('sectionTeachers.subjectId', 'name code');
    res.status(200).json({ success: true, message: `Teacher assigned to Section ${section}`, data: updated || batch });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
