import mongoose, { Schema, Document } from "mongoose";

export interface IMessMenu extends Document {
  hostelId: mongoose.Types.ObjectId;
  collegeId?: mongoose.Types.ObjectId;
  dayOfWeek: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
  breakfast: string;
  lunch: string;
  snacks: string;
  dinner: string;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MessMenuSchema: Schema = new Schema(
  {
    hostelId: { type: Schema.Types.ObjectId, ref: "Hostel", required: true, index: true },
    collegeId: { type: Schema.Types.ObjectId, ref: "College", index: true },
    dayOfWeek: {
      type: String,
      enum: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
      required: true,
    },
    breakfast: { type: String, default: "" },
    lunch: { type: String, default: "" },
    snacks: { type: String, default: "" },
    dinner: { type: String, default: "" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

MessMenuSchema.index({ hostelId: 1, dayOfWeek: 1 }, { unique: true });

export default mongoose.model<IMessMenu>("MessMenu", MessMenuSchema);
