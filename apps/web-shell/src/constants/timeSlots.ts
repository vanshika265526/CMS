export const DAYS = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
] as const;

export type TimetableDay = (typeof DAYS)[number];

export const TIME_SLOTS = [
	{ period: 1, start: "09:00", end: "10:00", label: "P1  9:00 - 10:00 AM" },
	{ period: 2, start: "10:00", end: "11:00", label: "P2  10:00 - 11:00 AM" },
	{ period: 3, start: "11:00", end: "12:00", label: "P3  11:00 - 12:00 PM" },
	{ period: 4, start: "12:00", end: "13:00", label: "P4  12:00 - 1:00 PM" },
	{ period: 5, start: "13:00", end: "14:00", label: "P5  1:00 - 2:00 PM" },
	{ period: 6, start: "14:00", end: "15:00", label: "P6  2:00 - 3:00 PM" },
	{ period: 7, start: "15:00", end: "16:00", label: "P7  3:00 - 4:00 PM" },
	{ period: 8, start: "16:00", end: "17:00", label: "P8  4:00 - 5:00 PM" },
] as const;

export type TimeSlot = (typeof TIME_SLOTS)[number];

export const getSlotByStartTime = (startTime: string) =>
	TIME_SLOTS.find((slot) => slot.start === startTime);

export const getSlotByPeriod = (period: number) =>
	TIME_SLOTS.find((slot) => slot.period === period);