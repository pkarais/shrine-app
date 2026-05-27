"use client"

import { Shield, Settings, UserCheck } from "lucide-react"

interface Staff {
  user_id: string
  role_assigned: "operations" | "security" | "manager" | "greeter" | "director" | string
  shift_start?: string | null
  shift_end?: string | null
  profiles: {
    full_name: string | null
    email: string
  } | null
}

interface EventStaffingProps {
  staff: Staff[]
}

export function EventStaffing({ staff }: EventStaffingProps) {
  if (!staff || staff.length === 0) {
    return (
      <div className="p-12 text-center bg-surface-container-low rounded-[2rem]">
        <p className="text-on-surface-variant font-body">No staff members assigned to this event.</p>
      </div>
    )
  }

  const roleIcons: Record<string, any> = {
    security: <Shield className="w-5 h-5" />,
    operations: <Settings className="w-5 h-5" />,
    manager: <UserCheck className="w-5 h-5" />,
    director: <UserCheck className="w-5 h-5" />,
  }

  const roleColors: Record<string, string> = {
    security: "bg-tertiary text-white",
    operations: "bg-primary text-white",
    manager: "bg-secondary text-white",
    director: "bg-secondary text-white",
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {staff.map((member) => (
        <div 
          key={member.user_id} 
          className="bg-surface-container-low p-6 rounded-[2rem] flex items-center gap-4 group hover:bg-surface-container transition-all"
        >
          <div className={`p-3 rounded-2xl ${roleColors[member.role_assigned.toLowerCase()] || "bg-on-surface-variant text-white"}`}>
            {roleIcons[member.role_assigned.toLowerCase()] || <Settings className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-on-surface truncate">
              {member.profiles?.full_name || "Unknown Staff"}
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant">
              {member.role_assigned}
            </p>
            {member.shift_start && (
              <p className="text-[10px] text-on-surface-variant mt-0.5 font-medium">
                {member.shift_start.length <= 5
                  ? member.shift_start
                  : new Date(member.shift_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {" – "}
                {member.shift_end
                  ? member.shift_end.length <= 5
                    ? member.shift_end
                    : new Date(member.shift_end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : ""}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
