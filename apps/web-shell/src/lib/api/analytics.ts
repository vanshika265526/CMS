import api from "@/lib/api";

export const fetchAnalyticsOverview = async () => {
  const response = await api.get("/analytics/overview");
  return response.data;
};

export const fetchEnrollmentTrend = async (months = 12) => {
  const response = await api.get("/analytics/enrollment-trend", { params: { months } });
  return response.data;
};

export const fetchAttendanceTrend = async (days = 30) => {
  const response = await api.get("/analytics/attendance-trend", { params: { days } });
  return response.data;
};

export const fetchDepartmentPerformance = async () => {
  const response = await api.get("/analytics/department-performance");
  return response.data;
};

export const fetchAtRiskStudents = async (threshold = 30) => {
  const response = await api.get("/analytics/at-risk", { params: { threshold } });
  return response.data;
};

export const fetchGradeDistribution = async () => {
  const response = await api.get("/analytics/grade-distribution");
  return response.data;
};
