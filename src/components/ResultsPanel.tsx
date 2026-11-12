"use client";

import { useMemo, useState } from "react";
import { sortOffers } from "@/lib/scoring";
import type { DifficultyLevel, InternshipOffer, SortKey } from "@/lib/types";
import { ResultCard } from "./ResultCard";

interface ResultsPanelProps {
  offers: InternshipOffer[];
  selectedId: string | null;
  bookmarkedIds: Set<string>;
  meta: { baCount: number; osmCount: number; osmError: string | null; disclaimer: string } | null;
  error: string | null;
  onSelect: (id: string) => void;
  onToggleBookmark: (offer: InternshipOffer) => void;
  onCoverLetter: (offer: InternshipOffer) => void;
}

export function ResultsPanel({
  offers,
  selectedId,
  bookmarkedIds,
  meta,
  error,
  onSelect,
  onToggleBookmark,
  onCoverLetter,
}: ResultsPanelProps) {
  const [sortKey, setSortKey] = useState<SortKey>("match");
  const [minMatch, setMinMatch] = useState(0);
  const [difficultyFilter, setDifficultyFilter] = useState<
    DifficultyLevel | "alle"
  >("alle");
  const [sourceFilter, setSourceFilter] = useState<"alle" | "ba" | "osm">(
    "alle",
  );
  const [detailId, setDetailId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = offers.filter((o) => o.score.matchPercent >= minMatch);
    if (difficultyFilter !== "alle") {
      list = list.filter((o) => o.score.difficulty === difficultyFilter);
    }
    if (sourceFilter !== "alle") {
      list = list.filter((o) => o.source === sourceFilter);
    }
    return sortOffers(list, sortKey);
  }, [offers, minMatch, difficultyFilter, sourceFilter, sortKey]);

  const detail = offers.find((o) => o.id === (detailId || selectedId)) || null;

  return (
    <section className="rounded-3xl border border-teal-900/10 bg-white/80 p-5 shadow-sm sm:p-6">
      <h2 className="font-[family-name:var(--font-display)] text-2xl text-teal-950">
        4. Ergebnisse
      </h2>
      <p className="mt-1 text-sm text-teal-900/70">
        Echte Angebote der Bundesagentur für Arbeit
        {meta ? ` (${meta.baCount})` : ""}
        {meta && meta.osmCount > 0
          ? ` plus ${meta.osmCount} OSM-Betriebe zur Initiativbewerbung`
          : ""}
        .
      </p>

      {meta && (
        <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {meta.disclaimer}
          {meta.osmError ? ` OSM-Hinweis: ${meta.osmError}` : ""}
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-rose-700" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-teal-950">Sortierung</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-xl border border-teal-900/15 bg-white px-3 py-2 text-sm"
          >
            <option value="match">Passung</option>
            <option value="difficulty">Schwierigkeit</option>
            <option value="distance">Entfernung</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-teal-950">
            Min. Passung: {minMatch}%
          </span>
          <input
            type="range"
            min={0}
            max={80}
            step={5}
            value={minMatch}
            onChange={(e) => setMinMatch(Number(e.target.value))}
            className="accent-teal-700"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-teal-950">Schwierigkeit</span>
          <select
            value={difficultyFilter}
            onChange={(e) =>
              setDifficultyFilter(e.target.value as DifficultyLevel | "alle")
            }
            className="rounded-xl border border-teal-900/15 bg-white px-3 py-2 text-sm"
          >
            <option value="alle">Alle</option>
            <option value="leicht">Leicht</option>
            <option value="mittel">Mittel</option>
            <option value="schwer">Schwer</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-teal-950">Quelle</span>
          <select
            value={sourceFilter}
            onChange={(e) =>
              setSourceFilter(e.target.value as "alle" | "ba" | "osm")
            }
            className="rounded-xl border border-teal-900/15 bg-white px-3 py-2 text-sm"
          >
            <option value="alle">Alle</option>
            <option value="ba">Nur BA-Anzeigen</option>
            <option value="osm">Nur OSM-Initiativ</option>
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-teal-900/20 px-4 py-8 text-center text-sm text-teal-900/60">
              Noch keine Ergebnisse. Setze Ort & Umkreis und starte die Suche.
            </p>
          ) : (
            filtered.map((offer) => (
              <ResultCard
                key={offer.id}
                offer={offer}
                selected={offer.id === selectedId}
                bookmarked={bookmarkedIds.has(offer.id)}
                onSelect={() => {
                  onSelect(offer.id);
                  setDetailId(offer.id);
                }}
                onToggleBookmark={() => onToggleBookmark(offer)}
                onCoverLetter={() => onCoverLetter(offer)}
              />
            ))
          )}
        </div>

        <aside className="rounded-2xl border border-teal-900/10 bg-teal-50/50 p-4 lg:sticky lg:top-24 lg:self-start">
          <h3 className="font-[family-name:var(--font-display)] text-lg text-teal-950">
            Details
          </h3>
          {!detail ? (
            <p className="mt-2 text-sm text-teal-900/60">
              Wähle ein Ergebnis aus der Liste oder der Karte.
            </p>
          ) : (
            <div className="mt-2 space-y-3 text-sm text-teal-950">
              <div>
                <p className="font-semibold">{detail.title}</p>
                <p className="text-teal-900/75">{detail.company}</p>
                <p className="mt-1 text-teal-900/65">{detail.locationLabel}</p>
              </div>
              {detail.isInitiative && (
                <p className="rounded-lg bg-violet-100 px-2 py-1.5 text-xs text-violet-950">
                  Betrieb ohne ausgeschriebenes Angebot, Initiativbewerbung
                  möglich.
                </p>
              )}
              <p className="whitespace-pre-wrap text-teal-900/80">
                {detail.description || "Keine Beschreibung verfügbar."}
              </p>
              <div>
                <p className="font-medium">Passung ({detail.score.matchPercent}%)</p>
                <ul className="mt-1 list-disc pl-4 text-xs text-teal-900/75">
                  {detail.score.matchReasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium">
                  Schwierigkeit ({detail.score.difficulty}) – Schätzung
                </p>
                <ul className="mt-1 list-disc pl-4 text-xs text-teal-900/75">
                  {detail.score.difficultyReasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
              {detail.url && (
                <a
                  href={detail.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800"
                >
                  Zur Originalanzeige / Website
                </a>
              )}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
