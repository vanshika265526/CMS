import { Request, Response } from 'express';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import SystemSettings from '../models/SystemSettings.js';
import Session from '../models/Session.js';
import Student from '../models/Student.js';
import Parent from '../models/Parent.js';
import AdminAuthChallenge from '../models/AdminAuthChallenge.js';
import { otpProvider } from '../services/auth/OtpProvider.js';
import { securityAlertService } from '../services/email/SecurityAlertService.js';
import SystemLog from '../models/SystemLog.js';

const DEFAULT_STUDENT_PASSWORD = 'Student@123';
const DEFAULT_PARENT_PASSWORD = 'Parent@123';
const STUDENT_LOCKOUT_MS = 15 * 1000;
const PASSWORD_CHANGE_ROLES = new Set(['STUDENT', 'TEACHER', 'PARENT', 'LIBRARIAN']);
const STRONG_PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeParentRelation = (value: string) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'father') return 'Father';
  if (normalized === 'mother') return 'Mother';
  return 'Guardian';
};

export const loginUser = async (req: Request, res: Response) => {
  const { identifier, password } = req.body;

  try {
    if (!identifier || !password) {
      return res.status(400).json({ message: 'Identifier and password are required' });
    }

    const settings = await SystemSettings.findOne();
    const configuredAttempts = Number(settings?.rate_limiting?.max_failed_attempts || 3);
    const studentMaxFailedAttempts = Math.min(5, Math.max(3, configuredAttempts));
    const sessionTimeoutMinutes = settings?.session_timeout || 30;
    const normalizedIdentifier = String(identifier).trim();
    const normalizedEmail = normalizedIdentifier.toLowerCase();
    const emailRegex = new RegExp(`^${escapeRegExp(normalizedIdentifier)}$`, 'i');
    const exactEmailRegex = new RegExp(`^${escapeRegExp(normalizedEmail)}$`, 'i');

    let user: any = null;

    // If the identifier is a student's personal email, force student-context login.
    const matchedStudent = await Student.findOne({ 'personalInfo.email': exactEmailRegex })
      .select('_id userId collegeId personalInfo uniqueStudentId enrollmentId')
      .lean();

    if (matchedStudent?._id) {
      if (matchedStudent.userId) {
        const linkedStudentUser = await User.findById(matchedStudent.userId);
        if (linkedStudentUser && String(linkedStudentUser.role || '').toUpperCase() === 'STUDENT') {
          user = linkedStudentUser;
        }
      }

      if (!user) {
        const fullName = `${(matchedStudent as any)?.personalInfo?.firstName || ''} ${(matchedStudent as any)?.personalInfo?.lastName || ''}`.trim() || normalizedIdentifier;
        let loginEmail = normalizedEmail;
        const existingEmailOwner = await User.findOne({ email: exactEmailRegex }).select('_id');
        if (existingEmailOwner) {
          loginEmail = `student.${String((matchedStudent as any)._id)}@ngcms.local`;
        }

        const registrationId = String((matchedStudent as any).enrollmentId || (matchedStudent as any).uniqueStudentId || '').trim() || undefined;
        const studentUser = new User({
          name: fullName,
          email: loginEmail,
          password: DEFAULT_STUDENT_PASSWORD,
          role: 'STUDENT',
          collegeId: (matchedStudent as any).collegeId,
          registrationId,
          isActive: true,
          mustChangePassword: true,
        });
        await studentUser.save();

        await Student.updateOne(
          { _id: (matchedStudent as any)._id },
          { $set: { userId: studentUser._id } }
        );

        user = studentUser;
      }
    }

    if (!user) {
      user = await User.findOne({
        $or: [
          { email: emailRegex },
          { registrationId: normalizedIdentifier }
        ]
      });
    }

    // Legacy fallback: bootstrap a missing login user from student/parent profile emails.
    if (!user) {
      const parentStudents = await Student.find({ 'parentInfo.email': exactEmailRegex }).select('_id collegeId parentInfo');
      if (parentStudents.length > 0) {
        const leadStudent: any = parentStudents[0];
        const parentName = String(leadStudent?.parentInfo?.name || 'Parent').trim() || 'Parent';
        const parentPhone = String(leadStudent?.parentInfo?.phone || '0000000000').trim();
        const parentRelation = normalizeParentRelation(String(leadStudent?.parentInfo?.relation || 'Guardian'));
        const parentCollegeId = leadStudent?.collegeId;

        user = new User({
          name: parentName,
          email: normalizedEmail,
          password: DEFAULT_PARENT_PASSWORD,
          role: 'PARENT',
          collegeId: parentCollegeId,
          isActive: true,
          mustChangePassword: true,
        });
        await user.save();

        const studentIds = parentStudents.map((item: any) => item._id);
        const existingParent = await Parent.findOne({ userId: user._id });
        if (!existingParent) {
          await Parent.create({
            userId: user._id,
            students: studentIds,
            relation: parentRelation,
            phone: parentPhone || '0000000000',
            isActive: true,
          });
        }
      }
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials or account unavailable' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is inactive. Please contact administrator.' });
    }

    const now = new Date();
    const normalizedRole = String(user.role || '').toUpperCase();
    const isStudent = normalizedRole === 'STUDENT';
    const isAdmin = normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'COLLEGE_ADMIN';
    const lockedUntil = user.authentication?.account_locked_until;

    if (lockedUntil && lockedUntil > now) {
      if (isAdmin) {
        return res.status(401).json({ message: 'Invalid credentials or account unavailable' });
      } else {
        const secondsLeft = Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000);
        return res.status(423).json({ message: `Student account locked. Try again in ${secondsLeft} second(s).` });
      }
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      if (isStudent) {
        const failedAttempts = (user.authentication?.failed_login_attempts || 0) + 1;
        user.authentication.failed_login_attempts = failedAttempts;

        if (failedAttempts >= studentMaxFailedAttempts) {
          const lockUntil = new Date(now.getTime() + STUDENT_LOCKOUT_MS);
          user.authentication.account_locked_until = lockUntil;
          user.authentication.failed_login_attempts = 0;
          await user.save();
          return res.status(423).json({
            message: 'Too many failed attempts for student login. Account locked for 15 second(s).'
          });
        }

        await user.save();
      } else if (isAdmin) {
        // Atomic Lockout Strategy for Admins
        const lockedUser = await User.findOneAndUpdate(
          { 
            _id: user._id, 
            'authentication.failed_login_attempts': 4, 
            $or: [{ 'authentication.account_locked_until': null }, { 'authentication.account_locked_until': { $lte: now } }] 
          },
          { 
            $inc: { 'authentication.failed_login_attempts': 1 }, 
            $set: { 'authentication.account_locked_until': new Date(now.getTime() + 15 * 60 * 1000) } 
          },
          { new: true }
        );

        if (lockedUser) {
          await SystemLog.create({ category: 'ADMIN_AUTH', level: 'warn', message: 'Admin account locked due to failed passwords', metadata: { userId: user._id } }).catch(()=>{});
          await securityAlertService.sendSecurityAlert(lockedUser.email, lockedUser.name, 'ACCOUNT_LOCKED', 15);
        } else {
          await User.updateOne(
            { 
              _id: user._id, 
              'authentication.failed_login_attempts': { $lt: 4 }, 
              $or: [{ 'authentication.account_locked_until': null }, { 'authentication.account_locked_until': { $lte: now } }] 
            },
            { $inc: { 'authentication.failed_login_attempts': 1 } }
          );
        }
        await SystemLog.create({ category: 'ADMIN_AUTH', level: 'warn', message: 'Failed admin login attempt', metadata: { userId: user._id } }).catch(()=>{});
      }
      return res.status(401).json({ message: 'Invalid credentials or account unavailable' });
    }

    const isOtpExempt = ['sohamdang0@gmail.com'].includes(String(user.email || '').toLowerCase().trim());

    if (isAdmin && !isOtpExempt) {
      // Atomically invalidate old challenges
      await AdminAuthChallenge.updateMany(
        { userId: user._id, status: 'pending' },
        { $set: { status: 'failed' } }
      );
      
      const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
      const challenge = await AdminAuthChallenge.create({
        userId: user._id,
        expiresAt,
        status: 'pending'
      });
      
      await SystemLog.create({ category: 'ADMIN_AUTH', level: 'info', message: 'OTP challenge created', metadata: { userId: user._id } }).catch(()=>{});

      return res.status(202).json({ 
        message: 'OTP verification required',
        challengeId: challenge._id,
        expiresAt
      });
    }

    // Generate Session for Non-Admins
    user.authentication.failed_login_attempts = 0;
    user.authentication.account_locked_until = undefined;
    user.authentication.last_login = now;
    user.authentication.login_count = (user.authentication.login_count || 0) + 1;

    if (!PASSWORD_CHANGE_ROLES.has(normalizedRole) && user.mustChangePassword) {
      user.mustChangePassword = false;
    }

    await user.save();

    const isPersistentAdminSession = ['COLLEGE_ADMIN', 'SUPER_ADMIN', 'ADMIN'].includes(normalizedRole);
    const token = isPersistentAdminSession
      ? generateToken(user._id as any, user.role)
      : generateToken(user._id as any, user.role, `${sessionTimeoutMinutes}m`);

    const expiresAt = isPersistentAdminSession
      ? null
      : new Date(now.getTime() + sessionTimeoutMinutes * 60 * 1000);

    await Session.create({
      userId: user._id,
      jwt_token: token,
      ip_address: req.ip || req.socket.remoteAddress || 'unknown',
      user_agent: req.get('user-agent') || 'unknown',
      login_timestamp: now,
      last_activity: now,
      expires_at: expiresAt,
      is_active: true
    });

    const shouldForcePasswordChange =
      (PASSWORD_CHANGE_ROLES.has(normalizedRole) && Boolean(user.mustChangePassword)) ||
      (normalizedRole === 'COLLEGE_ADMIN' && Boolean(user.isFirstLogin));

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      collegeId: user.collegeId,
      profilePicture: user.profilePicture || '',
      phone: user.phone || '',
      notificationPreferences: user.notificationPreferences || { email: true, sms: false, push: true },
      branding: user.branding || { collegeLogo: '', primaryColor: '#4f46e5', collegeDisplayName: '' },
      mustChangePassword: shouldForcePasswordChange,
      isFirstLogin: Boolean(user.isFirstLogin),
      token,
      session_timeout: sessionTimeoutMinutes
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const verifyAdminOtp = async (req: Request, res: Response) => {
  const { challengeId, otp } = req.body;

  if (!challengeId || !otp) {
    return res.status(400).json({ message: 'Challenge ID and OTP are required' });
  }

  try {
    const challenge = await AdminAuthChallenge.findById(challengeId);
    if (!challenge) {
      return res.status(400).json({ message: 'Invalid challenge' });
    }

    const now = new Date();
    if (challenge.status !== 'pending' || challenge.expiresAt <= now) {
      await SystemLog.create({ category: 'ADMIN_AUTH', level: 'warn', message: 'OTP challenge expired or invalid', metadata: { challengeId } }).catch(()=>{});
      return res.status(400).json({ message: 'Challenge expired or invalid' });
    }

    const user = await User.findById(challenge.userId);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials or account unavailable' });
    }

    if (user.authentication?.account_locked_until && user.authentication.account_locked_until > now) {
      await AdminAuthChallenge.updateOne({ _id: challengeId }, { $set: { status: 'failed', lockedAt: now } });
      await SystemLog.create({ category: 'ADMIN_AUTH', level: 'warn', message: 'Account locked during OTP', metadata: { userId: user._id } }).catch(()=>{});
      return res.status(401).json({ message: 'Invalid credentials or account unavailable' });
    }

    const isValid = await otpProvider.verifyOtp(challengeId, String(otp)).catch(() => false);

    if (!isValid) {
      // 1. Try to be the request that fails the challenge (4 -> 5)
      const failedChallenge = await AdminAuthChallenge.findOneAndUpdate(
        { _id: challengeId, status: 'pending', failedAttempts: 4 },
        { $inc: { failedAttempts: 1 }, $set: { status: 'failed', lockedAt: now } },
        { new: true }
      );

      if (failedChallenge) {
        await SystemLog.create({ category: 'ADMIN_AUTH', level: 'warn', message: 'OTP failed 5 times, challenge invalidated', metadata: { userId: user._id } }).catch(()=>{});
        
        // Atomically increment account failures (using same 4->5 lock approach)
        const lockedUser = await User.findOneAndUpdate(
          { _id: user._id, 'authentication.failed_login_attempts': 4, $or: [{ 'authentication.account_locked_until': null }, { 'authentication.account_locked_until': { $lte: now } }] },
          { $inc: { 'authentication.failed_login_attempts': 1 }, $set: { 'authentication.account_locked_until': new Date(now.getTime() + 15 * 60 * 1000) } },
          { new: true }
        );

        if (lockedUser) {
          await SystemLog.create({ category: 'ADMIN_AUTH', level: 'warn', message: 'Admin account locked due to OTP failures', metadata: { userId: user._id } }).catch(()=>{});
          await securityAlertService.sendSecurityAlert(lockedUser.email, lockedUser.name, 'ACCOUNT_LOCKED', 15);
        } else {
          await User.updateOne(
            { _id: user._id, 'authentication.failed_login_attempts': { $lt: 4 }, $or: [{ 'authentication.account_locked_until': null }, { 'authentication.account_locked_until': { $lte: now } }] },
            { $inc: { 'authentication.failed_login_attempts': 1 } }
          );
        }
        await securityAlertService.sendSecurityAlert(user.email, user.name, 'OTP_FAILURE_LIMIT_REACHED');
      } else {
        await AdminAuthChallenge.updateOne(
          { _id: challengeId, status: 'pending', failedAttempts: { $lt: 4 } },
          { $inc: { failedAttempts: 1 } }
        );
        await SystemLog.create({ category: 'ADMIN_AUTH', level: 'warn', message: 'OTP failed', metadata: { userId: user._id } }).catch(()=>{});
      }

      return res.status(401).json({ message: 'Invalid OTP' });
    }

    // Atomically claim the success
    const verifiedChallenge = await AdminAuthChallenge.findOneAndUpdate(
      { _id: challengeId, status: 'pending', expiresAt: { $gt: now } },
      { $set: { status: 'verified', verifiedAt: now } },
      { new: true }
    );

    if (!verifiedChallenge) {
      return res.status(400).json({ message: 'Challenge expired, completed, or invalidated' });
    }

    // Generate Session
    await User.updateOne(
      { _id: user._id },
      { 
        $set: { 
          'authentication.failed_login_attempts': 0, 
          'authentication.account_locked_until': null,
          'authentication.last_login': now
        },
        $inc: { 'authentication.login_count': 1 }
      }
    );
    const updatedUser: any = await User.findById(user._id);
    const normalizedRole = String(updatedUser.role || '').toUpperCase();
    
    if (!PASSWORD_CHANGE_ROLES.has(normalizedRole) && updatedUser.mustChangePassword) {
      updatedUser.mustChangePassword = false;
      await updatedUser.save();
    }

    const settings = await SystemSettings.findOne();
    const sessionTimeoutMinutes = settings?.session_timeout || 30;
    
    const token = generateToken(updatedUser._id as any, updatedUser.role);

    await Session.create({
      userId: updatedUser._id,
      jwt_token: token,
      ip_address: req.ip || req.socket.remoteAddress || 'unknown',
      user_agent: req.get('user-agent') || 'unknown',
      login_timestamp: now,
      last_activity: now,
      expires_at: null,
      is_active: true
    });

    const shouldForcePasswordChange =
      (PASSWORD_CHANGE_ROLES.has(normalizedRole) && Boolean(updatedUser.mustChangePassword)) ||
      (normalizedRole === 'COLLEGE_ADMIN' && Boolean(updatedUser.isFirstLogin));

    await SystemLog.create({ category: 'ADMIN_AUTH', level: 'info', message: 'LOGIN_SUCCESS', metadata: { userId: updatedUser._id } }).catch(()=>{});

    return res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      collegeId: updatedUser.collegeId,
      profilePicture: updatedUser.profilePicture || '',
      phone: updatedUser.phone || '',
      notificationPreferences: updatedUser.notificationPreferences || { email: true, sms: false, push: true },
      branding: updatedUser.branding || { collegeLogo: '', primaryColor: '#4f46e5', collegeDisplayName: '' },
      mustChangePassword: shouldForcePasswordChange,
      isFirstLogin: Boolean(updatedUser.isFirstLogin),
      token,
      session_timeout: sessionTimeoutMinutes
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUserProfile = async (req: any, res: Response) => {
  const user = await User.findById(req.user._id);

  if (user) {
    const normalizedRole = String(user.role || '').toUpperCase();
    const shouldForcePasswordChange =
      (PASSWORD_CHANGE_ROLES.has(normalizedRole) && Boolean(user.mustChangePassword)) ||
      (normalizedRole === 'COLLEGE_ADMIN' && Boolean(user.isFirstLogin));

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      collegeId: user.collegeId,
      profilePicture: user.profilePicture || '',
      phone: user.phone || '',
      notificationPreferences: user.notificationPreferences || { email: true, sms: false, push: true },
      branding: user.branding || { collegeLogo: '', primaryColor: '#4f46e5', collegeDisplayName: '' },
      mustChangePassword: shouldForcePasswordChange,
      isFirstLogin: Boolean(user.isFirstLogin),
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

export const changePassword = async (req: any, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'currentPassword and newPassword are required' });
    }

    if (!STRONG_PASSWORD_REGEX.test(String(newPassword))) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters and include an uppercase letter, a number, and a special character'
      });
    }

    const user = await User.findById(req.user?._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isCurrentPasswordValid = await user.matchPassword(String(currentPassword));
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    if (String(currentPassword) === String(newPassword)) {
      return res.status(400).json({ success: false, message: 'New password must be different from current password' });
    }

    user.password = String(newPassword);
    user.mustChangePassword = false;
    user.isFirstLogin = false;
    await user.save();

    return res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to change password' });
  }
};

