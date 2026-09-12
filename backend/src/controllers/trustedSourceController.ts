import { Request, Response } from 'express';
import TrustedSource from '../models/TrustedSource.js';
import ScrapeJob from '../models/ScrapeJob.js';
import AuditLog from '../models/AuditLog.js';
import { validateScraperUrl, testSourceUrl } from '../utils/urlValidator.js';
import mongoose from 'mongoose';

// GET /api/trusted-sources
export const getTrustedSources = async (req: Request, res: Response) => {
  try {
    const userCollegeId = (req as any).user.collegeId;
    const isSuperAdmin = (req as any).user.role === 'SUPER_ADMIN';

    const filters: any = {};
    if (!isSuperAdmin) {
      if (!userCollegeId) {
        return res.status(403).json({ success: false, message: 'Forbidden: Missing college context.' });
      }
      filters.collegeId = userCollegeId;
    } else {
      if (req.query.collegeId) {
        filters.collegeId = req.query.collegeId;
      }
    }

    if (req.query.isActive !== undefined) {
      filters.isActive = req.query.isActive === 'true';
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, 'i');
      filters.$or = [{ name: searchRegex }, { url: searchRegex }];
    }

    const sources = await TrustedSource.find(filters).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: sources });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error retrieving trusted sources.' });
  }
};

// POST /api/trusted-sources
export const createTrustedSource = async (req: Request, res: Response) => {
  try {
    const userCollegeId = (req as any).user.collegeId;
    const userId = (req as any).user._id;
    const isSuperAdmin = (req as any).user.role === 'SUPER_ADMIN';
    const { name, url, enabled, priority, scrapeFrequency } = req.body;

    if (!name || !url) {
      return res.status(400).json({ success: false, message: 'Name and URL are required.' });
    }

    const valResult = await validateScraperUrl(url);
    if (!valResult.isValid) {
      return res.status(400).json({ success: false, message: `URL validation failed: ${valResult.reason}` });
    }

    let collegeIdToAssign: mongoose.Types.ObjectId;
    if (isSuperAdmin) {
      if (!req.body.collegeId) {
        return res.status(400).json({ success: false, message: 'collegeId is required for SUPER_ADMIN creations.' });
      }
      collegeIdToAssign = new mongoose.Types.ObjectId(req.body.collegeId);
    } else {
      if (!userCollegeId) {
        return res.status(403).json({ success: false, message: 'Forbidden: Missing college context.' });
      }
      collegeIdToAssign = new mongoose.Types.ObjectId(userCollegeId);
    }

    const source = await TrustedSource.create({
      name,
      url,
      enabled: enabled !== undefined ? enabled : true,
      priority: priority !== undefined ? priority : 1,
      scrapeFrequency: scrapeFrequency !== undefined ? scrapeFrequency : 24,
      collegeId: collegeIdToAssign
    });

    await AuditLog.create({
      userId,
      action: 'CREATE',
      resource_type: 'TrustedSource',
      resource_id: source._id.toString(),
      change_details: { name, url, collegeId: collegeIdToAssign.toString() },
      ip_address: req.ip || '',
      user_agent: req.headers['user-agent'] || '',
      status: 'success'
    }).catch(console.error);

    return res.status(201).json({ success: true, data: source });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A trusted source with this URL already exists.' });
    }
    return res.status(500).json({ success: false, message: 'Server error creating trusted source.' });
  }
};

// PATCH /api/trusted-sources/:id
export const updateTrustedSource = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userCollegeId = (req as any).user.collegeId;
    const userId = (req as any).user._id;
    const isSuperAdmin = (req as any).user.role === 'SUPER_ADMIN';

    const source = await TrustedSource.findById(id);
    if (!source) {
      return res.status(404).json({ success: false, message: 'Trusted source not found.' });
    }

    if (!isSuperAdmin && source.collegeId.toString() !== userCollegeId?.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: You do not own this source.' });
    }

    const { name, url, enabled, priority, scrapeFrequency, isActive } = req.body;

    const oldValues = {
      name: source.name,
      url: source.url,
      enabled: source.enabled,
      priority: source.priority,
      scrapeFrequency: source.scrapeFrequency,
      isActive: source.isActive
    };

    if (url !== undefined && url !== source.url) {
      const valResult = await validateScraperUrl(url);
      if (!valResult.isValid) {
        return res.status(400).json({ success: false, message: `URL validation failed: ${valResult.reason}` });
      }
      source.url = url;
    }

    if (name !== undefined) source.name = name;
    if (enabled !== undefined) source.enabled = enabled;
    if (priority !== undefined) source.priority = priority;
    if (scrapeFrequency !== undefined) source.scrapeFrequency = scrapeFrequency;
    if (isActive !== undefined) source.isActive = isActive;

    await source.save();

    await AuditLog.create({
      userId,
      action: 'UPDATE',
      resource_type: 'TrustedSource',
      resource_id: source._id.toString(),
      change_details: { oldValues, newValues: { name, url, enabled, priority, scrapeFrequency, isActive } },
      ip_address: req.ip || '',
      user_agent: req.headers['user-agent'] || '',
      status: 'success'
    }).catch(console.error);

    return res.status(200).json({ success: true, data: source });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A trusted source with this URL already exists.' });
    }
    return res.status(500).json({ success: false, message: 'Server error updating trusted source.' });
  }
};

