// FILE: backend/src/models/LeaveRequest.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ILeaveRequest extends Document {
  studentId: mongoose.Types.ObjectId;
  fromDate: Date;
  toDate: Date;
  reason: string;
  supportingDoc?: string; // Cloudinary URL
  status: "pending" | "approved" | "rejected";
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  remarks?: string;
}

const LeaveRequestSchema: Schema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    reason: { type: String, required: true },
    supportingDoc: { type: String },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    remarks: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<ILeaveRequest>("LeaveRequest", LeaveRequestSchema);
