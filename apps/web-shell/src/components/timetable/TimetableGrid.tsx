"use client";

import React from 'react';
import { Plus, Pencil, Trash2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DAYS, TIME_SLOTS, type TimeSlot } from '@/constants/timeSlots';

export interface TimetableCellEntry {
  _id: string;
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  subjectId?: { _id?: string; name?: string; code?: string };
  teacherId?: { _id?: string; name?: string; email?: string };
  batchId?: { _id?: string; name?: string };
  sectionId?: { _id?: string; name?: string };
  createdBy?: { _id?: string; name?: string };
  room?: string;
  roomNo?: string;
}

interface TimetableGridProps {
  entries: TimetableCellEntry[];
  readOnly?: boolean;
  onEmptyCellClick?: (day: string, slot: TimeSlot) => void;
  onCellClick?: (entry: TimetableCellEntry) => void;
  onEdit?: (entry: TimetableCellEntry) => void;
  onDelete?: (entry: TimetableCellEntry) => void;
  renderBody: (entry: TimetableCellEntry) => React.ReactNode;
  renderMeta?: (entry: TimetableCellEntry) => React.ReactNode;
  emptyLabel?: string;
}

const palette = [
  { bg: 'bg-indigo-50', border: 'border-indigo-200', accent: 'bg-indigo-500', text: 'text-indigo-700' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', accent: 'bg-emerald-500', text: 'text-emerald-700' },
  { bg: 'bg-amber-50', border: 'border-amber-200', accent: 'bg-amber-500', text: 'text-amber-700' },
  { bg: 'bg-rose-50', border: 'border-rose-200', accent: 'bg-rose-500', text: 'text-rose-700' },
  { bg: 'bg-sky-50', border: 'border-sky-200', accent: 'bg-sky-500', text: 'text-sky-700' },
  { bg: 'bg-violet-50', border: 'border-violet-200', accent: 'bg-violet-500', text: 'text-violet-700' },
];

const getPalette = (key: string) => palette[Math.abs((key || 'x').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % palette.length];

export default function TimetableGrid({
  entries,
  readOnly = false,
  onEmptyCellClick,
  onCellClick,
  onEdit,
  onDelete,
  renderBody,
  renderMeta,
  emptyLabel = 'Add',
}: TimetableGridProps) {
  const lookup = React.useMemo(() => {
    const map: Record<string, Record<string, TimetableCellEntry>> = {};
    entries.forEach((entry) => {
      if (!map[entry.day]) map[entry.day] = {};
      map[entry.day][entry.startTime] = entry;
    });
    return map;
  }, [entries]);

  return (
    <div className="bg-white rounded-4xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-240 border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="w-37.5 p-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-400 border-r border-slate-100">Time</th>
              {DAYS.map((day) => (
                <th key={day} className="p-4 text-center text-[9px] font-black uppercase tracking-widest text-slate-400 border-r border-slate-100 last:border-r-0">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((slot, slotIndex) => (
              <tr key={slot.start} className={cn(slotIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/40', 'border-b border-slate-100 last:border-b-0')}>
                <td className="p-4 border-r border-slate-100 align-top">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                      <Clock size={13} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">P{slot.period}</p>
                      <p className="text-[10px] font-semibold text-slate-500">{slot.label.replace('P', '').trim()}</p>
                    </div>
                  </div>
                </td>

                {DAYS.map((day) => {
                  const entry = lookup[day]?.[slot.start];

                  if (entry) {
                    const color = getPalette(`${entry.subject}-${entry.teacherId?.name || entry.batchId?.name || day}`);
                    return (
                      <td key={`${day}-${slot.start}`} className="p-1.5 border-r border-slate-100 last:border-r-0 align-top">
                        <div
                          role={onCellClick ? 'button' : undefined}
                          tabIndex={onCellClick ? 0 : -1}
                          onClick={() => onCellClick?.(entry)}
                          className={cn('group relative min-h-24 rounded-2xl border p-3 transition-all duration-200', color.bg, color.border, onCellClick && 'cursor-pointer hover:brightness-95')}
                        >
                          <div className={cn('absolute left-0 top-0 h-full w-1 rounded-r-full', color.accent)} />
                          <div className="pl-2 pr-6 space-y-1.5">
                            {renderBody(entry)}
                            {renderMeta && <div className="pt-1 text-[9px] text-slate-500">{renderMeta(entry)}</div>}
                          </div>

                          {!readOnly && (
                            <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {onEdit && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onEdit(entry);
                                  }}
                                  className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 shadow-sm"
                                  title="Edit"
                                >
                                  <Pencil size={10} />
                                </button>
                              )}
                              {onDelete && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onDelete(entry);
                                  }}
                                  className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:border-rose-200 shadow-sm"
                                  title="Delete"
                                >
                                  <Trash2 size={10} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  }

                  if (readOnly || !onEmptyCellClick) {
                    return (
                      <td key={`${day}-${slot.start}`} className="p-1.5 border-r border-slate-100 last:border-r-0 align-top">
                        <div className="w-full min-h-24 rounded-2xl border border-dashed border-slate-100 bg-slate-50/40 flex items-center justify-center text-slate-200">
                          <span className="text-[10px] font-black uppercase tracking-widest">—</span>
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td key={`${day}-${slot.start}`} className="p-1.5 border-r border-slate-100 last:border-r-0 align-top">
                      <button
                        type="button"
                        onClick={() => onEmptyCellClick?.(day, slot)}
                        className={cn(
                          'w-full min-h-24 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center text-slate-300 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 hover:text-indigo-500'
                        )}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <Plus size={14} />
                          <span className="text-[9px] font-black uppercase tracking-widest">{emptyLabel}</span>
                        </div>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}