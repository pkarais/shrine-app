export function ShiftHistory({ shifts }: { shifts: any[] }) {
  return (
    <section className="section-wrapper p-8">
      <p className="text-xs label-text text-on-surface-variant mb-6">Shift History</p>
      <div className="space-y-3">
        {shifts.map((shift) => {
          const hours = shift.clock_out
            ? ((new Date(shift.clock_out).getTime() - new Date(shift.clock_in).getTime()) / (1000 * 60 * 60)).toFixed(1)
            : "Active"
          return (
            <div key={shift.id} className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-on-surface-variant">schedule</span>
                <div>
                  <p className="font-semibold text-on-surface">{shift.events?.title ?? "Unknown Event"}</p>
                  <p className="text-xs text-on-surface-variant">
                    {new Date(shift.clock_in).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              <span
                className={`font-display font-bold text-lg ${
                  shift.clock_out ? "text-on-surface-variant" : "text-secondary"
                }`}
              >
                {hours}h
              </span>
            </div>
          )
        })}
        {shifts.length === 0 && (
          <div className="text-center py-12 text-on-surface-variant body-md">No shifts recorded</div>
        )}
      </div>
    </section>
  )
}
