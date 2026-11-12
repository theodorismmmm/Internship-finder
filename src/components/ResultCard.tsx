"use client";

import {
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Info,
  Navigation,
} from "lucide-react";
import { formatMinutes } from "@/lib/geo";
import type { InternshipOffer } from "@/lib/types";

interface ResultCardProps {
  offer: InternshipOffer;
  selected: boolean;
  bookmarked: boolean;
  onSelect: () => void;
  onToggleBookmark: () => void;
  onCoverLetter: () => void;
}

function DifficultyBadge({ level }: { level: InternshipOffer["score"]["difficulty"] }) {
  const styles =
    level === "leicht"
      ? "bg-emerald-100 text-emerald-900"
      : level === "mittel"
        ? "bg-amber-100 text-amber-900"
        : "bg-rose-100 text-rose-900";
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${styles}`}>
      {level}
    </span>
  );
}

export function ResultCard({
  offer,
  selected,
  bookmarked,
  onSelect,
  onToggleBookmark,
  onCoverLetter,
}: ResultCardProps) {
  return (
    <article
      className={`rounded-2xl border p-4 transition ${
        selected
          ? "border-teal-600 bg-teal-50/80 shadow-sm"
          : "border-teal-900/10 bg-white hover:border-teal-700/25"
      }`}
    >
      <button type="button" onClick={onSelect} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-teal-950">{offer.title}</h3>
            <p className="text-sm text-teal-900/75">{offer.company}</p>
          </div>
          <span className="shrink-0 rounded-md bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-900 tabular-nums">
            {offer.score.matchPercent}% Passung
          </span>
        </div>

        {offer.isInitiative && (
          <p className="mt-2 rounded-lg bg-violet-50 px-2 py-1.5 text-xs text-violet-900">
            Betrieb ohne ausgeschriebenes Angebot – Initiativbewerbung möglich
            (Quelle: OpenStreetMap)
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-teal-900/70">
          <span className="inline-flex items-center gap-1">
            <Navigation className="h-3.5 w-3.5" />
            {offer.travel.distanceKm} km
          </span>
          <span>· zu Fuß {formatMinutes(offer.travel.walkMinutes)}</span>
          <span>· Rad {formatMinutes(offer.travel.bikeMinutes)}</span>
          <span>· ÖPNV ca. {formatMinutes(offer.travel.transitMinutes)}</span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-teal-900/70">Schwierigkeit:</span>
          <DifficultyBadge level={offer.score.difficulty} />
          <span
            className="inline-flex items-center gap-1 text-teal-800/70"
            title={[
              "Automatische Schätzung – keine Garantie.",
              "",
              "Passung:",
              ...offer.score.matchReasons.map((r) => `• ${r}`),
              "",
              "Schwierigkeit:",
              ...offer.score.difficultyReasons.map((r) => `• ${r}`),
              "",
              "Fahrzeiten: grobe Schätzung aus Entfernung und typischen Geschwindigkeiten.",
            ].join("\n")}
          >
            <Info className="h-3.5 w-3.5" />
            Schätzung – Hover für Details
          </span>
        </div>
      </button>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onToggleBookmark}
          className="inline-flex items-center gap-1.5 rounded-lg border border-teal-900/15 px-2.5 py-1.5 text-xs font-medium text-teal-950 hover:bg-teal-50"
        >
          {bookmarked ? (
            <BookmarkCheck className="h-3.5 w-3.5 text-teal-700" />
          ) : (
            <Bookmark className="h-3.5 w-3.5" />
          )}
          {bookmarked ? "Gemerkt" : "Merken"}
        </button>
        <button
          type="button"
          onClick={onCoverLetter}
          className="inline-flex items-center gap-1.5 rounded-lg border border-teal-900/15 px-2.5 py-1.5 text-xs font-medium text-teal-950 hover:bg-teal-50"
        >
          Anschreiben-Entwurf
        </button>
        {offer.url && (
          <a
            href={offer.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-800"
          >
            Originalanzeige
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </article>
  );
}
