import mongoose, { Schema, Document } from 'mongoose';

export interface IAssignedSubject {
  subjectId: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
}

export interface IFaculty extends Document {
  userId: mongoose.Types.ObjectId;
  collegeId: mongoose.Types.ObjectId;
  employeeId: string;
  assignedSubjects: IAssignedSubject[];
  personalInfo?: {
    name?: string;
    phone?: string;
    email?: string;
    photo?: string;
  };
  department?: string;
  designation?: string;
  qualification?: string;
  experience?: number;
  joiningDate?: Date;
  status: 'Active' | 'On-Leave' | 'Resigned';
  createdAt: Date;
  updatedAt: Date;
}

const FacultySchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true, index: true },
    employeeId: { type: String, required: true, unique: true },
    assignedSubjects: [
      {
        subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
        batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
      }
    ],
    personalInfo: {
      name: { type: String },
      phone: { type: String },
      email: { type: String },
      photo: { type: String },
    },
    department: { type: String },
    designation: { type: String, default: 'Assistant Professor' },
    qualification: { type: String },
    experience: { type: Number, default: 0 },
    joiningDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['Active', 'On-Leave', 'Resigned'],
      default: 'Active',
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index for fast assignment lookups
FacultySchema.index({ 'assignedSubjects.batchId': 1, 'assignedSubjects.subjectId': 1 });

// Soft-delete: auto-exclude isDeleted records from find and countDocuments
FacultySchema.pre(/^find/, function (this: any) {
  const filter = this.getFilter();
  if (filter.isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
});
FacultySchema.pre('countDocuments', function (this: any) {
  const filter = this.getFilter();
  if (filter.isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
});

export default mongoose.model<IFaculty>('Faculty', FacultySchema);
