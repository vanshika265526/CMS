import mongoose, { Schema, Document } from 'mongoose';

export interface ISubject extends Document {
  name: string;
  code: string;
  creditHours: number;
  courseId: mongoose.Types.ObjectId;
  collegeId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    creditHours: { type: Number, required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    collegeId: { type: Schema.Types.ObjectId, ref: "College", required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Soft-delete: auto-exclude isDeleted records from find and countDocuments
SubjectSchema.pre(/^find/, function (this: any) {
  const filter = this.getFilter();
  if (filter.isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
});
SubjectSchema.pre('countDocuments', function (this: any) {
  const filter = this.getFilter();
  if (filter.isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
});

export default mongoose.model<ISubject>("Subject", SubjectSchema);
