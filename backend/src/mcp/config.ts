// MCP Server — Centralized Constants
// All magic numbers live here. Change once, affects all tools.

/** Library: number of days a book can be borrowed before fines apply */
export const LIBRARY_LOAN_PERIOD_DAYS = 14;

/** Library: fine per overdue day in ₹ */
export const LIBRARY_FINE_PER_DAY = 5;

/** Receipt number prefix */
export const RECEIPT_PREFIX = 'RCP';

/** Attendance: percentage below which a student is flagged for shortage */
export const ATTENDANCE_SHORTAGE_THRESHOLD = 75;

/** Default page size for paginated queries */
export const DEFAULT_PAGE_SIZE = 20;

/** Maximum page size to prevent excessive queries */
export const MAX_PAGE_SIZE = 100;
