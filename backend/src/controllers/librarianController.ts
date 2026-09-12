import { Request, Response } from 'express';
import User from '../models/User.js';
import Librarian from '../models/Librarian.js';
import mongoose from 'mongoose';

interface AuthRequest extends Request {
  user?: any;
}

/**
 * POST /api/admin/librarians
 * Create a new librarian user + profile
 */
export const createLibrarian = async (req: AuthRequest, res: Response) => {
  const { name, email, password, employeeId, department } = req.body;
  const collegeId = req.user?.collegeId;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'name, email, and password are required' });
  }

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A user with this email already exists' });
    }

    // Create User — password is hashed via pre('save') hook
    const user = await User.create({
      name,
      email,
      password,
      role: 'LIBRARIAN',
      collegeId,
      isActive: true,
      mustChangePassword: true,
    });

    // Create optional Librarian profile
    const profile = await Librarian.create({
      userId: user._id,
      employeeId: employeeId || undefined,
      collegeId,
      department: department || undefined,
    });

    return res.status(201).json({
      success: true,
      data: {
        user: { _id: user._id, name: user.name, email: user.email, role: user.role },
        profile,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/admin/librarians
 * List all librarians for the college
 */
export const getLibrarians = async (req: AuthRequest, res: Response) => {
  const collegeId = req.user?.collegeId;

  try {
    const profiles = await Librarian.find({ collegeId })
      .populate('userId', 'name email isActive createdAt')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: profiles });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/admin/librarians/:id
 * Delete librarian profile + user account
 */
export const deleteLibrarian = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const profile = await Librarian.findById(id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Librarian profile not found' });
    }

    await User.findByIdAndDelete(profile.userId);
    await Librarian.findByIdAndDelete(id);

    return res.status(200).json({ success: true, message: 'Librarian deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/admin/librarians/:id
 * Update librarian profile details
 */
export const updateLibrarian = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, employeeId, department } = req.body;

  try {
    const profile = await Librarian.findById(id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Librarian profile not found' });
    }

    // Update user record
    if (name || email) {
      await User.findByIdAndUpdate(profile.userId, {
        ...(name && { name }),
        ...(email && { email }),
      });
    }

    // Update profile
    const updated = await Librarian.findByIdAndUpdate(
      id,
      {
        ...(employeeId !== undefined && { employeeId }),
        ...(department !== undefined && { department }),
      },
      { new: true }
    ).populate('userId', 'name email isActive');

    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
