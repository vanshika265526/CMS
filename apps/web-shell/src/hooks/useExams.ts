import { useState, useEffect, useCallback } from 'react';
import * as api from '@/lib/api/exams';

export const useExams = (collegeId?: string, status?: string) => {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExams = useCallback(async () => {
    if (!collegeId) return;
    setLoading(true);
    try {
      const res = await api.getExams({ collegeId, status });
      if (res.success) {
        setExams(res.data);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [collegeId, status]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const createExam = async (data: any) => {
    setLoading(true);
    try {
      const res = await api.createExam(data);
      if (res.success) {
        await fetchExams();
        return res;
      }
      
      // Handle validation errors with detailed info
      let errorMessage = res.message || "Failed to create exam";
      if (res.errors && Array.isArray(res.errors)) {
        const details = res.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(", ");
        errorMessage = `${errorMessage}. ${details}`;
      }
      
      throw new Error(errorMessage);
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message || err?.message || 'Failed to create exam';
      setError(apiMessage);
      throw new Error(apiMessage);
    } finally {
      setLoading(false);
    }
  };

  const scheduleExam = async (examId: string) => {
    setLoading(true);
    try {
      const res = await api.scheduleExam(examId);
      if (res.success) {
        await fetchExams();
        return res;
      }
      throw new Error(res.message);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { exams, loading, error, fetchExams, createExam, scheduleExam };
};

export const useExam = (examId: string) => {
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExam = useCallback(async () => {
    if (!examId) return;
    setLoading(true);
    try {
      const res = await api.getExamById(examId);
      if (res.success) {
        setExam(res.data);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    fetchExam();
  }, [fetchExam]);

  return { exam, loading, error, fetchExam };
};
