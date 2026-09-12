import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  receiverRole?: 'TEACHER' | 'STUDENT' | 'PARENT' | 'COLLEGE_ADMIN' | 'SUPER_ADMIN';
  senderRole: 'TEACHER' | 'STUDENT' | 'PARENT' | 'COLLEGE_ADMIN' | 'SUPER_ADMIN';
  content: string;
  conversationId?: string;
  attachmentUrl?: string;
  attachmentType?: string;
  attachmentName?: string;
  deliveryStatus?: 'sent' | 'delivered' | 'read';
  collegeId: mongoose.Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema = new Schema(
  {
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiverRole: { type: String, enum: ["TEACHER", "STUDENT", "PARENT", "COLLEGE_ADMIN", "SUPER_ADMIN"] },
    senderRole: { type: String, enum: ["TEACHER", "STUDENT", "PARENT", "COLLEGE_ADMIN", "SUPER_ADMIN"], required: true },
    content: { type: String, default: "" },
    conversationId: { type: String, index: true },
    attachmentUrl: { type: String },
    attachmentType: { type: String },
    attachmentName: { type: String },
    deliveryStatus: { type: String, enum: ["sent", "delivered", "read"], default: "sent" },
    collegeId: { type: Schema.Types.ObjectId, ref: "College" },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index for efficient conversation lookups
MessageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
MessageSchema.index({ collegeId: 1 });
MessageSchema.index({ conversationId: 1, createdAt: -1 });

export default mongoose.model<IMessage>("Message", MessageSchema);
