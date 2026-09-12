import { Request, Response } from "express";
import NaacDocument from "../models/NaacDocument.js";

export const getNaacDocuments = async (req: Request, res: Response) => {
  try {
    const { criterion, year } = req.query;
    const userRole = (req as any).user?.role;
    const userCollegeId = (req as any).user?.collegeId;
    
    let query: any = {};
    
    // For college admins, enforce their collegeId
    if (userRole === 'COLLEGE_ADMIN' && userCollegeId) {
      query.collegeId = userCollegeId;
    }
    
    if (criterion) query.criterion = Number(criterion);
    if (year) query.academicYear = year;

    const documents = await NaacDocument.find(query)
      .populate("uploadedBy", "name")
      .sort({ criterion: 1, createdAt: -1 });

    res.status(200).json({ success: true, data: documents });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadNaacDocument = async (req: Request, res: Response) => {
  try {
    const { title, criterion, academicYear, description, fileUrl } = req.body;
    const userCollegeId = (req as any).user?.collegeId;
    
    // In a real scenario, fileUrl would come from Cloudinary middleware
    const document = new NaacDocument({
      title,
      criterion,
      academicYear,
      description,
      fileUrl,
      uploadedBy: (req as any).user?._id,
      collegeId: userCollegeId,
      status: "DRAFT"
    });

    await document.save();
    res.status(201).json({ success: true, data: document });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateDocumentStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // DRAFT, REVIEW, APPROVED
    const userRole = (req as any).user?.role;
    const userCollegeId = (req as any).user?.collegeId;
    
    const document = await NaacDocument.findById(id);
    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }
    
    // For college admins, verify they own this document's college
    if (userRole === 'COLLEGE_ADMIN' && String(document.collegeId) !== String(userCollegeId)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    
    const updatedDoc = await NaacDocument.findByIdAndUpdate(id, { status }, { new: true });
    res.status(200).json({ success: true, data: updatedDoc });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getComplianceStats = async (req: Request, res: Response) => {
  try {
    const stats = await NaacDocument.aggregate([
      { $group: { _id: "$criterion", count: { $sum: 1 } } }
    ]);
    res.status(200).json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
