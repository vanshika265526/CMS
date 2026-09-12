import mongoose from 'mongoose';
import Student from '../models/Student.js';
import Result from '../models/Result.js';
import Notification from '../models/Notification.js';
import EmailQueue from '../models/EmailQueue.js';
import SystemLog from '../models/SystemLog.js';

const BRANCH_DICTIONARY: Record<string, string[]> = {
  'CSE': ['computer science', 'cse', 'computing', 'software', 'computer science and engineering'],
  'ECE': ['electronics', 'ece', 'communication', 'electronics and communication engineering', 'electronics & communication engineering'],
  'EEE': ['electrical', 'eee', 'electrical engineering', 'electrical and electronics engineering', 'electrical & electronics engineering'],
  'ME': ['mechanical', 'me', 'mechanical engineering', 'mech'],
  'IT': ['information technology', 'it']
};

export class PlacementNotificationService {

  public static matchesBatch(studentBatch: string, eligibleYears: string[]): boolean {
    if (!eligibleYears || eligibleYears.length === 0) return true;
    const studentNormalized = studentBatch.trim().toLowerCase();
    const tokens = studentNormalized.match(/\b\d{2,4}\b/g) || [];
    const years = tokens.map(t => {
      if (t.length === 2) {
        return `20${t}`;
      }
      return t;
    });
    return years.some(y => eligibleYears.includes(y));
  }

