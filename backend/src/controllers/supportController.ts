import { Request, Response } from "express";
import SupportTicket from "../models/SupportTicket.js";
import { emitToUser } from "../config/socket.js";

const STAFF_ROLES = ["SUPER_ADMIN", "COLLEGE_ADMIN", "ADMIN", "SUPPORT"];

const isStaff = (role?: string) => STAFF_ROLES.includes(String(role || "").toUpperCase());

// Hours allowed before a ticket breaches its SLA, by priority.
const SLA_HOURS: Record<string, number> = {
  URGENT: 4,
  HIGH: 12,
  MEDIUM: 48,
  LOW: 96,
};

const generateTicketNumber = () => {
  const stamp = Date.now().toString(36).toUpperCase();
  const noise = Math.floor(Math.random() * 46656).toString(36).toUpperCase().padStart(3, "0");
  return `TKT-${stamp}-${noise}`;
};

const collegeScope = (req: Request) => {
  const role = String((req as any).user?.role || "").toUpperCase();
  const collegeId = (req as any).user?.collegeId;
  return role !== "SUPER_ADMIN" && collegeId ? { collegeId } : {};
};

export const createTicket = async (req: Request, res: Response) => {
  try {
    const { subject, description, category, priority, attachmentUrl } = req.body;
    const user = (req as any).user;

    const effectivePriority = SLA_HOURS[String(priority).toUpperCase()] ? priority : "MEDIUM";
    const slaDueAt = new Date(Date.now() + SLA_HOURS[effectivePriority] * 60 * 60 * 1000);

    const ticket = await SupportTicket.create({
      ticketNumber: generateTicketNumber(),
      raisedBy: user?._id,
      collegeId: user?.collegeId,
      subject,
      description,
      category,
      priority: effectivePriority,
      slaDueAt,
      attachmentUrl,
    });

    res.status(201).json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getTickets = async (req: Request, res: Response) => {
  try {
    const { status, category, priority, search } = req.query;
    const user = (req as any).user;

    const query: any = { ...collegeScope(req) };

    // Anyone who is not support staff only ever sees the tickets they raised.
    if (!isStaff(user?.role)) {
      query.raisedBy = user?._id;
    }

    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (search) {
      const term = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { subject: { $regex: term, $options: "i" } },
        { ticketNumber: { $regex: term, $options: "i" } },
      ];
    }

    const tickets = await SupportTicket.find(query)
      .populate("raisedBy", "name email role")
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: tickets });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTicketById = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const query: any = { _id: req.params.id, ...collegeScope(req) };
    if (!isStaff(user?.role)) query.raisedBy = user?._id;

    const ticket = await SupportTicket.findOne(query)
      .populate("raisedBy", "name email role")
      .populate("assignedTo", "name email")
      .lean();

    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    res.status(200).json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const replyToTicket = async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    const user = (req as any).user;
    const staff = isStaff(user?.role);

    const query: any = { _id: req.params.id, ...collegeScope(req) };
    if (!staff) query.raisedBy = user?._id;

    const ticket = await SupportTicket.findOne(query);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    if (ticket.status === "CLOSED") {
      return res.status(400).json({ success: false, message: "This ticket is closed" });
    }

    ticket.replies.push({
      authorId: user._id,
      authorName: user.name || "User",
      message,
      isStaffReply: staff,
      createdAt: new Date(),
    } as any);

    // A staff reply on a fresh ticket moves it into progress automatically.
    if (staff && ticket.status === "OPEN") {
      ticket.status = "IN_PROGRESS";
    }
    await ticket.save();

    // Notify the other side of the conversation.
    const notifyUserId = staff ? String(ticket.raisedBy) : String(ticket.assignedTo || "");
    if (notifyUserId) {
      emitToUser(notifyUserId, "supportTicketReply", {
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        message: `New reply on ${ticket.ticketNumber}`,
      });
    }

    res.status(200).json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateTicket = async (req: Request, res: Response) => {
  try {
    const { status, priority, assignedTo } = req.body;

    const ticket = await SupportTicket.findOne({ _id: req.params.id, ...collegeScope(req) });
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

    if (priority && SLA_HOURS[String(priority).toUpperCase()]) {
      ticket.priority = priority;
      // Re-base the SLA clock on the original creation time, not "now".
      ticket.slaDueAt = new Date(
        new Date(ticket.createdAt).getTime() + SLA_HOURS[priority] * 60 * 60 * 1000
      );
    }
    if (assignedTo !== undefined) ticket.assignedTo = assignedTo || undefined;
    if (status) {
      ticket.status = status;
      if (status === "RESOLVED" || status === "CLOSED") {
        ticket.resolvedAt = ticket.resolvedAt || new Date();
      }
    }

    await ticket.save();

    emitToUser(String(ticket.raisedBy), "supportTicketUpdated", {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
      message: `Ticket ${ticket.ticketNumber} is now ${ticket.status.replace("_", " ").toLowerCase()}`,
    });

    res.status(200).json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getSupportStats = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const base: any = { ...collegeScope(req) };
    if (!isStaff(user?.role)) base.raisedBy = user?._id;

    const [byStatus, byCategory, breached, total] = await Promise.all([
      SupportTicket.aggregate([{ $match: base }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      SupportTicket.aggregate([
        { $match: base },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
      SupportTicket.countDocuments({
        ...base,
        status: { $in: ["OPEN", "IN_PROGRESS"] },
        slaDueAt: { $lt: new Date() },
      }),
      SupportTicket.countDocuments(base),
    ]);

    const statusMap = byStatus.reduce<Record<string, number>>(
      (acc, s: any) => ({ ...acc, [s._id]: s.count }),
      {}
    );

    res.status(200).json({
      success: true,
      data: {
        total,
        open: statusMap.OPEN || 0,
        inProgress: statusMap.IN_PROGRESS || 0,
        resolved: statusMap.RESOLVED || 0,
        closed: statusMap.CLOSED || 0,
        slaBreached: breached,
        byCategory: byCategory.reduce(
          (acc: Record<string, number>, c: any) => ({ ...acc, [c._id]: c.count }),
          {}
        ),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
