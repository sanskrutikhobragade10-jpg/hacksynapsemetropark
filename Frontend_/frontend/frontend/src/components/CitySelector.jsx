function CitySelector({ cities, selectedCity, onSelect }) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-metro-navy">
        Choose city
      </p>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {cities.map((city) => (
          <button
            key={city.id}
            type="button"
            onClick={() => onSelect(city.id)}
            className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition ${
        selectedCity === city.id
  ? "bg-[#31e7a7] text-white shadow-sm"
  : "bg-white text-[#102a43] ring-1 ring-slate-200 hover:bg-slate-50"
         }`}
          >
            {city.name}
          </button>
        ))}
      </div>
    </div>
  )
}

export default CitySelector