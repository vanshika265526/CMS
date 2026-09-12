import mongoose, { Schema, Document } from "mongoose";

export interface IHostelAllocation extends Document {
  studentId: mongoose.Types.ObjectId;
  hostelId: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  collegeId?: mongoose.Types.ObjectId;
  bedNumber: number;
  allocatedAt: Date;
  vacatedAt?: Date;
  status: "ACTIVE" | "VACATED";
  allocatedBy: mongoose.Types.ObjectId;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HostelAllocationSchema: Schema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    hostelId: { type: Schema.Types.ObjectId, ref: "Hostel", required: true, index: true },
    roomId: { type: Schema.Types.ObjectId, ref: "HostelRoom", required: true, index: true },
    collegeId: { type: Schema.Types.ObjectId, ref: "College", index: true },
    bedNumber: { type: Number, required: true, min: 1 },
    allocatedAt: { type: Date, default: Date.now },
    vacatedAt: { type: Date },
    status: { type: String, enum: ["ACTIVE", "VACATED"], default: "ACTIVE", index: true },
    allocatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    remarks: { type: String },
  },
  { timestamps: true }
);

// A bed can hold only one active occupant, and a student can hold only one active bed.
// Partial indexes let vacated history rows accumulate without tripping uniqueness.
HostelAllocationSchema.index(
  { roomId: 1, bedNumber: 1 },
  { unique: true, partialFilterExpression: { status: "ACTIVE" } }
);
HostelAllocationSchema.index(
  { studentId: 1 },
  { unique: true, partialFilterExpression: { status: "ACTIVE" } }
);

export default mongoose.model<IHostelAllocation>("HostelAllocation", HostelAllocationSchema);
