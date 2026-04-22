export function ScheduleList({ events }: { events: any[] }) {
  const getEventEndTime = (startTimeIso: string, endTimeIso?: string | null) => {
    if (endTimeIso) return new Date(endTimeIso)
    return new Date(new Date(startTimeIso).getTime() + 60 * 60 * 1000)
  }

  return (
    <section className="section-wrapper p-8">
      <p className="text-xs label-text text-on-surface-variant mb-6">Upcoming Schedule</p>
      <div className="space-y-3">
        {events.map((event) => (
          <div key={event.id} className="p-4 bg-surface-container-lowest rounded-xl">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-display font-bold text-on-surface">{event.title}</h3>
              {event.category === "major_feast" && (
                <span className="badge-feast">Major Feast</span>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 body-md text-on-surface-variant">
                <span className="material-symbols-outlined text-primary text-lg">calendar_today</span>
                <span>
                  {new Date(event.start_time).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  at{" "}
                  {new Date(event.start_time).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {` - ${getEventEndTime(event.start_time, event.end_time).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}`}
                </span>
              </div>
              <div className="flex items-center gap-2 body-md text-on-surface-variant">
                <span className="material-symbols-outlined text-secondary text-lg">groups</span>
                <span>
                  {(event.required_total ?? ((event.required_ops ?? 0) + (event.required_security ?? 0) + (event.required_greeter ?? 0)))} staff needed
                </span>
              </div>

              <div className="flex items-center gap-2 body-md">
                <span className={`material-symbols-outlined text-lg ${event.assigned_to_me ? "text-primary" : (event.remaining_for_my_role ?? 0) > 0 ? "text-error" : "text-on-surface-variant"}`}>
                  {event.assigned_to_me ? "verified" : (event.remaining_for_my_role ?? 0) > 0 ? "priority_high" : "task_alt"}
                </span>
                {event.assigned_to_me ? (
                  <span className="text-primary font-semibold">
                    Assigned to you{event.my_assignment_role ? ` as ${event.my_assignment_role}` : ""}
                  </span>
                ) : (event.required_for_my_role ?? 0) > 0 ? (
                  (event.remaining_for_my_role ?? 0) > 0 ? (
                    <span className="text-error font-semibold">
                      {event.remaining_for_my_role} {event.remaining_for_my_role === 1 ? "spot" : "spots"} still needed for your role
                    </span>
                  ) : (
                    <span className="text-on-surface-variant">Role coverage met for this event</span>
                  )
                ) : (
                  <span className="text-on-surface-variant">Your role is not required for this event</span>
                )}
              </div>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div className="text-center py-12 text-on-surface-variant body-md">No upcoming events</div>
        )}
      </div>
    </section>
  )
}
