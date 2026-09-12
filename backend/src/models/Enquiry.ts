// FILE: backend/src/models/Enquiry.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IEnquiry extends Document {
  name: string;
  phone: string;
  email: string;
  courseInterest: mongoose.Types.ObjectId;
  source: 'walkin' | 'online' | 'referral' | 'other';
  status: 'New' | 'Contacted' | 'Interested' | 'NotInterested' | 'applied' | 'admitted';
  notes: {
    content: string;
    createdAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const EnquirySchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    courseInterest: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    source: {
      type: String,
      enum: ["walkin", "online", "referral", "other"],
      default: "online",
    },
    status: {
      type: String,
      enum: ["New", "Contacted", "Interested", "NotInterested", "applied", "admitted"],
      default: "New",
    },
    notes: [
      {
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model<IEnquiry>("Enquiry", EnquirySchema);
