import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemSettings extends Document {
  timezone: string;
  language: string;
  maintenance_mode: boolean;
  password_policy: {
    min_length: number;
    require_uppercase: boolean;
    require_lowercase: boolean;
    require_numbers: boolean;
    require_special_chars: boolean;
  };
  session_timeout: number;
  rate_limiting: {
    max_failed_attempts: number;
    lockout_duration: number;
  };
  two_factor_auth: {
    enabled: boolean;
    methods: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingsSchema: Schema = new Schema(
  {
    timezone: { type: String, default: 'Asia/Kolkata' },
    language: { type: String, default: 'en' },
    maintenance_mode: { type: Boolean, default: false },
    password_policy: {
      min_length: { type: Number, default: 8 },
      require_uppercase: { type: Boolean, default: true },
      require_lowercase: { type: Boolean, default: true },
      require_numbers: { type: Boolean, default: true },
      require_special_chars: { type: Boolean, default: true }
    },
    session_timeout: { type: Number, default: 30 },
    rate_limiting: {
      max_failed_attempts: { type: Number, default: 5 },
      lockout_duration: { type: Number, default: 15 }
    },
    two_factor_auth: {
      enabled: { type: Boolean, default: true },
      methods: { type: [String], default: ['email', 'sms', 'authenticator_app'] }
    }
  },
  { timestamps: true }
);

export default mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);
