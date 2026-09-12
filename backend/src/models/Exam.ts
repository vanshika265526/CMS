import mongoose, { Schema, Document } from 'mongoose';

export interface IGradingScheme {
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F';
  minMarks: number;
  maxMarks: number;
  gradePoint: number;
}

export interface IExam extends Document {
  collegeId: mongoose.Types.ObjectId;
  code: string;
  name: string;
  examType: 'INTERNAL' | 'EXTERNAL' | 'PRACTICAL';
  scheduleDate: Date;
  duration: number; // in minutes
  courses: mongoose.Types.ObjectId[];
  subjects: mongoose.Types.ObjectId[];
  totalMarks: number;
  passingMarks: number;
  gradingScheme: IGradingScheme[];
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
  venue?: string;
  publishedDate?: Date;
  publishedBy?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExamSchema: Schema = new Schema({
  collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true },
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  examType: { type: String, enum: ['INTERNAL', 'EXTERNAL', 'PRACTICAL'], required: true },
  scheduleDate: { type: Date, required: true },
  duration: { type: Number, required: true },
  courses: [{ type: Schema.Types.ObjectId, ref: 'Course', required: true }],
  subjects: [{ type: Schema.Types.ObjectId, ref: 'Subject', required: true }],
  totalMarks: { type: Number, required: true },
  passingMarks: { type: Number, required: true },
  gradingScheme: [{
    grade: { type: String, enum: ['A+', 'A', 'B+', 'B', 'C', 'D', 'F'], required: true },
    minMarks: { type: Number, required: true },
    maxMarks: { type: Number, required: true },
    gradePoint: { type: Number, required: true }
  }],
  status: { type: String, enum: ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'], default: 'DRAFT' },
  venue: { type: String, default: "Examination Wing" },
  publishedDate: { type: Date },
  publishedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

// Optimize for common queries
ExamSchema.index({ collegeId: 1, status: 1 });
ExamSchema.index({ scheduleDate: 1 });
ExamSchema.index({ code: 1, collegeId: 1 }, { unique: true });

// Soft-delete: auto-exclude isDeleted records from find and countDocuments
ExamSchema.pre(/^find/, function (this: any) {
  const filter = this.getFilter();
  if (filter.isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
});
ExamSchema.pre('countDocuments', function (this: any) {
  const filter = this.getFilter();
  if (filter.isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
});

export default mongoose.model<IExam>('Exam', ExamSchema);
