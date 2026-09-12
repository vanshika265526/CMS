import mongoose from 'mongoose';
import Placement, { IPlacement } from '../models/Placement.js';
import PlacementHistory from '../models/PlacementHistory.js';
import crypto from 'crypto';
import { PlacementNotificationService } from './placementNotificationService.js';

export class PlacementService {

  static generateFingerprint(data: Partial<IPlacement>): string {
    const raw = `${data.companyName?.toLowerCase() || ''}_${data.role?.toLowerCase() || ''}_${data.deadline ? new Date(data.deadline).toISOString() : ''}_${data.location?.toLowerCase() || ''}_${data.applicationLink || ''}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  static async publishPlacement(
    placementId: string | mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId,
    collegeId?: mongoose.Types.ObjectId,
    session?: mongoose.ClientSession
  ) {
    const query = Placement.findById(placementId);
    if (session) {
      query.session(session);
    }
    const placement = await query;

    if (!placement) {
      const err: any = new Error('Placement not found');
      err.status = 404;
      throw err;
    }

    // Verify college scope authority
    if (collegeId && placement.collegeId.toString() !== collegeId.toString()) {
      const err: any = new Error('Forbidden: You are not authorized to publish placements for this college');
      err.status = 403;
      throw err;
    }

    // If already published, return immediately
    if (placement.workflowStatus === 'published') {
      return { placement };
    }

    // Edge case check (past deadline)
    if (new Date(placement.deadline) < new Date()) {
      const err: any = new Error('Cannot publish a placement with an expired deadline.');
      err.status = 400;
      throw err;
    }

    const oldStatus = placement.workflowStatus;
    placement.workflowStatus = 'published';
    placement.updatedBy = userId;

    if (session) {
      await placement.save({ session });
    } else {
      await placement.save();
    }

    // Record status change history
    const changes = [{
      field: 'workflowStatus',
      oldValue: oldStatus,
      newValue: 'published'
    }];

    const history = new PlacementHistory({
      placementId: placement._id,
      version: placement.version,
      changedBy: userId,
      changes
    });

    if (session) {
      await history.save({ session });
    } else {
      await history.save();
    }

    // Trigger Notification and Email Queue creation using the session
    const stats = await PlacementNotificationService.queueNotifications(placement, userId, session);

    return { placement, stats };
  }

  static async createPlacement(data: any, userId: mongoose.Types.ObjectId, collegeId: mongoose.Types.ObjectId, session?: mongoose.ClientSession) {
    const fingerprintHash = this.generateFingerprint(data);
    
    // Pre-check for duplicate
    const existing = await Placement.findOne({ fingerprintHash, isDeleted: false });
    if (existing) {
      const err: any = new Error('A placement with identical key details already exists.');
      err.status = 409;
      throw err;
    }

    // Try to find if same company exists to reuse logo if none provided
    if (!data.companyLogo && data.companyName) {
      const existingCompany = await Placement.findOne({ 
        companyName: new RegExp(`^${data.companyName}$`, 'i'), 
        companyLogo: { $ne: null } 
      }).sort({ createdAt: -1 });
      if (existingCompany && existingCompany.companyLogo) {
        data.companyLogo = existingCompany.companyLogo;
      }
    }

    const placement = new Placement({
      ...data,
      collegeId,
      createdBy: userId,
      updatedBy: userId,
      fingerprintHash,
      workflowStatus: data.workflowStatus || 'draft',
      version: 1
    });

    if (session) {
      return await placement.save({ session });
    }
    return await placement.save();
  }

  static async updatePlacement(id: string, data: any, userId: mongoose.Types.ObjectId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const placement = await Placement.findById(id).session(session);
      if (!placement) {
        const err: any = new Error('Placement not found');
        err.status = 404;
        throw err;
      }

      if (data.version && data.version !== placement.version) {
        const err: any = new Error('Concurrency Error: Placement was modified by another user.');
        err.status = 409;
        throw err;
      }

      // Generate changes for history
      const changes = [];
      const keysToTrack = ['companyName', 'role', 'package', 'deadline', 'eligibilityGPA', 'eligibilityBacklogs', 'description', 'applicationLink', 'location', 'workflowStatus'];
      
      for (const key of keysToTrack) {
        if (data[key] !== undefined && data[key] !== placement[key as keyof IPlacement]) {
          changes.push({
            field: key,
            oldValue: placement[key as keyof IPlacement],
            newValue: data[key]
          });
        }
      }

      const oldStatus = placement.workflowStatus;
      const shouldPublish = (data.workflowStatus === 'published' && oldStatus !== 'published');
      if (shouldPublish) {
        delete data.workflowStatus;
      }

      Object.assign(placement, data);
      placement.updatedBy = userId;
      
      // Update fingerprint if key fields changed
      placement.fingerprintHash = this.generateFingerprint(placement);
      
      // Increment version manually since we might bypass some mongoose pre-save logic depending on how it's saved
      // But Mongoose OptimisticConcurrency does this automatically on save().
      await placement.save({ session });

      if (changes.length > 0) {
        const history = new PlacementHistory({
          placementId: placement._id,
          version: placement.version,
          changedBy: userId,
          changes
        });
        await history.save({ session });
      }

      if (shouldPublish) {
        await this.publishPlacement(placement._id, userId, placement.collegeId, session);
        // Refresh version and status on local object
        placement.workflowStatus = 'published';
      }

      await session.commitTransaction();
      session.endSession();
      return placement;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  static async changeStatus(id: string, workflowStatus: string, userId: mongoose.Types.ObjectId, version?: number, collegeId?: mongoose.Types.ObjectId) {
    if (workflowStatus === 'published') {
      const result = await this.publishPlacement(id, userId, collegeId, undefined);
      return result.placement;
    }

    const placement = await Placement.findById(id);
    if (!placement) {
      const err: any = new Error('Placement not found');
      err.status = 404;
      throw err;
    }

    if (version && version !== placement.version) {
      const err: any = new Error('Concurrency Error: Placement was modified by another user.');
      err.status = 409;
      throw err;
    }

    // Verify college scope authority for non-published changes as well
    if (collegeId && placement.collegeId.toString() !== collegeId.toString()) {
      const err: any = new Error('Forbidden: You are not authorized to modify placements for this college');
      err.status = 403;
      throw err;
    }

    // Edge case: Restore past deadline
    if (workflowStatus === 'published' && new Date(placement.deadline) < new Date()) {
      const err: any = new Error('Cannot publish a placement with an expired deadline.');
      err.status = 400;
      throw err;
    }
    
    // If restoring from archive and deadline passed, it should be expired
    if (workflowStatus === 'draft' && new Date(placement.deadline) < new Date()) {
      workflowStatus = 'expired';
    }

    const changes = [{
      field: 'workflowStatus',
      oldValue: placement.workflowStatus,
      newValue: workflowStatus
    }];

    placement.workflowStatus = workflowStatus as any;
    placement.updatedBy = userId;

    await placement.save();

    const history = new PlacementHistory({
      placementId: placement._id,
      version: placement.version,
      changedBy: userId,
      changes
    });
    await history.save();

    return placement;
  }

  static async bulkDelete(ids: string[], userId: mongoose.Types.ObjectId) {
    return await Placement.updateMany(
      { _id: { $in: ids } },
      { $set: { isDeleted: true, updatedBy: userId } }
    );
  }

  static async bulkArchive(ids: string[], userId: mongoose.Types.ObjectId) {
    return await Placement.updateMany(
      { _id: { $in: ids } },
      { $set: { workflowStatus: 'archived', updatedBy: userId } }
    );
  }
  
  static async bulkPublish(ids: string[], userId: mongoose.Types.ObjectId, collegeId?: mongoose.Types.ObjectId) {
    const published: string[] = [];
    const alreadyPublished: string[] = [];
    const failed: { id: string, error: string }[] = [];
    let notificationsQueued = 0;

    for (const id of ids) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const placement = await Placement.findById(id).session(session);
        if (!placement) {
          throw new Error('Placement not found');
        }

        if (placement.workflowStatus === 'published') {
          alreadyPublished.push(id);
          await session.commitTransaction();
          session.endSession();
          continue;
        }

        const result = await this.publishPlacement(id, userId, collegeId, session);
        published.push(id);
        notificationsQueued += result.stats?.queuedCount || 0;

        await session.commitTransaction();
        session.endSession();
      } catch (err: any) {
        await session.abortTransaction();
        session.endSession();
        failed.push({ id, error: err.message || String(err) });
      }
    }

    return { published, alreadyPublished, failed, notificationsQueued };
  }

  static async getPlacements(filters: any, sort: any = { createdAt: -1 }, skip = 0, limit = 10) {
    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      filters.$or = [
        { companyName: searchRegex },
        { role: searchRegex },
        { location: searchRegex },
        { skillsRequired: searchRegex }
      ];
      delete filters.search;
    }

    const data = await Placement.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    const total = await Placement.countDocuments(filters);

    return { data, total, page: Math.floor(skip / limit) + 1, totalPages: Math.ceil(total / limit) };
  }
}
