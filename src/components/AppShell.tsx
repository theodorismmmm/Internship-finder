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
  const [includeOsm, setIncludeOsm] = useState(true);
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

  const suggestedFields = activeProfile?.suggestedFields ?? [];
  const selectedFields = fields;

  const bookmarkedIds = useMemo(
    () => new Set(merkliste.map((m) => m.id)),
    [merkliste],
  );

  function handleProfile(next: StudentProfile) {
    setManualProfile(next);
    setStoredProfile(next);
    if (next.suggestedFields.length) {
      setFields((prev) => (prev.length ? prev : next.suggestedFields));
    }
  }

  function handleSkipCv() {
    setManualProfile(emptyProfile());
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
          enrichDescriptions: true,
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
    <div className="min-h-full">
      <Header
        merklisteCount={merkliste.length}
        onOpenMerkliste={() => setMerklisteOpen(true)}
      />

      <main className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <section className="hero-panel relative overflow-hidden rounded-[2rem] border border-teal-900/10 px-5 py-8 sm:px-8 sm:py-10">
          <div className="radar-ring radar-ring-a" aria-hidden />
          <div className="radar-ring radar-ring-b" aria-hidden />
          <div className="relative max-w-2xl">
            <p className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-teal-950 sm:text-5xl">
              PraktikumsRadar
            </p>
            <h1 className="mt-3 text-lg font-medium text-teal-900/85 sm:text-xl">
              Finde passende Schülerpraktika in deiner Nähe – mit Profil,
              Karte und echten Angeboten.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-teal-900/65">
              Lebenslauf hochladen, Berufsfelder wählen, Radius setzen und
              Angebote der Bundesagentur für Arbeit vergleichen.
            </p>
          </div>
        </section>

        <div className="mt-6 space-y-6">
          <CvUpload onParsed={handleProfile} onSkip={handleSkipCv} />

          {activeProfile && (
            <ProfileEditor profile={activeProfile} onChange={updateProfile} />
          )}

          <FieldSelector
            selected={selectedFields}
            suggested={suggestedFields}
            onChange={setFields}
          />

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
        </div>

        <footer className="mt-10 border-t border-teal-900/10 pt-6 pb-8 text-xs text-teal-900/55">
          <p>
            Datenquellen: Bundesagentur für Arbeit (Jobsuche-API), OpenStreetMap
            / Overpass, Nominatim. Bewertungen sind automatische Schätzungen.
            Keine erfundenen Angebote.
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
