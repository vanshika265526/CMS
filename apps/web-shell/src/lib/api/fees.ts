import api from "@/lib/api";
import axios from "axios";

const getCandidateApiBases = () => {
  const candidates = new Set<string>();

  const configured = String(process.env.NEXT_PUBLIC_API_URL || "").trim();
  if (configured) candidates.add(configured.replace(/\/$/, ""));

  if (typeof window !== "undefined") {
    const host = window.location.hostname || "localhost";
    candidates.add(`http://${host}:5005/api`);
  }

  candidates.add("http://localhost:5005/api");
  candidates.add("http://127.0.0.1:5005/api");

  return Array.from(candidates);
};

export const fetchMyFeeCalculation = async () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const role = typeof window !== "undefined"
    ? String(JSON.parse(localStorage.getItem("user") || "{}").role || "").toUpperCase()
    : "";

  const paths = role === "PARENT"
    ? ["/fees/my", "/parent/me/fees"]
    : ["/fees/my"];

  const candidateBases = getCandidateApiBases();
  let lastError: any = null;

  for (const base of candidateBases) {
    for (const path of paths) {
      try {
        const response = await axios.get(`${base}${path}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          timeout: 10000,
        });
        return response.data;
      } catch (error: any) {
        lastError = error;
      }
    }
  }

  // Final fallback through shared API client to preserve existing behavior paths
  try {
    const response = await api.get("/fees/my");
    return response.data;
  } catch {
    if (role === "PARENT") {
      const fallback = await api.get("/parent/me/fees");
      return fallback.data;
    }
    throw lastError;
  }
};

export const fetchStudentFeeCalculation = async (studentId: string) => {
  const response = await api.get(`/student/fee/${studentId}`);
  return response.data;
};

export const createFeeOrder = async (payload: {
  student_id: string;
  amount: number;
  installment_number?: number;
}) => {
  const response = await api.post("/fees/create-order", payload);
  return response.data;
};

export const verifyFeePayment = async (payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) => {
  const response = await api.post("/fees/verify-payment", payload);
  return response.data;
};
