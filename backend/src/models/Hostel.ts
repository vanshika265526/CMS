import mongoose, { Schema, Document } from "mongoose";

export interface IHostel extends Document {
  name: string;
  code: string;
  type: "MALE" | "FEMALE" | "CO_ED";
  wardenId?: mongoose.Types.ObjectId;
  collegeId?: mongoose.Types.ObjectId;
  address?: string;
  contactNumber?: string;
  totalRooms: number;
  messFeePerMonth: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HostelSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    type: { type: String, enum: ["MALE", "FEMALE", "CO_ED"], required: true },
    wardenId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    collegeId: { type: Schema.Types.ObjectId, ref: "College", index: true },
    address: { type: String },
    contactNumber: { type: String },
    totalRooms: { type: Number, default: 0, min: 0 },
    messFeePerMonth: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

HostelSchema.index({ collegeId: 1, code: 1 }, { unique: true });

export default mongoose.model<IHostel>("Hostel", HostelSchema);
