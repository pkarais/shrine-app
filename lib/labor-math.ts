import { LABOR, BREAKS } from "@/constants"

export function calculatePaidHours(clockIn: Date, clockOut: Date): number {
  const totalMs = clockOut.getTime() - clockIn.getTime()
  const totalHours = totalMs / (1000 * 60 * 60)

  const unpaidMinutes = totalHours >= (BREAKS.LUNCH.TRIGGER_HOURS + BREAKS.LUNCH.DURATION_MINUTES / 60)
    ? LABOR.UNPAID_LUNCH_MINUTES
    : 0

  const paidHours = totalHours - unpaidMinutes / 60
  return Math.max(0, paidHours)
}

export function getNextBreakInfo(clockIn: Date, currentTime: Date) {
  const hoursWorked = (currentTime.getTime() - clockIn.getTime()) / (1000 * 60 * 60)

  if (hoursWorked < BREAKS.FIRST.TRIGGER_HOURS) {
    const remaining = (BREAKS.FIRST.TRIGGER_HOURS - hoursWorked) * 60
    return {
      nextBreak: "15-min break (paid)",
      remainingMinutes: Math.round(remaining),
      breakDuration: BREAKS.FIRST.DURATION_MINUTES,
      breakNumber: 1,
      isPaid: true,
    }
  }

  if (hoursWorked < BREAKS.LUNCH.TRIGGER_HOURS) {
    const remaining = (BREAKS.LUNCH.TRIGGER_HOURS - hoursWorked) * 60
    return {
      nextBreak: "30-min lunch (unpaid)",
      remainingMinutes: Math.round(remaining),
      breakDuration: BREAKS.LUNCH.DURATION_MINUTES,
      breakNumber: 2,
      isPaid: false,
    }
  }

  if (hoursWorked < BREAKS.SECOND.TRIGGER_HOURS) {
    const remaining = (BREAKS.SECOND.TRIGGER_HOURS - hoursWorked) * 60
    return {
      nextBreak: "15-min break (paid)",
      remainingMinutes: Math.round(remaining),
      breakDuration: BREAKS.SECOND.DURATION_MINUTES,
      breakNumber: 3,
      isPaid: true,
    }
  }

  return {
    nextBreak: "All breaks taken",
    remainingMinutes: 0,
    breakDuration: 0,
    breakNumber: 4,
    isPaid: true,
  }
}

export function getShiftProgress(clockIn: Date, currentTime: Date) {
  const hoursWorked = (currentTime.getTime() - clockIn.getTime()) / (1000 * 60 * 60)
  const paidHours = calculatePaidHours(clockIn, currentTime)
  const progress = Math.min(100, (hoursWorked / LABOR.SHIFT_LENGTH_HOURS) * 100)
  return {
    hoursWorked: Math.round(hoursWorked * 10) / 10,
    paidHours: Math.round(paidHours * 10) / 10,
    progressPercent: Math.round(progress),
    isOvertime: hoursWorked > LABOR.SHIFT_LENGTH_HOURS,
    overtimeHours: Math.max(0, Math.round((hoursWorked - LABOR.SHIFT_LENGTH_HOURS) * 10) / 10),
  }
}
