import mongoose, { Schema, Document } from "mongoose";

export interface IAnnouncement extends Document {
  senderId: mongoose.Types.ObjectId;
  collegeId?: mongoose.Types.ObjectId;
  targetAudience?: "all" | "students" | "parents" | "both";
  type?: string;
  targetClass?: string; // e.g. "Computer Science"
  title: string;
  body: string;
  priority: "Normal" | "Important" | "Urgent";
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema: Schema = new Schema(
  {
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    collegeId: { type: Schema.Types.ObjectId, ref: "College", index: true },
    targetAudience: { type: String, enum: ["all", "students", "parents", "both"], default: "all" },
    type: { type: String, default: "normal" },
    targetClass: { type: String },
    title: { type: String, required: true },
    body: { type: String, required: true },
    priority: { type: String, enum: ["Normal", "Important", "Urgent"], default: "Normal" },
    scheduledAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IAnnouncement>("Announcement", AnnouncementSchema);
