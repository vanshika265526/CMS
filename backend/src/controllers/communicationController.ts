import mongoose from "mongoose";
import { Request, Response } from "express";
import Announcement from "../models/Announcement.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Student from "../models/Student.js";
import Parent from "../models/Parent.js";
import Faculty from "../models/Faculty.js";
import Batch from "../models/Batch.js";
import Notification from "../models/Notification.js";
import { createAndEmitNotification, getRolePathPrefix } from "../services/notificationService.js";

const buildConversationId = (a: string, b: string) => [String(a), String(b)].sort().join('_');

// ====================================================================
// ANNOUNCEMENTS
// ====================================================================

/**
 * GET /teacher/announcements  (Teacher context)
 * Returns announcements created by this teacher
 */
export const getAnnouncements = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { targetAudience } = req.query;
    let query: any;

    if (["COLLEGE_ADMIN", "SUPER_ADMIN"].includes(user?.role)) {
      query = { collegeId: user?.collegeId };
    } else {
      query = { senderId: user?._id };
    }

    if (targetAudience) query.targetAudience = targetAudience;

    const announcements = await Announcement.find(query)
      .populate("senderId", "name role")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: announcements });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /teacher/announcements  (Teacher context)
 * Create a new announcement
 */
export const createAnnouncement = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { title, content, targetAudience, targetClass, type: annType, body } = req.body;
    const announcementText = String(content || body || "");

    const announcement = new Announcement({
      ...req.body,
      body: announcementText,
      senderId: user._id,
      collegeId: user.collegeId,
    });
    await announcement.save();

    // Trigger Notifications
    try {
      const { createAndEmitBulkNotifications } = await import("../services/notificationService.js");
      let recipientUserIds: mongoose.Types.ObjectId[] = [];

      if (targetClass === "all" || !targetClass) {
        // Broadcast to all students in college
        const students = await Student.find({ collegeId: user.collegeId }).select("userId");
        recipientUserIds = students.map(s => s.userId as mongoose.Types.ObjectId);
      } else {
        // Target specific batch
        let batchId = targetClass;
        // Check if targetClass is a name instead of ID
        if (!mongoose.Types.ObjectId.isValid(targetClass)) {
          const batch = await Batch.findOne({ name: targetClass, collegeId: user.collegeId });
          if (batch) batchId = batch._id;
        }

        const students = await Student.find({ 
          collegeId: user.collegeId, 
          $or: [{ batchId }, { "academicInfo.batch": targetClass }] 
        }).select("userId");
        recipientUserIds = students.map(s => s.userId as mongoose.Types.ObjectId);

        // Also notify parents if targetAudience includes parents
        if (targetAudience === "parents" || targetAudience === "both") {
          const studentIds = students.map(s => s._id);
          const parents = await Parent.find({ students: { $in: studentIds } }).select("userId");
          recipientUserIds.push(...parents.map(p => p.userId as mongoose.Types.ObjectId));
        }
      }

      // Unique IDs and Roles
      const uniqueRecipients = Array.from(new Set(recipientUserIds.map(id => id.toString())));
      const recipients = await User.find({ _id: { $in: uniqueRecipients } }).select("_id role");

      if (recipients.length > 0) {
        await createAndEmitBulkNotifications(
          recipients.map(r => ({ userId: r._id, role: r.role })),
          {
            title: `Announcement: ${title}`,
            message: announcementText.length > 100 ? announcementText.substring(0, 97) + "..." : announcementText,
            type: annType === "urgent" ? "alert" : "announcement",
            senderUserId: user._id,
            collegeId: user.collegeId,
            metadata: { announcementId: announcement._id, type: "announcement" }
          },
          (prefix) => `${prefix}/communication?tab=announcements`
        );
      }
    } catch (notifErr) {
      console.log("[NOTIF] Failed to send announcement notifications:", notifErr);
    }

    res.status(201).json({ success: true, data: announcement });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /teacher/announcements/:id
 * Deletes an announcement created by the current teacher
 */
