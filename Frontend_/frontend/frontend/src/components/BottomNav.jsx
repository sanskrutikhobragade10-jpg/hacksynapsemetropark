import {
  CalendarDays,
  Home,
  Map,
  User,
} from "lucide-react"

function BottomNav({ active, onChange }) {
  const items = [
    {
      id: "home",
      label: "Home",
      icon: Home,
    },
    {
      id: "map",
      label: "Map",
      icon: Map,
    },
    {
      id: "bookings",
      label: "Bookings",
      icon: CalendarDays,
    },
    {
      id: "profile",
      label: "Profile",
      icon: User,
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-3 py-2 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon
          const selected = active === item.id

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`flex min-w-16 flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium ${
                selected
                  ? "text-smart-green"
                  : "text-slate-500"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNav