import mongoose, { Schema, Document } from 'mongoose';

export interface IBatch extends Document {
  name: string;
  courseId: mongoose.Types.ObjectId;
  collegeId: mongoose.Types.ObjectId;
  status?: string;
  autoCreated?: boolean;
  startYear: number;
  endYear: number;
  currentSemester: number;
  sections: string[];
  sectionTeachers: {
    section: string;
    teacherId: mongoose.Types.ObjectId;
    subjectId?: mongoose.Types.ObjectId;
  }[];
  students: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const BatchSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    collegeId: { type: Schema.Types.ObjectId, ref: "College", required: true },
    status: { type: String, default: "active" },
    autoCreated: { type: Boolean, default: false },
    startYear: { type: Number, required: true },
    endYear: { type: Number, required: true },
    currentSemester: { type: Number, default: 1 },
    sections: [{ type: String, default: ["A"] }],
    sectionTeachers: [
      {
        section: { type: String, required: true },
        teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: false },
      }
    ],
    students: [{ type: Schema.Types.ObjectId, ref: "Student" }],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Soft-delete: auto-exclude isDeleted records from find and countDocuments
BatchSchema.pre(/^find/, function (this: any) {
  const filter = this.getFilter();
  if (filter.isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
});
BatchSchema.pre('countDocuments', function (this: any) {
  const filter = this.getFilter();
  if (filter.isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
});

export default mongoose.model<IBatch>("Batch", BatchSchema);