export const deleteAnnouncement = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    if (String(announcement.senderId) !== String(user?._id)) {
      return res.status(403).json({ success: false, message: 'You can only delete announcements you created' });
    }

    await Announcement.deleteOne({ _id: id });
    return res.status(200).json({ success: true, message: 'Announcement deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /students/announcements  (Student context)
 * Returns all announcements (for the student's batch or broadcast)
 */
export const getStudentAnnouncements = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;

    const student = await Student.findOne({ userId });
    const batchName = student?.academicInfo?.batch || null;
    const batchIdStr = student?.batchId?.toString() || null;

    // Always include "all" / broadcast announcements.
    // Also include batch-specific ones if the student belongs to a batch.
    const orConditions: any[] = [
      { targetClass: "all" },
      { targetClass: { $exists: false } },
      { targetClass: "" },
      { targetClass: null },
    ];

    if (batchName) {
      orConditions.push({ targetClass: batchName });
    }
    if (batchIdStr) {
      orConditions.push({ targetClass: batchIdStr });
    }

    const announcements = await Announcement.find({ $or: orConditions })
      .populate("senderId", "name role")
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ success: true, data: announcements });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /parent/me/announcements  (Parent context)
 * Returns announcements relevant to the linked child's batch
 */
export const getParentAnnouncements = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const parent = await Parent.findOne({ userId });

    if (!parent || !parent.students.length) {
      return res.status(200).json({ success: true, data: [] });
    }

    const student = await Student.findById(parent.students[0]);
    const batchName = student?.academicInfo?.batch || null;
    const batchIdStr = student?.batchId?.toString() || null;

    const query: any = {};
    const orConditions: any[] = [
      { targetClass: "all" },
      { targetClass: { $exists: false } },
      { targetClass: "" },
      { targetClass: null },
    ];

    if (batchName) {
      orConditions.push({ targetClass: batchName });
    }
    if (batchIdStr) {
      orConditions.push({ targetClass: batchIdStr });
    }
    query.$or = orConditions;

    const announcements = await Announcement.find(query)
      .populate("senderId", "name role")
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ success: true, data: announcements });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ====================================================================
// CONTACTS — Get Teachers for Students / Parents
// ====================================================================

/**
 * GET /students/my-teachers  (Student context)
 * Returns teachers assigned to this student's batch
 */
export const getStudentTeachers = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const student = await Student.findOne({ userId });

    if (!student) {
      return res.status(404).json({ success: false, message: "Student profile not found" });
    }

    const collegeId = student.collegeId;
    let batchId = student.batchId;

    // Batch fallback by name
    if (!batchId && student.academicInfo?.batch) {
      const batch = await Batch.findOne({ name: student.academicInfo.batch, collegeId });
      if (batch) batchId = batch._id;
    }

    if (!batchId) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Find faculty assigned to this batch (batch lives inside assignedSubjects[])
    const faculty = await Faculty.find({
      collegeId,
      "assignedSubjects.batchId": batchId,
    }).populate("userId", "name email profilePicture");

    // Get unread counts for each teacher (sent to this student)
    const unreadCounts = await Message.aggregate([
      { 
        $match: { 
          receiverId: new mongoose.Types.ObjectId(userId), 
          isRead: false 
        } 
      },
      { 
        $group: { 
          _id: "$senderId", 
          count: { $sum: 1 } 
        } 
      }
    ]);

    const unreadMap: Record<string, number> = {};
    unreadCounts.forEach(item => {
      unreadMap[item._id.toString()] = item.count;
    });

    const teachers = faculty
      .filter((f) => f.userId) // Safety filter
      .map((f) => {
        const teacherUserId = (f.userId as any)._id;
        return {
          _id: f._id,
          userId: f.userId,
          name: (f.userId as any).name,
          email: (f.userId as any).email,
          profilePicture: (f.userId as any).profilePicture,
          department: f.department,
          designation: f.designation,
          unreadCount: unreadMap[teacherUserId.toString()] || 0
        };
      });

    res.status(200).json({ success: true, data: teachers });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /parent/me/teachers  (Parent context)
 * Returns teachers of the linked child's batch
 */
