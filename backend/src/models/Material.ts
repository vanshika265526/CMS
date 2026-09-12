import mongoose, { Schema, Document } from 'mongoose';

export interface IMaterial extends Document {
  teacherId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  sectionId?: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  type: 'Assignment' | 'Material' | 'Reference';
  fileUrl: string;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MaterialSchema: Schema = new Schema({
  teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  classId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
  sectionId: { type: Schema.Types.ObjectId, ref: 'Section' },
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  title: { type: String, required: true },
  description: { type: String },
  type: { type: String, enum: ['Assignment', 'Material', 'Reference'], required: true },
  fileUrl: { type: String, required: true },
  dueDate: { type: Date },
}, { timestamps: true });

MaterialSchema.index({ classId: 1, sectionId: 1, subjectId: 1, createdAt: -1 });

export default mongoose.model<IMaterial>('Material', MaterialSchema);
