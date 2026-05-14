export type AttendanceRecord = {
  employeeId: string;
  employeeName: string;
  branch: string;
  department: string;
  designation: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  checkIn: string;
  checkOut: string;
  duration: string;
  totalHours: number;
  isLate: boolean;
  lateMins: number;
  isOvertime: boolean;
  overtimeMins: number;
  isEarlyExit: boolean;
  earlyExitMins: number;
  /** HR-entered in Google Sheet; not overwritten by uploads. */
  remarks: string;
};

export type DailySummary = {
  date: string;
  headcount: number;
  avgHours: number;
  lateCount: number;
  overtimeCount: number;
  earlyExitCount: number;
};

export type DeptSummary = {
  department: string;
  uniqueEmployees: number;
  avgHours: number;
  lateCount: number;
  overtimeCount: number;
};

export type EmployeeSummary = {
  employeeId: string;
  employeeName: string;
  daysPresent: number;
  avgHours: number;
  totalHours: number;
  lateDays: number;
  overtimeDays: number;
  earlyExitDays: number;
  totalOvertimeMins: number;
};

export type DashboardData = {
  dateRangeLabel: string;
  totalEmployees: number;
  avgDailyHours: number;
  /** Count of attendance rows with late arrival (same basis as latePercent). */
  lateArrivalsCount: number;
  latePercent: number;
  overtimeRecordsCount: number;
  earlyExitsCount: number;
  dailySummaries: DailySummary[];
  deptSummaries: DeptSummary[];
  employeeSummaries: EmployeeSummary[];
  records: AttendanceRecord[];
};
