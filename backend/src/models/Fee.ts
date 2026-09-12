import mongoose, { Schema, Document } from 'mongoose';

export interface IFee extends Document {
  studentId: mongoose.Types.ObjectId;
  collegeId: mongoose.Types.ObjectId;
  amount: number;
  dueDate: Date;
  status: 'paid' | 'pending' | 'overdue';
  paymentDate?: Date;
  receiptNumber?: string;
  type: string; // e.g., Tuition, Hostel, Exam
}

const FeeSchema: Schema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true },
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['paid', 'pending', 'overdue'], default: 'pending' },
  paymentDate: { type: Date },
  receiptNumber: { type: String },
  type: { type: String, required: true },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

// Soft-delete: auto-exclude isDeleted records from find and countDocuments
FeeSchema.pre(/^find/, function (this: any) {
  const filter = this.getFilter();
  if (filter.isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
});
FeeSchema.pre('countDocuments', function (this: any) {
  const filter = this.getFilter();
  if (filter.isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
});

export default mongoose.model<IFee>('Fee', FeeSchema);
