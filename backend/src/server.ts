import dotenv from 'dotenv';
dotenv.config();

console.log("--- SYSTEM BOOT DIAGNOSTICS ---");
console.log("PORT:", process.env.PORT);
console.log("CLOUD_NAME:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("-------------------------------");

import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';
import { initSocket } from './config/socket.js';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import admissionsRoutes from './routes/admissions.js';
import courseRoutes from './routes/courseRoutes.js';
import batchRoutes from './routes/batchRoutes.js';
import attendanceRoutes from './routes/attendance.js';
import studentRoutes from './routes/students.js';
import departmentRoutes from './routes/departments.js';
import subjectRoutes from './routes/subjectRoutes.js';
import examsRoutes from './routes/exams.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import teacherRoutes from './routes/teacher.js';
import adminRoutes from './routes/admin.routes.js';
import parentRoutes from './routes/parentRoutes.js';
import libraryRoutes from './routes/library.js';
import notificationsRoutes from './routes/notifications.js';
import superAdminRoutes from './routes/superAdmin.routes.js';
import publicSettingsRoutes from './routes/publicSettings.routes.js';
import timetableRoutes from './routes/timetableRoutes.js';
import dashboardRoutes from './routes/dashboard.js';
import feesRoutes from './routes/feesRoutes.js';
import studentFeeRoutes from './routes/studentFeeRoutes.js';
import placementRoutes from './routes/placementRoutes.js';
import importRoutes from './routes/importRoutes.js';
import trustedSourceRoutes from './routes/trustedSourceRoutes.js';
import { sanitizeInput } from './middleware/sanitize.js';
import { integrateMCPWithExpress } from './mcp/express.js';
import { JobOrchestrator } from './services/queue/JobOrchestrator.js';
import { EmailQueueProcessor } from './services/emailQueueProcessor.js';

// Production safety check: Do not allow static OTP in production
if (process.env.NODE_ENV === 'production' && process.env.ADMIN_STATIC_OTP) {
  console.error("FATAL ERROR: ADMIN_STATIC_OTP cannot be used in a production environment.");
  process.exit(1);
}

// Connect to MongoDB
console.log("[DB] Attempting to connect to MongoDB...");
await connectDB();
console.log("[DB] MongoDB connection sequence completed.");

const app = express();
// Trust Render's reverse proxy so req.ip / X-Forwarded-* reflect the real client
// (used by MCP rate limiting and login session IP capture).
app.set('trust proxy', 1);
integrateMCPWithExpress(app);
const httpServer = createServer(app);

// Initialize Socket.io
initSocket(httpServer);

// Middleware
const configuredOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean)
  : [];

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://[::1]:3000',
  'http://[::1]:3001',
  'https://collegemanagement.avanienterprises.in',
  'http://collegemanagement.avanienterprises.in',
  'https://cms-lovat-phi.vercel.app',
  ...configuredOrigins
];

const isAllowedLocalOrigin = (origin: string) => {
  try {
    const parsed = new URL(origin);
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '[::1]' || parsed.hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
};

app.use(cors({
  origin: (origin, callback) => {
    const cleanOrigin = origin ? origin.replace(/\/$/, '') : '';
    if (!origin || allowedOrigins.includes(cleanOrigin) || isAllowedLocalOrigin(cleanOrigin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sanitize all incoming input (body/query/params) to block script/HTML injection (XSS).
app.use(sanitizeInput);

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Request Logger
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admissions', admissionsRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/settings', publicSettingsRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/fees', feesRoutes);
app.use('/api/student', studentFeeRoutes);
app.use('/api/placements', placementRoutes);
app.use('/api/imports', importRoutes);
app.use('/api/trusted-sources', trustedSourceRoutes);

JobOrchestrator.initCron();

app.get('/', (req: Request, res: Response) => {
  res.send('AI-Powered College Management System API is running...');
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error("EXPRESS ERROR:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const PORT = process.env.PORT || 5005;

console.log(`[SERVER] Attempting to start server on port ${PORT}...`);
httpServer.listen(PORT, () => {
  console.log(`[SERVER] Success! Server is running on port ${PORT}`);
  
  // Start the email queue processor background loop
  EmailQueueProcessor.start();
  
  // Trigger recovery for stuck email queue jobs on startup
  EmailQueueProcessor.recoverStuckJobs().catch(err => {
    console.error('[EmailQueueProcessor] Error in startup recovery:', err);
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('[SERVER] SIGTERM received. Stopping background worker and closing HTTP server...');
  EmailQueueProcessor.stop();
  httpServer.close(() => {
    console.log('[SERVER] HTTP server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[SERVER] SIGINT received. Stopping background worker and closing HTTP server...');
  EmailQueueProcessor.stop();
  httpServer.close(() => {
    console.log('[SERVER] HTTP server closed.');
    process.exit(0);
  });
});
