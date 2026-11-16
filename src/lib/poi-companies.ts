import { estimateTravel, haversineKm } from "./geo";
import { scoreOffer } from "./scoring";
import type {
  CareerFieldId,
  InternshipOffer,
  MapCenter,
  StudentProfile,
} from "./types";

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    osm_key?: string;
    osm_value?: string;
    osm_id?: number;
    osm_type?: string;
    website?: string;
  };
}

/**
 * Benannte Orte/Firmen in der Nähe über Photon (OSM) – echte POIs, keine Fantasie.
 * Filtert streng nach Umkreis, damit keine Treffer aus ganz Norddeutschland kommen.
 */
export async function searchNearbyPois(params: {
  center: MapCenter;
  radiusKm: number;
  selectedFields: CareerFieldId[];
  profile: StudentProfile | null;
  existingCompanyKeys: Set<string>;
}): Promise<InternshipOffer[]> {
  const { center, radiusKm, selectedFields, profile, existingCompanyKeys } =
    params;

  const queries = [
    "Airbus",
    "Büro",
    "GmbH",
    "AG",
    "Werk",
    "Fabrik",
    "Krankenhaus",
    "Klinik",
    "Schule",
    "Kita",
    "Handwerk",
    "Firma",
    "Betrieb",
    "Industrie",
    "Technik",
    "Hotel",
    "Restaurant",
    "Supermarkt",
    "Bank",
    "Versicherung",
    "Behörde",
  ];

  const features: PhotonFeature[] = [];

  await Promise.all(
    queries.map(async (q) => {
      try {
        const url = new URL("https://photon.komoot.io/api/");
        url.searchParams.set("q", q);
        url.searchParams.set("lat", String(center.lat));
        url.searchParams.set("lon", String(center.lon));
        url.searchParams.set("limit", "25");
        url.searchParams.set("lang", "de");
        const res = await fetch(url.toString(), {
          headers: {
            Accept: "application/json",
            "User-Agent":
              process.env.GEO_USER_AGENT ||
              "PraktikumsRadar/1.0 (schulprojekt@example.com)",
          },
          next: { revalidate: 0 },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { features?: PhotonFeature[] };
        features.push(...(data.features ?? []));
      } catch {
        /* ignore */
      }
    }),
  );

  const offers: InternshipOffer[] = [];
  const seen = new Set<string>(existingCompanyKeys);
  const softRadius = Math.max(radiusKm, 20);

  for (const f of features) {
    const props = f.properties;
    const coords = f.geometry?.coordinates;
    if (!props?.name || !coords || coords.length < 2) continue;
    const lon = coords[0];
    const lat = coords[1];

    const distanceKm = haversineKm(center.lat, center.lon, lat, lon);
    if (distanceKm > softRadius) continue;

    const company = props.name.trim();
    const key = company.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    if (
      props.osm_key === "boundary" ||
      props.osm_key === "place" ||
      props.osm_key === "highway" ||
      props.osm_key === "railway" ||
      props.osm_key === "waterway" ||
      props.osm_value === "house" ||
      props.osm_value === "residential" ||
      props.osm_value === "apartments" ||
      /allee$|straße$|strasse$|weg$|platz$/i.test(company) ||
      /\bA\d{3}M\b|\bA\d{3}\b/.test(company) // Flugzeugtypen o.ä.
    ) {
      continue;
    }
    seen.add(key);

    const locationLabel =
      [
        [props.street, props.housenumber].filter(Boolean).join(" "),
        [props.postcode, props.city].filter(Boolean).join(" "),
      ]
        .filter(Boolean)
        .join(", ") || "Adresse laut OSM";

    const tag =
      props.osm_key && props.osm_value
        ? `${props.osm_key}=${props.osm_value}`
        : "POI";
    const title = `Initiativbewerbung: ${company}`;
    const description =
      `Ort/Betrieb aus OpenStreetMap (${tag}). ` +
      `Kein ausgeschriebenes Praktikumsangebot – Initiativbewerbung möglich.`;

    const score = scoreOffer({
      title,
      company,
      description,
      professions: [],
      fieldHints: [],
      selectedFields,
      profile,
      isInitiative: true,
    });

    offers.push({
      id: `poi-${props.osm_type || "n"}-${props.osm_id || `${lat}-${lon}-${key}`}`,
      source: "osm",
      title,
      company,
      description,
      locationLabel,
      lat,
      lon,
      distanceKm: Math.round(distanceKm * 10) / 10,
      url: props.website || null,
      professions: [],
      fieldHints: [],
      isInitiative: true,
      score,
      travel: estimateTravel(distanceKm),
    });

    if (offers.length >= 100) break;
  }

  return offers;
}
