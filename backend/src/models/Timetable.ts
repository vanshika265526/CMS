import mongoose, { Schema, Document } from 'mongoose';
import { DAYS, TIME_SLOT_STARTS } from '../constants/timeSlots.js';

export interface ITimetable extends Document {
  collegeId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  sectionId: mongoose.Types.ObjectId;
  subject: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  startTime: string;
  endTime: string;
  roomNo?: string;
  createdBy: mongoose.Types.ObjectId;
  subjectId?: mongoose.Types.ObjectId;
  classId?: mongoose.Types.ObjectId;
  section?: string;
  room?: string;
  dayOfWeek?: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  period?: number;
  academicYear?: string;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TimetableSchema: Schema = new Schema(
  {
    collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true, index: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true, index: true },
    subject: { type: String, required: true, trim: true },
    day: {
      type: String,
      enum: DAYS,
      required: true
    },
    startTime: { type: String, required: true, enum: TIME_SLOT_STARTS },
    endTime: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    roomNo: { type: String, default: '' },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
    classId: { type: Schema.Types.ObjectId, ref: 'Batch' },
    section: { type: String },
    room: { type: String },
    dayOfWeek: { type: String, enum: DAYS },
    period: { type: Number, min: 1, max: 8 },
    academicYear: { type: String },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Soft-delete: auto-exclude isDeleted records from find and countDocuments
TimetableSchema.pre(/^find/, function (this: any) {
  const filter = this.getFilter();
  if (filter.isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
});
TimetableSchema.pre('countDocuments', function (this: any) {
  const filter = this.getFilter();
  if (filter.isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
});

TimetableSchema.index(
  { collegeId: 1, batchId: 1, sectionId: 1, day: 1, startTime: 1 },
  { name: 'section_slot_lookup' }
);

TimetableSchema.index(
  { collegeId: 1, teacherId: 1, day: 1, startTime: 1 },
  { name: 'teacher_slot_lookup' }
);

export default mongoose.model<ITimetable>("Timetable", TimetableSchema);
