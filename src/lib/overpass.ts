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
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

function userAgent(): string {
  return (
    process.env.GEO_USER_AGENT ||
    "PraktikumsRadar/1.0 (schulprojekt@example.com)"
  );
}

function buildQuery(
  lat: number,
  lon: number,
  radiusM: number,
  fields: CareerFieldId[],
): string {
  const selected = fields.length
    ? CAREER_FIELDS.filter((f) => fields.includes(f.id))
    : CAREER_FIELDS.slice(0, 4);

  const filters: string[] = [];
  for (const field of selected) {
    for (const tag of field.osmTags.slice(0, 1)) {
      // Nur Nodes – deutlich schneller als nwr
      filters.push(`node[${tag}](around:${radiusM},${lat},${lon});`);
    }
  }
  filters.push(`node["office"="company"](around:${radiusM},${lat},${lon});`);
  filters.push(`node["craft"](around:${Math.min(radiusM, 8000)},${lat},${lon});`);

  return `
[out:json][timeout:15];
(
${Array.from(new Set(filters)).join("\n")}
);
out body 30;
`.trim();
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

async function fetchOverpass(query: string): Promise<OsmElement[]> {
  let lastError: Error | null = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);
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
      if (!res.ok) {
        lastError = new Error(`Overpass HTTP ${res.status} (${endpoint})`);
        continue;
      }
      const data = (await res.json()) as { elements?: OsmElement[] };
      return data.elements ?? [];
    } catch (err) {
      lastError =
        err instanceof Error ? err : new Error("Overpass-Anfrage fehlgeschlagen");
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new Error("OpenStreetMap/Overpass nicht erreichbar.");
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
  // OSM-Umkreis begrenzen, damit die Abfrage schnell bleibt
  const effectiveKm = Math.min(radiusKm, 20);
  const radiusM = Math.round(effectiveKm * 1000);
  const query = buildQuery(center.lat, center.lon, radiusM, selectedFields);
  const elements = await fetchOverpass(query);
  const offers: InternshipOffer[] = [];

  for (const el of elements) {
    const tags = el.tags || {};
    if (!tags.name && !tags.brand) continue;
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (typeof lat !== "number" || typeof lon !== "number") continue;

    const company = osmName(tags);
    const key = company.toLowerCase().replace(/\s+/g, " ").trim();
    if (existingCompanyKeys.has(key)) continue;

    const distanceKm = haversineKm(center.lat, center.lon, lat, lon);
    if (distanceKm > radiusKm) continue;

    const fieldHints = fieldHintsFromTags(tags, selectedFields);
    const title = `Initiativpraktikum möglich: ${company}`;
    const description =
      `Betrieb aus OpenStreetMap (${
        Object.entries(tags)
          .filter(([k]) =>
            ["office", "craft", "amenity", "shop", "tourism", "industrial"].includes(
              k,
            ),
          )
          .map(([k, v]) => `${k}=${v}`)
          .join(", ") || "ohne Detail-Tags"
      }). ` +
      "Kein ausgeschriebenes Praktikumsangebot – Initiativbewerbung möglich.";

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

    if (offers.length >= 20) break;
  }

  return offers;
}
