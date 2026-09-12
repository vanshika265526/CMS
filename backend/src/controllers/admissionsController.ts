// FILE: backend/src/controllers/admissionsController.ts
import { Request, Response } from "express";
import Enquiry from "../models/Enquiry.js";
import Application from "../models/Application.js";
import Seat from "../models/Seat.js";
import Department from "../models/Department.js";
import Student from "../models/Student.js";
import Batch from "../models/Batch.js";
import User from "../models/User.js";
import { generateEnrollmentId } from "../utils/enrollmentId.js";

const DEFAULT_STUDENT_PASSWORD = "Student@123";

const normalizeKey = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/[\s_-]+/g, "")
    .toLowerCase();

const normalizeEnquiryStatus = (status: unknown) => {
  const key = normalizeKey(status || "New");
  const statusMap: Record<string, "New" | "Contacted" | "Interested" | "NotInterested" | "applied" | "admitted"> = {
    new: "New",
    pending: "New",
    enquiry: "New",
    lead: "New",
    contacted: "Contacted",
    followup: "Contacted",
    interested: "Interested",
    applied: "applied",
    application: "applied",
    admitted: "admitted",
    enrolled: "admitted",
    notinterested: "NotInterested",
    uninterested: "NotInterested",
    rejected: "NotInterested",
  };

  return statusMap[key] || "New";
};

const normalizeApplicationStatus = (status: unknown) => {
  const key = normalizeKey(status || "pending");
  if (key === "approved") return "approved";
  if (key === "rejected") return "rejected";
  return "pending";
};

const toPlainObject = (doc: any) => (typeof doc?.toObject === "function" ? doc.toObject() : doc);

