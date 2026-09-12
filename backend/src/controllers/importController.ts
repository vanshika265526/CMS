import { Request, Response } from 'express';
import PlacementImport from '../models/PlacementImport.js';
import ScrapeJob from '../models/ScrapeJob.js';
import TrustedSource from '../models/TrustedSource.js';
import { JobOrchestrator } from '../services/queue/JobOrchestrator.js';
import { PlacementService } from '../services/placementService.js';
import AuditLog from '../models/AuditLog.js';
import mongoose from 'mongoose';

export const getImports = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    const collegeId = (req as any).user.collegeId;
    const filters: any = {};
    if (collegeId) {
      filters.collegeId = collegeId;
    }
    if (req.query.reviewStatus) filters.reviewStatus = req.query.reviewStatus;
    
    const imports = await PlacementImport.find(filters)
      .sort({ overallQualityScore: -1, scrapedAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await PlacementImport.countDocuments(filters);
    
    res.status(200).json({ success: true, data: imports, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getScrapeJobs = async (_req: Request, res: Response) => {
  try {
    const jobs = await ScrapeJob.find({})
      .populate('sourceId', 'name url enabled priority')
      .sort({ createdAt: -1 })
      .limit(100);

    const [pending, processing, completed, failed, activeSources] = await Promise.all([
      ScrapeJob.countDocuments({ status: 'pending' }),
      ScrapeJob.countDocuments({ status: 'processing' }),
      ScrapeJob.countDocuments({ status: 'completed' }),
      ScrapeJob.countDocuments({ status: 'failed' }),
      TrustedSource.countDocuments({ enabled: true, isActive: true })
    ]);

    res.status(200).json({
      success: true,
      data: jobs,
      summary: { pending, processing, completed, failed, activeSources }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const triggerScraper = async (req: Request, res: Response) => {
  try {
    const summary = await JobOrchestrator.triggerScraper();

    if ((summary as any)?.alreadyRunning) {
      return res.status(200).json({
        success: true,
        message: 'Scraper is already running. Skipping duplicate trigger.',
        summary
      });
    }

    if ((summary as any)?.activeSources === 0) {
      return res.status(200).json({
        success: true,
        message: 'No active trusted sources are configured, so no jobs were enqueued.',
        summary
      });
    }

    res.status(200).json({
      success: true,
      message: `Scraper processed ${(summary as any)?.processedJobs || 0} job(s) and enqueued ${(summary as any)?.enqueuedJobs || 0} new job(s).`,
      summary
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveImport = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const userId = (req as any).user._id;
    let collegeId = (req as any).user.collegeId;

    const placementImport = await PlacementImport.findById(id).session(session);
    if (!placementImport) {
      throw { status: 404, message: 'Import not found' };
    }

    if (!collegeId && placementImport.collegeId) {
      collegeId = placementImport.collegeId;
    }

    // Verify admin college authorization scope
    if (placementImport.collegeId && collegeId && placementImport.collegeId.toString() !== collegeId.toString()) {
      throw { status: 403, message: 'Forbidden: You are not authorized to approve imports for this college' };
    }
    
    if (placementImport.reviewStatus === 'approved') {
      throw { status: 409, message: 'This import has already been approved' };
    }

    // Map extracted data to Placement schema in draft status
    const placementData = {
      companyName: placementImport.companyName,
      role: placementImport.role,
      package: placementImport.package || 0,
      deadline: placementImport.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      description: placementImport.description || 'Details not provided by AI.',
      eligibilityGPA: 0,
      eligibilityBacklogs: 0,
      applicationLink: placementImport.applicationLink,
      location: placementImport.location,
      skillsRequired: placementImport.skills,
      employmentType: placementImport.employmentType,
      driveType: placementImport.driveType,
      sourceType: 'ai',
      sourceUrl: placementImport.sourceUrl,
      sourceWebsite: placementImport.sourceWebsite,
      workflowStatus: 'draft',
      companyLogo: ''
    };

    // Use existing service to create (which will generate fingerprint and check duplicates)
    let newPlacement = await PlacementService.createPlacement(placementData, userId, collegeId, session);

    // Call publishPlacement using the active session!
    const pubResult = await PlacementService.publishPlacement(newPlacement._id, userId, collegeId, session);
    newPlacement = pubResult.placement;

    // Mark as approved
    placementImport.reviewStatus = 'approved';
    placementImport.reviewedBy = userId;
    placementImport.reviewedAt = new Date();
    await placementImport.save({ session });
    
    await AuditLog.create([{
      userId,
      action: 'AI_IMPORT_APPROVED',
      resource_type: 'PlacementImport',
      resource_id: id,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'] || 'Unknown',
      status: 'success'
    }], { session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ success: true, data: newPlacement });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

export const rejectImport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = (req as any).user._id;

    const collegeId = (req as any).user.collegeId;
    const placementImport = await PlacementImport.findById(id);
    if (!placementImport) {
      return res.status(404).json({ success: false, message: 'Import not found' });
    }

    // Verify admin college authorization scope
    if (placementImport.collegeId && collegeId && placementImport.collegeId.toString() !== collegeId.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to reject imports for this college' });
    }

    placementImport.reviewStatus = 'rejected';
    placementImport.rejectionReason = reason;
    placementImport.reviewedBy = userId;
    placementImport.reviewedAt = new Date();
    await placementImport.save();
    
    await AuditLog.create({
      userId,
      action: 'AI_IMPORT_REJECTED',
      resource_type: 'PlacementImport',
      resource_id: id,
      change_details: { reason },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'] || 'Unknown',
      status: 'success'
    });

    res.status(200).json({ success: true, data: placementImport });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
