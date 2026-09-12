import { Request, Response } from "express";
import Hostel from "../models/Hostel.js";
import HostelRoom from "../models/HostelRoom.js";
import HostelAllocation from "../models/HostelAllocation.js";
import MessMenu from "../models/MessMenu.js";
import GatePass from "../models/GatePass.js";
import Student from "../models/Student.js";
import { emitToStudent } from "../config/socket.js";

const ADMIN_ROLES = ["SUPER_ADMIN", "COLLEGE_ADMIN", "ADMIN", "WARDEN"];

const isAdmin = (role?: string) => ADMIN_ROLES.includes(String(role || "").toUpperCase());

/** Scopes a query to the caller's college unless they are a super admin. */
const collegeScope = (req: Request) => {
  const role = String((req as any).user?.role || "").toUpperCase();
  const collegeId = (req as any).user?.collegeId;
  return role !== "SUPER_ADMIN" && collegeId ? { collegeId } : {};
};

const resolveStudent = async (req: Request) => {
  const userId = (req as any).user?._id;
  return Student.findOne({ userId }).select("_id collegeId personalInfo uniqueStudentId");
};

// ============ HOSTELS ============

export const getHostels = async (req: Request, res: Response) => {
  try {
    const hostels = await Hostel.find({ ...collegeScope(req), isActive: true })
      .populate("wardenId", "name email")
      .sort({ name: 1 })
      .lean();

    const hostelIds = hostels.map((h) => h._id);
    const [roomAgg, activeAgg] = await Promise.all([
      HostelRoom.aggregate([
        { $match: { hostelId: { $in: hostelIds } } },
        {
          $group: {
            _id: "$hostelId",
            rooms: { $sum: 1 },
            capacity: { $sum: "$capacity" },
          },
        },
      ]),
      HostelAllocation.aggregate([
        { $match: { hostelId: { $in: hostelIds }, status: "ACTIVE" } },
        { $group: { _id: "$hostelId", occupied: { $sum: 1 } } },
      ]),
    ]);

    const roomMap = new Map(roomAgg.map((r) => [String(r._id), r]));
    const occupiedMap = new Map(activeAgg.map((a) => [String(a._id), a.occupied]));

    const data = hostels.map((h) => {
      const rooms = roomMap.get(String(h._id));
      const capacity = rooms?.capacity || 0;
      const occupied = occupiedMap.get(String(h._id)) || 0;
      return {
        ...h,
        roomCount: rooms?.rooms || 0,
        capacity,
        occupied,
        available: Math.max(capacity - occupied, 0),
        occupancyRate: capacity > 0 ? Math.round((occupied / capacity) * 100) : 0,
      };
    });

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createHostel = async (req: Request, res: Response) => {
  try {
    const { name, code, type, wardenId, address, contactNumber, messFeePerMonth } = req.body;
    const hostel = await Hostel.create({
      name,
      code,
      type,
      wardenId: wardenId || undefined,
      address,
      contactNumber,
      messFeePerMonth: Number(messFeePerMonth) || 0,
      collegeId: (req as any).user?.collegeId,
    });
    res.status(201).json({ success: true, data: hostel });
  } catch (error: any) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "A hostel with this code already exists" });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateHostel = async (req: Request, res: Response) => {
  try {
    const hostel = await Hostel.findOneAndUpdate(
      { _id: req.params.id, ...collegeScope(req) },
      req.body,
      { new: true, runValidators: true }
    );
    if (!hostel) return res.status(404).json({ success: false, message: "Hostel not found" });
    res.status(200).json({ success: true, data: hostel });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============ ROOMS ============

export const getRooms = async (req: Request, res: Response) => {
  try {
    const { hostelId, status, floor } = req.query;
    const query: any = { ...collegeScope(req) };
    if (hostelId) query.hostelId = hostelId;
    if (status) query.status = status;
    if (floor !== undefined && floor !== "") query.floor = Number(floor);

    const rooms = await HostelRoom.find(query).sort({ floor: 1, roomNumber: 1 }).lean();

    const allocations = await HostelAllocation.find({
      roomId: { $in: rooms.map((r) => r._id) },
      status: "ACTIVE",
    })
      .populate("studentId", "personalInfo.name personalInfo.firstName personalInfo.lastName uniqueStudentId")
      .lean();

    const byRoom = new Map<string, any[]>();
    for (const a of allocations) {
      const key = String(a.roomId);
      if (!byRoom.has(key)) byRoom.set(key, []);
      byRoom.get(key)!.push(a);
    }

    const data = rooms.map((room) => {
      const occupants = byRoom.get(String(room._id)) || [];
      const takenBeds = new Set(occupants.map((o) => o.bedNumber));
      const beds = Array.from({ length: room.capacity }, (_, i) => {
        const bedNumber = i + 1;
        const occupant = occupants.find((o) => o.bedNumber === bedNumber);
        return {
          bedNumber,
          occupied: takenBeds.has(bedNumber),
          allocationId: occupant?._id || null,
          student: occupant?.studentId || null,
        };
      });
      return { ...room, beds, occupants: occupants.length };
    });

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createRoom = async (req: Request, res: Response) => {
  try {
    const { hostelId, roomNumber, floor, capacity, roomType, monthlyRent, amenities } = req.body;

    const hostel = await Hostel.findOne({ _id: hostelId, ...collegeScope(req) });
    if (!hostel) return res.status(404).json({ success: false, message: "Hostel not found" });

    const room = await HostelRoom.create({
      hostelId,
      collegeId: hostel.collegeId,
      roomNumber,
      floor: Number(floor) || 0,
      capacity: Number(capacity),
      roomType,
      monthlyRent: Number(monthlyRent) || 0,
      amenities: Array.isArray(amenities) ? amenities : [],
    });

    await Hostel.updateOne({ _id: hostelId }, { $inc: { totalRooms: 1 } });

    res.status(201).json({ success: true, data: room });
  } catch (error: any) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "That room number already exists in this hostel" });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateRoom = async (req: Request, res: Response) => {
  try {
    const room = await HostelRoom.findOne({ _id: req.params.id, ...collegeScope(req) });
    if (!room) return res.status(404).json({ success: false, message: "Room not found" });

    // Never let capacity drop below the number of students already living there.
    if (req.body.capacity !== undefined && Number(req.body.capacity) < room.occupiedCount) {
      return res.status(400).json({
        success: false,
        message: `Capacity cannot be lower than the ${room.occupiedCount} occupant(s) currently allocated`,
      });
    }

    Object.assign(room, req.body);
    if (room.status !== "MAINTENANCE" && room.status !== "RESERVED") {
      room.status = room.occupiedCount >= room.capacity ? "FULL" : "AVAILABLE";
    }
    await room.save();

    res.status(200).json({ success: true, data: room });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============ ALLOCATIONS ============

export const allocateBed = async (req: Request, res: Response) => {
  try {
    const { studentId, roomId, bedNumber, remarks } = req.body;

    const room = await HostelRoom.findOne({ _id: roomId, ...collegeScope(req) });
    if (!room) return res.status(404).json({ success: false, message: "Room not found" });
    if (room.status === "MAINTENANCE") {
      return res
        .status(400)
        .json({ success: false, message: "This room is under maintenance" });
    }

    const student = await Student.findById(studentId).select("_id collegeId personalInfo");
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    const existing = await HostelAllocation.findOne({ studentId, status: "ACTIVE" });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "This student already holds an active hostel allocation",
      });
    }

    const taken = await HostelAllocation.find({ roomId, status: "ACTIVE" }).select("bedNumber").lean();
    const takenBeds = new Set(taken.map((t) => t.bedNumber));

    let bed = Number(bedNumber);
    if (!bed) {
      bed = 0;
      for (let i = 1; i <= room.capacity; i++) {
        if (!takenBeds.has(i)) {
          bed = i;
          break;
        }
      }
    }

    if (!bed || bed > room.capacity) {
      return res.status(400).json({ success: false, message: "This room has no free beds" });
    }
    if (takenBeds.has(bed)) {
      return res.status(409).json({ success: false, message: `Bed ${bed} is already occupied` });
    }

    const allocation = await HostelAllocation.create({
      studentId,
      hostelId: room.hostelId,
      roomId,
      collegeId: room.collegeId,
      bedNumber: bed,
      allocatedBy: (req as any).user?._id,
      remarks,
    });

    const occupiedCount = await HostelAllocation.countDocuments({ roomId, status: "ACTIVE" });
    await HostelRoom.updateOne(
      { _id: roomId },
      {
        occupiedCount,
        ...(room.status === "RESERVED"
          ? {}
          : { status: occupiedCount >= room.capacity ? "FULL" : "AVAILABLE" }),
      }
    );

    emitToStudent(String(studentId), "hostelAllocated", {
      roomNumber: room.roomNumber,
      bedNumber: bed,
      message: `You have been allocated room ${room.roomNumber}, bed ${bed}`,
    });

    res.status(201).json({ success: true, data: allocation });
  } catch (error: any) {
    // The partial unique indexes are the real race guard — a concurrent request lands here.
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "That bed was just taken. Please pick another." });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

export const vacateBed = async (req: Request, res: Response) => {
  try {
    const allocation = await HostelAllocation.findOne({
      _id: req.params.id,
      status: "ACTIVE",
      ...collegeScope(req),
    });
    if (!allocation) {
      return res.status(404).json({ success: false, message: "Active allocation not found" });
    }

    allocation.status = "VACATED";
    allocation.vacatedAt = new Date();
    await allocation.save();

    const room = await HostelRoom.findById(allocation.roomId);
    if (room) {
      const occupiedCount = await HostelAllocation.countDocuments({
        roomId: room._id,
        status: "ACTIVE",
      });
      room.occupiedCount = occupiedCount;
      if (room.status !== "MAINTENANCE" && room.status !== "RESERVED") {
        room.status = occupiedCount >= room.capacity ? "FULL" : "AVAILABLE";
      }
      await room.save();
    }

    res.status(200).json({ success: true, data: allocation });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAllocations = async (req: Request, res: Response) => {
  try {
    const { hostelId, status = "ACTIVE" } = req.query;
    const query: any = { ...collegeScope(req), status };
    if (hostelId) query.hostelId = hostelId;

    const allocations = await HostelAllocation.find(query)
      .populate("studentId", "personalInfo uniqueStudentId academicInfo.semester")
      .populate("roomId", "roomNumber floor roomType monthlyRent")
      .populate("hostelId", "name code")
      .sort({ allocatedAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: allocations });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/** The logged-in student's own room, roommates, mess menu and gate passes. */
export const getMyHostel = async (req: Request, res: Response) => {
  try {
    const student = await resolveStudent(req);
    if (!student) return res.status(404).json({ success: false, message: "Student profile not found" });

    const allocation = await HostelAllocation.findOne({ studentId: student._id, status: "ACTIVE" })
      .populate("roomId", "roomNumber floor roomType monthlyRent capacity amenities")
      .populate("hostelId", "name code type address contactNumber messFeePerMonth")
      .lean();

    if (!allocation) {
      return res.status(200).json({ success: true, data: null });
    }

    const [roommates, menu, gatePasses] = await Promise.all([
      HostelAllocation.find({
        roomId: allocation.roomId,
        status: "ACTIVE",
        studentId: { $ne: student._id },
      })
        .populate("studentId", "personalInfo.name personalInfo.firstName personalInfo.lastName personalInfo.phone")
        .lean(),
      MessMenu.find({ hostelId: allocation.hostelId }).lean(),
      GatePass.find({ studentId: student._id }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    res.status(200).json({
      success: true,
      data: { allocation, roommates, messMenu: menu, gatePasses },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ MESS MENU ============

export const getMessMenu = async (req: Request, res: Response) => {
  try {
    const { hostelId } = req.query;
    const query: any = { ...collegeScope(req) };
    if (hostelId) query.hostelId = hostelId;
    const menu = await MessMenu.find(query).lean();
    res.status(200).json({ success: true, data: menu });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const upsertMessMenu = async (req: Request, res: Response) => {
  try {
    const { hostelId, dayOfWeek, breakfast, lunch, snacks, dinner } = req.body;

    const hostel = await Hostel.findOne({ _id: hostelId, ...collegeScope(req) });
    if (!hostel) return res.status(404).json({ success: false, message: "Hostel not found" });

    const menu = await MessMenu.findOneAndUpdate(
      { hostelId, dayOfWeek },
      {
        breakfast,
        lunch,
        snacks,
        dinner,
        collegeId: hostel.collegeId,
        updatedBy: (req as any).user?._id,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, data: menu });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============ GATE PASSES ============

export const createGatePass = async (req: Request, res: Response) => {
  try {
    const student = await resolveStudent(req);
    if (!student) return res.status(404).json({ success: false, message: "Student profile not found" });

    const allocation = await HostelAllocation.findOne({ studentId: student._id, status: "ACTIVE" });
    if (!allocation) {
      return res.status(400).json({
        success: false,
        message: "You need an active hostel allocation to request a gate pass",
      });
    }

    const { passType, reason, destination, departureAt, expectedReturnAt } = req.body;

    if (new Date(expectedReturnAt) <= new Date(departureAt)) {
      return res
        .status(400)
        .json({ success: false, message: "Return time must be after departure time" });
    }

    const pass = await GatePass.create({
      studentId: student._id,
      hostelId: allocation.hostelId,
      collegeId: allocation.collegeId,
      passType,
      reason,
      destination,
      departureAt,
      expectedReturnAt,
    });

    res.status(201).json({ success: true, data: pass });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getGatePasses = async (req: Request, res: Response) => {
  try {
    const { hostelId, status } = req.query;
    const role = String((req as any).user?.role || "").toUpperCase();

    const query: any = { ...collegeScope(req) };
    if (hostelId) query.hostelId = hostelId;
    if (status) query.status = status;

    // Students only ever see their own passes, whatever they ask for.
    if (!isAdmin(role)) {
      const student = await resolveStudent(req);
      if (!student) return res.status(200).json({ success: true, data: [] });
      query.studentId = student._id;
    }

    const passes = await GatePass.find(query)
      .populate("studentId", "personalInfo uniqueStudentId")
      .populate("hostelId", "name code")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: passes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateGatePassStatus = async (req: Request, res: Response) => {
  try {
    const { status, rejectionReason } = req.body;
    const allowed = ["APPROVED", "REJECTED", "CHECKED_OUT", "RETURNED"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid gate pass status" });
    }

    const pass = await GatePass.findOne({ _id: req.params.id, ...collegeScope(req) });
    if (!pass) return res.status(404).json({ success: false, message: "Gate pass not found" });

    if (status === "APPROVED" || status === "REJECTED") {
      pass.approvedBy = (req as any).user?._id;
      pass.approvedAt = new Date();
      if (status === "REJECTED") pass.rejectionReason = rejectionReason;
    }
    if (status === "RETURNED") {
      pass.actualReturnAt = new Date();
    }
    pass.status = status;
    await pass.save();

    emitToStudent(String(pass.studentId), "gatePassUpdated", {
      gatePassId: pass._id,
      status,
      message: `Your gate pass request was ${status.toLowerCase().replace("_", " ")}`,
    });

    res.status(200).json({ success: true, data: pass });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============ DASHBOARD ============

export const getHostelStats = async (req: Request, res: Response) => {
  try {
    const scope = collegeScope(req);
    const hostels = await Hostel.find({ ...scope, isActive: true }).select("_id").lean();
    const hostelIds = hostels.map((h) => h._id);

    const [capacityAgg, occupied, pendingPasses, overdue, roomsByStatus] = await Promise.all([
      HostelRoom.aggregate([
        { $match: { hostelId: { $in: hostelIds } } },
        { $group: { _id: null, capacity: { $sum: "$capacity" }, rooms: { $sum: 1 } } },
      ]),
      HostelAllocation.countDocuments({ hostelId: { $in: hostelIds }, status: "ACTIVE" }),
      GatePass.countDocuments({ hostelId: { $in: hostelIds }, status: "PENDING" }),
      GatePass.countDocuments({
        hostelId: { $in: hostelIds },
        status: "CHECKED_OUT",
        expectedReturnAt: { $lt: new Date() },
      }),
      HostelRoom.aggregate([
        { $match: { hostelId: { $in: hostelIds } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const capacity = capacityAgg[0]?.capacity || 0;

    res.status(200).json({
      success: true,
      data: {
        hostels: hostelIds.length,
        rooms: capacityAgg[0]?.rooms || 0,
        capacity,
        occupied,
        available: Math.max(capacity - occupied, 0),
        occupancyRate: capacity > 0 ? Math.round((occupied / capacity) * 100) : 0,
        pendingGatePasses: pendingPasses,
        overdueReturns: overdue,
        roomsByStatus: roomsByStatus.reduce(
          (acc: Record<string, number>, r: any) => ({ ...acc, [r._id]: r.count }),
          {}
        ),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
