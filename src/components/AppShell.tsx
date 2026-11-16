"use client";

import { useMemo, useState } from "react";
import { emptyProfile } from "@/lib/cv-parser";
import { draftCoverLetter } from "@/lib/cover-letter";
import { useMerkliste, useStoredProfile } from "@/hooks/useClientStore";
import type {
  CareerFieldId,
  InternshipOffer,
  MapCenter,
  SearchMode,
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

/** Start in Bremen (Airport-Stadt / Neuenland) – Airbus & viele Betriebe in der Nähe */
const DEFAULT_CENTER: MapCenter = {
  lat: 53.0524,
  lon: 8.7957,
  label: "Bremen, Airport-Stadt, Deutschland",
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
  const [radiusKm, setRadiusKm] = useState(25);
  const [searchMode, setSearchMode] = useState<SearchMode>("beides");
  const [schuelerOnly, setSchuelerOnly] = useState(false);
  const [offers, setOffers] = useState<InternshipOffer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{
    baCount: number;
    osmCount: number;
    osmError: string | null;
    baError?: string | null;
    searchPlace?: string;
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

  async function fetchJobsAt(
    atCenter: MapCenter,
    atRadius: number,
  ): Promise<{ ba: InternshipOffer[]; meta: typeof meta }> {
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        center: atCenter,
        radiusKm: atRadius,
        fields: selectedFields,
        profile: activeProfile,
        includeOsm: false,
        enrichDescriptions: false,
        schuelerOnly,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Suche fehlgeschlagen");
    return { ba: (data.offers || []) as InternshipOffer[], meta: data.meta || null };
  }

  async function fetchCompaniesAt(
    atCenter: MapCenter,
    atRadius: number,
    exclude: string[],
  ): Promise<InternshipOffer[]> {
    const companyRes = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        center: atCenter,
        radiusKm: atRadius,
        fields: selectedFields,
        profile: activeProfile,
        excludeCompanies: exclude,
      }),
    });
    const companyData = await companyRes.json();
    return (companyData.offers || []) as InternshipOffer[];
  }

  function handleSearchModeChange(mode: SearchMode) {
    setSearchMode(mode);
    if (mode === "firmen" && schuelerOnly) setSchuelerOnly(false);
  }

  function handleSchuelerOnlyChange(value: boolean) {
    setSchuelerOnly(value);
    if (value && searchMode === "firmen") setSearchMode("stellen");
  }

  async function runSearch(overrideRadius?: number) {
    setSearching(true);
    setSearchError(null);
    let usedRadius = overrideRadius ?? radiusKm;
    const wantJobs = searchMode !== "firmen" || schuelerOnly;
    const wantCompanies = searchMode !== "stellen" && !schuelerOnly;

    try {
      let baOffers: InternshipOffer[] = [];
      let jobMeta: typeof meta = null;

      if (wantJobs) {
        const first = await fetchJobsAt(center, usedRadius);
        baOffers = first.ba;
        jobMeta = first.meta;

        if (baOffers.length < 10 && usedRadius < 40) {
          usedRadius = Math.min(50, Math.max(usedRadius + 15, 30));
          setRadiusKm(usedRadius);
          const retry = await fetchJobsAt(center, usedRadius);
          if (retry.ba.length > baOffers.length) {
            baOffers = retry.ba;
            jobMeta = retry.meta;
          }
        }
      } else {
        jobMeta = {
          baCount: 0,
          osmCount: 0,
          osmError: null,
          searchPlace: center.label,
          disclaimer:
            "Firmensuche: Betriebe aus BA (Ausbildung/Intern) und OpenStreetMap – Initiativbewerbung möglich.",
        };
      }

      setOffers(baOffers);
      setMeta(jobMeta);
      setSelectedId(baOffers[0]?.id ?? null);
      setSearching(false);

      if (!wantCompanies) {
        if (baOffers.length === 0) {
          setSearchError(
            schuelerOnly
              ? "Keine Schülerpraktika in diesem Umkreis. Radius vergrößern oder Filter ausschalten."
              : "Keine Stellen in diesem Umkreis. Radius erhöhen oder „Stellen + Firmen“ / „Nur Firmen“ wählen.",
          );
        }
        return;
      }

      let companyOffers = await fetchCompaniesAt(
        center,
        usedRadius,
        baOffers.map((o) => o.company),
      );

      const total = baOffers.length + companyOffers.length;
      if (total < 25 && usedRadius < 50) {
        usedRadius = 50;
        setRadiusKm(50);
        const more = await fetchCompaniesAt(
          center,
          50,
          [...baOffers, ...companyOffers].map((o) => o.company),
        );
        companyOffers = [...companyOffers, ...more];
      }

      if (companyOffers.length > 0) {
        setOffers((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          return [...prev, ...companyOffers.filter((o) => !ids.has(o.id))];
        });
      }
      setMeta((prev) =>
        prev
          ? {
              ...prev,
              baCount: baOffers.length,
              osmCount: companyOffers.length,
              disclaimer:
                searchMode === "firmen"
                  ? "Nur Firmen: Ausbildungs-/Intern-Betriebe (BA) und Orte aus OpenStreetMap. Initiativbewerbung möglich."
                  : "Stellen und Firmen: offene Anzeigen plus Betriebe ohne Anzeige (Initiativ).",
            }
          : prev,
      );
      if (!baOffers.length && companyOffers[0]) {
        setSelectedId(companyOffers[0].id);
      }
      if (baOffers.length === 0 && companyOffers.length === 0) {
        setSearchError(
          "Keine Treffer in diesem Umkreis. Anderen Ort wählen oder Radius erhöhen.",
        );
      }
    } catch (err) {
      setSearchError(
        err instanceof Error ? err.message : "Suche fehlgeschlagen",
      );
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
            Ort wählen, Stellen oder Firmen suchen – fertig. Lebenslauf und
            Interessen sind optional.
          </p>
        </section>

        {/* Karte zuerst – ohne CV/Interessen nutzbar */}
        <MapSearch
          center={center}
          radiusKm={radiusKm}
          offers={offers}
          selectedId={selectedId}
          searchMode={searchMode}
          schuelerOnly={schuelerOnly}
          onCenterChange={setCenter}
          onRadiusChange={setRadiusKm}
          onSearchModeChange={handleSearchModeChange}
          onSchuelerOnlyChange={handleSchuelerOnlyChange}
          onSelectOffer={setSelectedId}
          onSearch={() => void runSearch()}
          searching={searching}
          autoSearchOnMount
        />

        <ResultsPanel
          offers={offers}
          selectedId={selectedId}
          bookmarkedIds={bookmarkedIds}
          meta={meta}
          error={searchError}
          defaultSchuelerOnly={schuelerOnly}
          defaultSearchMode={searchMode}
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
