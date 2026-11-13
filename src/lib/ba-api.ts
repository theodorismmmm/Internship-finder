import { estimateTravel, haversineKm } from "./geo";
import { resolveBaPlace } from "./place";
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
  /** 34 = Praktikum, 4 = Ausbildung */
  angebotsart?: "34" | "4";
}): Promise<BaJob[]> {
  const url = new URL(`${BA_BASE}/pc/v6/jobs`);
  url.searchParams.set("was", params.was);
  url.searchParams.set("wo", params.wo);
  url.searchParams.set("umkreis", String(Math.round(params.umkreis)));
  url.searchParams.set("angebotsart", params.angebotsart ?? "34");
  url.searchParams.set("page", "1");
  url.searchParams.set("size", String(params.size ?? 40));
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

export async function searchBaInternships(params: {
  center: MapCenter;
  radiusKm: number;
  searchTerms: string[];
  selectedFields: CareerFieldId[];
  profile: StudentProfile | null;
}): Promise<InternshipOffer[]> {
  const { center, radiusKm, searchTerms, selectedFields, profile } = params;
  const place = await resolveBaPlace(center);

  const queries =
    searchTerms.length > 0
      ? Array.from(
          new Set([
            "Praktikum",
            "Schülerpraktikum",
            ...searchTerms.slice(0, 3).map((t) => `Praktikum ${t}`),
          ]),
        )
      : ["Praktikum", "Schülerpraktikum", "Betriebspraktikum"];

  const jobMap = new Map<string, BaJob>();

  // Primär: aufgelöster Ort (z. B. Bremen statt Airport-Stadt…)
  // Zusätzlich größerer Umkreis, falls der Ortsteil zu eng ist
  const radii = Array.from(
    new Set([Math.round(radiusKm), Math.min(50, Math.round(radiusKm) + 15)]),
  );

  await Promise.all(
    queries.flatMap((was) =>
      radii.map(async (umkreis) => {
        try {
          const jobs = await fetchBaPage({ was, wo: place, umkreis });
          for (const job of jobs) {
            const key =
              job.referenznummer ||
              `${job.stellenangebotsTitel}-${job.firma}-${job.stellenlokationen?.[0]?.breite}`;
            if (key && !jobMap.has(key)) jobMap.set(key, job);
          }
        } catch {
          // Einzelne Query-Fehler nicht die ganze Suche killen
        }
      }),
    ),
  );

  // Fallback: wenn nichts kam, nochmal nur mit "Praktikum" + Stadt
  if (jobMap.size === 0 && place) {
    try {
      const jobs = await fetchBaPage({
        was: "Praktikum",
        wo: place,
        umkreis: Math.max(radiusKm, 25),
        size: 50,
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

  const jobs = Array.from(jobMap.values());
  const offers: InternshipOffer[] = [];
  const softRadius = Math.max(radiusKm, 5) + 2;

  for (const job of jobs) {
    const loc = job.stellenlokationen?.[0];
    const lat = loc?.breite;
    const lon = loc?.laenge;
    if (typeof lat !== "number" || typeof lon !== "number") continue;

    const distanceKm = haversineKm(center.lat, center.lon, lat, lon);
    // BA-Entfernungsangabe kann zum Stadtzentrum gehören – eigene Haversine bevorzugen
    if (distanceKm > softRadius) continue;

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

/**
 * Ausbildungsbetriebe aus der BA (echte Anzeigen, Art Ausbildung).
 * Dienen als zusätzliche Firmenliste für Initiativ-Schülerpraktika.
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

  const queries = ["Ausbildung", "Azubi", "Duales Studium"];
  await Promise.all(
    queries.map(async (was) => {
      try {
        const jobs = await fetchBaPage({
          was,
          wo: place,
          umkreis: Math.max(radiusKm, 15),
          size: 40,
          angebotsart: "4",
        });
        for (const job of jobs) {
          const company = (job.firma || "").toLowerCase().replace(/\s+/g, " ").trim();
          if (!company || existingCompanyKeys.has(company)) continue;
          const key = job.referenznummer || `${company}-${job.stellenangebotsTitel}`;
          if (!jobMap.has(key)) jobMap.set(key, job);
        }
      } catch {
        /* ignore */
      }
    }),
  );

  const offers: InternshipOffer[] = [];
  const seenCompanies = new Set<string>(existingCompanyKeys);
  const softRadius = Math.max(radiusKm, 8) + 3;

  for (const job of jobMap.values()) {
    const loc = job.stellenlokationen?.[0];
    const lat = loc?.breite;
    const lon = loc?.laenge;
    if (typeof lat !== "number" || typeof lon !== "number") continue;
    const company = job.firma || "Unbekannter Betrieb";
    const ckey = company.toLowerCase().replace(/\s+/g, " ").trim();
    if (seenCompanies.has(ckey)) continue;
    seenCompanies.add(ckey);

    const distanceKm = haversineKm(center.lat, center.lon, lat, lon);
    if (distanceKm > softRadius) continue;

    const professions = Array.from(
      new Set(
        [job.hauptberuf, ...(job.alleBerufe ?? [])].filter(Boolean) as string[],
      ),
    );
    const title = `Initiativpraktikum möglich: ${company}`;
    const description =
      `Ausbildungsbetrieb laut Bundesagentur für Arbeit ` +
      `(Anzeige: „${job.stellenangebotsTitel || "Ausbildung"}“). ` +
      `Kein Schülerpraktikum ausgeschrieben – Initiativbewerbung um ein Praktikum kann möglich sein.`;

    const fieldHints = inferFieldsFromOffer(
      job.stellenangebotsTitel || "",
      description,
      professions,
    );
    const score = scoreOffer({
      title,
      company,
      description,
      professions,
      fieldHints,
      selectedFields,
      profile,
      isInitiative: true,
    });

    offers.push({
      id: `ba-ausb-${job.referenznummer || `${lat}-${lon}-${company}`}`,
      source: "ba",
      title,
      company,
      description,
      locationLabel: locationLabel(loc),
      lat,
      lon,
      distanceKm: Math.round(distanceKm * 10) / 10,
      url: jobUrl(job),
      referenceNumber: job.referenznummer,
      professions,
      fieldHints,
      isInitiative: true,
      publishedAt: job.datumErsteVeroeffentlichung,
      score,
      travel: estimateTravel(distanceKm),
    });

    if (offers.length >= 50) break;
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
