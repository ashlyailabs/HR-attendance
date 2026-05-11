/** Official work window (minutes from midnight). */
export const WORK_START_MINS = 9 * 60 + 5; // 09:05 → 545
export const WORK_END_MINS = 17 * 60 + 30; // 17:30 → 1050

/**
 * Overtime is only counted when the employee stays at or beyond
 * 4 hours past the official end of day (17:30 + 4h = 21:30).
 */
export const OVERTIME_THRESHOLD_MINS = WORK_END_MINS + 4 * 60; // 21:30 → 1290
