import mongoose, { Schema, Document } from 'mongoose';

export interface ISubmissionVersion {
  fileUrl: string;
  fileName: string;
  textSubmission?: string;
  submittedAt: Date;
}

export interface IAssignmentSubmission extends Document {
  assignmentId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  collegeId: mongoose.Types.ObjectId;
  versions: ISubmissionVersion[];
  currentVersionIndex: number;
  status: 'PENDING' | 'SUBMITTED' | 'LATE' | 'GRADED';
  marks?: number;
  feedback?: string;
  gradedBy?: mongoose.Types.ObjectId;
  gradedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionVersionSchema: Schema = new Schema({
  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  textSubmission: { type: String },
  submittedAt: { type: Date, default: Date.now }
});

const AssignmentSubmissionSchema: Schema = new Schema({
  assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true },
  versions: [SubmissionVersionSchema],
  currentVersionIndex: { type: Number, default: 0 },
  status: { type: String, enum: ['PENDING', 'SUBMITTED', 'LATE', 'GRADED'], default: 'SUBMITTED' },
  marks: { type: Number },
  feedback: { type: String },
  gradedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  gradedAt: { type: Date }
}, { timestamps: true });

// Optimize for common queries
AssignmentSubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });
AssignmentSubmissionSchema.index({ studentId: 1 });
AssignmentSubmissionSchema.index({ status: 1 });

export default mongoose.model<IAssignmentSubmission>('AssignmentSubmission', AssignmentSubmissionSchema);
