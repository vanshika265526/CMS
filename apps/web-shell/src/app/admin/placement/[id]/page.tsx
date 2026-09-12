"use client";
import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useParams } from 'next/navigation';
import PlacementForm from '../components/PlacementForm';
import { Loader2 } from 'lucide-react';

export default function EditPlacementPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/placements/${id}`);
        setData(res.data.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <div className="p-12 text-center text-gray-500">Placement not found</div>;
  }

  return <PlacementForm initialData={data} placementId={id as string} />;
}