export const getParentTeachers = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const parent = await Parent.findOne({ userId });

    if (!parent || !parent.students.length) {
      return res.status(200).json({ success: true, data: [] });
    }

    const student = await Student.findById(parent.students[0]);
    if (!student) {
      return res.status(200).json({ success: true, data: [] });
    }

    const collegeId = student.collegeId;
    let batchId = student.batchId;

    if (!batchId && student.academicInfo?.batch) {
      const batch = await Batch.findOne({ name: student.academicInfo.batch, collegeId });
      if (batch) batchId = batch._id;
    }

    if (!batchId) {
      return res.status(200).json({ success: true, data: [] });
    }

    const faculty = await Faculty.find({
      collegeId,
      "assignedSubjects.batchId": batchId,
    }).populate("userId", "name email profilePicture");

    // Get unread counts for each teacher (sent to this parent)
    const unreadCounts = await Message.aggregate([
      { 
        $match: { 
          receiverId: new mongoose.Types.ObjectId(userId), 
          isRead: false 
        } 
      },
      { 
        $group: { 
          _id: "$senderId", 
          count: { $sum: 1 } 
        } 
      }
    ]);

    const unreadMap: Record<string, number> = {};
    unreadCounts.forEach(item => {
      unreadMap[item._id.toString()] = item.count;
    });

    const teachers = faculty
      .filter((f) => f.userId)
      .map((f) => {
        const teacherUserId = (f.userId as any)._id;
        return {
          _id: f._id,
          userId: f.userId,
          name: (f.userId as any).name,
          email: (f.userId as any).email,
          profilePicture: (f.userId as any).profilePicture,
          department: f.department,
          designation: f.designation,
          unreadCount: unreadMap[teacherUserId.toString()] || 0
        };
      });

    res.status(200).json({ success: true, data: teachers });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ====================================================================
// DIRECT MESSAGING
// ====================================================================

/**
 * GET /teacher/messages/:studentUserId  (Teacher context)
 * GET /students/messages/:teacherUserId  (Student context)
 * GET /parent/me/messages/:teacherUserId  (Parent context)
 * Returns the conversation between the authenticated user and the other party
 */
