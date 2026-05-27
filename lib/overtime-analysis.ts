import { calculatePaidHours } from "@/lib/labor-math";
import { LABOR } from "@/constants";

export const analyzeOvertime = (shifts: any[]) => {
  return shifts.map(shift => {
    const paid = calculatePaidHours(new Date(shift.clock_in), new Date(shift.clock_out));
    return { ...shift, paidHours: paid, isOvertime: paid > LABOR.OVERTIME_THRESHOLD_HOURS };
  });
};
