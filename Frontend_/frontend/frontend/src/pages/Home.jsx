import { useEffect, useMemo, useState, useCallback } from "react"
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Compass,
  ExternalLink,
  Info,
  LogOut,
  MapPin,
  Navigation,
  ParkingSquare,
  QrCode,
  RotateCw,
  Search,
  Sparkles,
  Timer,
  X,
} from "lucide-react"

import Header from "../components/Header"
import StationCard from "../components/StationCard"
import BottomNav from "../components/BottomNav"
import LocationSelector from "../components/LocationSelector"

import { stations as defaultStations, cities as defaultCities } from "../data/stations"
import { locationData } from "../data/locationData"
import { QRCodeSVG } from "qrcode.react"

import {
  fetchCities,
  fetchNearestStations,
  fetchParking,
  fetchRushAlert,
  fetchNavigation,
  reserveSlot,
  checkIn,
  checkOut,
  fetchHistory,
  cancelBooking,
} from "../services/api"

function Home({ onViewParking }) {
  // ================================
  // STATE
  // ================================

  const [selectedState, setSelectedState] = useState("maharashtra")
  const [selectedCity, setSelectedCity] = useState("nagpur")
  const [selectedLocationStation, setSelectedLocationStation] = useState("")
  
  const [search, setSearch] = useState("")
  const [activeNav, setActiveNav] = useState("home")

  const [locationEnabled, setLocationEnabled] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [message, setMessage] = useState("")

  // Live Backend Data
  const [backendStations, setBackendStations] = useState([])
  const [recommendedStationBackend, setRecommendedStationBackend] = useState(null)
  const [rushAlert, setRushAlert] = useState(null)
  const [bookingHistory, setBookingHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Parking Details View
  const [selectedStation, setSelectedStation] = useState(null)
  const [stationParkingData, setStationParkingData] = useState(null)
  const [selectedBay, setSelectedBay] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [parkingLoading, setParkingLoading] = useState(false)

  // Active Booking
  const [booking, setBooking] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [parkedSeconds, setParkedSeconds] = useState(0)
  const [bookingActionLoading, setBookingActionLoading] = useState(false)

  // ================================
  // LOAD STATIONS & DATA FROM BACKEND
  // ================================

  const loadStations = useCallback(async () => {
    try {
      const cityConfig = defaultCities.find(c => c.id === selectedCity)
      const lat = userLocation?.latitude ?? cityConfig?.center?.lat ?? 21.1458
      const lon = userLocation?.longitude ?? cityConfig?.center?.lon ?? 79.0882
      
      const data = await fetchNearestStations(lat, lon, selectedCity)
      if (data && data.stations && data.stations.length > 0) {
        setBackendStations(data.stations)
        if (data.recommendedStation) {
          setRecommendedStationBackend(data.recommendedStation)
        }
      } else {
        setBackendStations(defaultStations.filter(s => s.city === selectedCity))
      }
    } catch (err) {
      console.warn("Using local fallback station data:", err)
      setBackendStations(defaultStations.filter(s => s.city === selectedCity))
    }
  }, [selectedCity, userLocation])

  useEffect(() => {
    loadStations()
  }, [loadStations])

  useEffect(() => {
    const loadAlert = async () => {
      try {
        const alert = await fetchRushAlert()
        setRushAlert(alert)
      } catch (err) {
        console.warn("Rush alert fetch error:", err)
      }
    }
    loadAlert()
  }, [])

  const loadHistoryData = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const history = await fetchHistory()
      setBookingHistory(history)
    } catch (err) {
      console.warn("Failed to load history:", err)
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeNav === "bookings") {
      loadHistoryData()
    }
  }, [activeNav, loadHistoryData])

  // ================================
  // CITY STATIONS
  // ================================

  const cityStations = useMemo(() => {
    if (backendStations && backendStations.length > 0) {
      return backendStations.map(station => {
        const defaultMatch = defaultStations.find(s => s.id === station.id)
        return {
          ...station,
          driveTime: defaultMatch?.driveTime || Math.max(2, Math.round(station.distance * 2.5)),
          walkTime: defaultMatch?.walkTime || Math.max(3, Math.round(station.distance * 3.5)),
          totalSlots: station.totalSlots || 150,
          prediction: station.demandScore || 75,
        }
      })
    }
    return defaultStations.filter((station) => station.city === selectedCity)
  }, [backendStations, selectedCity])

  const filteredStations = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) {
      return cityStations
    }
    return cityStations.filter((station) =>
      station.name.toLowerCase().includes(query)
    )
  }, [cityStations, search])

  // ================================
  // SMART PICK
  // ================================

  const smartPick = useMemo(() => {
    if (recommendedStationBackend && recommendedStationBackend.city?.toLowerCase() === selectedCity.toLowerCase()) {
      const defaultMatch = defaultStations.find(s => s.id === recommendedStationBackend.id)
      return {
        ...recommendedStationBackend,
        driveTime: defaultMatch?.driveTime || Math.max(2, Math.round(recommendedStationBackend.distance * 2.5)),
        walkTime: defaultMatch?.walkTime || Math.max(3, Math.round(recommendedStationBackend.distance * 3.5)),
        prediction: recommendedStationBackend.demandScore || 85,
      }
    }

    const availableStations = cityStations.filter(
      (station) => station.availableSlots > 0
    )
    if (availableStations.length === 0) {
      return null
    }
    return [...availableStations].sort(
      (a, b) => (b.smartScore || 0) - (a.smartScore || 0)
    )[0]
  }, [cityStations, recommendedStationBackend, selectedCity])

  const alternativeStations = useMemo(() => {
    return cityStations
      .filter(
        (station) =>
          station.id !== smartPick?.id &&
          station.availableSlots > 0
      )
      .sort((a, b) => (b.smartScore || 0) - (a.smartScore || 0))
      .slice(0, 2)
  }, [cityStations, smartPick])

  // ================================
  // LOCATION
  // ================================

  function handleLocation() {
    if (!navigator.geolocation) {
      setMessage("Location is not supported by this browser.")
      return
    }

    setMessage("Finding nearby metro stations...")

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setLocationEnabled(true)
        setMessage("Location found. Nearby recommendations are ready.")
      },
      () => {
        setLocationEnabled(false)
        setMessage("Location permission was not given. You can search manually.")
      }
    )
  }

  // ================================
  // LOCATION SELECTION
  // ================================

  function handleStateSelect(stateId) {
    setSelectedState(stateId)
    setSelectedCity("")
    setSelectedLocationStation("")
    setSearch("")
    setMessage("")
  }

  function handleCitySelect(cityId) {
    setSelectedCity(cityId)
    setSelectedLocationStation("")
    setSearch("")
    setMessage("")
  }

  function handleLocationStationSelect(stationId) {
    setSelectedLocationStation(stationId)
    const realStation = cityStations.find(
      (item) => item.id === stationId
    )
    if (realStation) {
      setSearch(realStation.name)
    }
  }

  // ================================
  // OPEN PARKING DETAILS
  // ================================

  async function openParking(station) {
    if (onViewParking) {
      // Delegate or handle in-page
    }
    setSelectedStation(station)
    setSelectedSlot(null)
    setMessage("")
    setParkingLoading(true)

    try {
      const data = await fetchParking(station.id)
      setStationParkingData(data)
      if (data && data.parkings && data.parkings.length > 0) {
        const recommended = data.parkings.find(p => p.isRecommended) || data.parkings[0]
        setSelectedBay(recommended)
      }
    } catch (err) {
      console.warn("Failed to fetch parking from backend:", err)
      // fallback structure
      const fallbackLots = [
        { id: "A", name: "Main Concourse Bay", totalSlots: 50, availableSlots: Math.round(station.availableSlots * 0.4), distance: 120, smartScore: 92, isRecommended: true },
        { id: "B", name: "Tekdi Road Bay", totalSlots: 50, availableSlots: Math.round(station.availableSlots * 0.35), distance: 230, smartScore: 84, isRecommended: false },
        { id: "C", name: "South Deck", totalSlots: 40, availableSlots: Math.round(station.availableSlots * 0.25), distance: 380, smartScore: 75, isRecommended: false },
      ]
      setStationParkingData({
        stationId: station.id,
        stationName: station.name,
        parkings: fallbackLots,
        demand: { level: "Medium", score: 55 }
      })
      setSelectedBay(fallbackLots[0])
    } finally {
      setParkingLoading(false)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  function closeParking() {
    setSelectedStation(null)
    setStationParkingData(null)
    setSelectedBay(null)
    setSelectedSlot(null)
    setMessage("")
  }

  // ================================
  // PARKING SLOTS GENERATION
  // ================================

  const currentParkingBay = selectedBay || (stationParkingData?.parkings?.[0])

  const parkingSlots = useMemo(() => {
    if (!currentParkingBay) {
      return []
    }

    const totalSlots = Math.min(currentParkingBay.totalSlots || 30, 48)
    const availableSlots = Math.min(currentParkingBay.availableSlots || 0, totalSlots)
    const bayId = currentParkingBay.id || "A"

    return Array.from({ length: totalSlots }, (_, index) => {
      const number = index + 1
      const slotNum = `${bayId}-${String(number).padStart(2, "0")}`
      return {
        id: slotNum,
        available: number <= availableSlots,
      }
    })
  }, [currentParkingBay])

  // ================================
  // BOOKING / RESERVE API CALL
  // ================================

  async function handleBookSlot() {
    if (!selectedStation || !selectedBay) {
      return
    }

    setBookingActionLoading(true)
    setMessage("Connecting to backend to secure your slot...")

    try {
      const candidateSlotNumber = selectedSlot?.id || `${selectedBay.id}-01`
      const result = await reserveSlot({
        stationId: selectedStation.id,
        parkingId: selectedBay.id,
        slotNumber: candidateSlotNumber,
      })

      if (result && result.success && result.booking) {
        const bk = result.booking
        setBooking({
          id: bk.bookingId,
          bookingId: bk.bookingId,
          station: bk.stationName,
          stationId: bk.stationId,
          parkingId: bk.parkingId,
          parkingName: bk.parkingName,
          slot: bk.slotNumber,
          guidance: bk.guidance,
          entryQrToken: bk.entryQrToken || bk.bookingId,
          exitQrToken: bk.exitQrToken || `${bk.bookingId}-EXIT`,
          expiresAt: bk.expiresAt,
          expiresAtTimestamp: bk.expiresAtTimestamp || (Date.now() + 15 * 60 * 1000),
          status: bk.status || "ACTIVE",
          city: selectedCity,
        })

        const left = Math.max(0, Math.floor(((bk.expiresAtTimestamp || (Date.now() + 15 * 60 * 1000)) - Date.now()) / 1000))
        setSecondsLeft(left || 15 * 60)
        setSelectedSlot(null)
        setMessage("Your slot is held for 15 minutes by the backend server.")
        loadStations()
      } else {
        setMessage(result?.error || "Could not reserve slot.")
      }
    } catch (err) {
      console.error("Booking error:", err)
      const errorMsg = err.response?.data?.error || "Error reserving slot. Please try again."
      setMessage(errorMsg)
    } finally {
      setBookingActionLoading(false)
    }
  }

  // ================================
  // CHECK-IN (ENTRY SCAN)
  // ================================

  async function handleCheckIn() {
    if (!booking) return
    setBookingActionLoading(true)
    try {
      const result = await checkIn(booking.entryQrToken)
      if (result && result.success) {
        setBooking(prev => ({
          ...prev,
          status: "CHECKED_IN",
          checkedInAt: result.booking?.checkedInAt || new Date().toISOString()
        }))
        setParkedSeconds(0)
        setMessage("Entry barrier opened! Vehicle successfully checked in.")
        loadStations()
      } else {
        setMessage(result?.error || "Check-in failed.")
      }
    } catch (err) {
      console.error("Check-in error:", err)
      setMessage(err.response?.data?.error || "Check-in failed. Please verify QR token.")
    } finally {
      setBookingActionLoading(false)
    }
  }

  // ================================
  // CHECKOUT (EXIT SCAN)
  // ================================

  async function handleCheckOut() {
    if (!booking) return
    setBookingActionLoading(true)
    try {
      const result = await checkOut(booking.exitQrToken)
      if (result && result.success) {
        setBooking(prev => ({
          ...prev,
          status: "COMPLETED",
          checkedOutAt: result.booking?.checkedOutAt || new Date().toISOString(),
          parkingDurationMinutes: result.booking?.parkingDurationMinutes || Math.ceil(parkedSeconds / 60) || 1
        }))
        setMessage("Exit barrier opened! Parking session completed. Slot released.")
        loadStations()
        loadHistoryData()
      } else {
        setMessage(result?.error || "Checkout failed.")
      }
    } catch (err) {
      console.error("Checkout error:", err)
      setMessage(err.response?.data?.error || "Checkout failed.")
    } finally {
      setBookingActionLoading(false)
    }
  }

  // ================================
  // CANCEL BOOKING
  // ================================

  async function handleCancelBooking() {
    if (!booking) return
    setBookingActionLoading(true)
    try {
      await cancelBooking(booking.id)
      setMessage("Your parking hold has been cancelled and slot released.")
      setBooking(null)
      setSecondsLeft(0)
      loadStations()
    } catch (err) {
      console.error("Cancel error:", err)
      setBooking(null)
      setSecondsLeft(0)
      setMessage("Your parking hold has been cancelled.")
    } finally {
      setBookingActionLoading(false)
    }
  }

  // ================================
  // TIMERS
  // ================================

  // 15-min countdown for ACTIVE hold
  useEffect(() => {
    if (!booking || booking.status !== "ACTIVE" || secondsLeft <= 0) {
      return undefined
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setBooking(null)
          setMessage("Your 15-minute parking hold expired.")
          loadStations()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [booking, secondsLeft, loadStations])

  // Count-up timer for CHECKED_IN duration
  useEffect(() => {
    if (!booking || booking.status !== "CHECKED_IN") {
      return undefined
    }

    const interval = setInterval(() => {
      setParkedSeconds(prev => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [booking])

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0")
  const seconds = String(secondsLeft % 60).padStart(2, "0")

  const parkedMin = String(Math.floor(parkedSeconds / 60)).padStart(2, "0")
  const parkedSec = String(parkedSeconds % 60).padStart(2, "0")

  // Open Google Maps
  async function openNavigation(stationObj) {
    const target = stationObj || selectedStation || smartPick
    if (!target) return
    try {
      const data = await fetchNavigation(target.id)
      if (data && data.navigationUrl) {
        window.open(data.navigationUrl, "_blank", "noopener,noreferrer")
        return
      }
    } catch (err) {
      console.warn("Navigation API fallback:", err)
    }
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${target.latitude || 21.14152},${target.longitude || 79.08315}`,
      "_blank",
      "noopener,noreferrer"
    )
  }

  // ================================
  // HISTORY / BOOKINGS SCREEN (BottomNav Tab)
  // ================================

  if (activeNav === "bookings") {
    return (
      <div className="min-h-screen bg-[#F7F9FC] pb-24 text-[#102A43]">
        <Header />

        <main className="mx-auto max-w-2xl px-5 py-6 lg:py-10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Booking History</h1>
              <p className="mt-1 text-sm text-[#607D9A]">
                All reservations & parking records from SQLite backend
              </p>
            </div>
            <button
              type="button"
              onClick={loadHistoryData}
              disabled={historyLoading}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <RotateCw className={`h-3.5 w-3.5 ${historyLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {booking && (
            <div className="mb-6 rounded-3xl border-2 border-emerald-500 bg-emerald-50/50 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                  </span>
                  Active Session ({booking.status})
                </span>
                <span className="text-xs font-bold text-slate-500">{booking.id}</span>
              </div>
              <h3 className="mt-2 text-lg font-bold text-slate-900">{booking.station}</h3>
              <p className="text-sm text-slate-600">{booking.parkingName} · Slot <span className="font-bold text-emerald-700">{booking.slot}</span></p>
              <button
                type="button"
                onClick={() => setActiveNav("home")}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-700"
              >
                <QrCode className="h-4 w-4" />
                View Active QR Code & Controls
              </button>
            </div>
          )}

          {historyLoading ? (
            <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
              <RotateCw className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
              <p className="mt-3 text-sm text-slate-500">Loading history from metropark.db...</p>
            </div>
          ) : bookingHistory.length === 0 ? (
            <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
              <CalendarDays className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 font-bold">No Bookings Yet</h3>
              <p className="mt-2 text-sm text-[#607D9A]">
                Reserve a parking slot at any metro station to start your session.
              </p>
              <button
                type="button"
                onClick={() => setActiveNav("home")}
                className="mt-5 rounded-xl bg-[#10A66F] px-5 py-2.5 text-sm font-bold text-white"
              >
                Find Metro Parking
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {bookingHistory.map((item) => {
                const isCompleted = item.status === "COMPLETED"
                const isActive = item.status === "ACTIVE"
                const isCheckedIn = item.status === "CHECKED_IN"
                const isExpired = item.status === "EXPIRED"
                const isCancelled = item.status === "CANCELLED"

                return (
                  <div
                    key={item.bookingId}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{item.stationName}</span>
                          <span className="text-xs font-semibold text-slate-400">#{item.bookingId}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {item.parkingName} · Slot <span className="font-bold text-slate-700">{item.slotNumber}</span>
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : isCheckedIn
                            ? "bg-blue-100 text-blue-700"
                            : isCompleted
                            ? "bg-slate-100 text-slate-700"
                            : isCancelled
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                      <span>Reserved: {new Date(item.reservedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {item.parkingDurationMinutes ? (
                        <span className="font-bold text-emerald-700">
                          Duration: {item.parkingDurationMinutes} min
                        </span>
                      ) : isCheckedIn ? (
                        <span className="font-bold text-blue-600">Currently Parked</span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>

        <BottomNav active={activeNav} onChange={setActiveNav} />
      </div>
    )
  }

  // ================================
  // ACTIVE BOOKING / QR SCREEN
  // ================================

  if (booking) {
    const isCheckedIn = booking.status === "CHECKED_IN"
    const isCompleted = booking.status === "COMPLETED"
    const isActive = booking.status === "ACTIVE"

    return (
      <div className="min-h-screen bg-[#F7F9FC] pb-24 text-[#102A43]">
        <Header />

        <main className="mx-auto max-w-md px-5 py-6">
          <button
            type="button"
            onClick={() => {
              if (isCompleted) {
                setBooking(null)
              } else {
                setSelectedStation(null)
              }
            }}
            className="mb-6 flex items-center gap-2 text-sm font-semibold text-[#607D9A]"
          >
            <ArrowLeft className="h-4 w-4" />
            {isCompleted ? "Back to Search" : "Back to Station"}
          </button>

          <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
            <div
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                isCompleted
                  ? "bg-slate-100"
                  : isCheckedIn
                  ? "bg-blue-50"
                  : "bg-[#E9F8F1]"
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-8 w-8 text-slate-700" />
              ) : isCheckedIn ? (
                <Car className="h-8 w-8 text-blue-600" />
              ) : (
                <CheckCircle2 className="h-8 w-8 text-[#10A66F]" />
              )}
            </div>

            <h1 className="mt-5 text-2xl font-bold">
              {isCompleted
                ? "Parking Session Complete!"
                : isCheckedIn
                ? "Vehicle Parked!"
                : "Parking Held!"}
            </h1>

            <p className="mt-2 text-sm text-[#607D9A]">
              {isCompleted
                ? "Exit barrier verified. Have a safe metro journey!"
                : isCheckedIn
                ? "Entry verified. Scan exit QR when leaving the parking lot."
                : "Reach the parking facility before the timer expires."}
            </p>

            {/* TIMER DISPLAY */}
            <div
              className={`mt-6 rounded-2xl p-5 text-white ${
                isCompleted
                  ? "bg-slate-800"
                  : isCheckedIn
                  ? "bg-blue-900"
                  : "bg-[#102A43]"
              }`}
            >
              <p className="text-xs text-slate-300">
                {isCompleted
                  ? "TOTAL PARKING DURATION"
                  : isCheckedIn
                  ? "ACTIVE PARKING DURATION"
                  : "ARRIVAL WINDOW"}
              </p>

              <div className="mt-2 flex items-center justify-center gap-2">
                <Timer
                  className={`h-5 w-5 ${
                    isCompleted
                      ? "text-slate-300"
                      : isCheckedIn
                      ? "text-blue-300"
                      : "text-[#31E7A7]"
                  }`}
                />

                <span className="text-3xl font-bold">
                  {isCompleted
                    ? `${booking.parkingDurationMinutes || 1} min`
                    : isCheckedIn
                    ? `${parkedMin}:${parkedSec}`
                    : `${minutes}:${seconds}`}
                </span>
              </div>
            </div>

            {/* DETAILS */}
            <div className="mt-5 rounded-2xl bg-[#F7F9FC] p-4 text-left">
              <p className="text-xs text-[#607D9A]">METRO STATION</p>
              <p className="mt-1 font-bold">{booking.station}</p>
              <p className="text-xs text-slate-500">{booking.parkingName}</p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-[#607D9A]">SLOT</p>
                  <p className="mt-1 font-bold text-[#10A66F]">{booking.slot}</p>
                </div>

                <div>
                  <p className="text-xs text-[#607D9A]">BOOKING ID</p>
                  <p className="mt-1 font-bold">{booking.id}</p>
                </div>
              </div>

              {booking.guidance && (
                <div className="mt-4 border-t border-slate-200/60 pt-3 text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">Entrance: </span>
                  {booking.guidance.entrance || "Main Gate"} · {booking.guidance.zone || "Zone A"} · {booking.guidance.floor || "Ground Floor"}
                </div>
              )}
            </div>

            {/* QR CODE */}
            {!isCompleted && (
              <>
                <div className="mt-6 flex justify-center">
                  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <QRCodeSVG
                      value={isCheckedIn ? booking.exitQrToken : booking.entryQrToken}
                      size={170}
                      level="M"
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-center gap-2 text-sm text-[#607D9A]">
                  <QrCode className="h-4 w-4" />
                  {isCheckedIn ? "Scan at parking exit barrier" : "Scan at parking entry barrier"}
                </div>
              </>
            )}

            {/* LIVE BARRIER SCAN ACTIONS */}
            <div className="mt-6 space-y-3">
              {isActive && (
                <button
                  type="button"
                  disabled={bookingActionLoading}
                  onClick={handleCheckIn}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#10A66F] px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  {bookingActionLoading ? "Verifying..." : "Simulate Barrier Scan (Check-In)"}
                </button>
              )}

              {isCheckedIn && (
                <button
                  type="button"
                  disabled={bookingActionLoading}
                  onClick={handleCheckOut}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                >
                  <LogOut className="h-5 w-5" />
                  {bookingActionLoading ? "Processing Exit..." : "Simulate Barrier Scan (Checkout)"}
                </button>
              )}

              {/* Navigation button */}
              <button
                type="button"
                onClick={() => openNavigation(selectedStation)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-[#102A43] hover:bg-slate-50"
              >
                <ExternalLink className="h-4 w-4 text-emerald-600" />
                Navigate via Google Maps
              </button>

              {isActive && (
                <button
                  type="button"
                  disabled={bookingActionLoading}
                  onClick={handleCancelBooking}
                  className="w-full rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50"
                >
                  Cancel Hold
                </button>
              )}

              {isCompleted && (
                <button
                  type="button"
                  onClick={() => {
                    setBooking(null)
                    setSelectedStation(null)
                    setActiveNav("bookings")
                  }}
                  className="w-full rounded-2xl bg-[#10A66F] px-5 py-3.5 text-sm font-bold text-white"
                >
                  View in History
                </button>
              )}
            </div>
          </div>
        </main>

        <BottomNav active="bookings" onChange={setActiveNav} />
      </div>
    )
  }

  // ================================
  // PARKING DETAILS / BAY & SLOT SELECTION
  // ================================

  if (selectedStation) {
    const bays = stationParkingData?.parkings || [
      { id: "A", name: "Main Concourse Bay", totalSlots: 50, availableSlots: Math.round(selectedStation.availableSlots * 0.5), distance: 120, smartScore: 92, isRecommended: true }
    ]

    return (
      <div className="min-h-screen bg-[#F7F9FC] pb-24 text-[#102A43]">
        <Header />

        <main className="mx-auto max-w-4xl px-5 py-6 lg:py-10">
          <button
            type="button"
            onClick={closeParking}
            className="mb-6 flex items-center gap-2 text-sm font-semibold text-[#607D9A]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to stations
          </button>

          {/* STATION HERO */}
          <section className="rounded-3xl bg-[#102A43] p-6 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">
                  <Sparkles className="h-3.5 w-3.5" />
                  SmartPick {selectedStation.smartScore || 92}
                </span>

                <h1 className="mt-4 text-2xl font-bold">
                  {selectedStation.name}
                </h1>

                <p className="mt-2 text-sm capitalize text-slate-300">
                  {selectedCity} Metro
                </p>
              </div>

              <ParkingSquare className="h-8 w-8 text-[#31E7A7]" />
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <Car className="h-4 w-4 text-[#31E7A7]" />
                <p className="mt-2 text-lg font-bold">{selectedStation.availableSlots}</p>
                <p className="text-xs text-slate-300">Available</p>
              </div>

              <div className="rounded-2xl bg-white/10 p-3">
                <MapPin className="h-4 w-4 text-[#31E7A7]" />
                <p className="mt-2 text-lg font-bold">{selectedStation.distance}</p>
                <p className="text-xs text-slate-300">km</p>
              </div>

              <div className="rounded-2xl bg-white/10 p-3">
                <Clock3 className="h-4 w-4 text-[#31E7A7]" />
                <p className="mt-2 text-lg font-bold">{selectedStation.driveTime || 5}</p>
                <p className="text-xs text-slate-300">min</p>
              </div>
            </div>
          </section>

          {/* PARKING BAYS SELECTION */}
          {bays.length > 1 && (
            <section className="mt-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                1. Select Parking Facility
              </h3>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {bays.map((bay) => {
                  const isSelectedBay = currentParkingBay?.id === bay.id

                  return (
                    <button
                      key={bay.id}
                      type="button"
                      onClick={() => {
                        setSelectedBay(bay)
                        setSelectedSlot(null)
                      }}
                      className={`relative flex flex-col justify-between rounded-2xl border p-4 text-left transition ${
                        isSelectedBay
                          ? "border-[#10A66F] bg-emerald-50/70 shadow-sm"
                          : "border-slate-200 bg-white hover:border-emerald-300"
                      }`}
                    >
                      {bay.isRecommended && (
                        <span className="mb-2 inline-flex items-center gap-1 self-start rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          <Sparkles className="h-2.5 w-2.5" />
                          Recommended
                        </span>
                      )}
                      <div>
                        <p className="font-bold text-[#102A43]">{bay.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {bay.distance}m from concourse
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                        <span className="font-bold text-emerald-700">
                          {bay.availableSlots} free slots
                        </span>
                        <span className="font-semibold text-slate-500">
                          Score: {bay.smartScore}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {/* SLOTS GRID */}
          <section className="mt-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Choose your parking slot</h2>
                <p className="mt-1 text-sm text-[#607D9A]">
                  Green = available · Grey = occupied
                </p>
              </div>

              {currentParkingBay && (
                <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                  {currentParkingBay.name}
                </span>
              )}
            </div>

            <div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
              {parkingSlots.map((slot) => {
                const selected = selectedSlot?.id === slot.id

                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => setSelectedSlot(slot)}
                    className={`aspect-square rounded-2xl border text-sm font-bold transition ${
                      !slot.available
                        ? "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-300"
                        : selected
                        ? "border-[#10A66F] bg-[#10A66F] text-white shadow"
                        : "border-slate-200 bg-white text-[#102A43] hover:border-[#10A66F]"
                    }`}
                  >
                    {slot.id}
                  </button>
                )
              })}
            </div>
          </section>

          {/* HOLD NOTICE */}
          <section className="mt-8 rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex gap-3">
              <Timer className="h-5 w-5 shrink-0 text-[#10A66F]" />
              <div>
                <h3 className="font-bold">15-minute arrival hold</h3>
                <p className="mt-1 text-sm leading-6 text-[#607D9A]">
                  Your selected slot is held for 15 minutes by the server. If you don't arrive and scan in, it automatically returns to the pool.
                </p>
              </div>
            </div>
          </section>

          {/* BOOK BUTTON */}
          <button
            type="button"
            disabled={!selectedSlot || bookingActionLoading}
            onClick={handleBookSlot}
            className={`mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-bold transition ${
              selectedSlot && !bookingActionLoading
                ? "bg-[#10A66F] text-white hover:bg-emerald-700 shadow-md"
                : "cursor-not-allowed bg-slate-200 text-slate-400"
            }`}
          >
            {bookingActionLoading ? (
              <>
                <RotateCw className="h-4 w-4 animate-spin" />
                Reserving slot on backend...
              </>
            ) : selectedSlot ? (
              `Hold ${selectedSlot.id} for 15 minutes`
            ) : (
              "Select an available parking slot"
            )}
          </button>
        </main>

        <BottomNav active={activeNav} onChange={setActiveNav} />
      </div>
    )
  }

  // ================================
  // MAIN HOME VIEW
  // ================================

  return (
    <div className="min-h-screen bg-[#F7F9FC] pb-24 text-[#102A43] lg:pb-0">
      <Header />

      <main className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10 lg:py-10">

        {/* METRO BANNER */}
        <section className="metro-banner">
          <img
            src="/metro-hero.png"
            alt="Metro city"
            className="metro-banner-image"
          />

          <div className="metro-banner-overlay" />

          <div className="metro-banner-content">
            <span className="metro-banner-badge">
              <span className="hero-badge-dot" />
              SMART PARKING
            </span>

            <h1>
              Park smarter.
              <br />
              <span>Ride easier.</span>
            </h1>

            <p>
              Find parking near your metro station before you arrive.
            </p>
          </div>
        </section>

        {/* SEARCH & LOCATION */}
        <section className="search-panel-section">
          <div className="search-panel">
            <div className="search-input-wrap">
              <Search className="search-panel-icon" />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Where are you going?"
                className="search-panel-input"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="search-clear"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleLocation}
              className={`location-button ${locationEnabled ? "location-active" : ""}`}
            >
              <Navigation className="h-4 w-4" />
              <span>
                {locationEnabled ? "Location On" : "Use My Location"}
              </span>
            </button>
          </div>

          {message && (
            <div className="location-message">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}
        </section>

        {/* LOCATION HIERARCHY */}
        <LocationSelector
          locationData={locationData}
          selectedState={selectedState}
          selectedCity={selectedCity}
          selectedLocationStation={selectedLocationStation}
          onStateSelect={handleStateSelect}
          onCitySelect={handleCitySelect}
          onStationSelect={handleLocationStationSelect}
        />

        {/* SMART PICK */}
        {smartPick && !search && (
          <section className="mt-8">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#10A66F]" />
              <h2 className="text-lg font-bold">SmartPick for you</h2>
            </div>

            <div className="rounded-3xl bg-[#102A43] p-6 text-white shadow-lg">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">
                <Sparkles className="h-3.5 w-3.5" />
                Best Match · {smartPick.smartScore || 94}/100
              </div>

              <h3 className="mt-4 text-2xl font-bold">{smartPick.name}</h3>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                Recommended using live availability, distance, and parking demand algorithm.
              </p>

              <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-200">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {smartPick.distance} km
                </span>

                <span className="flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4" />
                  {smartPick.driveTime} min
                </span>

                <span className="flex items-center gap-1.5">
                  <Car className="h-4 w-4" />
                  {smartPick.availableSlots} free slots
                </span>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => openParking(smartPick)}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[#10A66F] px-5 py-3.5 text-sm font-bold text-white shadow transition hover:bg-emerald-700"
                >
                  View Parking & Reserve
                  <ChevronRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => openNavigation(smartPick)}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3.5 text-sm font-bold text-white hover:bg-white/20"
                >
                  <Navigation className="h-4 w-4" />
                  Navigate (Maps)
                </button>
              </div>
            </div>
          </section>
        )}

        {/* STATIONS GRID */}
        <section className="mt-10">
          <div className="mb-4">
            <h2 className="text-xl font-bold">Metro parking</h2>
            <p className="mt-1 text-sm text-[#607D9A]">
              {filteredStations.length} station{filteredStations.length !== 1 ? "s" : ""} available in {selectedCity}
            </p>
          </div>

          {filteredStations.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredStations.map((station) => (
                <StationCard
                  key={station.id}
                  station={station}
                  onView={openParking}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
              <MapPin className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-4 font-bold">No station found</h3>
              <p className="mt-2 text-sm text-[#607D9A]">
                Try searching for another station name.
              </p>
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-5 rounded-xl bg-[#10A66F] px-5 py-2.5 text-sm font-bold text-white"
              >
                Show all stations
              </button>
            </div>
          )}
        </section>

        {/* PREDICTION SECTION */}
        {smartPick && (
          <section className="mt-8 rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#10A66F]" />
                  <h2 className="font-bold">Parking prediction</h2>
                </div>

                <p className="mt-2 max-w-xl text-sm leading-6 text-[#607D9A]">
                  Expected parking occupancy and rush forecast at {smartPick.name}.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-3xl font-bold">
                    {smartPick.prediction || 75}%
                  </p>
                  <p className="text-xs text-[#607D9A]">
                    predicted demand
                  </p>
                </div>

                <div className="h-3 w-24 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#10A66F]"
                    style={{
                      width: `${smartPick.prediction || 75}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* STATION INTELLIGENCE */}
        {smartPick && (
          <section className="mt-8 grid gap-4 lg:grid-cols-3">
            {/* RUSH ALERT */}
            <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                    Rush alert
                  </p>
                  <h3 className="mt-1 font-bold text-[#102A43]">
                    {rushAlert?.alert ? rushAlert.message : "Parking demand manageable"}
                  </h3>
                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    {rushAlert?.alert
                      ? rushAlert.message
                      : `Live AI forecast indicates smooth parking at ${smartPick.name}.`}
                  </p>
                </div>
              </div>
            </div>

            {/* METRO TIMING */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                  <Clock3 className="h-5 w-5 text-[#10A66F]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#10A66F]">
                    Metro timing
                  </p>
                  <h3 className="mt-1 font-bold text-[#102A43]">
                    {smartPick.timing?.message || "Metro Open (06:00 - 23:00)"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Parking bays open 05:30 AM to 11:30 PM.
                  </p>
                </div>
              </div>
            </div>

            {/* PARKING GUIDANCE / NAVIGATION */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                  <Navigation className="h-5 w-5 text-[#10A66F]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#10A66F]">
                    Parking guidance
                  </p>
                  <h3 className="mt-1 font-bold text-[#102A43]">
                    Navigate to parking
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Direct GPS route to {smartPick.name}.
                  </p>
                  <button
                    type="button"
                    onClick={() => openNavigation(smartPick)}
                    className="mt-3 flex items-center gap-1.5 rounded-xl bg-[#10A66F] px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Google Maps
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ALTERNATIVE STATIONS */}
        {alternativeStations.length > 0 && (
          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#10A66F]">
                  Backup recommendation
                </p>
                <h2 className="mt-1 text-lg font-bold text-[#102A43]">
                  If your first choice gets busy
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Smart alternatives with available parking slots.
                </p>
              </div>
              <Sparkles className="h-5 w-5 shrink-0 text-[#10A66F]" />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {alternativeStations.map((station) => (
                <button
                  key={station.id}
                  type="button"
                  onClick={() => openParking(station)}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 text-left transition hover:border-[#10A66F] hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-[#102A43]">
                      {station.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {station.availableSlots} slots · {station.distance} km · Score {station.smartScore || 85}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-[#10A66F]" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* LOCATION TRACKING ACTIVE */}
        {userLocation && (
          <section className="mt-6 rounded-2xl border border-[#DCEFE5] bg-[#E9F8F1] p-4">
            <div className="flex gap-3">
              <Navigation className="h-5 w-5 shrink-0 text-[#10A66F]" />
              <div>
                <p className="text-sm font-bold">
                  Location tracking active ({userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)})
                </p>
                <p className="mt-1 text-xs text-[#607D9A]">
                  Smart recommendations are dynamically sorted by closest driving distance.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      <BottomNav active={activeNav} onChange={setActiveNav} />
    </div>
  )
}

export default Home