const ensureStudentUser = async (params: {
  email: string;
  fullName: string;
  collegeId?: any;
}) => {
  const email = String(params.email || "").trim().toLowerCase();
  if (!email) throw new Error("Student email is required");

  let user = await User.findOne({ email });
  if (!user) {
    user = new User({
      name: params.fullName,
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
  if (user.role !== "STUDENT") {
    user.role = "STUDENT";
    changed = true;
  }
  if (!user.isActive) {
    user.isActive = true;
    changed = true;
  }
  if (params.collegeId && !user.collegeId) {
    user.collegeId = params.collegeId;
    changed = true;
  }
  if (params.fullName && user.name !== params.fullName) {
    user.name = params.fullName;
    changed = true;
  }
  if (changed) await user.save();

  return user;
};

// --- Enquiry Controllers ---

export const createEnquiry = async (req: Request, res: Response) => {
  try {
    const { courseInterest, courseInterested, source, notes, ...rest } = req.body || {};
    const normalizedCourseInterest = courseInterest || courseInterested;

    if (!rest.name || !rest.phone || !rest.email || !normalizedCourseInterest) {
      return res.status(400).json({ success: false, message: "name, phone, email, and courseInterest are required" });
    }

    const normalizedSource = String(source || "online").replace("walk-in", "walkin");
    const safeSource = ["walkin", "online", "referral", "other"].includes(normalizedSource)
      ? normalizedSource
      : "online";

    const normalizedNotes = (() => {
      if (!notes) return [];
      if (Array.isArray(notes)) return notes;
      if (typeof notes === "string" && notes.trim()) {
        return [{ content: notes.trim(), createdAt: new Date() }];
      }
      return [];
    })();

    const enquiry = new Enquiry({
      ...rest,
      courseInterest: normalizedCourseInterest,
      source: safeSource,
      status: "New",
      notes: normalizedNotes,
    });
    await enquiry.save();
    res.status(201).json({ success: true, data: enquiry, message: "Enquiry created successfully" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getEnquiries = async (req: Request, res: Response) => {
  try {
    const { status, course, source, search } = req.query;
    const query: any = {};
    if (course) query.courseInterest = course;
    if (source && source !== "all") query.source = String(source).replace("walk-in", "walkin");
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const requestedStatus = status && status !== "all" ? normalizeEnquiryStatus(status) : null;
    const enquiries = await Enquiry.find(query).populate("courseInterest").sort({ createdAt: -1 });
    const normalizedEnquiries = enquiries
      .map((enquiry) => ({
      ...toPlainObject(enquiry),
      status: normalizeEnquiryStatus((enquiry as any).status),
    }))
      .filter((enquiry) => !requestedStatus || enquiry.status === requestedStatus);
    res.status(200).json({ success: true, data: normalizedEnquiries, message: "Enquiries fetched successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateEnquiryStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    const enquiry = await Enquiry.findById(id);
    if (!enquiry) return res.status(404).json({ success: false, message: "Enquiry not found" });

    if (status) {
      enquiry.status = normalizeEnquiryStatus(status);
    }
    if (note) {
      (enquiry.notes as any).push({ content: note, createdAt: new Date() });
    }
    await enquiry.save();
    res.status(200).json({ success: true, data: enquiry, message: "Enquiry status updated" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// --- Application Controllers ---

export const submitApplication = async (req: Request, res: Response) => {
  try {
    const { enquiryId, studentDetails, assignedCourse, assignedBatch } = req.body;
    
    // Check if enquiry exists
    const enquiry = await Enquiry.findById(enquiryId);
    if (!enquiry) return res.status(404).json({ success: false, message: "Enquiry not found" });

    const application = new Application({
      enquiryRef: enquiryId,
      studentDetails,
      assignedCourse,
      assignedBatch,
      status: "pending"
    });

    // Handle files if uploaded via multer/cloudinary
    if (req.files && Array.isArray(req.files)) {
      application.documents = (req.files as any[]).map(file => ({
        name: file.originalname,
        cloudinaryUrl: file.path,
        uploadedAt: new Date()
      }));
    }

    await application.save();
    
    // Update enquiry status
    enquiry.status = "applied";
    await enquiry.save();

    res.status(201).json({ success: true, data: application, message: "Application submitted successfully" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getApplications = async (req: Request, res: Response) => {
  try {
    const { status, course, batch } = req.query;
    const query: any = {};
    if (course) query.assignedCourse = course;
    if (batch) query.assignedBatch = batch;

    const applications = await Application.find(query).populate("enquiryRef").sort({ createdAt: -1 });
    const requestedStatus = status ? normalizeApplicationStatus(status) : null;
    const normalizedApplications = applications
      .map((application) => ({
      ...toPlainObject(application),
      status: normalizeApplicationStatus((application as any).status),
    }))
      .filter((application) => !requestedStatus || application.status === requestedStatus);
    res.status(200).json({ success: true, data: normalizedApplications, message: "Applications fetched successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateApplicationStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // approved / rejected / under-review
    const application = await Application.findById(id);
    if (!application) return res.status(404).json({ success: false, message: "Application not found" });

    const previousStatus = application.status;
    application.status = normalizeApplicationStatus(status);

    // --- Seat Allocation Logic ---
    if (status === "approved" && previousStatus !== "approved") {
      // Decrement seat
      const seat = await Seat.findOne({ course: application.assignedCourse, batch: application.assignedBatch });
      if (!seat) return res.status(400).json({ success: false, message: "Seat matrix not configured for this course/batch" });
      if (seat.filledSeats >= seat.totalSeats) return res.status(400).json({ success: false, message: "No seats available" });
      
      seat.filledSeats += 1;
      await seat.save();
      
      // Update enquiry to admitted
      await Enquiry.findByIdAndUpdate(application.enquiryRef, { status: "admitted" });
      
      // -> START STUDENT ID GENERATION <-
      let dept = await Department.findOne({ courses: application.assignedCourse });
      if (!dept) {
        dept = await Department.findOne();
        if (!dept) {
          dept = new Department({ name: "General Administration", courses: [application.assignedCourse] });
          await dept.save();
        }
      }

      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      const studentId = `NGCMS-${new Date().getFullYear()}-${randomDigits}`;
      const enrollmentId = await generateEnrollmentId(String((req as any).user?.collegeId), new Date());
      const studentEmail = String(application.studentDetails.email || "").trim().toLowerCase();
      const studentFirstName = String(application.studentDetails.firstName || "").trim();
      const studentLastName = String(application.studentDetails.lastName || "").trim();

      if (!studentEmail || !studentFirstName) {
        return res.status(400).json({ success: false, message: "Approved application is missing student email or first name" });
      }

      // Resolve actual batchId from string name
      const batchDoc = await Batch.findOne({ 
        name: application.assignedBatch,
        courseId: application.assignedCourse // Note: If assignedCourse is a string, this might need a course lookup too.
      });
      
      if (!batchDoc) {
        console.warn(`[ENROLLMENT] Could not find Batch document for name "${application.assignedBatch}". Student batchId will be null.`);
      }

      const loginUser = await ensureStudentUser({
        email: studentEmail,
        fullName: `${studentFirstName} ${studentLastName}`.trim(),
        collegeId: (req as any).user?.collegeId,
      });

      const newStudent = new Student({
        uniqueStudentId: studentId,
        enrollmentId,
        studentId: enrollmentId,
        userId: loginUser._id,
        batchId: batchDoc?._id, // LINK RESOLVED ID HERE

        personalInfo: {
          firstName: studentFirstName,
          lastName: studentLastName,
          dob: application.studentDetails.dob,
          gender: application.studentDetails.gender,
          phone: application.studentDetails.phone,
          email: studentEmail,
          address: application.studentDetails.address,
        },
        academicInfo: {
          course: application.assignedCourse,
          batch: application.assignedBatch,
          department: dept._id,
          semester: 1,
          enrollmentDate: new Date(),
          status: "active",
        },
        parentInfo: {
          name: application.studentDetails.parentName,
          phone: application.studentDetails.parentPhone,
          email: "parent@example.com", // Mock since Application currently lacks parent email
          relation: "Parent",
        },
        documents: application.documents,
      });

      await newStudent.save();
      
      // Trigger WhatsApp Alert (Mock)
      console.log(`WhatsApp Alert: Student ${application.studentDetails.firstName} Admitted to ${application.assignedCourse}. ID Generated: ${studentId}`);
    } else if (status === "rejected" && previousStatus === "approved") {
      // Revert seat if it was previously approved
      const seat = await Seat.findOne({ course: application.assignedCourse, batch: application.assignedBatch });
      if (seat && seat.filledSeats > 0) {
        seat.filledSeats -= 1;
        await seat.save();
      }
      // Update enquiry back to applied
      await Enquiry.findByIdAndUpdate(application.enquiryRef, { status: "applied" });
    }

    await application.save();
    res.status(200).json({ success: true, data: application, message: `Application ${status}` });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// --- Seat Controllers ---

export const getSeatMatrix = async (req: Request, res: Response) => {
  try {
    const seats = await Seat.find();
    res.status(200).json({ success: true, data: seats, message: "Seat matrix fetched successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const configureSeats = async (req: Request, res: Response) => {
  try {
    const { course, batch, totalSeats, reservedSeats } = req.body;
    const seat = await Seat.findOneAndUpdate(
      { course, batch },
      { totalSeats, reservedSeats },
      { upsert: true, new: true }
    );
    res.status(200).json({ success: true, data: seat, message: "Seats configured successfully" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAdmissionsReport = async (req: Request, res: Response) => {
  try {
    const [enquiries, applications, seats] = await Promise.all([
      Enquiry.find().select("status updatedAt"),
      Application.find().select("status updatedAt"),
      Seat.find().select("totalSeats filledSeats"),
    ]);

    const enquiryCounts = {
      New: 0,
      Contacted: 0,
      Interested: 0,
      applied: 0,
      admitted: 0,
      NotInterested: 0,
    };

    for (const enquiry of enquiries) {
      const normalizedStatus = normalizeEnquiryStatus((enquiry as any).status);
      enquiryCounts[normalizedStatus] += 1;
    }

    const pendingApps = applications.filter((application) => normalizeApplicationStatus((application as any).status) === "pending").length;
    const approvedApps = applications.filter((application) => normalizeApplicationStatus((application as any).status) === "approved").length;
    const rejectedApps = applications.filter((application) => normalizeApplicationStatus((application as any).status) === "rejected").length;

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const admittedThisMonth = enquiries.filter((enquiry) =>
      normalizeEnquiryStatus((enquiry as any).status) === "admitted" &&
      new Date((enquiry as any).updatedAt || 0) >= monthStart
    ).length;

    const totalEnquiries = enquiries.length;
    const totalCapacity = seats.reduce((acc, seat) => acc + Number((seat as any).totalSeats || 0), 0);
    const totalFilled = seats.reduce((acc, seat) => acc + Number((seat as any).filledSeats || 0), 0);
    const fillRate = totalCapacity > 0
      ? (totalFilled / totalCapacity) * 100
      : totalEnquiries > 0
        ? (enquiryCounts.admitted / totalEnquiries) * 100
        : 0;

    res.status(200).json({
      success: true,
      data: {
        totalEnquiries,
        pendingApps,
        approvedApps,
        rejectedApps,
        newEnquiries: enquiryCounts.New,
        contactedEnquiries: enquiryCounts.Contacted,
        interestedEnquiries: enquiryCounts.Interested,
        appliedEnquiries: enquiryCounts.applied,
        admittedEnquiries: enquiryCounts.admitted,
        admittedThisMonth,
        fillRate
      },
      message: "Admissions report generated"
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Enroll an approved applicant as a student
 */
export const enrollStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const application = await Application.findById(id);
    if (!application) return res.status(404).json({ success: false, message: "Application not found" });

    res.status(200).json({ success: true, message: "Student enrollment confirmed" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};


