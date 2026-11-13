"use client";

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
      className={`border-b border-neutral-200 py-5 transition ${
        selected ? "bg-neutral-50" : ""
      }`}
    >
      <button type="button" onClick={onSelect} className="w-full text-left">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold tracking-tight text-neutral-950">
              {offer.title}
            </h3>
            <p className="mt-0.5 text-[13px] text-neutral-500">{offer.company}</p>
          </div>
          <span className="shrink-0 text-[13px] font-medium tabular-nums text-neutral-950">
            {offer.score.matchPercent}%
          </span>
        </div>

        {offer.isInitiative && (
          <p className="mt-3 text-[12px] text-neutral-500">
            Ohne ausgeschriebenes Angebot · Initiativbewerbung möglich
          </p>
        )}

        <p className="mt-3 text-[12px] leading-relaxed text-neutral-500">
          {offer.travel.distanceKm} km · zu Fuß{" "}
          {formatMinutes(offer.travel.walkMinutes)} · Rad{" "}
          {formatMinutes(offer.travel.bikeMinutes)} · ÖPNV ca.{" "}
          {formatMinutes(offer.travel.transitMinutes)}
        </p>

        <p
          className="mt-2 text-[12px] text-neutral-400"
          title={[
            "Automatische Schätzung – keine Garantie.",
            "",
            "Passung:",
            ...offer.score.matchReasons.map((r) => `• ${r}`),
            "",
            "Schwierigkeit:",
            ...offer.score.difficultyReasons.map((r) => `• ${r}`),
          ].join("\n")}
        >
          Schwierigkeit: {offer.score.difficulty} · Schätzung
        </p>
      </button>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onToggleBookmark}
          className="rounded-full border border-neutral-200 px-3 py-1.5 text-[12px] font-medium text-neutral-800 hover:bg-neutral-50"
        >
          {bookmarked ? "Gemerkt" : "Merken"}
        </button>
        <button
          type="button"
          onClick={onCoverLetter}
          className="rounded-full border border-neutral-200 px-3 py-1.5 text-[12px] font-medium text-neutral-800 hover:bg-neutral-50"
        >
          Anschreiben
        </button>
        {offer.url && (
          <a
            href={offer.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-neutral-950 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-neutral-800"
          >
            Original
          </a>
        )}
      </div>
    </article>
  );
}
