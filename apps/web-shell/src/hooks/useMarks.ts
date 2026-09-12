import { useState, useCallback } from 'react';
import * as api from '@/lib/api/exams';

export const useMarks = (examId: string) => {
  const [marks, setMarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMarks = useCallback(async (params: any = {}) => {
    if (!examId) return;
    setLoading(true);
    try {
      const res = await api.getMarks(examId, params);
      if (res.success) {
        setMarks(res.data);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  const enterMarks = async (data: any) => {
    setLoading(true);
    try {
      const res = await api.enterMarks(examId, data);
      if (res.success) {
        await fetchMarks();
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

  const bulkImportMarks = async (data: any) => {
    setLoading(true);
    try {
      const res = await api.bulkImportMarks(examId, data);
      if (res.success) {
        await fetchMarks();
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

  const publishResults = async () => {
    setLoading(true);
    try {
      const res = await api.publishResults(examId);
      if (res.success) {
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

  return { marks, loading, error, fetchMarks, enterMarks, bulkImportMarks, publishResults };
};
