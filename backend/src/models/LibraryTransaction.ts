import mongoose, { Schema, Document } from 'mongoose';

export interface ILibraryTransaction extends Document {
  bookId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  issuedBy?: mongoose.Types.ObjectId;
  reservedBy?: mongoose.Types.ObjectId;
  issueDate?: Date;
  dueDate?: Date;
  returnDate?: Date;
  status: 'issued' | 'returned' | 'overdue' | 'reserved';
  fine: number;
  collegeId: mongoose.Types.ObjectId;
}

const LibraryTransactionSchema: Schema = new Schema(
  {
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reservedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    issueDate: { type: Date },
    dueDate: { type: Date },
    returnDate: { type: Date },
    status: {
      type: String,
      enum: ['issued', 'returned', 'overdue', 'reserved'],
      default: 'issued',
    },
    fine: { type: Number, default: 0 }, // ₹5 per overdue day
    collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true },
  },
  { timestamps: true }
);

// Index for fast queries
LibraryTransactionSchema.index({ collegeId: 1, status: 1 });
LibraryTransactionSchema.index({ studentId: 1, status: 1 });
LibraryTransactionSchema.index({ bookId: 1 });

export default mongoose.model<ILibraryTransaction>(
  'LibraryTransaction',
  LibraryTransactionSchema
);
