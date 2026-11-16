import { estimateTravel, haversineKm } from "./geo";
import { resolveBaPlace } from "./place";
import { isSchuelerpraktikumOffer } from "./schuelerpraktikum";
import { inferFieldsFromOffer, scoreOffer } from "./scoring";
import type {
  CareerFieldId,
  InternshipOffer,
  MapCenter,
  StudentProfile,
} from "./types";

const BA_BASE =
  "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service";

interface BaLocation {
  adresse?: {
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    ort?: string;
    ortsteil?: string;
  };
  breite?: number;
  laenge?: number;
}

interface BaJob {
  stellenangebotsTitel?: string;
  stellenangebotsBeschreibung?: string;
  firma?: string;
  referenznummer?: string;
  externeURL?: string;
  hauptberuf?: string;
  alleBerufe?: string[];
  stellenlokationen?: BaLocation[];
  entfernung?: number;
  datumErsteVeroeffentlichung?: string;
  stellenangebotsart?: string;
}

interface BaSearchResponse {
  ergebnisliste?: BaJob[];
  maxErgebnisse?: number;
}

function apiKey(): string {
  return process.env.BA_API_KEY || "jobboerse-jobsuche";
}

function locationLabel(loc?: BaLocation): string {
  if (!loc?.adresse) return "Ort unbekannt";
  const a = loc.adresse;
  const street = [a.strasse, a.hausnummer].filter(Boolean).join(" ");
  const city = [a.plz, a.ort].filter(Boolean).join(" ");
  return [street, city].filter(Boolean).join(", ") || a.ort || "Ort unbekannt";
}

function jobUrl(job: BaJob): string | null {
  if (job.externeURL) return job.externeURL;
  if (job.referenznummer) {
    return `https://www.arbeitsagentur.de/jobsuche/jobdetail/${encodeURIComponent(job.referenznummer)}`;
  }
  return null;
}

