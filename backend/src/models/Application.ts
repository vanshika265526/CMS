// FILE: backend/src/models/Application.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IApplication extends Document {
  enquiryRef: mongoose.Types.ObjectId;
  studentDetails: {
    firstName: string;
    lastName: string;
    dob: Date;
    gender: "male" | "female" | "other";
    phone: string;
    email: string;
    address: string;
    parentName: string;
    parentPhone: string;
  };
  assignedCourse: string;
  assignedBatch: string;
  documents: {
    name: string;
    cloudinaryUrl: string;
    uploadedAt: Date;
  }[];
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema: Schema = new Schema(
  {
    enquiryRef: { type: Schema.Types.ObjectId, ref: "Enquiry", required: true },
    studentDetails: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      dob: { type: Date, required: true },
      gender: { type: String, enum: ["male", "female", "other"], required: true },
      phone: { type: String, required: true },
      email: { type: String, required: true },
      address: { type: String, required: true },
      parentName: { type: String, required: true },
      parentPhone: { type: String, required: true },
    },
    assignedCourse: { type: String, required: true },
    assignedBatch: { type: String, required: true },
    documents: [
      {
        name: { type: String, required: true },
        cloudinaryUrl: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model<IApplication>("Application", ApplicationSchema);
