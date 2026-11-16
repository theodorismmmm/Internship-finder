"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { InternshipOffer, MapCenter, SearchMode } from "@/lib/types";

const RadiusMap = dynamic(() => import("./RadiusMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[320px] items-center justify-center bg-neutral-50 text-[13px] text-neutral-400">
      Karte wird geladen…
    </div>
  ),
});

interface MapSearchProps {
  center: MapCenter;
  radiusKm: number;
  offers: InternshipOffer[];
  selectedId: string | null;
  searchMode: SearchMode;
  schuelerOnly: boolean;
  onCenterChange: (center: MapCenter) => void;
  onRadiusChange: (km: number) => void;
  onSearchModeChange: (mode: SearchMode) => void;
  onSchuelerOnlyChange: (value: boolean) => void;
  onSelectOffer: (id: string) => void;
  onSearch: () => void;
  searching: boolean;
  autoSearchOnMount?: boolean;
}

const MODE_LABELS: Record<SearchMode, string> = {
  stellen: "Nur Stellen",
  firmen: "Nur Firmen",
  beides: "Stellen + Firmen",
};

export function MapSearch({
  center,
  radiusKm,
  offers,
  selectedId,
  searchMode,
  schuelerOnly,
  onCenterChange,
  onRadiusChange,
  onSearchModeChange,
  onSchuelerOnlyChange,
  onSelectOffer,
  onSearch,
  searching,
  autoSearchOnMount = false,
}: MapSearchProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MapCenter[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const didAutoSearch = useRef(false);
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  useEffect(() => {
    if (!autoSearchOnMount || didAutoSearch.current) return;
    didAutoSearch.current = true;
    const timer = window.setTimeout(() => onSearchRef.current(), 50);
    return () => window.clearTimeout(timer);
  }, [autoSearchOnMount]);

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
        setGeoError("Keine Treffer in Deutschland.");
      }
    } catch (err) {
      setGeoError(
        err instanceof Error ? err.message : "Adresssuche fehlgeschlagen",
      );
    } finally {
      setGeoLoading(false);
    }
  }

  const searchButtonLabel =
    searchMode === "firmen"
      ? "Firmen in der Nähe suchen"
      : searchMode === "stellen"
        ? "Stellen in der Nähe suchen"
        : "Stellen & Firmen suchen";

  return (
    <section className="border-b border-neutral-200 pb-10">
      <p className="text-[11px] font-medium tracking-[0.14em] text-neutral-400 uppercase">
        Karte
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
        Ort & Umkreis
      </h2>
      <p className="mt-2 text-[15px] text-neutral-500">
        Start in Bremen. Adresse suchen oder auf die Karte tippen – wähle, ob du
        offene Praktikumsstellen, allgemein Firmen oder beides suchst.
      </p>

      <form
        onSubmit={searchAddress}
        className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="z. B. München, Hamburg, PLZ…"
          className="w-full flex-1 border-0 border-b border-neutral-200 bg-transparent py-2.5 text-[15px] outline-none placeholder:text-neutral-300 focus:border-neutral-950"
        />
        <button
          type="submit"
          disabled={geoLoading}
          className="rounded-full border border-neutral-200 px-4 py-2 text-[13px] font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-50"
        >
          {geoLoading ? "Suche…" : "Adresse"}
        </button>
      </form>

      {geoError && (
        <p className="mt-2 text-[13px] text-neutral-950" role="alert">
          {geoError}
        </p>
      )}

      {suggestions.length > 1 && (
        <ul className="mt-3 space-y-1">
          {suggestions.map((s) => (
            <li key={`${s.lat}-${s.lon}-${s.label}`}>
              <button
                type="button"
                className="w-full py-1.5 text-left text-[13px] text-neutral-600 hover:text-neutral-950"
                onClick={() => onCenterChange(s)}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-medium text-neutral-950">
            Radius
          </span>
          <span className="text-[13px] tabular-nums text-neutral-500">
            {radiusKm} km
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={50}
          value={radiusKm}
          onChange={(e) => onRadiusChange(Number(e.target.value))}
          className="mt-3 w-full"
        />
        <p className="mt-2 text-[12px] text-neutral-400">{center.label}</p>
      </div>

      <fieldset className="mt-6">
        <legend className="text-[13px] font-medium text-neutral-950">
          Was suchen?
        </legend>
        <div
          className="mt-3 grid grid-cols-3 gap-1 border border-neutral-200 p-1"
          role="radiogroup"
          aria-label="Suchmodus"
        >
          {(["stellen", "firmen", "beides"] as SearchMode[]).map((mode) => {
            const disabled = schuelerOnly && mode === "firmen";
            const active = searchMode === mode;
            return (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={disabled}
                onClick={() => onSearchModeChange(mode)}
                className={`px-2 py-2 text-[12px] font-medium transition sm:text-[13px] ${
                  active
                    ? "bg-neutral-950 text-white"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                {MODE_LABELS[mode]}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[12px] text-neutral-400">
          {searchMode === "firmen"
            ? "Nur Betriebe in der Nähe – auch ohne offene Praktikumsanzeige (Initiativbewerbung)."
            : searchMode === "stellen"
              ? "Nur ausgeschriebene Praktika / Intern-Stellen der Arbeitsagentur."
              : "Offene Stellen und zusätzliche Firmen ohne Anzeige."}
        </p>
      </fieldset>

      <label className="mt-5 flex items-start gap-2.5 text-[13px] text-neutral-600">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={schuelerOnly}
          onChange={(e) => onSchuelerOnlyChange(e.target.checked)}
        />
        <span>
          Nur Schülerpraktikum – sucht gezielt nach Schul-/Betriebspraktika
          für Schüler (Klassen ~8–10) und blendet Werkstudent/Intern aus.
          {searchMode === "firmen"
            ? " (nur mit Stellen-Suche sinnvoll)"
            : ""}
        </span>
      </label>

      <div className="mt-6 h-[380px] overflow-hidden border border-neutral-200 sm:h-[460px]">
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
        className="mt-6 w-full rounded-full bg-neutral-950 px-6 py-3.5 text-[14px] font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50 sm:w-auto"
      >
        {searching ? "Suche läuft…" : searchButtonLabel}
      </button>
    </section>
  );
}
