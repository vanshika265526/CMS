import mongoose, { Schema, Document } from 'mongoose';

export interface ILibrarian extends Document {
  userId: mongoose.Types.ObjectId;
  employeeId?: string;
  collegeId: mongoose.Types.ObjectId;
  department?: string;
  isActive: boolean;
}

const LibrarianSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    employeeId: { type: String, sparse: true },
    collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true },
    department: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

LibrarianSchema.index({ collegeId: 1 });

export default mongoose.model<ILibrarian>('Librarian', LibrarianSchema);