export const getConversation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const { otherUserId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    })
      .populate("senderId", "name email role profilePicture")
      .populate("receiverId", "name email role profilePicture")
      .sort({ createdAt: 1 });

    // Auto-mark received messages as read
    await Message.updateMany(
      { senderId: otherUserId, receiverId: userId, isRead: false },
      { $set: { isRead: true, deliveryStatus: 'read' } }
    );

    res.status(200).json({ success: true, data: messages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /teacher/messages  (Teacher context)
 * POST /students/messages  (Student context)
 * Sends a direct message from the authenticated user
 */
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { receiverId, content, attachmentUrl, attachmentType, attachmentName } = req.body;
    const normalizedContent = String(content || '').trim();

    if (!receiverId || (!normalizedContent && !attachmentUrl)) {
      return res.status(400).json({ success: false, message: "receiverId and at least one of content/attachment are required" });
    }

    const receiver = await User.findById(receiverId).select('_id role');
    if (!receiver) {
      return res.status(404).json({ success: false, message: 'Receiver not found' });
    }

    const conversationId = buildConversationId(String(user._id), String(receiverId));

    const message = new Message({
      senderId: user._id,
      receiverId,
      receiverRole: receiver.role,
      senderRole: user.role,
      content: normalizedContent,
      conversationId,
      attachmentUrl,
      attachmentType,
      attachmentName,
      deliveryStatus: 'delivered',
      collegeId: user.collegeId,
    });
    await message.save();

    // Populate for response
    await message.populate("senderId", "name email role profilePicture");
    await message.populate("receiverId", "name email role profilePicture");

    // Emit real-time notification via socket
    try {
      const { getIO } = await import("../config/socket.js");
      const io = getIO();
      io.to(`user_${receiverId}`).emit("newMessage", {
        message,
        from: { _id: user._id, name: user.name, role: user.role },
      });

      // Determine recipient role for correct actionUrl
      const recipient = message.receiverId as any;
      const prefix = getRolePathPrefix(recipient.role);
      
      // For message notifications, we want to open the sender's conversation
      // If student is recipient, they see teacher's ID. If teacher is recipient, they see student's ID.
      const idParamName = recipient.role === 'TEACHER' ? 'studentUserId' : 'teacherId';
      const preview = normalizedContent || `Attachment: ${attachmentName || 'file'}`;

      // Create persistent notification for the bell icon
      await createAndEmitNotification({
        title: `New Message from ${user.name}`,
        message: preview.length > 50 ? preview.substring(0, 47) + "..." : preview,
        type: "personal",
        recipientUserId: receiverId,
        senderUserId: user._id,
        collegeId: user.collegeId,
        metadata: { messageId: message._id, type: "direct_message" },
        actionUrl: `${prefix}/communication?tab=messages&${idParamName}=${user._id}`
      });
    } catch (socketErr) {
      // Socket emission is best-effort, don't fail the API call
      console.log("[SOCKET/NOTIF] Failed to emit/create notification:", socketErr);
    }

    res.status(201).json({ success: true, data: message });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * POST /parent/me/messages  (Parent context)
 * Sends a message from parent to a teacher
 */
export const parentSendMessage = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { receiverId, content, attachmentUrl, attachmentType, attachmentName } = req.body;
    const normalizedContent = String(content || '').trim();

    if (!receiverId || (!normalizedContent && !attachmentUrl)) {
      return res.status(400).json({ success: false, message: "receiverId and at least one of content/attachment are required" });
    }

    const receiver = await User.findById(receiverId).select('_id role');
    if (!receiver) {
      return res.status(404).json({ success: false, message: 'Receiver not found' });
    }

    const conversationId = buildConversationId(String(user._id), String(receiverId));

    const message = new Message({
      senderId: user._id,
      receiverId,
      receiverRole: receiver.role,
      senderRole: "PARENT",
      content: normalizedContent,
      conversationId,
      attachmentUrl,
      attachmentType,
      attachmentName,
      deliveryStatus: 'delivered',
      collegeId: user.collegeId,
    });
    await message.save();

    await message.populate("senderId", "name email role profilePicture");
    await message.populate("receiverId", "name email role profilePicture");

    // Emit real-time notification
    try {
      const { getIO } = await import("../config/socket.js");
      const io = getIO();
      io.to(`user_${receiverId}`).emit("newMessage", {
        message,
        from: { _id: user._id, name: user.name, role: user.role },
      });

      // Determine recipient role for correct actionUrl
      const recipient = message.receiverId as any;
      const prefix = getRolePathPrefix(recipient.role);
      const idParamName = recipient.role === 'TEACHER' ? 'studentUserId' : 'teacherId';
      const preview = normalizedContent || `Attachment: ${attachmentName || 'file'}`;

      // Create persistent notification for the bell icon
      await createAndEmitNotification({
        title: `New Message from Parent`,
        message: preview.length > 50 ? preview.substring(0, 47) + "..." : preview,
        type: "personal",
        recipientUserId: receiverId,
        senderUserId: user._id,
        collegeId: user.collegeId,
        metadata: { messageId: message._id, type: "direct_message" },
        actionUrl: `${prefix}/communication?tab=messages&${idParamName}=${user._id}`
      });
    } catch (socketErr) {
      console.log("[SOCKET/NOTIF] Failed to emit/create notification:", socketErr);
    }

    res.status(201).json({ success: true, data: message });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * GET /teacher/messages  (existing — get all messages for teacher)
 * Returns all conversations grouped by contact
 */
export const getMessages = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    })
      .populate("senderId", "name email role profilePicture")
      .populate("receiverId", "name email role profilePicture")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: messages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /students/messages/unread-count  (Student context)
 * GET /parent/me/messages/unread-count  (Parent context)
 * Returns the count of unread messages
 */
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const count = await Message.countDocuments({
      receiverId: userId,
      isRead: false,
    });
    res.status(200).json({ success: true, data: { count } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /students/messages/:messageId/read  (Student context)
 * PUT /parent/me/messages/:messageId/read  (Parent context)
 * Mark a specific message as read
 */
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const { messageId } = req.params;

    await Message.findOneAndUpdate(
      { _id: messageId, receiverId: userId },
      { $set: { isRead: true, deliveryStatus: 'read' } }
    );

    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadMessageAttachment = async (req: Request, res: Response) => {
  try {
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const attachmentUrl = `/uploads/messages/${file.filename}`;
    const attachmentType = file.mimetype;
    const attachmentName = file.originalname;

    return res.status(200).json({
      success: true,
      data: {
        attachmentUrl,
        attachmentType,
        attachmentName,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to upload attachment' });
  }
};

// ====================================================================
// GENERIC NOTIFICATIONS
// ====================================================================

/**
 * GET /notifications
 * Returns all personal notifications for the logged-in user
 */
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const notifications = await Notification.find({ recipientUserId: userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ success: true, data: notifications });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /notifications/unread-count
 * Returns count of unread personal notifications
 */
export const getNotificationUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const count = await Notification.countDocuments({
      recipientUserId: userId,
      isRead: false,
    });
    res.status(200).json({ success: true, data: { count } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /notifications/:notifId/read
 * Mark a specific notification as read
 */
export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const { notifId } = req.params;

    await Notification.findOneAndUpdate(
      { _id: notifId, recipientUserId: userId },
      { $set: { isRead: true } }
    );

    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /notifications/read-all
 * Mark all personal notifications as read
 */
export const markAllNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    await Notification.updateMany(
      { recipientUserId: userId, isRead: false },
      { $set: { isRead: true } }
    );
    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
