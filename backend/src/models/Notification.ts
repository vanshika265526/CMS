import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  title: string;
  message: string;
  type: 'announcement' | 'alert' | 'personal' | 'library';
  recipientRole?: string; // e.g., STUDENT, TEACHER
  recipientUserId?: mongoose.Types.ObjectId;
  senderUserId: mongoose.Types.ObjectId;
  collegeId: mongoose.Types.ObjectId;
  isRead: boolean;
  metadata?: Record<string, any>;
  actionUrl?: string;
}

const NotificationSchema: Schema = new Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['announcement', 'alert', 'personal', 'library'], default: 'announcement' },
  recipientRole: { type: String },
  recipientUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  senderUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true },
  isRead: { type: Boolean, default: false },
  metadata: { type: Schema.Types.Mixed },
  actionUrl: { type: String },
}, { timestamps: true });

// Unique index to prevent duplicate notifications for a placement/student pair
NotificationSchema.index(
  { 'metadata.placementId': 1, recipientUserId: 1, type: 1 },
  { 
    unique: true, 
    partialFilterExpression: { 'metadata.placementId': { $exists: true } }
  }
);

export default mongoose.model<INotification>('Notification', NotificationSchema);