// DELETE /api/trusted-sources/:id
export const deleteTrustedSource = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userCollegeId = (req as any).user.collegeId;
    const userId = (req as any).user._id;
    const isSuperAdmin = (req as any).user.role === 'SUPER_ADMIN';

    const source = await TrustedSource.findById(id);
    if (!source) {
      return res.status(404).json({ success: false, message: 'Trusted source not found.' });
    }

    if (!isSuperAdmin && source.collegeId.toString() !== userCollegeId?.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: You do not own this source.' });
    }

    await TrustedSource.findByIdAndDelete(id);

    await AuditLog.create({
      userId,
      action: 'DELETE',
      resource_type: 'TrustedSource',
      resource_id: id,
      change_details: { name: source.name, url: source.url, collegeId: source.collegeId.toString() },
      ip_address: req.ip || '',
      user_agent: req.headers['user-agent'] || '',
      status: 'success'
    }).catch(console.error);

    return res.status(200).json({ success: true, message: 'Trusted source deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error deleting trusted source.' });
  }
};

// POST /api/trusted-sources/:id/test
export const testTrustedSource = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userCollegeId = (req as any).user.collegeId;
    const userId = (req as any).user._id;
    const isSuperAdmin = (req as any).user.role === 'SUPER_ADMIN';

    const source = await TrustedSource.findById(id);
    if (!source) {
      return res.status(404).json({ success: false, message: 'Trusted source not found.' });
    }

    if (!isSuperAdmin && source.collegeId.toString() !== userCollegeId?.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: You do not own this source.' });
    }

    const result = await testSourceUrl(source.url);

    await AuditLog.create({
      userId,
      action: 'PREVIEWED',
      resource_type: 'TrustedSource',
      resource_id: id,
      change_details: { url: source.url, testResult: result },
      ip_address: req.ip || '',
      user_agent: req.headers['user-agent'] || '',
      status: result.success ? 'success' : 'failure',
      error_message: result.success ? undefined : result.reason
    }).catch(console.error);

    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error testing trusted source.' });
  }
};

// POST /api/trusted-sources/:id/scrape
export const triggerScrape = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userCollegeId = (req as any).user.collegeId;
    const userId = (req as any).user._id;
    const isSuperAdmin = (req as any).user.role === 'SUPER_ADMIN';

    const source = await TrustedSource.findById(id);
    if (!source) {
      return res.status(404).json({ success: false, message: 'Trusted source not found.' });
    }

    if (!isSuperAdmin && source.collegeId.toString() !== userCollegeId?.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: You do not own this source.' });
    }

    if (!source.enabled || !source.isActive) {
      return res.status(400).json({ success: false, message: 'Cannot scrape a disabled source.' });
    }

    const existingJob = await ScrapeJob.findOne({
      sourceId: source._id,
      status: { $in: ['pending', 'processing'] }
    });

    if (existingJob) {
      return res.status(409).json({
        success: false,
        message: `A scrape job for this source is already in progress (${existingJob.status}).`
      });
    }

    const job = await ScrapeJob.create({
      url: source.url,
      sourceId: source._id,
      status: 'pending'
    });

    await AuditLog.create({
      userId,
      action: 'CREATE',
      resource_type: 'ScrapeJob',
      resource_id: job._id.toString(),
      change_details: { sourceId: id, url: source.url },
      ip_address: req.ip || '',
      user_agent: req.headers['user-agent'] || '',
      status: 'success'
    }).catch(console.error);

    return res.status(201).json({
      success: true,
      message: 'Scrape job successfully enqueued.',
      data: job
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Server error enqueuing scrape job.' });
  }
};
