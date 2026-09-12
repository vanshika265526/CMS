import mongoose, { Schema, Document } from "mongoose";

export interface IFeeAdjustment extends Document {
  studentId: mongoose.Types.ObjectId;
  collegeId: mongoose.Types.ObjectId;
  type: "waiver" | "extra_charge" | "late_fee";
  amount: number;
  reason: string;
  createdByAdminId: mongoose.Types.ObjectId;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FeeAdjustmentSchema: Schema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    collegeId: { type: Schema.Types.ObjectId, ref: "College", required: true, index: true },
    type: { type: String, enum: ["waiver", "extra_charge", "late_fee"], required: true },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, trim: true },
    createdByAdminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IFeeAdjustment>("FeeAdjustment", FeeAdjustmentSchema);
