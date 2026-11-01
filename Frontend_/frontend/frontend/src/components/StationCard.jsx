import { ArrowRight, MapPin, Sparkles } from "lucide-react"

function StationCard({ station, onView }) {
  const isFull = station.availableSlots === 0

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50">
            <MapPin className="h-5 w-5 text-emerald-600" />
          </div>

          <div className="min-w-0">
            <h3 className="font-bold text-slate-900">
              {station.name}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {station.distance} km · {station.driveTime} min drive
            </p>
          </div>
        </div>

        {station.smartScore >= 90 && (
          <div className="flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-600">
            <Sparkles className="h-3 w-3" />
            SmartPick
          </div>
        )}
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500">
            Parking availability
          </p>

          <p className="mt-1 font-bold text-emerald-600">
            {isFull
              ? "Full"
              : `${station.availableSlots} slots available`}
          </p>
        </div>

        {!isFull && (
          <button
            type="button"
            onClick={() => onView(station)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
          >
            Book a Slot
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export default StationCard