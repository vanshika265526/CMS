// FILE: backend/src/models/Student.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IStudent extends Document {
  uniqueStudentId: string;
  enrollmentId?: string;
  userId: mongoose.Types.ObjectId;
  collegeId?: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;  // Top-level for efficient querying
  category?: "GEN" | "SC" | "ST" | "OBC";
  scholarshipId?: mongoose.Types.ObjectId;
  studentId?: string; // Compatibility alias
  personalInfo: {
    firstName: string;
    lastName: string;
    name?: string; // Compatibility alias
    dob: Date;
    gender: "male" | "female" | "other";
    phone: string;
    email: string;
    address: string;
    photo?: string;
  };
  academicInfo: {
    course: string;
    batch: string;
    department: mongoose.Types.ObjectId;
    status: "active" | "graduated" | "dropped";
    semester: number;
    rollNumber?: string;
    enrollmentDate?: Date;
    section?: string;
  };
  parentInfo: {
    name: string;
    phone: string;
    email: string;
    relation: string;
  };
  documents: {
    name: string;
    cloudinaryUrl: string;
    uploadedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema: Schema = new Schema(
  {
    uniqueStudentId: { type: String, required: true, unique: true },
    enrollmentId: { type: String, unique: true, sparse: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    collegeId: { type: Schema.Types.ObjectId, ref: "College", index: true },
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", index: true },
    category: { type: String, enum: ["GEN", "SC", "ST", "OBC"], default: "GEN" },
    scholarshipId: { type: Schema.Types.ObjectId, ref: "Scholarship", index: true },
    studentId: { type: String }, // Virtual alias possible but field is safer for population
    personalInfo: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      name: { type: String }, 
      dob: { type: Date, required: true },
      gender: { type: String, enum: ["male", "female", "other"], required: true },
      phone: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      address: { type: String, required: true },
      photo: { type: String },
    },
    academicInfo: {
      course: { type: String, required: true },
      batch: { type: String, required: true },
      department: { type: Schema.Types.ObjectId, ref: "Department", required: true },
      status: { type: String, enum: ["active", "graduated", "dropped"], default: "active" },
      semester: { type: Number, default: 1 },
      rollNumber: { type: String },
      enrollmentDate: { type: Date, default: Date.now },
      section: { type: String },
    },
    parentInfo: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, required: true },
      relation: { type: String, required: true },
    },
    documents: [
      {
        name: { type: String, required: true },
        cloudinaryUrl: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Pre-save hook to sync compatibility fields
StudentSchema.pre('save', function(next) {
  const student = this as any;
  if (student.personalInfo.firstName && student.personalInfo.lastName) {
    student.personalInfo.name = `${student.personalInfo.firstName} ${student.personalInfo.lastName}`;
  }
  if (student.uniqueStudentId) {
    student.studentId = student.uniqueStudentId;
  }
  if (student.enrollmentId) {
    student.studentId = student.enrollmentId;
  }
  next();
});

// Soft-delete: auto-exclude isDeleted records from find and countDocuments
StudentSchema.pre(/^find/, function (this: any) {
  const filter = this.getFilter();
  if (filter.isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
});
StudentSchema.pre('countDocuments', function (this: any) {
  const filter = this.getFilter();
  if (filter.isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
});

export default mongoose.model<IStudent>("Student", StudentSchema);