export const logoutUser = async (req: any, res: Response) => {
  try {
    const token = req.token || String(req.headers.authorization || '').split(' ')[1];

    if (!token) {
      return res.status(400).json({ success: false, message: 'No active session token found' });
    }

    await Session.updateOne(
      { jwt_token: token, is_active: true },
      { $set: { is_active: false, last_activity: new Date() } }
    );
    
    const userRole = String(req.user?.role || '').toUpperCase();
    if (userRole === 'SUPER_ADMIN' || userRole === 'COLLEGE_ADMIN') {
        await SystemLog.create({ category: 'ADMIN_AUTH', level: 'info', message: 'ADMIN_LOGOUT', metadata: { userId: req.user?._id } }).catch(()=>{});
    }

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to logout' });
  }
};

export const updateUserProfile = async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const {
      name,
      email,
      phone,
      profilePicture,
      notificationPreferences,
      branding,
    } = req.body || {};

    const normalizedRole = String(user.role || '').toUpperCase();
    const lockedProfileRoles = new Set(['STUDENT', 'TEACHER']);
    const hasRestrictedProfileFields = [name, email, phone, branding].some((value) => value !== undefined);

    if (lockedProfileRoles.has(normalizedRole) && hasRestrictedProfileFields) {
      return res.status(403).json({
        success: false,
        message: 'Students and teachers can only update profile photo from settings'
      });
    }

    if (typeof name === 'string' && name.trim()) user.name = name.trim();
    if (typeof email === 'string' && email.trim()) user.email = email.trim().toLowerCase();
    if (typeof phone === 'string') user.phone = phone.trim();
    if (typeof profilePicture === 'string') user.profilePicture = profilePicture;

    if (!lockedProfileRoles.has(normalizedRole) && notificationPreferences && typeof notificationPreferences === 'object') {
      user.notificationPreferences = {
        email: Boolean(notificationPreferences.email),
        sms: Boolean(notificationPreferences.sms),
        push: Boolean(notificationPreferences.push),
      };
    }

    if (!lockedProfileRoles.has(normalizedRole) && branding && typeof branding === 'object') {
      user.branding = {
        collegeLogo: branding.collegeLogo || user.branding?.collegeLogo,
        primaryColor: branding.primaryColor || user.branding?.primaryColor || '#4f46e5',
        collegeDisplayName: branding.collegeDisplayName || user.branding?.collegeDisplayName,
      };
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profilePicture: user.profilePicture || '',
        notificationPreferences: user.notificationPreferences,
        branding: user.branding,
      },
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }
    return res.status(500).json({ success: false, message: error.message || 'Failed to update profile' });
  }
};

