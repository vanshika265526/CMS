import Notification, { INotification } from '../models/Notification.js';
import User from '../models/User.js';
import { emitToUser } from '../config/socket.js';
import mongoose from 'mongoose';

interface NotificationParams {
  title: string;
  message: string;
  type: 'announcement' | 'alert' | 'personal' | 'library';
  recipientUserId: string | mongoose.Types.ObjectId;
  senderUserId: string | mongoose.Types.ObjectId;
  collegeId: string | mongoose.Types.ObjectId;
  metadata?: Record<string, any>;
  actionUrl?: string; // Optional: can be built dynamically if not provided
}

/**
 * Resolves the frontend path prefix based on user role
 */
export const getRolePathPrefix = (role: string): string => {
  switch (role) {
    case 'TEACHER': return '/teacher';
    case 'COLLEGE_ADMIN':
    case 'SUPER_ADMIN': return '/admin';
    case 'STUDENT': 
    case 'PARENT': return ''; // Root based routes for students/parents
    default: return '';
  }
};

/**
 * Create a single notification and emit it via socket.
 */
export const createAndEmitNotification = async (params: NotificationParams) => {
  try {
    // If actionUrl is not provided but we have enough metadata, we could build it here.
    // For now, we expect the controller to provide the correct URL using getRolePathPrefix.

    const notification = await Notification.create({
      ...params,
      isRead: false
    });

    // Emit real-time socket event
    emitToUser(params.recipientUserId.toString(), 'notification', notification);

    return notification;
  } catch (error) {
    console.error('[NotificationService] Error creating notification:', error);
    throw error;
  }
};

/**
 * Create bulk notifications and emit them individually via socket.
 */
export const createAndEmitBulkNotifications = async (
  recipients: { userId: string | mongoose.Types.ObjectId, role: string }[],
  baseParams: Omit<NotificationParams, 'recipientUserId' | 'actionUrl'>,
  urlBuilder: (prefix: string) => string
) => {
  try {
    if (recipients.length === 0) return [];

    const notificationsData = recipients.map(recipient => {
      const prefix = getRolePathPrefix(recipient.role);
      const actionUrl = urlBuilder(prefix);
      
      return {
        ...baseParams,
        recipientUserId: recipient.userId,
        actionUrl,
        isRead: false
      };
    });

    // Use insertMany for efficient DB operation
    const createdNotifications = await Notification.insertMany(notificationsData);

    // Emit to each user individually
    createdNotifications.forEach(notif => {
      emitToUser(notif.recipientUserId!.toString(), 'notification', notif);
    });

    return createdNotifications;
  } catch (error) {
    console.error('[NotificationService] Error in bulk notifications:', error);
    throw error;
  }
};
