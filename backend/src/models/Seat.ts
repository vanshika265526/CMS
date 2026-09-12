// FILE: backend/src/models/Seat.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ISeat extends Document {
  course: string;
  batch: string;
  totalSeats: number;
  filledSeats: number;
  reservedSeats: {
    SC: number;
    ST: number;
    OBC: number;
    General: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SeatSchema: Schema = new Schema(
  {
    course: { type: String, required: true },
    batch: { type: String, required: true },
    totalSeats: { type: Number, required: true, default: 0 },
    filledSeats: { type: Number, default: 0 },
    reservedSeats: {
      SC: { type: Number, default: 0 },
      ST: { type: Number, default: 0 },
      OBC: { type: Number, default: 0 },
      General: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// Compound index to ensure uniqueness per course and batch
SeatSchema.index({ course: 1, batch: 1 }, { unique: true });

export default mongoose.model<ISeat>("Seat", SeatSchema);