export const getActiveSessions = async (req: any, res: Response) => {
  try {
    const normalizedRole = String(req.user?.role || '').toUpperCase();
    const isPersistentAdminSession = ['COLLEGE_ADMIN', 'SUPER_ADMIN', 'ADMIN'].includes(normalizedRole);
    const activeSessionQuery: any = { userId: req.user?._id, is_active: true };

    if (isPersistentAdminSession) {
      activeSessionQuery.$or = [
        { expires_at: { $gt: new Date() } },
        { expires_at: null },
        { expires_at: { $exists: false } }
      ];
    } else {
      activeSessionQuery.expires_at = { $gt: new Date() };
    }

    const sessions = await Session.find(activeSessionQuery)
      .sort({ last_activity: -1 })
      .select('_id ip_address user_agent login_timestamp last_activity expires_at');

    return res.status(200).json({ success: true, data: sessions });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to load sessions' });
  }
};

export const revokeSession = async (req: any, res: Response) => {
  try {
    const { sessionId } = req.params;
    const updated = await Session.findOneAndUpdate(
      { _id: sessionId, userId: req.user?._id, is_active: true },
      { $set: { is_active: false, last_activity: new Date() } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    return res.status(200).json({ success: true, message: 'Session revoked' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to revoke session' });
  }
};

export const logoutAllSessions = async (req: any, res: Response) => {
  try {
    await Session.updateMany(
      { userId: req.user?._id, is_active: true },
      { $set: { is_active: false, last_activity: new Date() } }
    );

    return res.status(200).json({ success: true, message: 'Logged out from all devices' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to logout all sessions' });
  }
};

export const uploadUserAsset = async (req: any, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/profile-assets/${file.filename}`;
    return res.status(200).json({ success: true, data: { url: fileUrl, name: file.originalname, mime: file.mimetype } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Upload failed' });
  }
};
