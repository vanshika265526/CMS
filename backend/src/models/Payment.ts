import mongoose, { Schema, Document } from "mongoose";

export interface IPayment extends Document {
  studentId: mongoose.Types.ObjectId;
  feeStructureId?: mongoose.Types.ObjectId;
  amountPaid: number;
  amount?: number;
  fineApplied: number;
  paymentDate: Date;
  mode?: "cash" | "cheque" | "online" | "razorpay";
  paymentMethod?: string;
  receiptNumber?: string; // auto-generated
  status: "Paid" | "Partial" | "Pending" | "Failed" | "paid" | "pending" | "failed" | "COMPLETED";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  installmentNumber?: number;
  paidByRole?: "STUDENT" | "PARENT" | "COLLEGE_ADMIN" | "SUPER_ADMIN";
  paidByName?: string;
  paidByUserId?: mongoose.Types.ObjectId;
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema: Schema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    feeStructureId: { type: Schema.Types.ObjectId, ref: "FeeStructure" },
    amountPaid: { type: Number, required: true },
    amount: { type: Number },
    fineApplied: { type: Number, default: 0 },
    paymentDate: { type: Date, default: Date.now },
    mode: { type: String, enum: ["cash", "cheque", "online", "razorpay"] },
    paymentMethod: { type: String },
    receiptNumber: { type: String, unique: true, sparse: true },
    status: { type: String, enum: ["Paid", "Partial", "Pending", "Failed", "paid", "pending", "failed", "COMPLETED"], required: true },
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String, index: true },
    razorpaySignature: { type: String },
    installmentNumber: { type: Number },
    paidByRole: { type: String, enum: ["STUDENT", "PARENT", "COLLEGE_ADMIN", "SUPER_ADMIN"] },
    paidByName: { type: String },
    paidByUserId: { type: Schema.Types.ObjectId, ref: "User" },
    transactionId: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IPayment>("Payment", PaymentSchema);
