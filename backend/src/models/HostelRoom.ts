import mongoose, { Schema, Document } from "mongoose";

export interface IHostelRoom extends Document {
  hostelId: mongoose.Types.ObjectId;
  collegeId?: mongoose.Types.ObjectId;
  roomNumber: string;
  floor: number;
  capacity: number;
  occupiedCount: number;
  roomType: "SINGLE" | "DOUBLE" | "TRIPLE" | "DORMITORY";
  monthlyRent: number;
  amenities: string[];
  status: "AVAILABLE" | "FULL" | "MAINTENANCE" | "RESERVED";
  createdAt: Date;
  updatedAt: Date;
}

const HostelRoomSchema: Schema = new Schema(
  {
    hostelId: { type: Schema.Types.ObjectId, ref: "Hostel", required: true, index: true },
    collegeId: { type: Schema.Types.ObjectId, ref: "College", index: true },
    roomNumber: { type: String, required: true, trim: true },
    floor: { type: Number, default: 0, min: 0 },
    capacity: { type: Number, required: true, min: 1 },
    occupiedCount: { type: Number, default: 0, min: 0 },
    roomType: {
      type: String,
      enum: ["SINGLE", "DOUBLE", "TRIPLE", "DORMITORY"],
      default: "DOUBLE",
    },
    monthlyRent: { type: Number, default: 0, min: 0 },
    amenities: [{ type: String }],
    status: {
      type: String,
      enum: ["AVAILABLE", "FULL", "MAINTENANCE", "RESERVED"],
      default: "AVAILABLE",
    },
  },
  { timestamps: true }
);

HostelRoomSchema.index({ hostelId: 1, roomNumber: 1 }, { unique: true });

export default mongoose.model<IHostelRoom>("HostelRoom", HostelRoomSchema);
