import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Timetable from '../models/Timetable.js';
import Student from '../models/Student.js';
import Batch from '../models/Batch.js';
import Section from '../models/Section.js';
import Subject from '../models/Subject.js';
import { DAYS, TIME_SLOTS, getSlotByStartTime } from '../constants/timeSlots.js';

const dayOrder = [...DAYS];

const normalizeSectionName = (value: any) => String(value ?? '').trim();

const groupEntries = (entries: any[]) => entries.reduce((acc: any, entry: any) => {
  const day = entry.day || entry.dayOfWeek;
  const start = String(entry.startTime || '').trim();
  if (!acc[day]) acc[day] = {};
  if (!acc[day][start]) acc[day][start] = [];
  acc[day][start].push(entry);
  return acc;
}, {});

const sortEntries = (entries: any[]) => [...entries].sort((a, b) => {
  const dayDiff = dayOrder.indexOf(a.day || a.dayOfWeek) - dayOrder.indexOf(b.day || b.dayOfWeek);
  if (dayDiff !== 0) return dayDiff;
  return String(a.startTime || '').localeCompare(String(b.startTime || ''));
});

const populateTimetable = (query: any) => query
  .populate('teacherId', 'name email role')
  .populate('batchId', 'name startYear endYear sections')
  .populate('sectionId', 'name batchId')
  .populate('createdBy', 'name email role')
  .populate('subjectId', 'name code');

const resolveSectionDocument = async (collegeId: string, batchId: string, sectionInput: string, createIfMissing = true) => {
  const normalized = normalizeSectionName(sectionInput);
  if (!normalized) return null;

  if (mongoose.Types.ObjectId.isValid(normalized)) {
    const byId = await Section.findOne({ _id: normalized, collegeId, batchId });
    if (byId) return byId;
  }

  const existing = await Section.findOne({ collegeId, batchId, name: normalized });
  if (existing) return existing;

  if (!createIfMissing) return null;
  return Section.create({ collegeId, batchId, name: normalized });
};

const resolveStudentSection = async (student: any) => {
  const batchId = student.batchId || null;
  const sectionName = normalizeSectionName(student.academicInfo?.section);
  if (!batchId || !sectionName) return null;
  return resolveSectionDocument(String(student.collegeId), String(batchId), sectionName);
};

const validateDay = (day: string) => {
  if (!dayOrder.includes(day as any)) {
    throw new Error(`Invalid day "${day}". Must be one of: ${dayOrder.join(', ')}`);
  }
};

const buildEntryPayload = async (req: Request, existingEntry?: any) => {
  const collegeId = String((req as any).user?.collegeId || existingEntry?.collegeId || '');
  const teacherId = String(req.body.teacherId || existingEntry?.teacherId || '');
  const batchId = String(req.body.batchId || existingEntry?.batchId || '');
  const sectionInput = String(req.body.sectionId || req.body.section || existingEntry?.sectionId || existingEntry?.section || '');
  const day = String(req.body.day || req.body.dayOfWeek || existingEntry?.day || existingEntry?.dayOfWeek || '');
  const startTime = String(req.body.startTime || existingEntry?.startTime || '');
  const slot = getSlotByStartTime(startTime);

  if (!collegeId) throw new Error('College ID is required');
  if (!teacherId) throw new Error('Teacher is required');
  if (!batchId) throw new Error('Batch is required');
  if (!day) throw new Error('Day is required');
  if (!slot) throw new Error(`Invalid start time "${startTime}". Must be one of: ${TIME_SLOTS.map(s => s.start).join(', ')}`);
  validateDay(day);

  const batch = await Batch.findOne({ _id: batchId, collegeId });
  if (!batch) throw new Error('Batch not found');

  const sectionDoc = await resolveSectionDocument(collegeId, batchId, sectionInput);
  if (!sectionDoc) throw new Error('Section is required');

  const providedSubject = String(req.body.subject || existingEntry?.subject || '').trim();
  const providedSubjectId = String(req.body.subjectId || existingEntry?.subjectId || '').trim();

  let subject = providedSubject;
  let subjectId: string | null = providedSubjectId || null;

  if (!subject && subjectId && mongoose.Types.ObjectId.isValid(subjectId)) {
    const subjectDoc = await Subject.findById(subjectId).select('name');
    subject = subjectDoc?.name || '';
  }

  if (!subject) {
    throw new Error('Subject is required');
  }

  return {
    collegeId,
    teacherId,
    batchId,
    sectionDoc,
    subject,
    subjectId,
    day,
    startTime: slot.start,
    endTime: slot.end,
    period: slot.period,
  };
};

export const getTimeSlots = (_req: Request, res: Response) => {
  res.status(200).json({ success: true, data: TIME_SLOTS });
};

