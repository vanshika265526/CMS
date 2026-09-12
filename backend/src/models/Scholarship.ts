import mongoose, { Schema, Document } from "mongoose";

export interface IScholarship extends Document {
  name: string;
  type: "percentage" | "fixed";
  value: number;
  categoryApplicable: "GEN" | "SC" | "ST" | "OBC" | "ALL";
  collegeId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ScholarshipSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["percentage", "fixed"], required: true },
    value: { type: Number, required: true, min: 0 },
    categoryApplicable: {
      type: String,
      enum: ["GEN", "SC", "ST", "OBC", "ALL"],
      default: "ALL",
    },
    collegeId: { type: Schema.Types.ObjectId, ref: "College", required: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.model<IScholarship>("Scholarship", ScholarshipSchema);
