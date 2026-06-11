export type TemplateShift = {
  date: string             // YYYY-MM-DD
  staffName: string
  scheduleRole: string     // DIRECTOR | PORTER | GREETER | SECURITY
  shiftStart: string | null  // HH:mm or null (OFF)
  shiftEnd: string | null
}

export type TemplateSnapshot = {
  savedAt: string
  uploadedDates: string[]
  shifts: TemplateShift[]
}
