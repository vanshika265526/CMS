import mongoose, { Schema, Document } from "mongoose";

export interface IParent extends Document {
  userId: mongoose.Types.ObjectId;
  students: mongoose.Types.ObjectId[]; // Array of Student references
  relation: "Father" | "Mother" | "Guardian";
  phone: string;
  address?: string;
  occupation?: string;
  isActive: boolean;
}

const ParentSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    students: [{ type: Schema.Types.ObjectId, ref: "Student", required: true }],
    relation: { type: String, enum: ["Father", "Mother", "Guardian"], required: true },
    phone: { type: String, required: true },
    address: { type: String },
    occupation: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IParent>("Parent", ParentSchema);
