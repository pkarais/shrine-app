export const LABOR = {
  SHIFT_LENGTH_HOURS: 7.5,
  OVERTIME_THRESHOLD_HOURS: 7.5,
  UNPAID_LUNCH_MINUTES: 30,
} as const

export const BREAKS = {
  FIRST: {
    TRIGGER_HOURS: 2.0,
    DURATION_MINUTES: 15,
    PAID: true,
  },
  LUNCH: {
    TRIGGER_HOURS: 4.5,
    DURATION_MINUTES: 30,
    PAID: false,
  },
  SECOND: {
    TRIGGER_HOURS: 6.5,
    DURATION_MINUTES: 15,
    PAID: true,
  },
} as const

export const GEOFENCE = {
  LIBERTY_PARK: {
    LAT: parseFloat(process.env.NEXT_PUBLIC_SITE_LAT || "40.7101341"),
    LON: parseFloat(process.env.NEXT_PUBLIC_SITE_LON || "-74.0132028"),
    RADIUS_METERS: parseInt(process.env.NEXT_PUBLIC_GEOFENCE_RADIUS || "275", 10),
  },
} as const

export const SECURITY = {
  MANAGER_INVITE_CODE: process.env.NEXT_PUBLIC_MANAGER_INVITE_CODE || "SHRINE2026",
} as const
