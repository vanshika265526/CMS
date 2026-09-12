import mongoose, { Schema, Document } from 'mongoose';

export interface IEnrollmentCounter extends Document {
  collegeId: mongoose.Types.ObjectId;
  year: number;
  sequence: number;
  createdAt: Date;
  updatedAt: Date;
}

const EnrollmentCounterSchema: Schema = new Schema(
  {
    collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true, index: true },
    year: { type: Number, required: true, index: true },
    sequence: { type: Number, default: 0 },
  },
  { timestamps: true }
);

EnrollmentCounterSchema.index({ collegeId: 1, year: 1 }, { unique: true });

export default mongoose.model<IEnrollmentCounter>('EnrollmentCounter', EnrollmentCounterSchema);
