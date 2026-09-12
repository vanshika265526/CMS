"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Home,
  ChevronRight,
  Loader2,
  Plus,
  X,
  BedDouble,
  DoorOpen,
  UtensilsCrossed,
  AlertTriangle,
  Check,
  Users,
} from "lucide-react";
import {
  fetchHostels,
  fetchHostelStats,
  fetchRooms,
  fetchAllocations,
  fetchGatePasses,
  fetchMessMenu,
  fetchMyHostel,
  createHostel,
  createRoom,
  allocateBed,
  vacateBed,
  createGatePass,
  updateGatePassStatus,
  saveMessMenu,
} from "@/lib/api/hostel";
import { getStudents } from "@/lib/api/students";

const ADMIN_ROLES = ["SUPER_ADMIN", "COLLEGE_ADMIN", "ADMIN", "WARDEN"];
const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-600 border-amber-100",
  APPROVED: "bg-emerald-50 text-emerald-600 border-emerald-100",
  REJECTED: "bg-rose-50 text-rose-600 border-rose-100",
  CHECKED_OUT: "bg-indigo-50 text-indigo-600 border-indigo-100",
  RETURNED: "bg-slate-50 text-slate-600 border-slate-200",
  OVERDUE: "bg-rose-50 text-rose-600 border-rose-100",
  AVAILABLE: "bg-emerald-50 text-emerald-600 border-emerald-100",
  FULL: "bg-slate-100 text-slate-600 border-slate-200",
  MAINTENANCE: "bg-amber-50 text-amber-600 border-amber-100",
  RESERVED: "bg-indigo-50 text-indigo-600 border-indigo-100",
};

const studentLabel = (student: any) => {
  if (!student) return "Unknown";
  const info = student.personalInfo || {};
  return (
    info.name || `${info.firstName || ""} ${info.lastName || ""}`.trim() || student.uniqueStudentId || "Unknown"
  );
};