export const getSectionsByBatch = async (req: Request, res: Response) => {
  try {
    const collegeId = String((req as any).user?.collegeId || '');
    const { batchId } = req.params;

    const batch = await Batch.findOne({ _id: batchId, collegeId });
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    const seededSections = await Promise.all((batch.sections || []).map((sectionName) =>
      resolveSectionDocument(collegeId, String(batch._id), sectionName)
    ));

    const sections = await Section.find({ collegeId, batchId }).sort({ name: 1 });
    const merged = new Map<string, any>();
    [...seededSections, ...sections].forEach((section) => {
      if (section) merged.set(String(section._id), section);
    });

    res.status(200).json({ success: true, data: Array.from(merged.values()) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTimetableEntry = async (req: Request, res: Response) => {
  try {
    const payload = await buildEntryPayload(req);
    const { collegeId, teacherId, batchId, sectionDoc, subject, subjectId, day, startTime, endTime, period } = payload;

    const sectionConflict = await Timetable.findOne({
      collegeId,
      sectionId: sectionDoc._id,
      day,
      startTime,
      ...(req.params.id ? { _id: { $ne: req.params.id } } : {}),
    });
    if (sectionConflict) {
      return res.status(400).json({ success: false, message: 'This time slot is already filled for this section.' });
    }

    const teacherConflict = await Timetable.findOne({
      collegeId,
      teacherId,
      day,
      startTime,
      ...(req.params.id ? { _id: { $ne: req.params.id } } : {}),
    });
    if (teacherConflict) {
      return res.status(400).json({ success: false, message: 'This teacher already has a class at this time on this day.' });
    }

    const created = await Timetable.create({
      collegeId,
      teacherId,
      batchId,
      sectionId: sectionDoc._id,
      subject,
      subjectId: subjectId && mongoose.Types.ObjectId.isValid(subjectId) ? subjectId : undefined,
      day,
      dayOfWeek: day,
      startTime,
      endTime,
      period,
      section: sectionDoc.name,
      classId: batchId,
      createdBy: (req as any).user?._id,
      isActive: true,
    });

    const data = await populateTimetable(Timetable.findById(created._id));
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateTimetableEntry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const collegeId = (req as any).user?.collegeId;
    const existing = await Timetable.findOne({ _id: id, collegeId });
    if (!existing) return res.status(404).json({ success: false, message: 'Timetable entry not found' });

    const payload = await buildEntryPayload(req, existing);
    const { teacherId, batchId, sectionDoc, subject, subjectId, day, startTime, endTime, period } = payload;

    const sectionConflict = await Timetable.findOne({
      collegeId,
      sectionId: sectionDoc._id,
      day,
      startTime,
      _id: { $ne: id },
    });
    if (sectionConflict) {
      return res.status(400).json({ success: false, message: 'This time slot is already filled for this section.' });
    }

    const teacherConflict = await Timetable.findOne({
      collegeId,
      teacherId,
      day,
      startTime,
      _id: { $ne: id },
    });
    if (teacherConflict) {
      return res.status(400).json({ success: false, message: 'This teacher already has a class at this time on this day.' });
    }

    existing.teacherId = new mongoose.Types.ObjectId(teacherId);
    existing.batchId = new mongoose.Types.ObjectId(batchId);
    existing.sectionId = sectionDoc._id;
    existing.subject = subject;
    existing.subjectId = subjectId && mongoose.Types.ObjectId.isValid(subjectId) ? new mongoose.Types.ObjectId(subjectId) : undefined;
    existing.day = day as any;
    existing.dayOfWeek = day as any;
    existing.startTime = startTime;
    existing.endTime = endTime;
    existing.period = period;
    existing.section = sectionDoc.name;
    existing.classId = new mongoose.Types.ObjectId(batchId);
    existing.createdBy = existing.createdBy || (req as any).user?._id;
    existing.isActive = true;

    await existing.save();

    const data = await populateTimetable(Timetable.findById(existing._id));
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteTimetableEntry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const collegeId = (req as any).user?.collegeId;
    const entry = await Timetable.findOneAndDelete({ _id: id, collegeId });
    if (!entry) return res.status(404).json({ success: false, message: 'Timetable entry not found' });
    res.status(200).json({ success: true, message: 'Entry deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const copySectionTimetable = async (req: Request, res: Response) => {
  try {
    const collegeId = String((req as any).user?.collegeId || '');
    const {
      sourceBatchId,
      sourceSectionId,
      sourceSectionName,
      targetBatchId,
      targetSectionId,
      targetSectionName,
      overwrite = false,
    } = req.body || {};

    if (!collegeId) {
      return res.status(400).json({ success: false, message: 'College ID is required' });
    }
    if (!sourceBatchId || !targetBatchId) {
      return res.status(400).json({ success: false, message: 'Source and target batch are required' });
    }

    const sourceSectionInput = String(sourceSectionId || sourceSectionName || '').trim();
    const targetSectionInput = String(targetSectionId || targetSectionName || '').trim();
    if (!sourceSectionInput || !targetSectionInput) {
      return res.status(400).json({ success: false, message: 'Source and target section are required' });
    }

    const sourceSection = await resolveSectionDocument(collegeId, String(sourceBatchId), sourceSectionInput, false);
    if (!sourceSection) {
      return res.status(404).json({ success: false, message: 'Source section not found' });
    }

    const targetSection = await resolveSectionDocument(collegeId, String(targetBatchId), targetSectionInput, true);
    if (!targetSection) {
      return res.status(404).json({ success: false, message: 'Target section not found' });
    }

    const targetBatch = await Batch.findOne({ _id: targetSection.batchId, collegeId }).select('name startYear endYear');
    const targetAcademicYear = String(
      (targetBatch as any)?.name
      || (targetBatch as any)?.academicYear
      || `${(targetBatch as any)?.startYear ?? ''}-${(targetBatch as any)?.endYear ?? ''}`
    ).trim();

    const sourceEntries = await Timetable.find({
      collegeId,
      isActive: true,
      $or: [
        { sectionId: sourceSection._id },
        { batchId: sourceSection.batchId, section: sourceSection.name },
      ],
    }).sort({ day: 1, startTime: 1 });

    if (!sourceEntries.length) {
      return res.status(200).json({
        success: true,
        data: { copied: 0, skippedConflicts: 0, sourceCount: 0 },
        message: 'No source timetable entries found to copy.',
      });
    }

    let copied = 0;
    let skippedConflicts = 0;

    for (const entry of sourceEntries) {
      const day = entry.day || entry.dayOfWeek;
      const startTime = String(entry.startTime || '');

      const sectionConflict = await Timetable.findOne({
        collegeId,
        sectionId: targetSection._id,
        day,
        startTime,
        isActive: true,
      });

      const teacherConflict = await Timetable.findOne({
        collegeId,
        teacherId: entry.teacherId,
        day,
        startTime,
        isActive: true,
      });

      const teacherPeriodConflict = await Timetable.findOne({
        collegeId,
        teacherId: entry.teacherId,
        dayOfWeek: day,
        period: entry.period,
        academicYear: targetAcademicYear || null,
        isActive: true,
      });

      if (sectionConflict || teacherConflict || teacherPeriodConflict) {
        if (!overwrite) {
          skippedConflicts += 1;
          continue;
        }

        if (sectionConflict) {
          await Timetable.deleteOne({ _id: sectionConflict._id });
        }
      }

      await Timetable.create({
        collegeId,
        teacherId: entry.teacherId,
        batchId: targetSection.batchId,
        sectionId: targetSection._id,
        subject: entry.subject,
        subjectId: entry.subjectId,
        day,
        dayOfWeek: day,
        startTime,
        endTime: entry.endTime,
        period: entry.period,
        academicYear: targetAcademicYear || undefined,
        section: targetSection.name,
        classId: targetSection.batchId,
        createdBy: (req as any).user?._id,
        room: entry.room,
        isActive: true,
      });

      copied += 1;
    }

    return res.status(200).json({
      success: true,
      data: {
        sourceCount: sourceEntries.length,
        copied,
        skippedConflicts,
        sourceBatchId,
        sourceSection: sourceSection.name,
        targetBatchId,
        targetSection: targetSection.name,
      },
      message: 'Timetable copy completed.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getTimetableBySection = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const collegeId = user?.collegeId;
    const { sectionId } = req.params;

    if (!user || !collegeId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const requestedSection = await Section.findOne({
      collegeId,
      $or: [
        { _id: sectionId },
        { name: normalizeSectionName(sectionId) },
      ],
    });

    if (!requestedSection) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }

    if (user.role === 'STUDENT') {
      const student = await Student.findOne({ userId: user._id, collegeId });
      if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

      const studentSection = await resolveStudentSection(student);
      if (!studentSection || String(studentSection._id) !== String(requestedSection._id)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    }

    const entries = await populateTimetable(
      Timetable.find({
        collegeId,
        isActive: true,
        $or: [
          { sectionId: requestedSection._id },
          { batchId: requestedSection.batchId, section: requestedSection.name },
        ],
      })
    ).sort({ day: 1, startTime: 1 });

    res.status(200).json({ success: true, data: entries });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTeacherTimetableById = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const collegeId = user?.collegeId;
    const { teacherId } = req.params;

    if (!user || !collegeId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (user.role === 'STUDENT') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    if (user.role === 'TEACHER' && String(user._id) !== String(teacherId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const entries = await populateTimetable(
      Timetable.find({ collegeId, teacherId, isActive: true })
    ).sort({ day: 1, startTime: 1 });

    res.status(200).json({ success: true, data: entries });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTimetableByTeacher = getTeacherTimetableById;

export const getFullTimetable = async (req: Request, res: Response) => {
  try {
    const collegeId = (req as any).user?.collegeId;
    const { teacherId, batchId, sectionId } = req.query;

    const query: any = { collegeId, isActive: true };
    if (teacherId && teacherId !== 'undefined') query.teacherId = teacherId;
    if (batchId && batchId !== 'undefined') query.batchId = batchId;
    if (sectionId && sectionId !== 'undefined') query.sectionId = sectionId;

    const results = await populateTimetable(Timetable.find(query)).sort({ day: 1, startTime: 1 });
    res.status(200).json({ success: true, data: results });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getConflicts = async (req: Request, res: Response) => {
  try {
    const collegeId = (req as any).user?.collegeId;
    const conflicts = await Timetable.aggregate([
      { $match: { collegeId: new mongoose.Types.ObjectId(collegeId), isActive: true } },
      {
        $group: {
          _id: {
            teacherId: '$teacherId',
            day: '$day',
            startTime: '$startTime',
          },
          count: { $sum: 1 },
          docs: { $push: '$$ROOT' }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);

    res.status(200).json({ success: true, data: conflicts });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTeacherTimetable = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).user?._id;
    const collegeId = (req as any).user?.collegeId;
    if (!teacherId || !collegeId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const timetable = await populateTimetable(
      Timetable.find({ collegeId, teacherId, isActive: true })
    ).sort({ day: 1, startTime: 1 });

    res.status(200).json({ success: true, data: groupEntries(timetable) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTodaySchedule = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).user?._id;
    const collegeId = (req as any).user?.collegeId;
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];

    if (today === 'Sunday') {
      return res.status(200).json({ success: true, data: [], message: 'No classes scheduled for Sunday' });
    }

    const timetable = await populateTimetable(
      Timetable.find({ collegeId, teacherId, day: today, isActive: true })
    ).sort({ startTime: 1 });

    const now = new Date();
    const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const enrichedTimetable = timetable.map((entry: any) => ({
      ...entry.toObject(),
      isUpcoming: entry.startTime > currentTimeStr,
      sessionState: entry.endTime <= currentTimeStr ? 'passed' : (entry.startTime > currentTimeStr ? 'upcoming' : 'live')
    }));

    res.status(200).json({
      success: true,
      data: enrichedTimetable,
      meta: {
        serverDate: now.toISOString().split('T')[0],
        serverTime: currentTimeStr,
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStudentTimetable = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const collegeId = (req as any).user?.collegeId;
    if (!userId || !collegeId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const student = await Student.findOne({ userId, collegeId });
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

    const batchId = student.batchId || (await Batch.findOne({ name: student.academicInfo?.batch, collegeId }))?._id;
    if (!batchId) return res.status(400).json({ success: false, message: 'Student is not assigned to a valid batch' });

    const section = await resolveStudentSection(student);
    if (!section) return res.status(400).json({ success: false, message: 'Student is not assigned to a valid section' });

    const results = await populateTimetable(
      Timetable.find({
        collegeId,
        batchId,
        isActive: true,
        $or: [
          { sectionId: section._id },
          { section: section.name },
        ],
      })
    ).sort({ day: 1, startTime: 1 });

    res.status(200).json({ success: true, data: groupEntries(results) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStudentTodaySchedule = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const collegeId = (req as any).user?.collegeId;
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    if (today === 'Sunday') return res.status(200).json({ success: true, data: [] });

    const student = await Student.findOne({ userId, collegeId });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const section = await resolveStudentSection(student);
    // Today's schedule is a non-critical dashboard widget: if the student has no
    // section assigned yet, return an empty schedule instead of failing with 400.
    if (!section) {
      return res.status(200).json({ success: true, data: [], message: 'Student is not assigned to a section yet' });
    }

    const results = await populateTimetable(
      Timetable.find({
        collegeId,
        day: today,
        isActive: true,
        $or: [
          { sectionId: section._id },
          { batchId: section.batchId, section: section.name },
        ],
      })
    ).sort({ startTime: 1 });

    const now = new Date();
    const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const enriched = results.map((entry: any) => ({
      ...entry.toObject(),
      isUpcoming: entry.startTime > currentTimeStr
    }));

    res.status(200).json({ success: true, data: enriched });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStudentTimetableLegacy = getStudentTimetable;
export const getTeacherTimetableLegacy = getTeacherTimetable;
export const getTodayScheduleLegacy = getStudentTodaySchedule;
