import mongoose, { Schema, Document } from "mongoose";

export interface IGatePass extends Document {
  studentId: mongoose.Types.ObjectId;
  hostelId: mongoose.Types.ObjectId;
  collegeId?: mongoose.Types.ObjectId;
  passType: "DAY_OUT" | "OVERNIGHT" | "HOME_VISIT" | "EMERGENCY";
  reason: string;
  destination: string;
  departureAt: Date;
  expectedReturnAt: Date;
  actualReturnAt?: Date;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CHECKED_OUT" | "RETURNED" | "OVERDUE";
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  parentNotifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GatePassSchema: Schema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    hostelId: { type: Schema.Types.ObjectId, ref: "Hostel", required: true, index: true },
    collegeId: { type: Schema.Types.ObjectId, ref: "College", index: true },
    passType: {
      type: String,
      enum: ["DAY_OUT", "OVERNIGHT", "HOME_VISIT", "EMERGENCY"],
      default: "DAY_OUT",
    },
    reason: { type: String, required: true },
    destination: { type: String, required: true },
    departureAt: { type: Date, required: true },
    expectedReturnAt: { type: Date, required: true },
    actualReturnAt: { type: Date },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "CHECKED_OUT", "RETURNED", "OVERDUE"],
      default: "PENDING",
      index: true,
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
    parentNotifiedAt: { type: Date },
  },
  { timestamps: true }
);

GatePassSchema.index({ hostelId: 1, status: 1, departureAt: -1 });

export default mongoose.model<IGatePass>("GatePass", GatePassSchema);
