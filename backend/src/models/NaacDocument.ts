import mongoose, { Schema, Document } from "mongoose";

export interface INaacDocument extends Document {
  title: string;
  criterion: string; // e.g. "2.3", "3.1"
  fileUrl: string; // Cloudinary
  academicYear: string; // e.g. "2025-26"
  collegeId?: mongoose.Types.ObjectId;
  description?: string;
  status?: 'DRAFT' | 'REVIEW' | 'APPROVED';
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const NaacDocumentSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    criterion: { type: String, required: true },
    fileUrl: { type: String, required: true },
    academicYear: { type: String, required: true },
    collegeId: { type: Schema.Types.ObjectId, ref: "College" },
    description: { type: String },
    status: { type: String, enum: ['DRAFT', 'REVIEW', 'APPROVED'], default: 'DRAFT' },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model<INaacDocument>("NaacDocument", NaacDocumentSchema);
