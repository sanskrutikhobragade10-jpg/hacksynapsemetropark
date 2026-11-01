import { useState, useEffect } from "react";
import { ArrowLeft, Car, CheckCircle2, Clock3, RotateCw, Sparkles } from "lucide-react";
import { fetchParking, reserveSlot } from "../services/api";

function ParkingDetails({ station, onBack, onReserved }) {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [parkingData, setParkingData] = useState(null);
  const [selectedBay, setSelectedBay] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!station?.id) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchParking(station.id);
        setParkingData(data);
        if (data?.parkings?.length > 0) {
          const rec = data.parkings.find(p => p.isRecommended) || data.parkings[0];
          setSelectedBay(rec);
        }
      } catch (err) {
        console.warn("Failed to load parking:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [station?.id]);

  const currentBay = selectedBay || parkingData?.parkings?.[0];
  const totalSlots = currentBay ? Math.min(currentBay.totalSlots, 36) : 24;
  const availableSlotsCount = currentBay ? Math.min(currentBay.availableSlots, totalSlots) : 10;
  const bayId = currentBay?.id || "A";

  const slots = Array.from({ length: totalSlots }, (_, i) => {
    const num = i + 1;
    return {
      id: `${bayId}-${String(num).padStart(2, "0")}`,
      status: num <= availableSlotsCount ? "available" : "occupied"
    };
  });

  const handleBook = async () => {
    if (!selectedSlot || !station || !currentBay) return;
    setBookingLoading(true);
    try {
      const result = await reserveSlot({
        stationId: station.id,
        parkingId: currentBay.id,
        slotNumber: selectedSlot
      });
      if (result && result.success && onReserved) {
        onReserved(result.booking);
      } else if (result && result.success) {
        alert(`Slot ${selectedSlot} held for 15 minutes! Booking ID: ${result.booking?.bookingId}`);
        if (onBack) onBack();
      } else {
        setMessage(result?.error || "Reservation failed.");
      }
    } catch (err) {
      console.error("Booking error:", err);
      setMessage(err.response?.data?.error || "Error reserving slot.");
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-6xl mx-auto px-5 py-6">

        {/* Back */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 font-semibold"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Stations
        </button>

        {/* Header */}
        <div className="bg-metro-navy text-white rounded-3xl p-6 mb-6 shadow-lg">
          <p className="text-green-300 text-sm font-medium">
            Metro Parking
          </p>

          <h1 className="text-3xl font-bold mt-1">
            {station?.name || "Metro Station"}
          </h1>

          <div className="flex flex-wrap gap-5 mt-4 text-sm text-slate-200">
            <span className="flex items-center gap-2">
              <Car className="w-4 h-4 text-[#31E7A7]" />
              {currentBay?.availableSlots || station?.availableSlots || 0} slots available
            </span>

            <span className="flex items-center gap-2">
              <Clock3 className="w-4 h-4 text-[#31E7A7]" />
              15 min reservation hold
            </span>
          </div>
        </div>

        {message && (
          <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
            {message}
          </div>
        )}

        {/* Parking Bay Selector */}
        {parkingData?.parkings && parkingData.parkings.length > 1 && (
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            {parkingData.parkings.map((bay) => {
              const isSelected = currentBay?.id === bay.id;
              return (
                <button
                  key={bay.id}
                  onClick={() => {
                    setSelectedBay(bay);
                    setSelectedSlot(null);
                  }}
                  className={`rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? "border-smart-green bg-green-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  {bay.isRecommended && (
                    <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-smart-green px-2 py-0.5 text-[10px] font-bold text-white">
                      <Sparkles className="h-3 w-3" /> Recommended
                    </span>
                  )}
                  <p className="font-bold text-metro-navy">{bay.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{bay.availableSlots} available · {bay.distance}m</p>
                </button>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex gap-5 mb-4 text-sm">
          <span className="flex items-center gap-2 font-medium text-slate-700">
            <span className="w-3 h-3 rounded-full bg-smart-green"></span>
            Available
          </span>

          <span className="flex items-center gap-2 font-medium text-slate-700">
            <span className="w-3 h-3 rounded-full bg-slate-400"></span>
            Occupied
          </span>
        </div>

        {/* Slots */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-lg font-bold text-metro-navy mb-5">
            Parking Slots ({currentBay?.name || "Concourse"})
          </h2>

          {loading ? (
            <div className="py-10 text-center">
              <RotateCw className="w-8 h-8 animate-spin mx-auto text-smart-green" />
              <p className="mt-2 text-sm text-slate-500">Loading live parking slots...</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {slots.map((slot) => {
                const available = slot.status === "available";
                const selected = selectedSlot === slot.id;

                return (
                  <button
                    key={slot.id}
                    disabled={!available}
                    onClick={() => setSelectedSlot(slot.id)}
                    className={`
                      rounded-xl p-4 text-center border-2 transition font-bold
                      ${
                        !available
                          ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                          : selected
                          ? "bg-green-50 border-smart-green text-smart-green shadow"
                          : "bg-white border-slate-200 text-metro-navy hover:border-smart-green"
                      }
                    `}
                  >
                    <div>{slot.id}</div>
                    <div className="text-xs font-normal mt-1">
                      {available ? "Available" : "Occupied"}
                    </div>
                    {selected && (
                      <CheckCircle2 className="w-5 h-5 mx-auto mt-2 text-smart-green" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Booking Footer */}
        {selectedSlot && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                  Selected slot
                </p>
                <p className="font-bold text-metro-navy text-lg">
                  {selectedSlot} · {currentBay?.name}
                </p>
              </div>

              <button
                disabled={bookingLoading}
                className="bg-smart-green text-white px-7 py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
                onClick={handleBook}
              >
                {bookingLoading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    Reserving...
                  </>
                ) : (
                  `Hold ${selectedSlot} (15 min)`
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ParkingDetails;