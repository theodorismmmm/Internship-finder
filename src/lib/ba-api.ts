import { estimateTravel, haversineKm } from "./geo";
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

export async function searchBaInternships(params: {
  center: MapCenter;
  radiusKm: number;
  searchTerms: string[];
  selectedFields: CareerFieldId[];
  profile: StudentProfile | null;
}): Promise<InternshipOffer[]> {
  const { center, radiusKm, searchTerms, selectedFields, profile } = params;
  // Mehrere Suchbegriffe abfragen und zusammenführen (echte BA-Treffer, keine Fantasiedaten)
  const queries =
    searchTerms.length > 0
      ? Array.from(
          new Set(["Praktikum", ...searchTerms.slice(0, 4).map((t) => `Praktikum ${t}`)]),
        )
      : ["Praktikum"];

  const jobMap = new Map<string, BaJob>();

  await Promise.all(
    queries.map(async (was) => {
      const url = new URL(`${BA_BASE}/pc/v6/jobs`);
      url.searchParams.set("was", was);
      url.searchParams.set("wo", center.label || `${center.lat},${center.lon}`);
      url.searchParams.set("umkreis", String(Math.round(radiusKm)));
      url.searchParams.set("angebotsart", "34");
      url.searchParams.set("page", "1");
      url.searchParams.set("size", "25");
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
      for (const job of data.ergebnisliste ?? []) {
        const key =
          job.referenznummer ||
          `${job.stellenangebotsTitel}-${job.firma}-${job.stellenlokationen?.[0]?.breite}`;
        if (key && !jobMap.has(key)) jobMap.set(key, job);
      }
    }),
  );

  const jobs = Array.from(jobMap.values());
  const offers: InternshipOffer[] = [];

  for (const job of jobs) {
    const loc = job.stellenlokationen?.[0];
    const lat = loc?.breite;
    const lon = loc?.laenge;
    if (typeof lat !== "number" || typeof lon !== "number") continue;

    const distanceKm =
      typeof job.entfernung === "number"
        ? job.entfernung
        : haversineKm(center.lat, center.lon, lat, lon);

    if (distanceKm > radiusKm + 0.5) continue;

    const professions = Array.from(
      new Set(
        [job.hauptberuf, ...(job.alleBerufe ?? [])].filter(Boolean) as string[],
      ),
    );
    const title = job.stellenangebotsTitel || "Praktikum";
    const description = job.stellenangebotsBeschreibung || "";
    const company = job.firma || "Unbekannter Betrieb";
    const fieldHints = inferFieldsFromOffer(title, description, professions);
    const score = scoreOffer({
      title,
      company,
      description,
      professions,
      fieldHints,
      selectedFields,
      profile,
      isInitiative: false,
    });

    offers.push({
      id: `ba-${job.referenznummer || `${lat}-${lon}-${title}`}`,
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
      isInitiative: false,
      publishedAt: job.datumErsteVeroeffentlichung,
      score,
      travel: estimateTravel(distanceKm),
    });
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
