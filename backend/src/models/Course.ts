import mongoose, { Schema, Document } from 'mongoose';

export interface ICourse extends Document {
  name: string;
  code: string;
  duration: number; // years
  department: mongoose.Types.ObjectId;
  collegeId: mongoose.Types.ObjectId;
  totalSeats: number;
  description?: string;
  subjects: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    duration: { type: Number, required: true },
    department: { type: Schema.Types.ObjectId, ref: "Department", required: true },
    collegeId: { type: Schema.Types.ObjectId, ref: "College", required: true },
    totalSeats: { type: Number, required: true },
    description: { type: String },
    subjects: [{ type: Schema.Types.ObjectId, ref: "Subject" }],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Soft-delete: auto-exclude isDeleted records from find and countDocuments
CourseSchema.pre(/^find/, function (this: any) {
  const filter = this.getFilter();
  if (filter.isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
});
CourseSchema.pre('countDocuments', function (this: any) {
  const filter = this.getFilter();
  if (filter.isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
});

export default mongoose.model<ICourse>("Course", CourseSchema);