async function fetchBaPage(params: {
  was: string;
  wo: string;
  umkreis: number;
  size?: number;
  page?: number;
  angebotsart?: "34" | "4" | "1";
}): Promise<BaJob[]> {
  const url = new URL(`${BA_BASE}/pc/v6/jobs`);
  if (params.was) url.searchParams.set("was", params.was);
  url.searchParams.set("wo", params.wo);
  url.searchParams.set("umkreis", String(Math.round(params.umkreis)));
  url.searchParams.set("angebotsart", params.angebotsart ?? "34");
  url.searchParams.set("page", String(params.page ?? 1));
  url.searchParams.set("size", String(params.size ?? 50));
  url.searchParams.set("zeitarbeit", "false");

  const res = await fetch(url.toString(), {
    headers: {
      "X-API-Key": apiKey(),
      Accept: "application/json",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(
      `Jobsuche der Bundesagentur für Arbeit nicht erreichbar (HTTP ${res.status}).`,
    );
  }

  const data = (await res.json()) as BaSearchResponse;
  return data.ergebnisliste ?? [];
}

function toOffer(
  job: BaJob,
  center: MapCenter,
  selectedFields: CareerFieldId[],
  profile: StudentProfile | null,
  opts: { isInitiative: boolean; titlePrefix?: string },
): InternshipOffer | null {
  const loc = job.stellenlokationen?.[0];
  const lat = loc?.breite;
  const lon = loc?.laenge;
  if (typeof lat !== "number" || typeof lon !== "number") return null;

  const professions = Array.from(
    new Set(
      [job.hauptberuf, ...(job.alleBerufe ?? [])].filter(Boolean) as string[],
    ),
  );
  const rawTitle = job.stellenangebotsTitel || "Praktikum";
  const title = opts.titlePrefix
    ? `${opts.titlePrefix}${job.firma || rawTitle}`
    : rawTitle;
  const description = opts.isInitiative
    ? `Betrieb mit aktueller BA-Anzeige „${rawTitle}“. Kein explizites Schülerpraktikum – Initiativbewerbung kann möglich sein.`
    : job.stellenangebotsBeschreibung || "";
  const company = job.firma || "Unbekannter Betrieb";
  const fieldHints = inferFieldsFromOffer(rawTitle, description, professions);
  const distanceKm = haversineKm(center.lat, center.lon, lat, lon);
  const score = scoreOffer({
    title,
    company,
    description,
    professions,
    fieldHints,
    selectedFields,
    profile,
    isInitiative: opts.isInitiative,
  });

  const schueler = isSchuelerpraktikumOffer(rawTitle, description, professions);

  return {
    id: `${opts.isInitiative ? "ba-init" : "ba"}-${job.referenznummer || `${lat}-${lon}-${rawTitle}`}`,
    source: "ba",
    title,
    company,
    description: description.slice(0, 2000),
    locationLabel: locationLabel(loc),
    lat,
    lon,
    distanceKm: Math.round(distanceKm * 10) / 10,
    url: jobUrl(job),
    referenceNumber: job.referenznummer,
    professions,
    fieldHints,
    isInitiative: opts.isInitiative,
    isSchuelerpraktikum: schueler,
    publishedAt: job.datumErsteVeroeffentlichung,
    score,
    travel: estimateTravel(distanceKm),
  };
}

/** Extra Suchwörter, damit Firmen wie Airbus (Intern / Working Student) nicht fehlen. */
function buildInternshipQueries(
  searchTerms: string[],
  schuelerOnly = false,
): string[] {
  if (schuelerOnly) {
    const base = [
      "Schülerpraktikum",
      "Schulpraktikum",
      "Betriebspraktikum",
      "Ferienpraktikum",
      "Schnupperpraktikum",
      "Praktikum Schüler",
      "Praktikum Schule",
    ];
    const fromFields = searchTerms.slice(0, 6).map((t) => `Schülerpraktikum ${t}`);
    return Array.from(new Set([...base, ...fromFields]));
  }
  const base = [
    "Praktikum",
    "Schülerpraktikum",
    "Betriebspraktikum",
    "Ferienpraktikum",
    "Schnupperpraktikum",
    "Intern",
    "Internship",
    "Werkstudent",
    "Working Student",
    "Praktikant",
    "Trainee",
    "Airbus",
    "Luftfahrt",
  ];
  const fromFields = searchTerms.slice(0, 6).flatMap((t) => [
    `Praktikum ${t}`,
    `Intern ${t}`,
    t,
  ]);
  return Array.from(new Set([...base, ...fromFields]));
}

export async function searchBaInternships(params: {
  center: MapCenter;
  radiusKm: number;
  searchTerms: string[];
  selectedFields: CareerFieldId[];
  profile: StudentProfile | null;
  schuelerOnly?: boolean;
}): Promise<InternshipOffer[]> {
  const {
    center,
    radiusKm,
    searchTerms,
    selectedFields,
    profile,
    schuelerOnly = false,
  } = params;
  const place = await resolveBaPlace(center);
  const queries = buildInternshipQueries(searchTerms, schuelerOnly);
  const jobMap = new Map<string, BaJob>();
  const searchRadius = Math.max(Math.round(radiusKm), 30);

  await Promise.all(
    queries.map(async (was) => {
      for (const page of [1, 2, 3, 4]) {
        try {
          const jobs = await fetchBaPage({
            was,
            wo: place,
            umkreis: searchRadius,
            size: 50,
            page,
            angebotsart: "34",
          });
          for (const job of jobs) {
            const key =
              job.referenznummer ||
              `${job.stellenangebotsTitel}-${job.firma}-${job.stellenlokationen?.[0]?.breite}`;
            if (key && !jobMap.has(key)) jobMap.set(key, job);
          }
          if (jobs.length < 50) break;
        } catch {
          break;
        }
      }
    }),
  );

  // Fallback: breite Stadt-Suche, damit der Radius nie „leer“ wirkt
  if (jobMap.size < 20) {
    for (const was of ["Praktikum", "Intern", ""]) {
      try {
        const jobs = await fetchBaPage({
          was,
          wo: place || "Bremen",
          umkreis: Math.max(searchRadius, 50),
          size: 50,
          page: 1,
          angebotsart: "34",
        });
        for (const job of jobs) {
          const key =
            job.referenznummer ||
            `${job.stellenangebotsTitel}-${job.firma}-${job.stellenlokationen?.[0]?.breite}`;
          if (key && !jobMap.has(key)) jobMap.set(key, job);
        }
      } catch {
        /* ignore */
      }
    }
  }

  // Großzügig: lieber mehr echte Treffer zeigen als zu streng filtern
  const softRadius = Math.max(radiusKm, 25) + 20;
  const offers: InternshipOffer[] = [];

  for (const job of jobMap.values()) {
    const offer = toOffer(job, center, selectedFields, profile, {
      isInitiative: false,
    });
    if (!offer) continue;
    if (offer.distanceKm > softRadius) continue;
    if (schuelerOnly && !offer.isSchuelerpraktikum) continue;
    offers.push(offer);
  }

  return offers;
}

/**
 * Weitere echte BA-Treffer als Betriebe: Ausbildung + Intern/Werkstudent (Arbeit),
 * damit große Arbeitgeber wie Airbus sichtbar werden.
 */
export async function searchBaTrainingCompanies(params: {
  center: MapCenter;
  radiusKm: number;
  selectedFields: CareerFieldId[];
  profile: StudentProfile | null;
  existingCompanyKeys: Set<string>;
}): Promise<InternshipOffer[]> {
  const { center, radiusKm, selectedFields, profile, existingCompanyKeys } =
    params;
  const place = await resolveBaPlace(center);
  const jobMap = new Map<string, BaJob>();
  const searchRadius = Math.max(radiusKm, 25);

  const passes: Array<{ was: string; angebotsart: "34" | "4" | "1" }> = [
    { was: "Ausbildung", angebotsart: "4" },
    { was: "Azubi", angebotsart: "4" },
    { was: "Duales Studium", angebotsart: "4" },
    { was: "", angebotsart: "4" },
    { was: "Intern", angebotsart: "34" },
    { was: "Werkstudent", angebotsart: "34" },
    { was: "Working Student", angebotsart: "34" },
    { was: "Intern", angebotsart: "1" },
    { was: "Werkstudent", angebotsart: "1" },
    { was: "Working Student", angebotsart: "1" },
    { was: "Teilzeit", angebotsart: "1" },
    { was: "Luftfahrt", angebotsart: "34" },
    { was: "Luftfahrt", angebotsart: "4" },
    { was: "Airbus", angebotsart: "1" },
    { was: "Airbus", angebotsart: "4" },
    { was: "Airbus", angebotsart: "34" },
    { was: "Industrie", angebotsart: "4" },
    { was: "Handwerk", angebotsart: "4" },
    { was: "Pflege", angebotsart: "4" },
    { was: "IT", angebotsart: "4" },
  ];

  await Promise.all(
    passes.map(async ({ was, angebotsart }) => {
      for (const page of [1, 2]) {
        try {
          const jobs = await fetchBaPage({
            was,
            wo: place,
            umkreis: searchRadius,
            size: 50,
            page,
            angebotsart,
          });
          for (const job of jobs) {
            const company = (job.firma || "")
              .toLowerCase()
              .replace(/\s+/g, " ")
              .trim();
            if (!company || existingCompanyKeys.has(company)) continue;
            const key =
              job.referenznummer || `${company}-${job.stellenangebotsTitel}`;
            if (!jobMap.has(key)) jobMap.set(key, job);
          }
          if (jobs.length < 50) break;
        } catch {
          break;
        }
      }
    }),
  );

  const offers: InternshipOffer[] = [];
  const seenCompanies = new Set<string>(existingCompanyKeys);
  const softRadius = Math.max(radiusKm, 25) + 25;

  for (const job of jobMap.values()) {
    const company = job.firma || "Unbekannter Betrieb";
    const ckey = company.toLowerCase().replace(/\s+/g, " ").trim();
    if (seenCompanies.has(ckey)) continue;

    const offer = toOffer(job, center, selectedFields, profile, {
      isInitiative: true,
      titlePrefix: "Initiativpraktikum möglich: ",
    });
    if (!offer) continue;
    if (offer.distanceKm > softRadius) continue;

    seenCompanies.add(ckey);
    // Titel auf Firmenname normieren für die Initiativ-Liste
    offer.title = `Initiativpraktikum möglich: ${company}`;
    offers.push(offer);
    if (offers.length >= 250) break;
  }

  return offers;
}

export async function fetchBaJobDetails(
  referenceNumber: string,
): Promise<string | null> {
  const b64 = Buffer.from(referenceNumber, "utf8").toString("base64");
  const res = await fetch(`${BA_BASE}/pc/v4/jobdetails/${b64}`, {
    headers: {
      "X-API-Key": apiKey(),
      Accept: "application/json",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as BaJob;
  return data.stellenangebotsBeschreibung ?? null;
}
