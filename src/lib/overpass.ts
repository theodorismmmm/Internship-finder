import { CAREER_FIELDS, getFieldById } from "./fields";
import { estimateTravel, haversineKm } from "./geo";
import { scoreOffer } from "./scoring";
import type {
  CareerFieldId,
  InternshipOffer,
  MapCenter,
  StudentProfile,
} from "./types";

interface OsmElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const OVERPASS_ENDPOINTS = [
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
];

function userAgent(): string {
  return (
    process.env.GEO_USER_AGENT ||
    "PraktikumsRadar/1.0 (schulprojekt@example.com)"
  );
}

/** Mehrere kleine Queries – robuster als eine große. */
function buildQueries(lat: number, lon: number, radiusM: number): string[] {
  const r = Math.min(Math.max(radiusM, 3000), 15000);
  return [
    `[out:json][timeout:12];node["office"](around:${r},${lat},${lon});out body 50;`,
    `[out:json][timeout:12];node["craft"](around:${r},${lat},${lon});out body 40;`,
    `[out:json][timeout:12];(
  node["amenity"="hospital"](around:${r},${lat},${lon});
  node["amenity"="clinic"](around:${r},${lat},${lon});
  node["amenity"="school"](around:${r},${lat},${lon});
  node["amenity"="kindergarten"](around:${r},${lat},${lon});
  node["shop"="car_repair"](around:${r},${lat},${lon});
  node["shop"="car"](around:${r},${lat},${lon});
);out body 40;`,
  ];
}

function osmName(tags: Record<string, string>): string {
  return tags.name || tags["name:de"] || tags.brand || "Betrieb ohne Namen";
}

function osmAddress(tags: Record<string, string>): string {
  const street = [tags["addr:street"], tags["addr:housenumber"]]
    .filter(Boolean)
    .join(" ");
  const city = [tags["addr:postcode"], tags["addr:city"]].filter(Boolean).join(" ");
  return [street, city].filter(Boolean).join(", ") || "Adresse laut OSM unvollständig";
}

function fieldHintsFromTags(
  tags: Record<string, string>,
  selected: CareerFieldId[],
): CareerFieldId[] {
  const blob = Object.entries(tags)
    .map(([k, v]) => `${k} ${v}`)
    .join(" ")
    .toLowerCase();
  const hints = CAREER_FIELDS.filter((f) =>
    f.keywords.some((kw) => blob.includes(kw.toLowerCase())),
  ).map((f) => f.id);

  for (const id of selected) {
    const field = getFieldById(id);
    if (!field) continue;
    if (
      field.osmTags.some((t) =>
        blob.includes(t.replace(/"/g, "").split("=")[0]),
      )
    ) {
      if (!hints.includes(id)) hints.push(id);
    }
  }
  return hints;
}

async function fetchOneEndpoint(
  endpoint: string,
  query: string,
  timeoutMs: number,
): Promise<OsmElement[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": userAgent(),
        Accept: "application/json",
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { elements?: OsmElement[] };
    return data.elements ?? [];
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOverpass(query: string): Promise<OsmElement[]> {
  // Endpunkte parallel anfragen – erster Erfolg gewinnt
  const errors: string[] = [];
  const tasks = OVERPASS_ENDPOINTS.map(async (endpoint) => {
    try {
      return await fetchOneEndpoint(endpoint, query, 10000);
    } catch (err) {
      errors.push(
        `${endpoint}: ${err instanceof Error ? err.message : "fail"}`,
      );
      throw err;
    }
  });

  try {
    return await Promise.any(tasks);
  } catch {
    throw new Error(
      errors[0] || "OpenStreetMap/Overpass nicht erreichbar.",
    );
  }
}

export async function searchOsmCompanies(params: {
  center: MapCenter;
  radiusKm: number;
  selectedFields: CareerFieldId[];
  profile: StudentProfile | null;
  existingCompanyKeys: Set<string>;
}): Promise<InternshipOffer[]> {
  const { center, radiusKm, selectedFields, profile, existingCompanyKeys } =
    params;
  const radiusM = Math.round(Math.min(Math.max(radiusKm, 5), 20) * 1000);
  const queries = buildQueries(center.lat, center.lon, radiusM);

  const batches = await Promise.all(
    queries.map(async (q) => {
      try {
        return await fetchOverpass(q);
      } catch {
        return [] as OsmElement[];
      }
    }),
  );

  const elements = batches.flat();
  const offers: InternshipOffer[] = [];
  const seen = new Set<string>(existingCompanyKeys);
  const seenIds = new Set<string>();

  for (const el of elements) {
    const idKey = `${el.type}-${el.id}`;
    if (seenIds.has(idKey)) continue;
    seenIds.add(idKey);

    const tags = el.tags || {};
    if (!tags.name && !tags.brand) continue;
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (typeof lat !== "number" || typeof lon !== "number") continue;

    const company = osmName(tags);
    const key = company.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);

    const distanceKm = haversineKm(center.lat, center.lon, lat, lon);
    if (distanceKm > radiusKm + 0.5) continue;

    const fieldHints = fieldHintsFromTags(tags, selectedFields);
    const title = `Initiativbewerbung: ${company}`;
    const description =
      `Betrieb in der Nähe (OpenStreetMap). ` +
      `Kein ausgeschriebenes Praktikumsangebot – Initiativbewerbung möglich. ` +
      `Tags: ${
        Object.entries(tags)
          .filter(([k]) =>
            [
              "office",
              "craft",
              "amenity",
              "shop",
              "tourism",
              "industrial",
              "aeroway",
            ].includes(k),
          )
          .map(([k, v]) => `${k}=${v}`)
          .join(", ") || "Betrieb"
      }.`;

    const score = scoreOffer({
      title,
      company,
      description,
      professions: [],
      fieldHints,
      selectedFields,
      profile,
      isInitiative: true,
    });

    const website = tags.website || tags["contact:website"] || null;

    offers.push({
      id: `osm-${el.type}-${el.id}`,
      source: "osm",
      title,
      company,
      description,
      locationLabel: osmAddress(tags),
      lat,
      lon,
      distanceKm: Math.round(distanceKm * 10) / 10,
      url: website,
      professions: [],
      fieldHints,
      isInitiative: true,
      score,
      travel: estimateTravel(distanceKm),
    });

    if (offers.length >= 80) break;
  }

  return offers;
}