export default function HostelPage() {
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [tab, setTab] = useState<"overview" | "rooms" | "allocations" | "passes" | "mess">("overview");

  const [stats, setStats] = useState<any>(null);
  const [hostels, setHostels] = useState<any[]>([]);
  const [activeHostel, setActiveHostel] = useState<string>("");
  const [rooms, setRooms] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [gatePasses, setGatePasses] = useState<any[]>([]);
  const [messMenu, setMessMenu] = useState<any[]>([]);
  const [myHostel, setMyHostel] = useState<any>(null);

  const [modal, setModal] = useState<null | "hostel" | "room" | "allocate" | "gatePass" | "mess">(null);
  const [allocationTarget, setAllocationTarget] = useState<{ room: any; bedNumber: number } | null>(null);

  const isAdmin = ADMIN_ROLES.includes(role.toUpperCase());

  const notify = (type: "error" | "success", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 5000);
  };

  const loadAdminData = useCallback(async (hostelId?: string) => {
    const [statsRes, hostelsRes] = await Promise.all([fetchHostelStats(), fetchHostels()]);
    if (statsRes.success) setStats(statsRes.data);

    const list = hostelsRes.success ? hostelsRes.data : [];
    setHostels(list);

    const selected = hostelId || list[0]?._id || "";
    setActiveHostel(selected);

    if (selected) {
      const [roomsRes, allocRes, passRes, menuRes] = await Promise.all([
        fetchRooms({ hostelId: selected }),
        fetchAllocations({ hostelId: selected }),
        fetchGatePasses({ hostelId: selected }),
        fetchMessMenu(selected),
      ]);
      if (roomsRes.success) setRooms(roomsRes.data);
      if (allocRes.success) setAllocations(allocRes.data);
      if (passRes.success) setGatePasses(passRes.data);
      if (menuRes.success) setMessMenu(menuRes.data);
    } else {
      setRooms([]);
      setAllocations([]);
      setGatePasses([]);
      setMessMenu([]);
    }
  }, []);

  const loadStudentData = useCallback(async () => {
    const [mineRes, passRes] = await Promise.all([fetchMyHostel(), fetchGatePasses()]);
    if (mineRes.success) setMyHostel(mineRes.data);
    if (passRes.success) setGatePasses(passRes.data);
  }, []);

  const refresh = useCallback(
    async (currentRole: string, hostelId?: string) => {
      setLoading(true);
      try {
        if (ADMIN_ROLES.includes(currentRole.toUpperCase())) {
          await loadAdminData(hostelId);
        } else {
          await loadStudentData();
        }
      } catch (err: any) {
        notify("error", err?.response?.data?.message || err.message || "Failed to load hostel data");
      } finally {
        setLoading(false);
      }
    },
    [loadAdminData, loadStudentData]
  );

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("user") || "{}").role || "";
    setRole(stored);
    refresh(stored);
  }, [refresh]);

  const selectHostel = async (hostelId: string) => {
    setActiveHostel(hostelId);
    await refresh(role, hostelId);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Operations <ChevronRight size={10} /> <span className="text-slate-900">Hostel</span>
          </nav>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Hostel Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Room allocation, mess planning and gate pass security.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-3">
            {hostels.length > 0 && (
              <select
                value={activeHostel}
                onChange={(e) => selectHostel(e.target.value)}
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-400"
              >
                {hostels.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.name}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => setModal("hostel")}
              className="px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-lg shadow-slate-900/10 flex items-center gap-2"
            >
              <Plus size={14} /> New Hostel
            </button>
          </div>
        )}

        {!isAdmin && myHostel && (
          <button
            onClick={() => setModal("gatePass")}
            className="px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-lg shadow-slate-900/10 flex items-center gap-2"
          >
            <DoorOpen size={14} /> Request Gate Pass
          </button>
        )}
      </header>

      {feedback && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold flex items-center gap-2 ${
            feedback.type === "error"
              ? "border-rose-100 bg-rose-50 text-rose-700"
              : "border-emerald-100 bg-emerald-50 text-emerald-700"
          }`}
        >
          {feedback.type === "error" ? <AlertTriangle size={16} /> : <Check size={16} />}
          {feedback.text}
        </div>
      )}

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-indigo-600" size={28} />
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
            Loading hostel records
          </p>
        </div>
      ) : isAdmin ? (
        <AdminView
          tab={tab}
          setTab={setTab}
          stats={stats}
          hostels={hostels}
          activeHostel={activeHostel}
          rooms={rooms}
          allocations={allocations}
          gatePasses={gatePasses}
          messMenu={messMenu}
          onAddRoom={() => setModal("room")}
          onEditMess={() => setModal("mess")}
          onAllocate={(room, bedNumber) => {
            setAllocationTarget({ room, bedNumber });
            setModal("allocate");
          }}
          onVacate={async (allocationId) => {
            try {
              await vacateBed(allocationId);
              notify("success", "Bed vacated");
              await refresh(role, activeHostel);
            } catch (err: any) {
              notify("error", err?.response?.data?.message || "Failed to vacate bed");
            }
          }}
          onPassAction={async (id, status) => {
            try {
              await updateGatePassStatus(id, status);
              notify("success", `Gate pass ${status.toLowerCase().replace("_", " ")}`);
              await refresh(role, activeHostel);
            } catch (err: any) {
              notify("error", err?.response?.data?.message || "Failed to update gate pass");
            }
          }}
        />
      ) : (
        <StudentView data={myHostel} gatePasses={gatePasses} />
      )}

      {modal === "hostel" && (
        <HostelModal
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null);
            notify("success", "Hostel created");
            await refresh(role);
          }}
          onError={(m) => notify("error", m)}
        />
      )}

      {modal === "room" && (
        <RoomModal
          hostelId={activeHostel}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null);
            notify("success", "Room added");
            await refresh(role, activeHostel);
          }}
          onError={(m) => notify("error", m)}
        />
      )}

      {modal === "allocate" && allocationTarget && (
        <AllocateModal
          target={allocationTarget}
          onClose={() => {
            setModal(null);
            setAllocationTarget(null);
          }}
          onSaved={async () => {
            setModal(null);
            setAllocationTarget(null);
            notify("success", "Bed allocated");
            await refresh(role, activeHostel);
          }}
          onError={(m) => notify("error", m)}
        />
      )}

      {modal === "gatePass" && (
        <GatePassModal
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null);
            notify("success", "Gate pass requested. Awaiting warden approval.");
            await refresh(role);
          }}
          onError={(m) => notify("error", m)}
        />
      )}

      {modal === "mess" && (
        <MessModal
          hostelId={activeHostel}
          existing={messMenu}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null);
            notify("success", "Mess menu updated");
            await refresh(role, activeHostel);
          }}
          onError={(m) => notify("error", m)}
        />
      )}
    </div>
  );
}

// ============ ADMIN ============

function AdminView({
  tab,
  setTab,
  stats,
  hostels,
  activeHostel,
  rooms,
  allocations,
  gatePasses,
  messMenu,
  onAddRoom,
  onEditMess,
  onAllocate,
  onVacate,
  onPassAction,
}: any) {
  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "rooms", label: `Rooms (${rooms.length})` },
    { id: "allocations", label: `Allocations (${allocations.length})` },
    { id: "passes", label: `Gate Passes (${gatePasses.filter((p: any) => p.status === "PENDING").length})` },
    { id: "mess", label: "Mess Menu" },
  ];

  if (!hostels.length) {
    return (
      <EmptyState
        icon={<Home size={28} />}
        title="No hostels configured yet"
        body="Create your first hostel block to start allocating rooms, planning the mess and issuing gate passes."
      />
    );
  }

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap border transition-all ${
              tab === t.id
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Occupancy" value={`${stats.occupancyRate}%`} hint={`${stats.occupied} of ${stats.capacity} beds`} />
            <StatCard label="Beds Available" value={stats.available} hint={`${stats.rooms} rooms`} />
            <StatCard label="Pending Passes" value={stats.pendingGatePasses} hint="Awaiting warden approval" />
            <StatCard
              label="Overdue Returns"
              value={stats.overdueReturns}
              hint="Students past return time"
              alert={stats.overdueReturns > 0}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">
                Blocks
              </h3>
              <div className="space-y-3">
                {hostels.map((h: any) => (
                  <div key={h._id} className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{h.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {h.type.replace("_", "-")} · {h.roomCount} rooms
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            h.occupancyRate >= 90 ? "bg-rose-500" : "bg-indigo-600"
                          }`}
                          style={{ width: `${Math.min(h.occupancyRate, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-black text-slate-900 w-10 text-right">
                        {h.occupancyRate}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">
                Rooms by Status
              </h3>
              <div className="space-y-3">
                {Object.entries(stats.roomsByStatus || {}).map(([status, count]: any) => (
                  <div key={status} className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                        STATUS_STYLES[status] || "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      {status}
                    </span>
                    <span className="text-sm font-black text-slate-900">{count}</span>
                  </div>
                ))}
                {!Object.keys(stats.roomsByStatus || {}).length && (
                  <p className="text-xs text-slate-400 font-semibold">No rooms created yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "rooms" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={onAddRoom}
              className="px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
            >
              <Plus size={14} /> Add Room
            </button>
          </div>

          {!rooms.length ? (
            <EmptyState
              icon={<BedDouble size={28} />}
              title="No rooms in this block"
              body="Add rooms to start allocating beds to students."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {rooms.map((room: any) => (
                <div key={room._id} className="bg-white border border-slate-200 rounded-3xl p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-lg font-black text-slate-900">Room {room.roomNumber}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Floor {room.floor} · {room.roomType}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                        STATUS_STYLES[room.status] || "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      {room.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {room.beds.map((bed: any) => (
                      <button
                        key={bed.bedNumber}
                        onClick={() =>
                          bed.occupied ? onVacate(bed.allocationId) : onAllocate(room, bed.bedNumber)
                        }
                        title={
                          bed.occupied
                            ? `${studentLabel(bed.student)} — click to vacate`
                            : "Click to allocate"
                        }
                        className={`w-12 h-12 rounded-xl border-2 flex flex-col items-center justify-center transition-all hover:scale-105 ${
                          bed.occupied
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "bg-white border-dashed border-slate-300 text-slate-400 hover:border-indigo-400"
                        }`}
                      >
                        <BedDouble size={14} />
                        <span className="text-[8px] font-black">{bed.bedNumber}</span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {room.occupants}/{room.capacity} occupied
                    </span>
                    <span className="text-xs font-black text-slate-900">
                      ₹{room.monthlyRent.toLocaleString("en-IN")}/mo
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "allocations" && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
          {!allocations.length ? (
            <div className="p-12">
              <EmptyState
                icon={<Users size={28} />}
                title="No active allocations"
                body="Allocate a bed from the Rooms tab to see students here."
                bare
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {["Student", "Room", "Bed", "Since", ""].map((h) => (
                      <th
                        key={h}
                        className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allocations.map((a: any) => (
                    <tr key={a._id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3">
                        <p className="font-bold text-slate-900">{studentLabel(a.studentId)}</p>
                        <p className="text-[10px] font-bold text-slate-400">
                          {a.studentId?.uniqueStudentId}
                        </p>
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-700">
                        {a.roomId?.roomNumber}
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-700">{a.bedNumber}</td>
                      <td className="px-5 py-3 text-slate-500 font-medium">
                        {new Date(a.allocatedAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => onVacate(a._id)}
                          className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50"
                        >
                          Vacate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "passes" && (
        <div className="space-y-3">
          {!gatePasses.length ? (
            <EmptyState
              icon={<DoorOpen size={28} />}
              title="No gate pass requests"
              body="Requests raised by hostel residents will appear here for approval."
            />
          ) : (
            gatePasses.map((pass: any) => (
              <div
                key={pass._id}
                className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-slate-900">{studentLabel(pass.studentId)}</p>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                        STATUS_STYLES[pass.status]
                      }`}
                    >
                      {pass.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 font-medium">
                    {pass.reason} — {pass.destination}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {new Date(pass.departureAt).toLocaleString("en-IN")} →{" "}
                    {new Date(pass.expectedReturnAt).toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {pass.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => onPassAction(pass._id, "APPROVED")}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => onPassAction(pass._id, "REJECTED")}
                        className="px-4 py-2 rounded-xl border border-rose-200 text-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {pass.status === "APPROVED" && (
                    <button
                      onClick={() => onPassAction(pass._id, "CHECKED_OUT")}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest"
                    >
                      Check Out
                    </button>
                  )}
                  {pass.status === "CHECKED_OUT" && (
                    <button
                      onClick={() => onPassAction(pass._id, "RETURNED")}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest"
                    >
                      Mark Returned
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "mess" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={onEditMess}
              className="px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
            >
              <UtensilsCrossed size={14} /> Edit Menu
            </button>
          </div>
          <MessTable menu={messMenu} />
        </div>
      )}
    </>
  );
}

