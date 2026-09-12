import mongoose, { Schema, Document } from 'mongoose';

export interface IAssignment extends Document {
  title: string;
  description: string;
  subjectId: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  sectionId?: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  collegeId: mongoose.Types.ObjectId;
  dueDate: Date;
  maxMarks: number;
  attachments: {
    name: string;
    fileUrl: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema: Schema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
  sectionId: { type: Schema.Types.ObjectId, ref: 'Section' },
  teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true },
  dueDate: { type: Date, required: true },
  maxMarks: { type: Number, required: true, default: 100 },
  attachments: [{
    name: { type: String, required: true },
    fileUrl: { type: String, required: true }
  }]
}, { timestamps: true });

// Optimize for common queries
AssignmentSchema.index({ batchId: 1, subjectId: 1 });
AssignmentSchema.index({ batchId: 1, sectionId: 1, subjectId: 1 });
AssignmentSchema.index({ teacherId: 1 });
AssignmentSchema.index({ collegeId: 1 });

export default mongoose.model<IAssignment>('Assignment', AssignmentSchema);
