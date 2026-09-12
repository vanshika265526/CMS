import mongoose from 'mongoose';
import Notification from './src/models/Notification.js';
import User from './src/models/User.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ngcms';

async function migrateNotifications() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const notifications = await Notification.find({
      $or: [
        { actionUrl: { $regex: '/communication/messages/' } },
        { actionUrl: '/communication/announcements' }
      ]
    });

    console.log(`Found ${notifications.length} notifications to migrate.`);

    for (const notif of notifications) {
      const recipient = await User.findById(notif.recipientUserId);
      if (!recipient) continue;

      let prefix = '';
      if (recipient.role === 'TEACHER') prefix = '/teacher';
      else if (recipient.role.includes('ADMIN')) prefix = '/admin';

      let newUrl = notif.actionUrl;
      if (notif.actionUrl.includes('/communication/messages/')) {
        const parts = notif.actionUrl.split('/');
        const id = parts[parts.length - 1];
        const idParam = recipient.role === 'TEACHER' ? 'studentUserId' : 'teacherId';
        const senderId = notif.senderUserId?.toString() || id; // Fallback to extracted ID if senderUserId missing
        newUrl = `${prefix}/communication?tab=messages&${idParam}=${senderId}`;
      } else if (notif.actionUrl === '/communication/announcements') {
        newUrl = `${prefix}/communication?tab=announcements`;
      }

      notif.actionUrl = newUrl;
      await notif.save();
    }

    console.log('Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrateNotifications();
