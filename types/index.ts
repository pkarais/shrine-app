export type UserRole = 'operations' | 'security' | 'manager' | 'council'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Event {
  id: number
  title: string
  description: string | null
  start_time: string
  end_time: string | null
  category: string
  dcs_link: string | null
  required_ops: number
  required_security: number
  required_greeter: number
  director_mandatory: boolean
  google_event_id: string | null
  created_at: string
  updated_at: string
}

export interface Shift {
  id: string
  user_id: string
  event_id: number | null
  clock_in: string
  clock_out: string | null
  created_at: string
  profiles?: Profile
  events?: Event
}

export interface Break {
  id: string
  shift_id: string
  break_start: string
  break_end: string | null
}

export interface Walkthrough {
  id: string
  user_id: string
  event_id: number | null
  category: 'facility' | 'security'
  walkthrough_type: 'opening' | 'closing'
  checks: Record<string, boolean>
  notes: string | null
  media_urls: string[]
  completed_at: string
}

export interface Incident {
  id: string
  user_id: string
  event_id: number | null
  incident_date: string
  report_date: string
  shift: 'opening' | 'midday' | 'closing'
  location: string
  incident_types: string[]
  description: string
  involved_person_name: string | null
  involved_person_description: string | null
  involved_person_contact: string | null
  witness_name: string | null
  witness_contact: string | null
  witness_statement: string | null
  actions_taken: string[]
  authorities_contacted: boolean
  agency_contacted: string[]
  officer_name_badge: string | null
  case_number: string | null
  evidence_photos: boolean
  evidence_footage: boolean
  evidence_statements: boolean
  camera_location: string | null
  follow_up_required: string[]
  follow_up_details: string | null
  severity: 'low' | 'medium' | 'high' | 'critical'
  media_urls: string[]
  created_at: string
}

export interface MaintenanceTicket {
  id: string
  user_id: string
  event_id: number | null
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  media_urls: string[]
  assigned_to: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  profiles?: Profile
}

export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  media_urls: string[]
  read_at: string | null
  created_at: string
  sender?: Profile
  recipient?: Profile
}

export interface StaffAssignment {
  id: string
  event_id: number
  user_id: string
  role_assigned: 'operations' | 'security' | 'greeter' | 'director'
  shift_start: string | null
  shift_end: string | null
  created_at: string
  profiles?: Profile
  events?: Event
}

export interface Notification {
  id: string
  user_id: string
  title: string
  body: string
  type: 'info' | 'warning' | 'shift_reminder' | 'staffing_gap' | 'ticket_assigned'
  read_at: string | null
  reference_id: string | null
  created_at: string
}

export interface VisitorVolume {
  id: string
  event_id: number | null
  count: number
  recorded_at: string
  recorded_by: string | null
}

export interface BreakInfo {
  nextBreak: string
  remainingMinutes: number
  breakDuration: number
  breakNumber: number
  isPaid: boolean
}

export interface ShiftProgress {
  hoursWorked: number
  paidHours: number
  progressPercent: number
  isOvertime: boolean
  overtimeHours: number
}

export interface GeofenceCheck {
  inRange: boolean
  distance: number
}
