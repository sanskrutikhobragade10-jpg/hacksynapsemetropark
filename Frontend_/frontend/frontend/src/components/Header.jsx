function Header() {
  return (
    <header className="w-full bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center">
          <img
            src="/smartpark-logo.png"
            alt="SmartPark Metro"
            className="h-16 w-auto object-contain"
          />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">

          {/* Notification */}
          <button
            type="button"
            className="p-2 rounded-full hover:bg-slate-100 transition"
            aria-label="Notifications"
          >
            🔔
          </button>

          {/* Profile */}
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-metro-navy text-sm font-semibold text-white"
            aria-label="Profile"
          >
            S
          </button>

        </div>
      </div>
    </header>
  )
}

export default Header