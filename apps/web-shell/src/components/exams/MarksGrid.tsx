"use client";

import React, { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import { useMarks } from "@/hooks/useMarks";

interface MarksGridProps {
  examId: string;
  subjects: any[];
  students: any[];
  courseId: string;
  batchId: string;
  totalMarks: number;
}

const MarksGrid: React.FC<MarksGridProps> = ({ examId, subjects, students, courseId, batchId, totalMarks }) => {
  const { enterMarks, loading, error: apiError } = useMarks(examId);
  const [localMarks, setLocalMarks] = useState<Record<string, any>>({});
  const [activeSubject, setActiveSubject] = useState(subjects[0]?._id);
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleMarkChange = (studentId: string, obtainedMarks: string) => {
    setLocalMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [activeSubject]: obtainedMarks
      }
    }));
  };

  const handleSave = async (studentId: string) => {
    const marksValue = localMarks[studentId]?.[activeSubject];
    if (marksValue === undefined) return;

    // Validate required fields
    if (!studentId || !activeSubject || !courseId || !batchId) {
      alert("Missing required data: ensure course, batch, and student data are loaded");
      return;
    }

    const marksNum = Number(marksValue);
    if (isNaN(marksNum) || marksNum < 0 || marksNum > totalMarks) {
      alert(`Marks must be between 0 and ${totalMarks}`);
      return;
    }

    setSavingId(`${studentId}-${activeSubject}`);
    try {
      await enterMarks({
        studentId,
        subjectId: activeSubject,
        courseId,
        batchId,
        components: [
          { name: "Main Exam", maxMarks: totalMarks, obtainedMarks: marksNum }
        ]
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {(!batchId || !courseId) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <div className="text-red-600 font-bold text-lg">⚠️</div>
          <div>
            <p className="text-sm font-bold text-red-600">Cannot save marks yet</p>
            <p className="text-xs text-red-500 mt-1">Missing batch or course information. Please reload the page or contact support.</p>
          </div>
        </div>
      )}

      <div className="flex gap-2 p-1 bg-surface-container rounded-2xl w-fit">
        {subjects.map((subject) => (
          <button
            key={subject._id}
            onClick={() => setActiveSubject(subject._id)}
            className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${
              activeSubject === subject._id
                ? "bg-surface-container-lowest text-primary shadow-ambient"
                : "text-surface-on-surface-variant hover:text-surface-on-surface"
            }`}
          >
            {subject.name}
          </button>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-high text-surface-on-surface-variant uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4 text-center">Marks</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline">
              {students.map((student) => (
                <tr key={student._id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-4 font-medium text-surface-on-surface">
                    {student.personalInfo.firstName} {student.personalInfo.lastName}
                  </td>
                  <td className="px-6 py-4 text-surface-on-surface-variant">
                    {student.uniqueStudentId}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <input
                        type="number"
                        min="0"
                        max={totalMarks}
                        value={localMarks[student._id]?.[activeSubject] || ""}
                        onChange={(e) => handleMarkChange(student._id, e.target.value)}
                        className="w-24 bg-slate-50 text-center font-bold text-slate-900 p-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-10 shadow-inner"
                      />
                      <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Max: {totalMarks}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleSave(student._id)}
                      disabled={savingId === `${student._id}-${activeSubject}` || !batchId || !courseId}
                      className="px-4 py-2 bg-primary text-primary-on-primary rounded-lg text-sm font-medium shadow-ambient hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingId === `${student._id}-${activeSubject}` ? "Saving..." : "Save"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default MarksGrid;
