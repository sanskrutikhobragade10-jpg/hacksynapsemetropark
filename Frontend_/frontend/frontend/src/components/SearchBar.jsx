import { Search, X } from "lucide-react"

function SearchBar({ value, onChange }) {
  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search metro station..."
        className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-12 text-sm outline-none transition focus:border-smart-green focus:ring-4 focus:ring-smart-green-light"
      />

      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export default SearchBar