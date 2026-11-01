import { Building2, Check, MapPin, Train } from "lucide-react"

function LocationSelector({
  locationData,
  selectedState,
  selectedCity,
  selectedLocationStation,
  onStateSelect,
  onCitySelect,
  onStationSelect,
}) {
  const selectedStateData = locationData.find(
    (state) => state.stateId === selectedState
  )

  const selectedCityData = selectedStateData?.cities?.find(
    (city) => city.cityId === selectedCity
  )

  const stations =
    selectedCityData?.metros?.flatMap(
      (metro) => metro.stations || []
    ) || []

  return (
    <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
          Parking location
        </p>

        <h2 className="mt-1 text-xl font-bold text-slate-900">
          Choose your metro
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Select your location to find available parking.
        </p>
      </div>

      {/* STATE */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-bold text-slate-700">
            1. Select State
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {locationData.map((state) => {
            const isSelected =
              selectedState === state.stateId

            return (
              <button
                key={state.stateId}
                type="button"
                onClick={() =>
                  onStateSelect(state.stateId)
                }
                className={`flex min-h-12 items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-emerald-400 hover:bg-emerald-50"
                }`}
              >
                <span>{state.stateName}</span>

                {isSelected && (
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* CITY */}
      {selectedStateData && (
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-bold text-slate-700">
              2. Select City
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedStateData.cities.map((city) => {
              const isSelected =
                selectedCity === city.cityId

              return (
                <button
                  key={city.cityId}
                  type="button"
                  onClick={() =>
                    onCitySelect(city.cityId)
                  }
                  className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${
                    isSelected
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-emerald-50"
                  }`}
                >
                  {city.cityName}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* METRO STATION */}
      {selectedCityData && (
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <Train className="h-4 w-4 text-emerald-600" />

            <span className="text-sm font-bold text-slate-700">
              3. Select Metro Station
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {stations.map((station) => {
              const isSelected =
                selectedLocationStation ===
                station.stationId

              return (
                <button
                  key={station.stationId}
                  type="button"
                  onClick={() =>
                    onStationSelect(
                      station.stationId
                    )
                  }
                  className={`flex min-h-12 items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-emerald-400 hover:bg-emerald-50"
                  }`}
                >
                  <span>{station.stationName}</span>

                  {isSelected && (
                    <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* SUCCESS */}
      {selectedLocationStation && (
        <div className="mt-5 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          <Check className="h-5 w-5" />
          Ready to find your parking
        </div>
      )}
    </section>
  )
}

export default LocationSelector