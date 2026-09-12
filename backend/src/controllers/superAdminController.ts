import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import College from '../models/College.js';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import Parent from '../models/Parent.js';
import AuditLog from '../models/AuditLog.js';
import SystemSettings from '../models/SystemSettings.js';
import Session from '../models/Session.js';

interface AuthRequest extends Request {
  user?: any;
}

const PASSWORD_CHANGE_ROLES = new Set(['STUDENT', 'TEACHER', 'PARENT', 'LIBRARIAN']);

// =====================
// COLLEGE MANAGEMENT
// =====================

export const createCollege = async (req: AuthRequest, res: Response) => {
  try {
    const { code, name, email, phone, website, location, adminId, affiliation, established_year, subscription, settings } = req.body;

    const existingCollege = await College.findOne({ $or: [{ code }, { name }] });
    if (existingCollege) {
      return res.status(400).json({ success: false, message: 'College code or name already exists' });
    }

    const college = new College({
      code,
      name,
      email,
      phone,
      website,
      location,
      adminId,
      affiliation,
      established_year,
      subscription: subscription || {
        plan: 'basic',
        status: 'active',
        start_date: new Date(),
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        max_students: 500,
        max_teachers: 50,
        max_admins: 5
      },
      settings: settings || {
        academic_year: '2024-2025',
        semester_system: true,
        batch_size: 'default',
        grading_scale: '10.0'
      }
    });

    await college.save();

    if (!college.adminId && college.email) {
      const normalizedEmail = String(college.email).trim().toLowerCase();
      const existingAdmin = await User.findOne({ email: normalizedEmail });

      if (!existingAdmin) {
        const createdAdmin = await User.create({
          name: `${String(college.name || 'College').trim()} Admin`,
          email: normalizedEmail,
          password: 'ChangeMe123!',
          role: 'COLLEGE_ADMIN',
          isFirstLogin: true,
          collegeId: college._id,
          phone: college.phone,
          isActive: true,
          authentication: {
            two_factor_enabled: false,
            two_factor_method: 'email',
            login_count: 0,
            failed_login_attempts: 0
          }
        });

        college.adminId = createdAdmin._id as any;
        await college.save();
      }
    }

    // Log audit
    await logAudit(
      req.user?.id || 'unknown',
      'CREATE',
      'College',
      college._id.toString(),
      'success',
      undefined,
      {
        summary: 'College created',
        created: {
          name: college.name,
          code: college.code,
          email: college.email,
          status: college.status
        }
      }
    );

    res.status(201).json({ success: true, data: college, message: 'College created successfully' });
  } catch (error: any) {
    await logAudit(req.user?.id || 'unknown', 'CREATE', 'College', '', 'failure', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllColleges = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = ((Number(page) - 1) * Number(limit));

    let filter: any = {};
    if (status) filter.status = status;
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];

    const colleges = await College.find(filter)
      .populate('adminId', 'name email')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await College.countDocuments(filter);

    res.json({
      success: true,
      data: colleges,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCollegeById = async (req: AuthRequest, res: Response) => {
  try {
    const collegeId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const college = await College.findById(collegeId).populate('adminId', 'name email');
    if (!college) {
      return res.status(404).json({ success: false, message: 'College not found' });
    }
    res.json({ success: true, data: college });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCollege = async (req: AuthRequest, res: Response) => {
  try {
    const collegeId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { code, name, email, phone, website, location, adminId, subscription, settings, status, is_verified } = req.body;

    const college = await College.findById(collegeId);
    if (!college) {
      return res.status(404).json({ success: false, message: 'College not found' });
    }

    const oldData = college.toObject();
    const updateData: Record<string, any> = {};

    if (typeof code === 'string') {
      const trimmedCode = code.trim();
      if (!trimmedCode) {
        return res.status(400).json({ success: false, message: 'College code is required' });
      }
      if (trimmedCode !== college.code) {
        const existing = await College.findOne({ code: trimmedCode, _id: { $ne: collegeId } });
        if (existing) {
          return res.status(400).json({ success: false, message: 'College code already exists' });
        }
      }
      updateData.code = trimmedCode;
    }

    if (typeof name === 'string') {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({ success: false, message: 'College name is required' });
      }
      updateData.name = trimmedName;
    }

    if (typeof email === 'string') {
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        return res.status(400).json({ success: false, message: 'College email is required' });
      }
      updateData.email = trimmedEmail;
    }

    if (typeof phone === 'string') {
      const trimmedPhone = phone.trim();
      if (!trimmedPhone) {
        return res.status(400).json({ success: false, message: 'College phone is required' });
      }
      updateData.phone = trimmedPhone;
    }

    if (typeof website === 'string') {
      updateData.website = website.trim();
    }

    if (location && typeof location === 'object') {
      updateData.location = { ...college.location, ...location };
    }

    if (adminId) {
      updateData.adminId = adminId;
    }

    if (subscription && typeof subscription === 'object') {
      updateData.subscription = { ...college.subscription, ...subscription };
    }

    if (settings && typeof settings === 'object') {
      updateData.settings = { ...college.settings, ...settings };
    }

    if (typeof status === 'string') {
      const normalizedStatus = status.trim();
      if (!['active', 'inactive', 'suspended'].includes(normalizedStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid college status' });
      }
      updateData.status = normalizedStatus;
    }

    if (typeof is_verified === 'boolean') {
      updateData.is_verified = is_verified;
    }

    if (Object.keys(updateData).length === 0) {
      return res.json({ success: true, data: college, message: 'No changes to update' });
    }

    const updatedCollege = await College.findByIdAndUpdate(
      collegeId,
      { $set: updateData },
      { new: true, runValidators: true, context: 'query' }
    );

    if (!updatedCollege) {
      return res.status(404).json({ success: false, message: 'College not found' });
    }

    // Keep linked college admin user in sync when core college contact data changes.
    const shouldSyncAdminUser = typeof email === 'string' || typeof phone === 'string' || typeof name === 'string' || !!adminId;
    if (shouldSyncAdminUser) {
      let resolvedAdminId: any = updateData.adminId || updatedCollege.adminId;

      if (!resolvedAdminId) {
        const fallbackAdmin = await User.findOne({ collegeId: updatedCollege._id, role: 'COLLEGE_ADMIN' }).select('_id');
        resolvedAdminId = fallbackAdmin?._id;
      }

      if (resolvedAdminId) {
        const adminUser = await User.findOne({ _id: resolvedAdminId, role: 'COLLEGE_ADMIN' });
        if (adminUser) {
          if (typeof email === 'string') {
            const normalizedEmail = email.trim().toLowerCase();
            if (normalizedEmail && normalizedEmail !== String(adminUser.email || '').toLowerCase()) {
              const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: adminUser._id } });
              if (existingUser) {
                return res.status(400).json({ success: false, message: 'College admin email already in use' });
              }
              adminUser.email = normalizedEmail;
            }
          }

          if (typeof phone === 'string') {
            adminUser.phone = phone.trim();
          }

          if (typeof name === 'string' && name.trim()) {
            adminUser.name = `${name.trim()} Admin`;
          }

          if (typeof status === 'string') {
            adminUser.isActive = status.trim() === 'active';
          }

          await adminUser.save();
        }
      } else if (typeof email === 'string' && email.trim()) {
        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (!existingUser) {
          const createdAdmin = await User.create({
            name: `${String(name || updatedCollege.name || 'College').trim()} Admin`,
            email: normalizedEmail,
            password: 'ChangeMe123!',
            role: 'COLLEGE_ADMIN',
            isFirstLogin: true,
            collegeId: updatedCollege._id,
            phone: typeof phone === 'string' ? phone.trim() : undefined,
            isActive: typeof status === 'string' ? status.trim() === 'active' : true,
            authentication: {
              two_factor_enabled: false,
              two_factor_method: 'email',
              login_count: 0,
              failed_login_attempts: 0
            }
          });

          updatedCollege.adminId = createdAdmin._id as any;
          await updatedCollege.save();
        }
      }
    }

    // Log audit
    const changes = await summarizeObjectChanges(oldData, updatedCollege.toObject());
    await logAudit(req.user?.id || 'unknown', 'UPDATE', 'College', updatedCollege._id.toString(), 'success', undefined, changes);

    res.json({ success: true, data: updatedCollege, message: 'College updated successfully' });
  } catch (error: any) {
    if (error?.code === 11000) {
      const duplicateField = Object.keys(error?.keyPattern || {})[0] || 'field';
      return res.status(400).json({ success: false, message: `${duplicateField} already exists` });
    }

    if (error?.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }

    await logAudit(req.user?.id || 'unknown', 'UPDATE', 'College', (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id), 'failure', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCollege = async (req: AuthRequest, res: Response) => {
  try {
    const collegeId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const college = await College.findByIdAndDelete(collegeId);
    if (!college) {
      return res.status(404).json({ success: false, message: 'College not found' });
    }

    // Log audit
    await logAudit(
      req.user?.id || 'unknown',
      'DELETE',
      'College',
      collegeId,
      'success',
      undefined,
      {
        summary: 'College deleted',
        deleted: {
          name: college.name,
          code: college.code,
          email: college.email,
          status: college.status
        }
      }
    );

    res.json({ success: true, message: 'College deleted successfully' });
  } catch (error: any) {
    const collegeId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await logAudit(req.user?.id || 'unknown', 'DELETE', 'College', collegeId, 'failure', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCollegeAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const collegeId = Array.isArray(req.params.collegeId) ? req.params.collegeId[0] : req.params.collegeId;

    const studentCount = await Student.countDocuments({ collegeId });
    const teacherCount = await Faculty.countDocuments({ collegeId });
    const adminCount = await User.countDocuments({ collegeId, role: 'COLLEGE_ADMIN' });

    const college = await College.findById(collegeId);

    res.json({
      success: true,
      data: {
        collegeId,
        collegeName: college?.name,
        students: studentCount,
        teachers: teacherCount,
        admins: adminCount,
        subscription: college?.subscription,
        modules: college?.modules_enabled,
        status: college?.status
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportCollegesCsv = async (req: AuthRequest, res: Response) => {
  try {
    const { status, search } = req.query;
    const filter: any = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const colleges = await College.find(filter)
      .select('code name email phone status is_verified createdAt subscription')
      .sort({ createdAt: -1 })
      .lean();

    const headers = ['Code', 'Name', 'Email', 'Phone', 'Status', 'Verified', 'Plan', 'CreatedAt'];
    const rows = colleges.map((college: any) => [
      escapeCsv(college.code),
      escapeCsv(college.name),
      escapeCsv(college.email),
      escapeCsv(college.phone),
      escapeCsv(college.status),
      college.is_verified ? 'Yes' : 'No',
      escapeCsv(college.subscription?.plan || 'basic'),
      escapeCsv(new Date(college.createdAt).toISOString())
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="colleges-${Date.now()}.csv"`);
    res.status(200).send(csv);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const bulkImportColleges = async (req: AuthRequest, res: Response) => {
  try {
    const { colleges } = req.body;
    if (!Array.isArray(colleges) || colleges.length === 0) {
      return res.status(400).json({ success: false, message: 'colleges must be a non-empty array' });
    }

    let created = 0;
    let skipped = 0;
    const errors: Array<{ index: number; reason: string }> = [];

    for (let i = 0; i < colleges.length; i++) {
      const college = colleges[i];
      const { code, name, email, phone } = college || {};

      if (!code || !name || !email || !phone) {
        skipped++;
        errors.push({ index: i, reason: 'Missing required fields: code, name, email, phone' });
        continue;
      }

      const exists = await College.findOne({ $or: [{ code }, { name }] });
      if (exists) {
        skipped++;
        errors.push({ index: i, reason: 'Duplicate college code or name' });
        continue;
      }

      try {
        await College.create({
          code,
          name,
          email,
          phone,
          website: college.website,
          location: {
            address: college.location?.address || 'N/A',
            city: college.location?.city || 'N/A',
            state: college.location?.state || 'N/A',
            pin_code: college.location?.pin_code || '000000',
            country: college.location?.country || 'India'
          },
          affiliation: college.affiliation,
          established_year: college.established_year,
          status: college.status || 'active'
        });
        created++;
      } catch (err: any) {
        skipped++;
        errors.push({ index: i, reason: err.message || 'Failed to create college' });
      }
    }

    await logAudit(req.user?.id || 'unknown', 'CREATE', 'College', `bulk_import_${created}`);
    res.status(200).json({
      success: true,
      message: 'College bulk import completed',
      data: {
        total: colleges.length,
        created,
        skipped,
        errors
      }
    });
  } catch (error: any) {
    await logAudit(req.user?.id || 'unknown', 'CREATE', 'College', 'bulk_import_failure', 'failure', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================
// USER MANAGEMENT
// =====================

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, role, status, collegeId, search } = req.query;
    const skip = ((Number(page) - 1) * Number(limit));

    let filter: any = {};
    if (role) filter.role = role;
    if (status) filter.isActive = status === 'active';
    if (collegeId) filter.collegeId = collegeId;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .populate('collegeId', 'name code')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: users,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await User.findById(userId)
      .select('-password')
      .populate('collegeId', 'name code email');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      email,
      password,
      role,
      collegeId,
      phone,
      profilePicture,
      dateOfBirth,
      gender,
      address,
      enrollmentNumber,
      course,
      batch,
      section,
      parentName,
      parentContact,
      employeeId,
      department,
      qualification,
      joiningDate,
      studentIds,
      relation
    } = req.body;

    const normalizedEmail = String(email || '').trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const normalizedRole = String(role || '').trim().toUpperCase();
    if (!name || !normalizedEmail || !password || !normalizedRole) {
      return res.status(400).json({ success: false, message: 'name, email, password and role are required' });
    }

    if (['STUDENT', 'TEACHER'].includes(normalizedRole) && !collegeId) {
      return res.status(400).json({ success: false, message: 'collegeId is required for Student and Teacher users' });
    }

    if (normalizedRole === 'PARENT') {
      const selectedStudents = Array.isArray(studentIds) ? studentIds.filter(Boolean) : [];
      if (!selectedStudents.length) {
        return res.status(400).json({ success: false, message: 'At least one student must be selected for a Parent account' });
      }
    }

    const user = new User({
      name,
      email: normalizedEmail,
      password,
      role: normalizedRole,
      collegeId: collegeId || undefined,
      phone,
      profilePicture,
      dateOfBirth,
      gender,
      address,
      enrollmentNumber,
      course,
      batch,
      section,
      parentName,
      parentContact,
      employeeId,
      department,
      qualification,
      joiningDate,
      mustChangePassword: PASSWORD_CHANGE_ROLES.has(normalizedRole),
      authentication: {
        two_factor_enabled: false,
        two_factor_method: 'email',
        login_count: 0,
        failed_login_attempts: 0
      }
    });

    await user.save();

    if (normalizedRole === 'PARENT') {
      const selectedStudents = Array.isArray(studentIds) ? studentIds.filter(Boolean) : [];
      await Parent.create({
        userId: user._id,
        students: selectedStudents,
        relation: relation || 'Guardian',
        phone: phone || '',
        isActive: true,
      });
    }

    // Log audit
    await logAudit(
      req.user?.id || 'unknown',
      'CREATE',
      'User',
      user._id.toString(),
      'success',
      undefined,
      {
        summary: 'User account created',
        created: {
          name: user.name,
          email: user.email,
          role: user.role,
          collegeId: user.collegeId || null,
          isActive: user.isActive
        }
      }
    );
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({ success: true, data: userResponse, message: 'User created successfully' });
  } catch (error: any) {
    await logAudit(req.user?.id || 'unknown', 'CREATE', 'User', '', 'failure', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const {
      name,
      email,
      role,
      phone,
      profilePicture,
      collegeId,
      dateOfBirth,
      gender,
      address,
      enrollmentNumber,
      course,
      batch,
      section,
      parentName,
      parentContact,
      employeeId,
      department,
      qualification,
      joiningDate,
      isActive
    } = req.body;

    const uploadedProfilePictureUrl = getUploadedFileUrl(req as any);
    const parsedIsActive = typeof isActive === 'string'
      ? isActive.toLowerCase() === 'true'
      : isActive;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const oldData = user.toObject();

    if (typeof email === 'string' && email.trim() && email.trim().toLowerCase() !== String(user.email || '').toLowerCase()) {
      const normalizedEmail = email.trim().toLowerCase();
      const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
      user.email = normalizedEmail;
    }

    const normalizedRole = typeof role === 'string' ? role.trim().toUpperCase() : undefined;

    if (typeof name === 'string') user.name = name;
    if (normalizedRole) user.role = normalizedRole as any;
    if (typeof phone === 'string') user.phone = phone;
    if (uploadedProfilePictureUrl) {
      user.profilePicture = uploadedProfilePictureUrl;
    } else if (typeof profilePicture === 'string') {
      const cleanedPicture = profilePicture.trim();
      if (cleanedPicture.startsWith('data:image/')) {
        return res.status(400).json({ success: false, message: 'Base64 profile pictures are not allowed. Upload an image file instead.' });
      }
      user.profilePicture = cleanedPicture || undefined;
    }
    if (typeof collegeId !== 'undefined') user.collegeId = collegeId || undefined;
    if (typeof dateOfBirth !== 'undefined') user.dateOfBirth = dateOfBirth || undefined;
    if (typeof gender !== 'undefined') user.gender = gender || undefined;
    if (typeof address === 'string' || address === null) user.address = address || undefined;
    if (typeof enrollmentNumber === 'string' || enrollmentNumber === null) user.enrollmentNumber = enrollmentNumber || undefined;
    if (typeof course === 'string' || course === null) user.course = course || undefined;
    if (typeof batch === 'string' || batch === null) user.batch = batch || undefined;
    if (typeof section === 'string' || section === null) user.section = section || undefined;
    if (typeof parentName === 'string' || parentName === null) user.parentName = parentName || undefined;
    if (typeof parentContact === 'string' || parentContact === null) user.parentContact = parentContact || undefined;
    if (typeof employeeId === 'string' || employeeId === null) user.employeeId = employeeId || undefined;
    if (typeof department === 'string' || department === null) user.department = department || undefined;
    if (typeof qualification === 'string' || qualification === null) user.qualification = qualification || undefined;
    if (typeof joiningDate !== 'undefined') user.joiningDate = joiningDate || undefined;
    if (typeof parsedIsActive === 'boolean') user.isActive = parsedIsActive;

    const effectiveRole = String((normalizedRole || user.role || '')).toUpperCase();
    if (!PASSWORD_CHANGE_ROLES.has(effectiveRole)) {
      user.mustChangePassword = false;
    }

    await user.save();

    // If role/status changed, invalidate only the target user's sessions (never the acting admin's session).
    const requesterId = String(req.user?._id || req.user?.id || '');
    const targetUserId = String(user._id);
    const roleChanged = oldData.role !== user.role;
    const activeChanged = oldData.isActive !== user.isActive;
    if ((roleChanged || activeChanged) && requesterId && requesterId !== targetUserId) {
      await Session.updateMany(
        { userId: user._id, is_active: true },
        { $set: { is_active: false, last_activity: new Date() } }
      );
    }

    // Log audit
    const changes = await summarizeObjectChanges(oldData, user.toObject());
    await logAudit(req.user?.id || 'unknown', 'UPDATE', 'User', user._id.toString(), 'success', undefined, changes);

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ success: true, data: userResponse, message: 'User updated successfully' });
  } catch (error: any) {
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await logAudit(req.user?.id || 'unknown', 'UPDATE', 'User', userId, 'failure', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Log audit
    await logAudit(
      req.user?.id || 'unknown',
      'DELETE',
      'User',
      userId,
      'success',
      undefined,
      {
        summary: 'User account deleted',
        deleted: {
          name: user.name,
          email: user.email,
          role: user.role,
          collegeId: user.collegeId || null
        }
      }
    );

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await logAudit(req.user?.id || 'unknown', 'DELETE', 'User', userId, 'failure', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const resetUserPassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { newPassword } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.password = newPassword;
  user.mustChangePassword = PASSWORD_CHANGE_ROLES.has(String(user.role || '').toUpperCase());
    await user.save();

    // Log audit
    await logAudit(req.user?.id || 'unknown', 'UPDATE', 'User_Password', user._id.toString());

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error: any) {
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await logAudit(req.user?.id || 'unknown', 'UPDATE', 'User_Password', userId, 'failure', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportUsersCsv = async (req: AuthRequest, res: Response) => {
  try {
    const { role, status, search } = req.query;
    const filter: any = {};
    if (role) filter.role = role;
    if (status) filter.isActive = status === 'active';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('name email role isActive authentication collegeId createdAt')
      .populate('collegeId', 'name code')
      .sort({ createdAt: -1 })
      .lean();

    const headers = ['Name', 'Email', 'Role', 'Status', 'College', 'LoginCount', 'LastLogin', 'CreatedAt'];
    const rows = users.map((user: any) => [
      escapeCsv(user.name),
      escapeCsv(user.email),
      escapeCsv(user.role),
      user.isActive ? 'Active' : 'Inactive',
      escapeCsv(user.collegeId?.name || ''),
      escapeCsv(String(user.authentication?.login_count || 0)),
      escapeCsv(user.authentication?.last_login ? new Date(user.authentication.last_login).toISOString() : ''),
      escapeCsv(new Date(user.createdAt).toISOString())
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="users-${Date.now()}.csv"`);
    res.status(200).send(csv);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const bulkImportUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { users, defaultPassword } = req.body;
    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ success: false, message: 'users must be a non-empty array' });
    }

    let created = 0;
    let skipped = 0;
    const errors: Array<{ index: number; reason: string }> = [];

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const { name, email } = user || {};
      const password = user?.password || defaultPassword || 'ChangeMe123!';

      if (!name || !email) {
        skipped++;
        errors.push({ index: i, reason: 'Missing required fields: name, email' });
        continue;
      }

      const exists = await User.findOne({ email });
      if (exists) {
        skipped++;
        errors.push({ index: i, reason: 'Duplicate email' });
        continue;
      }

      try {
        await User.create({
          name,
          email,
          password,
          role: user.role || 'STUDENT',
          collegeId: user.collegeId,
          phone: user.phone,
          isActive: typeof user.isActive === 'boolean' ? user.isActive : true,
          authentication: {
            two_factor_enabled: false,
            two_factor_method: 'email',
            login_count: 0,
            failed_login_attempts: 0
          }
        });
        created++;
      } catch (err: any) {
        skipped++;
        errors.push({ index: i, reason: err.message || 'Failed to create user' });
      }
    }

    await logAudit(req.user?.id || 'unknown', 'CREATE', 'User', `bulk_import_${created}`);
    res.status(200).json({
      success: true,
      message: 'User bulk import completed',
      data: {
        total: users.length,
        created,
        skipped,
        errors
      }
    });
  } catch (error: any) {
    await logAudit(req.user?.id || 'unknown', 'CREATE', 'User', 'bulk_import_failure', 'failure', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================
// ANALYTICS & REPORTING
// =====================

export const getDashboardAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const totalColleges = await College.countDocuments();
    const totalUsers = await User.countDocuments();
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    const roleMap = usersByRole.reduce((acc: Record<string, number>, current: any) => {
      acc[String(current._id || '').toUpperCase()] = Number(current.count || 0);
      return acc;
    }, {} as Record<string, number>);

    const totalStudents = roleMap.STUDENT || 0;
    const totalTeachers = roleMap.TEACHER || 0;
    const totalAdmins = roleMap.COLLEGE_ADMIN || 0;
    const activeColleges = await College.countDocuments({ status: 'active' });
    const activeSessions = await Session.countDocuments({
      is_active: true,
      $or: [
        { expires_at: { $gt: new Date() } },
        { expires_at: null },
        { expires_at: { $exists: false } }
      ]
    });

    const collegesByStatus = await College.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        kpis: {
          totalColleges,
          totalUsers,
          totalStudents,
          totalTeachers,
          totalAdmins,
          activeColleges,
          activeSessions,
          systemHealth: 99.5
        },
        collegesByStatus,
        usersByRole
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCollegeAnalyticsComparison = async (req: AuthRequest, res: Response) => {
  try {
    const analyticsData = await buildCollegeUserMetrics();

    res.json({ success: true, data: analyticsData });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const monthlyNewUsers = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    const collegeMetrics = await buildCollegeUserMetrics();
    const usersByCollege = collegeMetrics.map((college: any) => ({
      _id: college.collegeId,
      count: (college.students || 0) + (college.teachers || 0) + (college.admins || 0),
      college: {
        _id: college.collegeId,
        name: college.collegeName,
      }
    }));

    res.json({
      success: true,
      data: {
        monthlyNewUsers,
        usersByCollege
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================
// AUDIT LOG MANAGEMENT
// =====================

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, userId, action, resource_type, search } = req.query;
    const skip = ((Number(page) - 1) * Number(limit));

    let filter: any = {};
    if (userId) filter.userId = userId;
    if (action) filter.action = action;
    if (resource_type) filter.resource_type = resource_type;
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' } as any;
      const matchingUsers = await User.find({
        $or: [
          { name: searchRegex },
          { email: searchRegex }
        ]
      }).select('_id');

      const matchingUserIds = matchingUsers.map((user) => user._id);
      filter.$or = [
        { resource_type: searchRegex },
        { resource_id: searchRegex },
        { action: searchRegex },
        { error_message: searchRegex },
        { userId: { $in: matchingUserIds } }
      ];
    }

    const logs = await AuditLog.find(filter)
      .populate('userId', 'name email role')
      .skip(skip)
      .limit(Number(limit))
      .sort({ timestamp: -1 });

    const total = await AuditLog.countDocuments(filter);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, action, resource_type, search } = req.query;

    const filter: any = {};
    if (userId) filter.userId = userId;
    if (action) filter.action = action;
    if (resource_type) filter.resource_type = resource_type;
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' } as any;
      const matchingUsers = await User.find({
        $or: [
          { name: searchRegex },
          { email: searchRegex }
        ]
      }).select('_id');

      const matchingUserIds = matchingUsers.map((user) => user._id);
      filter.$or = [
        { resource_type: searchRegex },
        { resource_id: searchRegex },
        { action: searchRegex },
        { error_message: searchRegex },
        { userId: { $in: matchingUserIds } },
      ];
    }

    const logs = await AuditLog.find(filter)
      .populate('userId', 'name email role')
      .sort({ timestamp: -1 })
      .lean();

    const headers = ['Timestamp', 'User', 'Email', 'Role', 'Action', 'Resource Type', 'Resource ID', 'Status', 'Error Message', 'Change Details'];
    const rows = logs.map((log: any) => [
      escapeCsv(log.timestamp ? new Date(log.timestamp).toISOString() : ''),
      escapeCsv(log.userId?.name || ''),
      escapeCsv(log.userId?.email || ''),
      escapeCsv(log.userId?.role || ''),
      escapeCsv(log.action || ''),
      escapeCsv(log.resource_type || ''),
      escapeCsv(log.resource_id || ''),
      escapeCsv(log.status || ''),
      escapeCsv(log.error_message || ''),
      escapeCsv(log.change_details ? JSON.stringify(log.change_details) : ''),
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
    res.status(200).send(csv);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const comparison = await buildCollegeUserMetrics();
    const collegesById = await College.find({ status: 'active' }).select('name code').lean();
    const codeMap = new Map(collegesById.map((college: any) => [String(college._id), college.code || '']));

    const comparisonRows = comparison.map((college: any) => [
      escapeCsv(college.collegeName || ''),
      escapeCsv(String(codeMap.get(String(college.collegeId)) || '')),
      String(college.students || 0),
      String(college.teachers || 0),
      String(college.admins || 0),
      String((college.students || 0) + (college.teachers || 0) + (college.admins || 0)),
    ]);

    const summaryHeaders = ['Metric', 'Value'];
    const totalColleges = await College.countDocuments();
    const totalUsers = await User.countDocuments();
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    const roleMap = usersByRole.reduce((acc: Record<string, number>, current: any) => {
      acc[String(current._id || '').toUpperCase()] = Number(current.count || 0);
      return acc;
    }, {} as Record<string, number>);
    const totalStudents = roleMap.STUDENT || 0;
    const totalTeachers = roleMap.TEACHER || 0;
    const totalAdmins = roleMap.COLLEGE_ADMIN || 0;

    const summaryRows = [
      ['Total Colleges', String(totalColleges)],
      ['Total Users', String(totalUsers)],
      ['Total Students', String(totalStudents)],
      ['Total Teachers', String(totalTeachers)],
      ['Total College Admins', String(totalAdmins)],
    ];

    const collegeHeaders = ['College', 'Code', 'Students', 'Teachers', 'Admins', 'Total Users'];
    const csvSections = [
      summaryHeaders.join(','),
      ...summaryRows.map((row) => row.map(escapeCsv).join(',')),
      '',
      collegeHeaders.join(','),
      ...comparisonRows.map((row) => row.join(',')),
    ];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="analytics-${Date.now()}.csv"`);
    res.status(200).send(csvSections.join('\n'));
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserActivityLog = async (req: AuthRequest, res: Response) => {
  try {
    const userActivityId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    const { page = 1, limit = 20 } = req.query;
    const skip = ((Number(page) - 1) * Number(limit));

    const logs = await AuditLog.find({ userId: userActivityId })
      .skip(skip)
      .limit(Number(limit))
      .sort({ timestamp: -1 });

    const total = await AuditLog.countDocuments({ userId: userActivityId });

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================
// HELPER FUNCTIONS
// =====================

async function buildCollegeUserMetrics() {
  const activeColleges = await College.find({ status: 'active' }).select('_id name').sort({ name: 1 }).lean();
  if (!activeColleges.length) {
    return [];
  }

  const collegeIds = activeColleges.map((college: any) => college._id);
  const perCollegeRoleCounts = await User.aggregate([
    {
      $match: {
        collegeId: { $in: collegeIds },
        role: { $in: ['STUDENT', 'TEACHER', 'COLLEGE_ADMIN'] }
      }
    },
    {
      $group: {
        _id: {
          collegeId: '$collegeId',
          role: '$role'
        },
        count: { $sum: 1 }
      }
    }
  ]);

  const keyedCounts = new Map<string, { students: number; teachers: number; admins: number }>();
  perCollegeRoleCounts.forEach((entry: any) => {
    const key = String(entry._id.collegeId);
    const current = keyedCounts.get(key) || { students: 0, teachers: 0, admins: 0 };
    const role = String(entry._id.role || '').toUpperCase();
    if (role === 'STUDENT') current.students = Number(entry.count || 0);
    if (role === 'TEACHER') current.teachers = Number(entry.count || 0);
    if (role === 'COLLEGE_ADMIN') current.admins = Number(entry.count || 0);
    keyedCounts.set(key, current);
  });

  return activeColleges.map((college: any) => {
    const counts = keyedCounts.get(String(college._id)) || { students: 0, teachers: 0, admins: 0 };
    return {
      collegeId: college._id,
      collegeName: college.name,
      students: counts.students,
      teachers: counts.teachers,
      admins: counts.admins,
    };
  });
}

function getUploadedFileUrl(req: any) {
  const file = req?.file;
  if (!file) return '';

  const filePath = String(file.path || file.url || '').trim();
  if (!filePath) return '';

  if (/^https?:\/\//i.test(filePath)) {
    return filePath;
  }

  const normalized = filePath.replace(/\\/g, '/');
  const cleaned = normalized.startsWith('/') ? normalized.slice(1) : normalized;
  const host = req.get('host');
  if (!host) return cleaned;
  return `${req.protocol || 'http'}://${host}/${cleaned}`;
}

async function summarizeObjectChanges(beforeObj: any, afterObj: any) {
  const before = flattenForDiff(beforeObj || {});
  const after = flattenForDiff(afterObj || {});

  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  const fields: Array<{ field: string; from: any; to: any }> = [];

  for (const key of keys) {
    if (isExcludedDiffPath(key)) continue;

    const from = normalizeDiffValue(before[key]);
    const to = normalizeDiffValue(after[key]);
    if (from === to) continue;

    fields.push({
      field: beautifyDiffPath(key),
      from: await resolveHumanValueForPath(key, from),
      to: await resolveHumanValueForPath(key, to)
    });
  }

  return {
    summary: fields.length ? `${fields.length} field(s) updated` : 'No value changes detected',
    fields
  };
}

function flattenForDiff(value: any, path = '', output: Record<string, any> = {}) {
  if (value === null || typeof value === 'undefined') {
    if (path) output[path] = null;
    return output;
  }

  if (Array.isArray(value)) {
    if (path) output[path] = value.map((item) => normalizeDiffValue(item)).join(', ');
    return output;
  }

  if (typeof value !== 'object' || value instanceof Date) {
    if (path) output[path] = value;
    return output;
  }

  const entries = Object.entries(value);
  if (!entries.length && path) {
    output[path] = '';
    return output;
  }

  for (const [key, nestedValue] of entries) {
    const nextPath = path ? `${path}.${key}` : key;
    flattenForDiff(nestedValue, nextPath, output);
  }

  return output;
}

function isExcludedDiffPath(path: string) {
  const excludedPathFragments = [
    'password',
    'authentication',
    '__v',
    'updatedAt',
    'createdAt',
    '_id',
    'tokens',
    'session',
    'permissions.role_based',
    'permissions.custom_permissions'
  ];

  return excludedPathFragments.some((fragment) => path === fragment || path.startsWith(`${fragment}.`));
}

function normalizeDiffValue(value: any) {
  if (value === null || typeof value === 'undefined') return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    if (value?._id) return String(value._id);
    if (value?.name) return String(value.name);
    return JSON.stringify(value);
  }
  return String(value);
}

function beautifyDiffPath(path: string) {
  const explicitLabels: Record<string, string> = {
    'location.city': 'City',
    'location.state': 'State',
    'location.country': 'Country',
    'location.address': 'Address',
    'subscription.plan': 'Subscription Plan',
    'subscription.status': 'Subscription Status',
    'collegeId': 'College',
    'adminId': 'College Admin',
    'role': 'Role',
    'isActive': 'Status'
  };

  if (explicitLabels[path]) return explicitLabels[path];

  return path
    .split('.')
    .map((chunk) => chunk.replace(/_/g, ' '))
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' > ');
}

async function resolveHumanValueForPath(path: string, value: any) {
  const stringValue = String(value || '').trim();
  if (!stringValue) return '-';

  const normalizedPath = path.toLowerCase();
  if (normalizedPath.includes('collegeid') || normalizedPath === 'adminid') {
    if (mongoose.Types.ObjectId.isValid(stringValue)) {
      if (normalizedPath.includes('collegeid')) {
        const college = await College.findById(stringValue).select('name').lean();
        if (college?.name) return college.name;
      }

      if (normalizedPath === 'adminid') {
        const admin = await User.findById(stringValue).select('name email').lean();
        if (admin?.name || admin?.email) return `${admin?.name || 'User'}${admin?.email ? ` (${admin.email})` : ''}`;
      }
    }
  }

  if (normalizedPath === 'isactive') {
    return ['true', '1'].includes(stringValue.toLowerCase()) ? 'active' : 'inactive';
  }

  return stringValue;
}

async function logAudit(
  userId: string | undefined,
  action: string,
  resource_type: string,
  resource_id: string,
  status: 'success' | 'failure' = 'success',
  error_message?: string,
  change_details?: any
) {
  try {
    const safeUserId = userId && mongoose.Types.ObjectId.isValid(userId) ? userId : undefined;
    const log = new AuditLog({
      userId: safeUserId,
      action,
      resource_type,
      resource_id,
      status,
      error_message,
      change_details,
      ip_address: process.env.REQUEST_IP || 'unknown',
      user_agent: process.env.REQUEST_USER_AGENT || 'unknown',
      timestamp: new Date()
    });
    await log.save();
  } catch (err) {
    console.error('Error logging audit:', err);
  }
}

function escapeCsv(value: string) {
  const normalized = String(value ?? '');
  const escaped = normalized.replace(/"/g, '""');
  return `"${escaped}"`;
}

// =====================
// SYSTEM SETTINGS
// =====================

export const getSystemSettings = async (req: AuthRequest, res: Response) => {
  try {
    const existing = await SystemSettings.findOne();
    const settings = existing || (await SystemSettings.create({}));
    res.json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSystemSettings = async (req: AuthRequest, res: Response) => {
  try {
    const settings = await SystemSettings.findOneAndUpdate(
      {},
      req.body,
      { new: true, upsert: true, runValidators: true }
    );

    await logAudit(req.user?.id || 'unknown', 'UPDATE', 'SystemSettings', 'global');

    res.json({ 
      success: true, 
      message: 'System settings updated successfully',
      data: settings
    });
  } catch (error: any) {
    await logAudit(req.user?.id || 'unknown', 'UPDATE', 'SystemSettings', 'global', 'failure', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPublicSystemSettings = async (req: Request, res: Response) => {
  try {
    const existing = await SystemSettings.findOne();
    const settings = existing || (await SystemSettings.create({}));

    res.json({
      success: true,
      data: {
        timezone: settings.timezone,
        session_timeout: settings.session_timeout,
        password_policy: settings.password_policy,
        maintenance_mode: settings.maintenance_mode
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  createCollege,
  getAllColleges,
  getCollegeById,
  updateCollege,
  deleteCollege,
  getCollegeAnalytics,
  exportCollegesCsv,
  bulkImportColleges,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  exportUsersCsv,
  bulkImportUsers,
  getDashboardAnalytics,
  getCollegeAnalyticsComparison,
  getUserAnalytics,
  getAuditLogs,
  exportAuditLogs,
  getUserActivityLog,
  exportAnalytics,
  getSystemSettings,
  updateSystemSettings,
  getPublicSystemSettings
};
