// FILE: backend/src/models/Department.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IDepartment extends Document {
  name: string;
  collegeId: mongoose.Types.ObjectId;
  hod?: string;
  courses: string[];
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    collegeId: { type: Schema.Types.ObjectId, ref: "College", required: true },
    hod: { type: String },
    courses: [{ type: String }],
  },
  { timestamps: true }
);

DepartmentSchema.index({ collegeId: 1, name: 1 }, { unique: true });

export default mongoose.model<IDepartment>("Department", DepartmentSchema);
