"use client";

import { useMemo, useState } from "react";
import { emptyProfile } from "@/lib/cv-parser";
import { draftCoverLetter } from "@/lib/cover-letter";
import { useMerkliste, useStoredProfile } from "@/hooks/useClientStore";
import type {
  CareerFieldId,
  InternshipOffer,
  MapCenter,
  StudentProfile,
} from "@/lib/types";
import { CoverLetterModal } from "./CoverLetterModal";
import { CvUpload } from "./CvUpload";
import { FieldSelector } from "./FieldSelector";
import { Header } from "./Header";
import { MapSearch } from "./MapSearch";
import { MerklisteModal } from "./MerklisteModal";
import { ProfileEditor } from "./ProfileEditor";
import { ResultsPanel } from "./ResultsPanel";

const DEFAULT_CENTER: MapCenter = {
  lat: 52.52,
  lon: 13.405,
  label: "Berlin, Deutschland",
};

export function AppShell() {
  const [profile, setStoredProfile] = useStoredProfile();
  const [merkliste, setMerkliste] = useMerkliste();
  const [manualProfile, setManualProfile] = useState<StudentProfile | null>(
    null,
  );
  const activeProfile = manualProfile ?? profile;
  const [fields, setFields] = useState<CareerFieldId[]>([]);
  const [center, setCenter] = useState<MapCenter>(DEFAULT_CENTER);
  const [radiusKm, setRadiusKm] = useState(15);
  const [includeOsm, setIncludeOsm] = useState(false);
  const [offers, setOffers] = useState<InternshipOffer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{
    baCount: number;
    osmCount: number;
    osmError: string | null;
    disclaimer: string;
  } | null>(null);
  const [merklisteOpen, setMerklisteOpen] = useState(false);
  const [coverText, setCoverText] = useState("");
  const [coverOpen, setCoverOpen] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  const suggestedFields = activeProfile?.suggestedFields ?? [];
  const selectedFields = fields;

  const bookmarkedIds = useMemo(
    () => new Set(merkliste.map((m) => m.id)),
    [merkliste],
  );

  function handleProfile(next: StudentProfile) {
    setManualProfile(next);
    setStoredProfile(next);
    setShowOptional(true);
    if (next.suggestedFields.length) {
      setFields((prev) => (prev.length ? prev : next.suggestedFields));
    }
  }

  function handleSkipCv() {
    setManualProfile(emptyProfile());
    setShowOptional(true);
  }

  function updateProfile(next: StudentProfile) {
    setManualProfile(next);
    setStoredProfile(next);
  }

  async function runSearch() {
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          center,
          radiusKm,
          fields: selectedFields,
          profile: activeProfile,
          includeOsm,
          enrichDescriptions: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Suche fehlgeschlagen");
      setOffers(data.offers || []);
      setMeta(data.meta || null);
      setSelectedId(data.offers?.[0]?.id ?? null);
    } catch (err) {
      setSearchError(
        err instanceof Error ? err.message : "Suche fehlgeschlagen",
      );
    } finally {
      setSearching(false);
    }
  }

  function toggleBookmark(offer: InternshipOffer) {
    setMerkliste((prev) => {
      const exists = prev.some((p) => p.id === offer.id);
      return exists ? prev.filter((p) => p.id !== offer.id) : [...prev, offer];
    });
  }

  function openCoverLetter(offer: InternshipOffer) {
    setCoverText(draftCoverLetter(offer, activeProfile));
    setCoverOpen(true);
  }

  return (
    <div className="min-h-full bg-white">
      <Header
        merklisteCount={merkliste.length}
        onOpenMerkliste={() => setMerklisteOpen(true)}
      />

      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <section className="pb-10">
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-950 sm:text-5xl">
            PraktikumsRadar
          </h1>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-neutral-500">
            Ort wählen, suchen, fertig. Lebenslauf und Interessen sind optional.
          </p>
        </section>

        {/* Karte zuerst – ohne CV/Interessen nutzbar */}
        <MapSearch
          center={center}
          radiusKm={radiusKm}
          offers={offers}
          selectedId={selectedId}
          includeOsm={includeOsm}
          onCenterChange={setCenter}
          onRadiusChange={setRadiusKm}
          onIncludeOsmChange={setIncludeOsm}
          onSelectOffer={setSelectedId}
          onSearch={() => void runSearch()}
          searching={searching}
        />

        <ResultsPanel
          offers={offers}
          selectedId={selectedId}
          bookmarkedIds={bookmarkedIds}
          meta={meta}
          error={searchError}
          onSelect={setSelectedId}
          onToggleBookmark={toggleBookmark}
          onCoverLetter={openCoverLetter}
        />

        <div className="border-t border-neutral-200 pt-10">
          <button
            type="button"
            onClick={() => setShowOptional((v) => !v)}
            className="text-[13px] font-medium text-neutral-500 underline-offset-4 hover:text-neutral-950 hover:underline"
          >
            {showOptional
              ? "Optionales ausblenden"
              : "Optional: Lebenslauf & Interessen für bessere Passung"}
          </button>

          {showOptional && (
            <div className="mt-2">
              <CvUpload onParsed={handleProfile} onSkip={handleSkipCv} />
              {activeProfile && (
                <ProfileEditor
                  profile={activeProfile}
                  onChange={updateProfile}
                />
              )}
              <FieldSelector
                selected={selectedFields}
                suggested={suggestedFields}
                onChange={setFields}
              />
            </div>
          )}
        </div>

        <footer className="mt-16 border-t border-neutral-200 pt-6 pb-10 text-[11px] leading-relaxed text-neutral-400">
          <p>
            Keine Google-/Mapbox-Keys nötig. Karte: OpenStreetMap / CARTO ·
            Adressen: Nominatim · Praktika: Bundesagentur für Arbeit · optional
            OSM/Overpass. Bewertungen sind Schätzungen.
          </p>
        </footer>
      </main>

      <MerklisteModal
        open={merklisteOpen}
        items={merkliste}
        onClose={() => setMerklisteOpen(false)}
        onRemove={(id) => {
          setMerkliste((prev) => prev.filter((p) => p.id !== id));
        }}
        onSelect={setSelectedId}
      />

      <CoverLetterModal
        open={coverOpen}
        text={coverText}
        onClose={() => setCoverOpen(false)}
      />
    </div>
  );
}
