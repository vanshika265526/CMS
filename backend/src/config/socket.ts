import { Server } from "socket.io";
import { Server as HttpServer } from "http";

let io: Server;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: "*", // Adjust for production
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log(`[SOCKET] User connected: ${socket.id}`);

    // Join room based on role and ID (Batch/Student/User)
    socket.on("join", (data: { userId: string; role: string; batchId?: string; studentId?: string }) => {
      console.log(`[SOCKET] User ${data.userId} joining rooms:`, data);
      
      // Personal User Room (for DM notifications — every user gets one)
      if (data.userId) {
        socket.join(`user_${data.userId}`);
        console.log(`Joined room: user_${data.userId}`);
      }

      // Personal Room (Student/Parent specific child room)
      if (data.studentId) {
        socket.join(`student_${data.studentId}`);
        console.log(`Joined room: student_${data.studentId}`);
      }

      // Batch Room (For general notifications/attendance)
      if (data.batchId) {
        socket.join(`batch_${data.batchId}`);
        console.log(`Joined room: batch_${data.batchId}`);
      }
    });

    socket.on("disconnect", () => {
      console.log(`[SOCKET] User disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

export const emitToUser = (userId: string, event: string, data: any) => {
  if (io) {
    io.to(`user_${userId}`).emit(event, data);
  }
};

export const emitToStudent = (studentId: string, event: string, data: any) => {
  if (io) {
    io.to(`student_${studentId}`).emit(event, data);
  }
};

export const emitToBatch = (batchId: string, event: string, data: any) => {
  if (io) {
    io.to(`batch_${batchId}`).emit(event, data);
  }
};
