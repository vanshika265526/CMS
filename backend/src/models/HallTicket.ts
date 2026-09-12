import mongoose, { Schema, Document } from 'mongoose';

export interface IHallTicket extends Document {
  examId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  ticketNumber: string;
  studentInfo: {
    name: string;
    rollNumber: string;
    enrollmentNumber: string;
    photo: string; // Cloudinary URL
    course: string;
    batch: string;
    department: string;
  };
  examInfo: {
    examCode: string;
    examName: string;
    scheduleDate: Date;
    duration: number;
    venue: string;
    seatNumber: string;
    invigilator: string;
  };
  documentUrl?: string; // Cloudinary PDF URL
  status: 'GENERATED' | 'PUBLISHED' | 'DOWNLOADED';
  downloadedAt?: Date;
  downloadCount: number;
  generatedAt: Date;
}

const HallTicketSchema: Schema = new Schema({
  examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  ticketNumber: { type: String, required: true, unique: true },
  studentInfo: {
    name: { type: String, required: true },
    rollNumber: { type: String, required: true },
    enrollmentNumber: { type: String, required: true },
    photo: { type: String, required: true },
    course: { type: String, required: true },
    batch: { type: String, required: true },
    department: { type: String, required: true }
  },
  examInfo: {
    examCode: { type: String, required: true },
    examName: { type: String, required: true },
    scheduleDate: { type: Date, required: true },
    duration: { type: Number, required: true },
    venue: { type: String, required: true },
    seatNumber: { type: String, required: true },
    invigilator: { type: String, required: true }
  },
  documentUrl: { type: String },
  status: { type: String, enum: ['GENERATED', 'PUBLISHED', 'DOWNLOADED'], default: 'GENERATED' },
  downloadedAt: { type: Date },
  downloadCount: { type: Number, default: 0 },
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Optimize for common queries
HallTicketSchema.index({ examId: 1, studentId: 1 }, { unique: true });

export default mongoose.model<IHallTicket>('HallTicket', HallTicketSchema);
