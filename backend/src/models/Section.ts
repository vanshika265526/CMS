import mongoose, { Schema, Document } from 'mongoose';

export interface ISection extends Document {
  collegeId: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const SectionSchema: Schema = new Schema(
  {
    collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true, index: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

SectionSchema.index({ collegeId: 1, batchId: 1, name: 1 }, { unique: true });

export default mongoose.model<ISection>('Section', SectionSchema);