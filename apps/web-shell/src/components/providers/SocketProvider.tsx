"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const resolveSocketBaseUrl = () => {
    const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
    if (configuredUrl) {
      return configuredUrl.replace(/\/api\/?$/, "");
    }

    return "http://localhost:5005";
  };

  const canReachBackend = async (socketBaseUrl: string) => {
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 2500);
      const response = await fetch(`${socketBaseUrl}/api/settings/public`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    let socketInstance: Socket | null = null;

    const bootstrapSocket = async () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const token = localStorage.getItem("token");

    if (!token || !user._id) return;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsConnected(false);
      return;
    }

    const socketUrl = resolveSocketBaseUrl();
    const backendReady = await canReachBackend(socketUrl);
    if (!backendReady) {
      setIsConnected(false);
      return;
    }
    
    socketInstance = io(socketUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 2,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
      timeout: 4000,
    });

    socketInstance.on("connect", () => {
      console.log("[SOCKET] Connected to backend");
      setIsConnected(true);

      // Join rooms based on role and linked child if any
      const joinData: any = { userId: user._id, role: user.role };
      
      // If student, join student room and batch room
      if (user.role === 'STUDENT') {
        const student = JSON.parse(localStorage.getItem("student_profile") || "{}");
        if (student._id) joinData.studentId = student._id;
        if (student.batchId) joinData.batchId = student.batchId;
      }
      
      // If parent, join linked child rooms
      if (user.role === 'PARENT') {
        const children = JSON.parse(localStorage.getItem("children_profiles") || "[]");
        if (children.length > 0) {
          joinData.studentId = children[0]._id; // For simplicity, first child
          joinData.batchId = children[0].batchId;
        }
      }

      socketInstance.emit("join", joinData);
    });

    socketInstance.on("disconnect", () => {
      console.log("[SOCKET] Disconnected from backend");
      setIsConnected(false);
    });

    socketInstance.on("connect_error", () => {
      setIsConnected(false);
    });

    setSocket(socketInstance);
    };

    bootstrapSocket();

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
