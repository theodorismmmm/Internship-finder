"use client";

import { useMemo, useState } from "react";
import { sortOffers } from "@/lib/scoring";
import type { DifficultyLevel, InternshipOffer, SortKey } from "@/lib/types";
import { ResultCard } from "./ResultCard";

interface ResultsPanelProps {
  offers: InternshipOffer[];
  selectedId: string | null;
  bookmarkedIds: Set<string>;
  meta: {
    baCount: number;
    osmCount: number;
    osmError: string | null;
    baError?: string | null;
    searchPlace?: string;
    disclaimer: string;
  } | null;
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
    <section className="py-10">
      <p className="text-[11px] font-medium tracking-[0.14em] text-neutral-400 uppercase">
        Treffer
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
        Ergebnisse
      </h2>
      <p className="mt-2 text-[15px] text-neutral-500">
        {meta
          ? `${meta.baCount} offene Stellen${
              meta.osmCount > 0
                ? ` · ${meta.osmCount} Betriebe ohne Anzeige`
                : ""
            }${meta.searchPlace ? ` · Suche: ${meta.searchPlace}` : ""}`
          : "Noch keine Suche gestartet."}
      </p>

      {meta && (
        <p className="mt-3 text-[12px] text-neutral-400">
          {meta.disclaimer}
          {meta.baError ? ` · BA: ${meta.baError}` : ""}
          {meta.osmError ? ` · OSM: ${meta.osmError}` : ""}
        </p>
      )}
      {error && (
        <p className="mt-2 text-[13px] text-neutral-950" role="alert">
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="text-[12px]">
          <span className="mb-1 block text-neutral-500">Sortierung</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="border-0 border-b border-neutral-200 bg-transparent py-1.5 text-[14px] outline-none focus:border-neutral-950"
          >
            <option value="match">Passung</option>
            <option value="difficulty">Schwierigkeit</option>
            <option value="distance">Entfernung</option>
          </select>
        </label>
        <label className="text-[12px]">
          <span className="mb-1 block text-neutral-500">
            Min. Passung {minMatch}%
          </span>
          <input
            type="range"
            min={0}
            max={80}
            step={5}
            value={minMatch}
            onChange={(e) => setMinMatch(Number(e.target.value))}
          />
        </label>
        <label className="text-[12px]">
          <span className="mb-1 block text-neutral-500">Schwierigkeit</span>
          <select
            value={difficultyFilter}
            onChange={(e) =>
              setDifficultyFilter(e.target.value as DifficultyLevel | "alle")
            }
            className="border-0 border-b border-neutral-200 bg-transparent py-1.5 text-[14px] outline-none focus:border-neutral-950"
          >
            <option value="alle">Alle</option>
            <option value="leicht">Leicht</option>
            <option value="mittel">Mittel</option>
            <option value="schwer">Schwer</option>
          </select>
        </label>
        <label className="text-[12px]">
          <span className="mb-1 block text-neutral-500">Quelle</span>
          <select
            value={sourceFilter}
            onChange={(e) =>
              setSourceFilter(e.target.value as "alle" | "ba" | "osm")
            }
            className="border-0 border-b border-neutral-200 bg-transparent py-1.5 text-[14px] outline-none focus:border-neutral-950"
          >
            <option value="alle">Alle (Stellen + Betriebe)</option>
            <option value="ba">Nur offene Stellen (BA)</option>
            <option value="osm">Nur Betriebe ohne Anzeige</option>
          </select>
        </label>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          {filtered.length === 0 ? (
            <p className="py-12 text-[14px] text-neutral-400">
              Keine Ergebnisse. Ort setzen und Suche starten.
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

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-[11px] font-medium tracking-[0.14em] text-neutral-400 uppercase">
            Details
          </p>
          {!detail ? (
            <p className="mt-3 text-[14px] text-neutral-400">
              Ein Ergebnis auswählen.
            </p>
          ) : (
            <div className="mt-4 space-y-4 text-[14px] text-neutral-700">
              <div>
                <p className="text-[16px] font-semibold tracking-tight text-neutral-950">
                  {detail.title}
                </p>
                <p className="mt-1 text-neutral-500">{detail.company}</p>
                <p className="mt-1 text-[13px] text-neutral-400">
                  {detail.locationLabel}
                </p>
              </div>
              {detail.isInitiative && (
                <p className="text-[13px] text-neutral-500">
                  Initiativbewerbung möglich – kein ausgeschriebenes Angebot.
                </p>
              )}
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-neutral-600">
                {detail.description || "Keine Beschreibung verfügbar."}
              </p>
              <div>
                <p className="text-[12px] font-medium text-neutral-950">
                  Passung {detail.score.matchPercent}%
                </p>
                <ul className="mt-2 space-y-1 text-[12px] text-neutral-500">
                  {detail.score.matchReasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[12px] font-medium text-neutral-950">
                  Schwierigkeit · {detail.score.difficulty}
                </p>
                <ul className="mt-2 space-y-1 text-[12px] text-neutral-500">
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
                  className="inline-flex rounded-full bg-neutral-950 px-4 py-2 text-[12px] font-medium text-white hover:bg-neutral-800"
                >
                  Zur Anzeige
                </a>
              )}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
