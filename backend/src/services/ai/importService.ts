import crypto from 'crypto';
import mongoose from 'mongoose';
import PlacementImport from '../../models/PlacementImport.js';
import Placement from '../../models/Placement.js';
import SystemLog from '../../models/SystemLog.js';
import { AIExtractedPlacement } from './AIProvider.js';

export class ImportService {
  
  static generateFingerprint(data: Partial<AIExtractedPlacement>): string {
    const raw = `${data.companyName?.toLowerCase().trim() || ''}_${data.role?.toLowerCase().trim() || ''}_${data.deadline ? new Date(data.deadline).toISOString() : ''}_${data.location?.toLowerCase().trim() || ''}_${data.applicationLink || ''}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  static async processImport(
    extractedData: AIExtractedPlacement, 
    sourceUrl: string, 
    sourceWebsite: string, 
    rawHtml: string, 
    rawContent: string,
    screenshotUrl?: string,
    collegeId?: mongoose.Types.ObjectId
  ) {
    const fingerprintHash = this.generateFingerprint(extractedData);

    // 1. Check for existing PlacementImport (Duplicate Pre-check)
    const existingImport = await PlacementImport.findOne({ fingerprintHash });
    if (existingImport) {
      await SystemLog.create({
        category: 'IMPORT_LOG',
        level: 'info',
        message: `Skipped duplicate import. PlacementImport already exists for fingerprint: ${fingerprintHash}`,
        metadata: {
          companyName: extractedData.companyName,
          role: extractedData.role,
          fingerprintHash,
          existingImportId: existingImport._id,
          collegeId: collegeId || existingImport.collegeId
        }
      }).catch(() => {});
      return existingImport;
    }
    
    let duplicateScore = 0;
    let reviewStatus: 'pending' | 'rejected' = 'pending';
    let duplicatePlacementId = undefined;
    let rejectionReason = '';

    // Stage 1: Exact Duplicate Check (Fingerprint)
    const exactMatch = await Placement.findOne({ fingerprintHash, isDeleted: false });
    if (exactMatch) {
      duplicateScore = 100;
      reviewStatus = 'rejected';
      rejectionReason = 'Exact duplicate found in system';
      duplicatePlacementId = exactMatch._id;
    } else {
      // Stage 2: AI / Heuristic Similarity (Same company, similar role)
      if (extractedData.companyName) {
        const potentialMatches = await Placement.find({ 
          companyName: new RegExp(`^${extractedData.companyName.trim()}$`, 'i'),
          isDeleted: false
        }).sort({ createdAt: -1 }).limit(5);

        if (potentialMatches.length > 0) {
          duplicateScore = 50; // Flag as possible duplicate
          duplicatePlacementId = potentialMatches[0]._id;
        }
      }
    }

    // Validation Score
    let validationScore = 100;
    if (!extractedData.companyName) validationScore -= 40;
    if (!extractedData.role) validationScore -= 40;
    if (!extractedData.deadline) validationScore -= 10;
    if (!extractedData.applicationLink) validationScore -= 10;
    
    if (validationScore < 50 && reviewStatus !== 'rejected') {
      reviewStatus = 'rejected';
      rejectionReason = 'Validation score too low (Missing critical fields)';
    }

    // Overall Quality Score
    const aiConf = extractedData.confidenceScore || 0;
    const qualityScore = Math.max(0, Math.round((validationScore + aiConf - duplicateScore) / 2));

    const placementImport = new PlacementImport({
      ...extractedData,
      sourceType: 'ai',
      sourceUrl,
      sourceWebsite,
      scrapedAt: new Date(),
      screenshotUrl,
      collegeId,
      
      aiConfidence: aiConf,
      validationScore,
      duplicateScore,
      overallQualityScore: qualityScore,
      
      reviewStatus,
      rejectionReason,
      duplicatePlacementId,
      fingerprintHash,
      
      rawContent,
      aiJsonOutput: JSON.stringify(extractedData)
    });

    try {
      await placementImport.save();
      return placementImport;
    } catch (error: any) {
      // Handle MongoDB duplicate key error code 11000 for concurrent runs (race condition)
      if (error.code === 11000) {
        const raceImport = await PlacementImport.findOne({ fingerprintHash });
        if (raceImport) {
          await SystemLog.create({
            category: 'IMPORT_LOG',
            level: 'info',
            message: `Concurrent duplicate import race condition prevented. Reusing existing import for fingerprint: ${fingerprintHash}`,
            metadata: {
              companyName: extractedData.companyName,
              role: extractedData.role,
              fingerprintHash,
              existingImportId: raceImport._id
            }
          }).catch(() => {});
          return raceImport;
        }
      }
      throw error;
    }
  }
}
