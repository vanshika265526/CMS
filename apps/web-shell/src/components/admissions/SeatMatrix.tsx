// FILE: apps/web-shell/src/components/admissions/SeatMatrix.tsx
"use client";

import React from "react";
import Card from "@/components/ui/Card";

interface SeatMatrixProps {
  seats: any[];
  onEditSeat?: (seat: any) => void;
}

export default function SeatMatrix({ seats, onEditSeat }: SeatMatrixProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {seats.map((seat) => {
        const totalSeats = Number(seat.totalSeats || 0);
        const filledSeats = Number(seat.filledSeats || 0);
        const fillPercentage = totalSeats > 0 ? (filledSeats / totalSeats) * 100 : 0;
        const isLow = fillPercentage < 50;
        const isHigh = fillPercentage > 85;

        return (
          <Card key={seat._id} className="p-6 bg-surface-container-low border-none group hover:scale-[1.02] transition-all">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-on-surface uppercase tracking-tight">{seat.course}</h4>
                <p className="text-[10px] font-bold text-on-surface/30 uppercase tracking-widest">{seat.batch}</p>
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                <span className="text-xl font-display font-bold text-on-surface">{filledSeats}</span>
                <span className="text-xs text-on-surface/30 font-bold tracking-tight px-1">/</span>
                <span className="text-xs text-on-surface/40 font-bold">{totalSeats}</span>
                {onEditSeat && (
                  <button
                    type="button"
                    onClick={() => onEditSeat(seat)}
                    className="text-[10px] font-black uppercase tracking-widest text-primary-indigo hover:underline"
                  >
                    Edit seats
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              <span>Utilization</span>
              <span>{fillPercentage.toFixed(0)}%</span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full bg-white/50 rounded-full overflow-hidden mb-6">
              <div 
                className={`h-full transition-all duration-700 ${
                  isHigh ? "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]" : 
                  isLow ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]" : 
                  "bg-primary-indigo shadow-[0_0_12px_rgba(79,70,229,0.4)]"
                }`}
                style={{ width: `${Math.min(fillPercentage, 100)}%` }}
              />
            </div>

            {/* Reservation Breakdown */}
            <div className="grid grid-cols-4 gap-2 border-t border-outline-variant/30 pt-4">
              <ReservationMiniItem label="GEN" count={Number(seat.reservedSeats?.General || 0)} />
              <ReservationMiniItem label="OBC" count={Number(seat.reservedSeats?.OBC || 0)} />
              <ReservationMiniItem label="SC" count={Number(seat.reservedSeats?.SC || 0)} />
              <ReservationMiniItem label="ST" count={Number(seat.reservedSeats?.ST || 0)} />
            </div>
          </Card>
        );
      })}
      {seats.length === 0 && (
        <Card className="col-span-full py-12 flex flex-col items-center justify-center bg-surface-container-low/30 border-dashed border-2 border-outline-variant">
          <p className="text-sm text-on-surface/30 font-bold uppercase tracking-widest">No seat configurations found.</p>
        </Card>
      )}
    </div>
  );
}

function ReservationMiniItem({ label, count }: { label: string; count: number }) {
  return (
    <div className="text-center">
      <p className="text-[8px] font-bold text-on-surface/30 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-xs font-bold text-on-surface/60">{count}</p>
    </div>
  );
}