  public static matchesBranch(studentCourse: string, studentDeptName: string, eligibleBranches: string[]): boolean {
    if (!eligibleBranches || eligibleBranches.length === 0) return true;
    
    const normalizedCourse = studentCourse.trim().toLowerCase();
    const normalizedDept = studentDeptName.trim().toLowerCase();
    
    for (const branch of eligibleBranches) {
      const normBranch = branch.trim().toLowerCase();
      // Whole word boundary check for the branch code itself
      const rx = new RegExp(`\\b${normBranch.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      if (rx.test(normalizedCourse) || rx.test(normalizedDept)) {
        return true;
      }

      // Check expansion words in the branch dictionary
      const expansions = BRANCH_DICTIONARY[branch.toUpperCase()] || [];
      for (const exp of expansions) {
        const rxExp = new RegExp(`\\b${exp.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
        if (rxExp.test(normalizedCourse) || rxExp.test(normalizedDept)) {
          return true;
        }
      }
    }
    return false;
  }

  public static async queueNotifications(placement: any, actorId: mongoose.Types.ObjectId, session?: mongoose.ClientSession): Promise<{
    eligibleCount: number;
    queuedCount: number;
    skippedCount: number;
  }> {
    let eligibleCount = 0;
    let queuedCount = 0;
    let skippedCount = 0;

    try {
      // 1. Get lightweight student IDs to fetch CGPA map
      const studentIdsQuery = Student.find({
        collegeId: placement.collegeId,
        'academicInfo.status': 'active'
      });

      if (session) {
        studentIdsQuery.session(session);
      }

      const studentIds = await studentIdsQuery.distinct('_id');

      if (studentIds.length === 0) {
        return { eligibleCount, queuedCount, skippedCount };
      }

      // 2. Fetch and aggregate CGPAs for these students
      const cgpaAggregateQuery = Result.aggregate([
        {
          $match: {
            type: 'EXAM',
            studentId: { $in: studentIds },
            cgpa: { $ne: null, $exists: true }
          }
        },
        {
          $group: {
            _id: '$studentId',
            avgCgpa: { $avg: '$cgpa' }
          }
        }
      ]);

      if (session) {
        cgpaAggregateQuery.session(session);
      }

      const cgpaResults = await cgpaAggregateQuery;
      const cgpaMap = new Map<string, number>();
      for (const r of cgpaResults) {
        cgpaMap.set(r._id.toString(), parseFloat(r.avgCgpa.toFixed(2)));
      }

      // 3. Process students memory-efficiently using Mongoose cursors
      const studentCursorQuery = Student.find({
        collegeId: placement.collegeId,
        'academicInfo.status': 'active'
      })
      .populate('userId')
      .populate('academicInfo.department');

      if (session) {
        studentCursorQuery.session(session);
      }

      const studentCursor = studentCursorQuery.cursor();

      for await (const student of studentCursor) {
        // Enforce strict college isolation
        if (!student.collegeId || student.collegeId.toString() !== placement.collegeId.toString()) {
          skippedCount++;
          continue;
        }

        // Email validation (Requirement 4)
        const email = student.personalInfo?.email || '';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email.trim().toLowerCase())) {
          skippedCount++;
          continue;
        }

        // Recipient Name validation (Requirement 4)
        const firstName = student.personalInfo?.firstName || '';
        const lastName = student.personalInfo?.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim();
        if (!fullName) {
          skippedCount++;
          continue;
        }

        // Check CGPA eligibility
        const studentCGPA = cgpaMap.get(student._id.toString()) || 0;
        if (placement.eligibilityGPA > 0 && studentCGPA < placement.eligibilityGPA) {
          continue;
        }

        // Check Batch/Year eligibility
        const studentBatch = student.academicInfo?.batch || '';
        if (!this.matchesBatch(studentBatch, placement.yearEligible || [])) {
          continue;
        }

        // Check Branch/Department eligibility
        const studentCourse = student.academicInfo?.course || '';
        const studentDeptName = (student.academicInfo?.department as any)?.name || '';
        if (!this.matchesBranch(studentCourse, studentDeptName, placement.branchesEligible || [])) {
          continue;
        }

        // Eligible student found!
        eligibleCount++;

        // 4. Create In-App Notification (Idempotent)
        const recipientUserId = student.userId?._id || student.userId;
        if (!recipientUserId) {
          skippedCount++;
          continue;
        }

        // Check for existing logical notification (placementId + studentId + notificationType)
        const notifQuery = Notification.findOne({
          recipientUserId,
          type: 'alert',
          'metadata.placementId': placement._id
        });

        if (session) {
          notifQuery.session(session);
        }

        const existingNotif = await notifQuery;
        if (!existingNotif) {
          const newNotifData = {
            title: `New Placement Opportunity: ${placement.companyName}`,
            message: `A new placement opportunity for ${placement.role} has been published.`,
            type: 'alert',
            recipientRole: 'STUDENT',
            recipientUserId,
            senderUserId: actorId,
            collegeId: placement.collegeId,
            metadata: { placementId: placement._id },
            actionUrl: `/student/placements/${placement._id}`,
            isRead: false
          };

          try {
            if (session) {
              await Notification.create([newNotifData], { session });
            } else {
              await Notification.create(newNotifData);
            }
          } catch (notifErr: any) {
            // Handle expected 11000 index collision safely
            if (notifErr.code !== 11000) {
              throw notifErr;
            }
          }
        }

        // 5. Create EmailQueue Record (Idempotent)
        const queueItem = {
          placementId: placement._id,
          studentId: student._id,
          recipientEmail: email.trim().toLowerCase(),
          recipientName: fullName,
          status: 'pending',
          attempts: 0,
          runAt: new Date()
        };

        try {
          if (session) {
            await EmailQueue.create([queueItem], { session });
          } else {
            await EmailQueue.create(queueItem);
          }
          queuedCount++;
        } catch (queueErr: any) {
          // MongoDB 11000 is an expected idempotency collision
          if (queueErr.code === 11000) {
            skippedCount++;
          } else {
            throw queueErr;
          }
        }
      }

      // Safe logging (avoid student personal data)
      await SystemLog.create({
        category: 'NOTIFICATION_LOG',
        level: 'info',
        message: `Placement notification queuing sequence completed`,
        metadata: {
          placementId: placement._id,
          collegeId: placement.collegeId,
          eligibleCount,
          queuedCount,
          skippedCount
        }
      }).catch(() => {});

      return { eligibleCount, queuedCount, skippedCount };
    } catch (err: any) {
      console.error('[PlacementNotificationService] Error:', err);
      // Log critical system error
      await SystemLog.create({
        category: 'NOTIFICATION_LOG',
        level: 'error',
        message: `Placement notification queuing critical failure: ${err.message}`,
        metadata: { placementId: placement._id }
      }).catch(() => {});
      throw err;
    }
  }
}
