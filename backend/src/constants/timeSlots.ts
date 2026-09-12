export const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const TIME_SLOTS = [
  { period: 1, start: "09:00", end: "10:00", label: "9:00 AM – 10:00 AM" },
  { period: 2, start: "10:00", end: "11:00", label: "10:00 AM – 11:00 AM" },
  { period: 3, start: "11:00", end: "12:00", label: "11:00 AM – 12:00 PM" },
  { period: 4, start: "12:00", end: "13:00", label: "12:00 PM – 1:00 PM" },
  { period: 5, start: "13:00", end: "14:00", label: "1:00 PM – 2:00 PM" },
  { period: 6, start: "14:00", end: "15:00", label: "2:00 PM – 3:00 PM" },
  { period: 7, start: "15:00", end: "16:00", label: "3:00 PM – 4:00 PM" },
  { period: 8, start: "16:00", end: "17:00", label: "4:00 PM – 5:00 PM" },
] as const;

export type TimeSlot = typeof TIME_SLOTS[number];

export type TimetableDay = typeof DAYS[number];

export const TIME_SLOT_STARTS = TIME_SLOTS.map((slot) => slot.start);

export const getSlotByPeriod = (period: number): TimeSlot | undefined =>
  TIME_SLOTS.find(s => s.period === period);

export const getSlotByStartTime = (startTime: string): TimeSlot | undefined =>
  TIME_SLOTS.find(s => s.start === startTime?.trim());
