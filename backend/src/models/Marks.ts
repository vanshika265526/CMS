import mongoose, { Schema, Document } from 'mongoose';

export interface IMarkComponent {
  name: string;
  maxMarks: number;
  obtainedMarks: number;
  weight?: number;
}

export interface IMarks extends Document {
  collegeId: mongoose.Types.ObjectId;
  examId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  marksObtained: number;
  maxMarks: number;
  grade: string;
  isPublished: boolean;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MarksSchema: Schema = new Schema({
  collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true },
  examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  marksObtained: { type: Number, required: true },
  maxMarks: { type: Number, required: true },
  grade: { type: String }, // Calculated automatically
  isPublished: { type: Boolean, default: false },
  remarks: { type: String },
}, { timestamps: true });

// Auto-grade logic
MarksSchema.pre('save', function(next) {
  const marks = this as any;
  const percentage = (marks.marksObtained / marks.maxMarks) * 100;
  
  if (percentage >= 90) marks.grade = 'A+';
  else if (percentage >= 80) marks.grade = 'A';
  else if (percentage >= 70) marks.grade = 'B';
  else if (percentage >= 60) marks.grade = 'C';
  else if (percentage >= 50) marks.grade = 'D';
  else marks.grade = 'F';
  
  next();
});

// Optimize for common queries
MarksSchema.index({ collegeId: 1, examId: 1, studentId: 1 }, { unique: true });
MarksSchema.index({ studentId: 1 });
MarksSchema.index({ examId: 1 });

export default mongoose.model<IMarks>('Marks', MarksSchema);