// ============ STUDENT ============

function StudentView({ data, gatePasses }: { data: any; gatePasses: any[] }) {
  if (!data) {
    return (
      <EmptyState
        icon={<Home size={28} />}
        title="No hostel allocation"
        body="You do not currently have a hostel room assigned. Contact the hostel office if you have applied for accommodation."
      />
    );
  }

  const { allocation, roommates, messMenu } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-5">
            My Accommodation
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <Detail label="Block" value={allocation.hostelId?.name} />
            <Detail label="Room" value={allocation.roomId?.roomNumber} />
            <Detail label="Bed" value={allocation.bedNumber} />
            <Detail label="Type" value={allocation.roomId?.roomType} />
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
              Roommates
            </p>
            {roommates.length ? (
              <div className="flex flex-wrap gap-2">
                {roommates.map((r: any) => (
                  <span
                    key={r._id}
                    className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700"
                  >
                    {studentLabel(r.studentId)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-semibold">
                You currently have this room to yourself.
              </p>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-5">
            Charges
          </h3>
          <div className="space-y-4">
            <Detail
              label="Room Rent"
              value={`₹${(allocation.roomId?.monthlyRent || 0).toLocaleString("en-IN")}/mo`}
            />
            <Detail
              label="Mess Fee"
              value={`₹${(allocation.hostelId?.messFeePerMonth || 0).toLocaleString("en-IN")}/mo`}
            />
            <div className="pt-4 border-t border-slate-100">
              <Detail
                label="Total Monthly"
                value={`₹${(
                  (allocation.roomId?.monthlyRent || 0) + (allocation.hostelId?.messFeePerMonth || 0)
                ).toLocaleString("en-IN")}`}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-5">
          My Gate Passes
        </h3>
        {gatePasses.length ? (
          <div className="space-y-3">
            {gatePasses.map((pass: any) => (
              <div
                key={pass._id}
                className="flex items-center justify-between gap-4 py-3 border-b border-slate-50 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {pass.reason} — {pass.destination}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {new Date(pass.departureAt).toLocaleString("en-IN")}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border shrink-0 ${
                    STATUS_STYLES[pass.status]
                  }`}
                >
                  {pass.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 font-semibold">
            No gate pass requests yet.
          </p>
        )}
      </div>

      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">
          Weekly Mess Menu
        </h3>
        <MessTable menu={messMenu} />
      </div>
    </div>
  );
}

// ============ SHARED PIECES ============

function MessTable({ menu }: { menu: any[] }) {
  const byDay = useMemo(
    () => new Map(menu.map((m: any) => [m.dayOfWeek, m])),
    [menu]
  );

  if (!menu.length) {
    return (
      <EmptyState
        icon={<UtensilsCrossed size={28} />}
        title="Mess menu not published"
        body="The weekly menu for this block has not been set up yet."
      />
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {["Day", "Breakfast", "Lunch", "Snacks", "Dinner"].map((h) => (
              <th
                key={h}
                className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {DAYS.map((day) => {
            const row = byDay.get(day);
            return (
              <tr key={day} className="hover:bg-slate-50/50">
                <td className="px-5 py-3 font-black text-slate-900 text-[10px] uppercase tracking-widest">
                  {day.slice(0, 3)}
                </td>
                <td className="px-5 py-3 text-slate-600">{row?.breakfast || "—"}</td>
                <td className="px-5 py-3 text-slate-600">{row?.lunch || "—"}</td>
                <td className="px-5 py-3 text-slate-600">{row?.snacks || "—"}</td>
                <td className="px-5 py-3 text-slate-600">{row?.dinner || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ label, value, hint, alert }: any) {
  return (
    <div
      className={`bg-white border rounded-3xl p-5 ${
        alert ? "border-rose-200" : "border-slate-200"
      }`}
    >
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{label}</p>
      <p className={`text-3xl font-black ${alert ? "text-rose-600" : "text-slate-900"}`}>{value}</p>
      <p className="text-[10px] font-bold text-slate-400 mt-1">{hint}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-slate-900">{value ?? "—"}</p>
    </div>
  );
}

function EmptyState({ icon, title, body, bare }: any) {
  const content = (
    <div className="max-w-md mx-auto text-center py-8">
      <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
        {icon}
      </div>
      <h2 className="text-lg font-bold text-slate-900 mb-2">{title}</h2>
      <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
    </div>
  );

  if (bare) return content;
  return (
    <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-8">{content}</div>
  );
}

function Dialog({ title, onClose, children }: any) {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-100 p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-black text-slate-900 uppercase tracking-widest">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center"
          >
            <X size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400";
const labelClass =
  "block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2";

function SubmitRow({ onClose, saving, label = "Save" }: any) {
  return (
    <div className="flex items-center justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-60 flex items-center gap-2"
      >
        {saving && <Loader2 size={14} className="animate-spin" />}
        {label}
      </button>
    </div>
  );
}

// ============ MODALS ============

function HostelModal({ onClose, onSaved, onError }: any) {
  const [form, setForm] = useState({
    name: "",
    code: "",
    type: "MALE",
    address: "",
    contactNumber: "",
    messFeePerMonth: 0,
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createHostel(form);
      onSaved();
    } catch (err: any) {
      onError(err?.response?.data?.message || "Failed to create hostel");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title="New Hostel Block" onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Name</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Code</label>
            <input
              className={inputClass}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="e.g. BH1"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Type</label>
            <select
              className={inputClass}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="MALE">Boys</option>
              <option value="FEMALE">Girls</option>
              <option value="CO_ED">Co-ed</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Mess Fee (per month)</label>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={form.messFeePerMonth}
              onChange={(e) => setForm({ ...form, messFeePerMonth: Number(e.target.value) })}
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Address</label>
          <input
            className={inputClass}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Contact Number</label>
          <input
            className={inputClass}
            value={form.contactNumber}
            onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
          />
        </div>
        <SubmitRow onClose={onClose} saving={saving} label="Create Hostel" />
      </form>
    </Dialog>
  );
}

function RoomModal({ hostelId, onClose, onSaved, onError }: any) {
  const [form, setForm] = useState({
    roomNumber: "",
    floor: 0,
    capacity: 2,
    roomType: "DOUBLE",
    monthlyRent: 0,
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createRoom({ ...form, hostelId });
      onSaved();
    } catch (err: any) {
      onError(err?.response?.data?.message || "Failed to add room");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title="Add Room" onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Room Number</label>
            <input
              className={inputClass}
              value={form.roomNumber}
              onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Floor</label>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={form.floor}
              onChange={(e) => setForm({ ...form, floor: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Type</label>
            <select
              className={inputClass}
              value={form.roomType}
              onChange={(e) => {
                const roomType = e.target.value;
                const capacityByType: Record<string, number> = {
                  SINGLE: 1,
                  DOUBLE: 2,
                  TRIPLE: 3,
                  DORMITORY: 6,
                };
                setForm({ ...form, roomType, capacity: capacityByType[roomType] || form.capacity });
              }}
            >
              <option value="SINGLE">Single</option>
              <option value="DOUBLE">Double</option>
              <option value="TRIPLE">Triple</option>
              <option value="DORMITORY">Dormitory</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Capacity</label>
            <input
              type="number"
              min={1}
              className={inputClass}
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Rent (per month)</label>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={form.monthlyRent}
              onChange={(e) => setForm({ ...form, monthlyRent: Number(e.target.value) })}
            />
          </div>
        </div>
        <SubmitRow onClose={onClose} saving={saving} label="Add Room" />
      </form>
    </Dialog>
  );
}

function AllocateModal({ target, onClose, onSaved, onError }: any) {
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getStudents({ search, limit: 25 });
        const list = (res?.data as any)?.students || res?.data || [];
        setStudents(Array.isArray(list) ? list : []);
      } catch {
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    })();
  }, [search]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return onError("Select a student to allocate");
    setSaving(true);
    try {
      await allocateBed({
        studentId: selected,
        roomId: target.room._id,
        bedNumber: target.bedNumber,
      });
      onSaved();
    } catch (err: any) {
      onError(err?.response?.data?.message || "Failed to allocate bed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title={`Allocate Room ${target.room.roomNumber} · Bed ${target.bedNumber}`} onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label className={labelClass}>Search Student</label>
          <input
            className={inputClass}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or enrollment number"
          />
        </div>

        <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100">
          {loadingStudents ? (
            <div className="p-6 flex justify-center">
              <Loader2 className="animate-spin text-indigo-600" size={20} />
            </div>
          ) : students.length ? (
            students.map((s: any) => (
              <button
                type="button"
                key={s._id}
                onClick={() => setSelected(s._id)}
                className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
                  selected === s._id ? "bg-indigo-50" : "hover:bg-slate-50"
                }`}
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">{studentLabel(s)}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {s.uniqueStudentId}
                  </p>
                </div>
                {selected === s._id && <Check size={16} className="text-indigo-600" />}
              </button>
            ))
          ) : (
            <p className="p-6 text-center text-xs text-slate-400 font-semibold">
              No students matched that search.
            </p>
          )}
        </div>

        <SubmitRow onClose={onClose} saving={saving} label="Allocate Bed" />
      </form>
    </Dialog>
  );
}

function GatePassModal({ onClose, onSaved, onError }: any) {
  const [form, setForm] = useState({
    passType: "DAY_OUT",
    reason: "",
    destination: "",
    departureAt: "",
    expectedReturnAt: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createGatePass(form);
      onSaved();
    } catch (err: any) {
      onError(err?.response?.data?.message || "Failed to request gate pass");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title="Request Gate Pass" onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Pass Type</label>
            <select
              className={inputClass}
              value={form.passType}
              onChange={(e) => setForm({ ...form, passType: e.target.value })}
            >
              <option value="DAY_OUT">Day Out</option>
              <option value="OVERNIGHT">Overnight</option>
              <option value="HOME_VISIT">Home Visit</option>
              <option value="EMERGENCY">Emergency</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Destination</label>
            <input
              className={inputClass}
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
              required
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Reason</label>
          <textarea
            className={`${inputClass} min-h-24`}
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            required
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Departure</label>
            <input
              type="datetime-local"
              className={inputClass}
              value={form.departureAt}
              onChange={(e) => setForm({ ...form, departureAt: e.target.value })}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Expected Return</label>
            <input
              type="datetime-local"
              className={inputClass}
              value={form.expectedReturnAt}
              onChange={(e) => setForm({ ...form, expectedReturnAt: e.target.value })}
              required
            />
          </div>
        </div>
        <SubmitRow onClose={onClose} saving={saving} label="Submit Request" />
      </form>
    </Dialog>
  );
}

function MessModal({ hostelId, existing, onClose, onSaved, onError }: any) {
  const [day, setDay] = useState("MONDAY");
  const [form, setForm] = useState({ breakfast: "", lunch: "", snacks: "", dinner: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const row = existing.find((m: any) => m.dayOfWeek === day);
    setForm({
      breakfast: row?.breakfast || "",
      lunch: row?.lunch || "",
      snacks: row?.snacks || "",
      dinner: row?.dinner || "",
    });
  }, [day, existing]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveMessMenu({ hostelId, dayOfWeek: day, ...form });
      onSaved();
    } catch (err: any) {
      onError(err?.response?.data?.message || "Failed to save mess menu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title="Edit Mess Menu" onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label className={labelClass}>Day</label>
          <select className={inputClass} value={day} onChange={(e) => setDay(e.target.value)}>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d.charAt(0) + d.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        {(["breakfast", "lunch", "snacks", "dinner"] as const).map((meal) => (
          <div key={meal}>
            <label className={labelClass}>{meal}</label>
            <input
              className={inputClass}
              value={form[meal]}
              onChange={(e) => setForm({ ...form, [meal]: e.target.value })}
            />
          </div>
        ))}
        <SubmitRow onClose={onClose} saving={saving} label="Save Menu" />
      </form>
    </Dialog>
  );
}
