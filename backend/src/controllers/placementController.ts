import { Request, Response } from 'express';
import { PlacementService } from '../services/placementService.js';
import { createPlacementSchema, updatePlacementSchema, changePlacementStatusSchema, bulkActionSchema } from '../validators/placementValidation.js';
import AuditLog from '../models/AuditLog.js';
import Placement from '../models/Placement.js';

const logAudit = async (action: string, req: Request, resourceId: string, details?: any, status: 'success' | 'failure' = 'success', errorMsg?: string) => {
  try {
    await AuditLog.create({
      userId: (req as any).user?._id,
      action,
      resource_type: 'Placement',
      resource_id: resourceId,
      change_details: details,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'] || 'Unknown',
      status,
      error_message: errorMsg
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
    // Do not block placement operations
  }
};

export const createPlacement = async (req: Request, res: Response) => {
  try {
    const validatedData = createPlacementSchema.parse(req.body);
    const userId = (req as any).user._id;
    const collegeId = (req as any).user.collegeId;

    const requestedStatus = validatedData.workflowStatus;
    if (requestedStatus === 'published') {
      validatedData.workflowStatus = 'draft';
    }

    let placement = await PlacementService.createPlacement(validatedData, userId, collegeId);
    let stats = null;

    if (requestedStatus === 'published') {
      const pubResult = await PlacementService.publishPlacement(placement._id, userId, collegeId);
      placement = pubResult.placement;
      stats = pubResult.stats;
    }
    
    await logAudit('PLACEMENT_CREATED', req, placement._id.toString(), { workflowStatus: placement.workflowStatus });
    
    res.status(201).json({ 
      success: true, 
      message: requestedStatus === 'published' ? 'Placement published successfully. Notifications are being processed.' : undefined,
      data: placement,
      stats 
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ success: false, message: 'Validation Error', errors: error.errors });
    } else {
      res.status(error.status || 500).json({ success: false, message: error.message });
    }
  }
};

export const updatePlacement = async (req: Request, res: Response) => {
  try {
    const validatedData = updatePlacementSchema.parse(req.body);
    const user = (req as any).user;
    
    const existing = await Placement.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Placement not found' });
    }
    if (user.role === 'COLLEGE_ADMIN' && existing.collegeId.toString() !== user.collegeId.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to update placements for this college' });
    }

    const placement = await PlacementService.updatePlacement(req.params.id, validatedData, user._id);
    
    // Distinguish autosave vs manual save if passed from client
    const action = req.body.isAutosave ? 'DRAFT_SAVED' : 'PLACEMENT_UPDATED';
    await logAudit(action, req, placement._id.toString(), validatedData);
    
    res.status(200).json({ success: true, data: placement });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ success: false, message: 'Validation Error', errors: error.errors });
    } else {
      res.status(error.status || 500).json({ success: false, message: error.message });
    }
  }
};

export const getPlacements = async (req: Request, res: Response) => {
  try {
    const filters: any = { isDeleted: false };
    
    // Role-based filtering
    const role = (req as any).user.role;
    if (role === 'STUDENT') {
      filters.workflowStatus = 'published';
    } else {
      if (req.query.workflowStatus) filters.workflowStatus = req.query.workflowStatus;
    }

    if (req.query.search) filters.search = req.query.search;
    if (req.query.location) filters.location = new RegExp(req.query.location as string, 'i');
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const result = await PlacementService.getPlacements(filters, { createdAt: -1 }, skip, limit);
    res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPlacementById = async (req: Request, res: Response) => {
  try {
    const placement = (await PlacementService.getPlacements({ _id: req.params.id, isDeleted: false }, undefined, 0, 1)).data[0];
    if (!placement) {
      return res.status(404).json({ success: false, message: 'Placement not found' });
    }
    
    const role = (req as any).user.role;
    if (role === 'STUDENT' && placement.workflowStatus !== 'published') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    if (req.query.preview === 'true') {
      await logAudit('PREVIEWED', req, placement._id.toString());
    } else {
      await logAudit('VIEWED', req, placement._id.toString());
    }

    res.status(200).json({ success: true, data: placement });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const changeStatus = async (req: Request, res: Response) => {
  try {
    const { workflowStatus, version } = changePlacementStatusSchema.parse(req.body);
    const userId = (req as any).user._id;
    const collegeId = (req as any).user.collegeId;

    const placement = await PlacementService.changeStatus(req.params.id, workflowStatus, userId, version, collegeId);
    
    let action = 'PLACEMENT_UPDATED';
    if (workflowStatus === 'published') action = 'PLACEMENT_PUBLISHED';
    if (workflowStatus === 'archived') action = 'PLACEMENT_ARCHIVED';
    if (workflowStatus === 'draft') action = 'PLACEMENT_RESTORED';

    await logAudit(action, req, placement._id.toString(), { workflowStatus });

    res.status(200).json({ success: true, data: placement });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ success: false, message: 'Validation Error', errors: error.errors });
    } else {
      res.status(error.status || 500).json({ success: false, message: error.message });
    }
  }
};

export const bulkAction = async (req: Request, res: Response) => {
  try {
    const { ids } = bulkActionSchema.parse(req.body);
    const action = req.params.action; // delete, archive, publish
    const userId = (req as any).user._id;
    const collegeId = (req as any).user.collegeId;

    let result;
    let auditAction = '';
    
    if (action === 'delete') {
      result = await PlacementService.bulkDelete(ids, userId);
      auditAction = 'PLACEMENT_DELETED';
    } else if (action === 'archive') {
      result = await PlacementService.bulkArchive(ids, userId);
      auditAction = 'PLACEMENT_ARCHIVED';
    } else if (action === 'publish') {
      result = await PlacementService.bulkPublish(ids, userId, collegeId);
      auditAction = 'PLACEMENT_PUBLISHED';
    } else {
      return res.status(400).json({ success: false, message: 'Invalid bulk action' });
    }

    // Best effort audit for bulk
    for (const id of ids) {
      await logAudit(auditAction, req, id, { bulk: true });
    }

    res.status(200).json({ 
      success: true, 
      message: action === 'publish' ? 'Bulk publish successful. Notifications are being processed.' : `Bulk ${action} successful`, 
      result 
    });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};
