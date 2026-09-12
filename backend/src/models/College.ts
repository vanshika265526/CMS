import mongoose, { Schema, Document } from 'mongoose';

export interface ICollege extends Document {
  code: string;
  name: string;
  email: string;
  phone: string;
  website?: string;
  location: {
    address: string;
    city: string;
    state: string;
    pin_code: string;
    country: string;
  };
  adminId?: mongoose.Types.ObjectId;
  affiliation?: string;
  established_year?: number;
  subscription: {
    plan: 'basic' | 'premium' | 'enterprise';
    status: 'active' | 'expired' | 'suspended';
    start_date: Date;
    end_date: Date;
    max_students: number;
    max_teachers: number;
    max_admins: number;
  };
  settings: {
    academic_year: string;
    semester_system: boolean;
    batch_size: string;
    grading_scale: string;
  };
  modules_enabled: string[];
  status: 'active' | 'inactive' | 'suspended';
  is_verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CollegeSchema: Schema = new Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  website: { type: String },
  location: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pin_code: { type: String, required: true },
    country: { type: String, default: 'India' }
  },
  adminId: { type: Schema.Types.ObjectId, ref: 'User' },
  affiliation: { type: String },
  established_year: { type: Number },
  subscription: {
    plan: { type: String, enum: ['basic', 'premium', 'enterprise'], default: 'basic' },
    status: { type: String, enum: ['active', 'expired', 'suspended'], default: 'active' },
    start_date: { type: Date, default: Date.now },
    end_date: { type: Date },
    max_students: { type: Number, default: 500 },
    max_teachers: { type: Number, default: 50 },
    max_admins: { type: Number, default: 5 }
  },
  settings: {
    academic_year: { type: String, default: '2024-2025' },
    semester_system: { type: Boolean, default: true },
    batch_size: { type: String, default: 'default' },
    grading_scale: { type: String, default: '10.0' }
  },
  modules_enabled: { 
    type: [String], 
    default: ['admissions', 'student_management', 'academics', 'attendance', 'exams_results', 'fees_payments', 'communication', 'naac']
  },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  is_verified: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model<ICollege>('College', CollegeSchema);
