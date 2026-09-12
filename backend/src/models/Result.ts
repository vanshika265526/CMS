import mongoose, { Schema, Document } from 'mongoose';

export interface ISubjectResult {
  subjectId: mongoose.Types.ObjectId;
  subjectName: string;
  marks: number;
  maxMarks: number;
  grade: string;
  gradePoint: number;
  status: 'PASS' | 'FAIL' | 'ABSENT';
}

export interface IResult extends Document {
  type: 'EXAM' | 'ASSIGNMENT';
  examId?: mongoose.Types.ObjectId;
  assignmentId?: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  subjects: ISubjectResult[];
  totalMarksObtained: number;
  totalMaxMarks: number;
  percentage: number;
  cgpa: number;
  status: 'PASS' | 'FAIL' | 'INCOMPLETE';
  reAppearSubjects: mongoose.Types.ObjectId[];
  publishedDate: Date;
  publishedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ResultSchema: Schema = new Schema({
  type: { type: String, enum: ['EXAM', 'ASSIGNMENT'], default: 'EXAM' },
  examId: { type: Schema.Types.ObjectId, ref: 'Exam' }, // Optional for assignments
  assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment' }, // NEW
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
  subjects: [{
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    subjectName: { type: String, required: true },
    marks: { type: Number, required: true },
    maxMarks: { type: Number, required: true },
    grade: { type: String, required: true },
    gradePoint: { type: Number, required: true },
    status: { type: String, enum: ['PASS', 'FAIL', 'ABSENT'], required: true }
  }],
  totalMarksObtained: { type: Number, required: true },
  totalMaxMarks: { type: Number, required: true },
  percentage: { type: Number, required: true },
  cgpa: { type: Number, required: true },
  status: { type: String, enum: ['PASS', 'FAIL', 'INCOMPLETE'], required: true },
  reAppearSubjects: [{ type: Schema.Types.ObjectId, ref: 'Subject' }],
  publishedDate: { type: Date, required: true },
  publishedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Optimize for common queries
ResultSchema.index({ type: 1, examId: 1, studentId: 1 }, { unique: true, partialFilterExpression: { type: 'EXAM' } });
ResultSchema.index({ type: 1, assignmentId: 1, studentId: 1 }, { unique: true, partialFilterExpression: { type: 'ASSIGNMENT' } });
ResultSchema.index({ studentId: 1 });
ResultSchema.index({ status: 1 });
ResultSchema.index({ type: 1 });

export default mongoose.model<IResult>('Result', ResultSchema);
