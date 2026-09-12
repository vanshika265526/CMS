import mongoose, { Schema, Document } from "mongoose";

export interface IFeeStructure extends Document {
  courseId: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;
  semester: number;
  tuitionFee?: number;
  hostelFee?: number;
  examFee?: number;
  otherCharges?: number;
  academicYear?: string;
  lateFeeAmount?: number;
  installmentPlan?: "full" | "semester" | "quarterly";
  components: {
    name: string; // tuition, exam, lab, misc
    amount: number;
  }[];
  dueDate: Date;
  finePerDay: number;
  createdAt: Date;
  updatedAt: Date;
}

const FeeStructureSchema: Schema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", index: true },
    semester: { type: Number, required: true },
    tuitionFee: { type: Number, default: 0 },
    hostelFee: { type: Number, default: 0 },
    examFee: { type: Number, default: 0 },
    otherCharges: { type: Number, default: 0 },
    academicYear: { type: String },
    lateFeeAmount: { type: Number, default: 0 },
    installmentPlan: { type: String, enum: ["full", "semester", "quarterly"], default: "full" },
    components: [
      {
        name: { type: String, required: true },
        amount: { type: Number, required: true },
      },
    ],
    dueDate: { type: Date, required: true },
    finePerDay: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IFeeStructure>("FeeStructure", FeeStructureSchema);
