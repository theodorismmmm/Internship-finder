"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import type { InternshipOffer, MapCenter } from "@/lib/types";

const RadiusMap = dynamic(() => import("./RadiusMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl bg-teal-50 text-sm text-teal-800">
      Karte wird geladen…
    </div>
  ),
});

interface MapSearchProps {
  center: MapCenter;
  radiusKm: number;
  offers: InternshipOffer[];
  selectedId: string | null;
  includeOsm: boolean;
  onCenterChange: (center: MapCenter) => void;
  onRadiusChange: (km: number) => void;
  onIncludeOsmChange: (value: boolean) => void;
  onSelectOffer: (id: string) => void;
  onSearch: () => void;
  searching: boolean;
}

export function MapSearch({
  center,
  radiusKm,
  offers,
  selectedId,
  includeOsm,
  onCenterChange,
  onRadiusChange,
  onIncludeOsmChange,
  onSelectOffer,
  onSearch,
  searching,
}: MapSearchProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MapCenter[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  async function searchAddress(e?: React.FormEvent) {
    e?.preventDefault();
    if (query.trim().length < 2) return;
    setGeoLoading(true);
    setGeoError(null);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Adresssuche fehlgeschlagen");
      setSuggestions(data.results || []);
      if (data.results?.[0]) {
        onCenterChange(data.results[0]);
      } else {
        setGeoError("Keine Treffer in Deutschland gefunden.");
      }
    } catch (err) {
      setGeoError(err instanceof Error ? err.message : "Adresssuche fehlgeschlagen");
    } finally {
      setGeoLoading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-teal-900/10 bg-white/80 p-5 shadow-sm sm:p-6">
      <h2 className="font-[family-name:var(--font-display)] text-2xl text-teal-950">
        3. Ort & Umkreis
      </h2>
      <p className="mt-1 text-sm text-teal-900/70">
        Klicke auf die Karte oder suche eine Adresse. Ziehe den Slider für den
        Radius (1–50 km).
      </p>

      <form
        onSubmit={searchAddress}
        className="mt-4 flex flex-col gap-2 sm:flex-row"
      >
        <div className="relative flex-1">
          <MapPin className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-teal-700/70" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Adresse oder Ort (z. B. München Hauptbahnhof)"
            className="w-full rounded-xl border border-teal-900/15 bg-white py-2 pr-3 pl-9 text-sm outline-none ring-teal-600/30 focus:ring-2"
          />
        </div>
        <button
          type="submit"
          disabled={geoLoading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal-800/15 bg-white px-4 py-2 text-sm font-medium text-teal-950 hover:bg-teal-50"
        >
          {geoLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Adresse suchen
        </button>
      </form>

      {geoError && (
        <p className="mt-2 text-sm text-rose-700" role="alert">
          {geoError}
        </p>
      )}

      {suggestions.length > 1 && (
        <ul className="mt-2 space-y-1">
          {suggestions.map((s) => (
            <li key={`${s.lat}-${s.lon}-${s.label}`}>
              <button
                type="button"
                className="w-full rounded-lg px-2 py-1.5 text-left text-sm text-teal-900 hover:bg-teal-50"
                onClick={() => onCenterChange(s)}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-teal-950">Umkreis</span>
          <span className="tabular-nums text-teal-800">{radiusKm} km</span>
        </div>
        <input
          type="range"
          min={1}
          max={50}
          value={radiusKm}
          onChange={(e) => onRadiusChange(Number(e.target.value))}
          className="mt-2 w-full accent-teal-700"
        />
        <p className="mt-1 text-xs text-teal-900/55">
          Mittelpunkt: {center.label}
        </p>
      </div>

      <label className="mt-3 flex items-start gap-2 text-sm text-teal-900/80">
        <input
          type="checkbox"
          className="mt-1 accent-teal-700"
          checked={includeOsm}
          onChange={(e) => onIncludeOsmChange(e.target.checked)}
        />
        <span>
          Zusätzlich Betriebe aus OpenStreetMap laden (ohne ausgeschriebenes
          Angebot – klar als Initiativbewerbung gekennzeichnet)
        </span>
      </label>

      <div className="mt-4 h-[360px] overflow-hidden rounded-2xl border border-teal-900/10 sm:h-[420px]">
        <RadiusMap
          center={center}
          radiusKm={radiusKm}
          offers={offers}
          selectedId={selectedId}
          onCenterChange={onCenterChange}
          onSelectOffer={onSelectOffer}
        />
      </div>

      <button
        type="button"
        onClick={onSearch}
        disabled={searching}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60 sm:w-auto"
      >
        {searching ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
        {searching ? "Suche läuft…" : "Praktika in der Nähe suchen"}
      </button>
    </section>
  );
}
