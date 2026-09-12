import mongoose, { Schema, Document } from "mongoose";

export interface ITicketReply {
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  message: string;
  isStaffReply: boolean;
  createdAt: Date;
}

export interface ISupportTicket extends Document {
  ticketNumber: string;
  raisedBy: mongoose.Types.ObjectId;
  collegeId?: mongoose.Types.ObjectId;
  subject: string;
  description: string;
  category: "ACADEMIC" | "HOSTEL" | "FEES" | "TECHNICAL" | "LIBRARY" | "EXAMINATION" | "OTHER";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  assignedTo?: mongoose.Types.ObjectId;
  replies: ITicketReply[];
  slaDueAt: Date;
  resolvedAt?: Date;
  attachmentUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TicketReplySchema = new Schema(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    message: { type: String, required: true },
    isStaffReply: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const SupportTicketSchema: Schema = new Schema(
  {
    ticketNumber: { type: String, required: true, unique: true },
    raisedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    collegeId: { type: Schema.Types.ObjectId, ref: "College", index: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ["ACADEMIC", "HOSTEL", "FEES", "TECHNICAL", "LIBRARY", "EXAMINATION", "OTHER"],
      default: "OTHER",
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
      index: true,
    },
    status: {
      type: String,
      enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
      default: "OPEN",
      index: true,
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", index: true },
    replies: [TicketReplySchema],
    slaDueAt: { type: Date, required: true },
    resolvedAt: { type: Date },
    attachmentUrl: { type: String },
  },
  { timestamps: true }
);

SupportTicketSchema.index({ collegeId: 1, status: 1, createdAt: -1 });

export default mongoose.model<ISupportTicket>("SupportTicket", SupportTicketSchema);
