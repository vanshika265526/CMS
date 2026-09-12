import mongoose, { Schema, Document } from 'mongoose';

export interface IAdmission extends Document {
  fullName: string;
  email: string;
  phone: string;
  courseId: mongoose.Types.ObjectId;
  collegeId: mongoose.Types.ObjectId;
  status: 'enquiry' | 'applied' | 'approved' | 'rejected' | 'enrolled';
  documents: { name: string, url: string }[];
  remarks?: string;
  appliedDate: Date;
  enrolledDate?: Date;
  studentId?: mongoose.Types.ObjectId; // Link to Student once enrolled
}

const AdmissionSchema: Schema = new Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true },
  status: { type: String, enum: ['enquiry', 'applied', 'approved', 'rejected', 'enrolled'], default: 'enquiry' },
  documents: [{ name: { type: String }, url: { type: String } }],
  remarks: { type: String },
  appliedDate: { type: Date, default: Date.now },
  enrolledDate: { type: Date },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student' },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

// Soft-delete: auto-exclude isDeleted records from find and countDocuments
AdmissionSchema.pre(/^find/, function (this: any) {
  const filter = this.getFilter();
  if (filter.isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
});
AdmissionSchema.pre('countDocuments', function (this: any) {
  const filter = this.getFilter();
  if (filter.isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
});

export default mongoose.model<IAdmission>('Admission', AdmissionSchema);
