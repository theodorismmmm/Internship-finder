import type { MapCenter } from "./types";

/** Macht aus Nominatim-Labels / Koordinaten einen BA-tauglichen Ortsnamen. */
export function extractBaPlace(center: MapCenter): string {
  const label = (center.label || "").trim();
  if (!label) return "Deutschland";

  // Reine Koordinaten → Stadt später per Reverse-Geocode setzen; Fallback Bremen-ähnlich nah
  if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(label)) {
    return `${center.lat.toFixed(3)},${center.lon.toFixed(3)}`;
  }

  const parts = label
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  // Typisch: "... , Bremen, 28199, Deutschland"
  const withoutCountry = parts.filter(
    (p) => !/^(deutschland|germany|de)$/i.test(p),
  );

  // PLZ entfernen und die letzte sinnvolle Ortsangabe nehmen
  const withoutPlz = withoutCountry.filter((p) => !/^\d{5}$/.test(p));
  if (withoutPlz.length === 0) return label;

  // Bevorzuge bekannte Stadt-Tokens hinten (nicht den kleinsten Stadtteil vorne)
  const cityCandidate =
    withoutPlz.find((p) =>
      /^(berlin|hamburg|münchen|muenchen|köln|koeln|frankfurt|stuttgart|düsseldorf|duesseldorf|dortmund|essen|leipzig|bremen|dresden|hannover|nürnberg|nuernberg)$/i.test(
        p.split(/\s+/)[0],
      ),
    ) || withoutPlz[withoutPlz.length - 1];

  // "Bremen-Süd" → "Bremen"
  return cityCandidate.replace(/[-–].*$/, "").trim() || label;
}

export async function resolveBaPlace(center: MapCenter): Promise<string> {
  const extracted = extractBaPlace(center);
  if (!/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(extracted)) {
    return extracted;
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(center.lat));
    url.searchParams.set("lon", String(center.lon));
    url.searchParams.set("format", "json");
    url.searchParams.set("zoom", "10");
    url.searchParams.set("addressdetails", "1");

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent":
          process.env.GEO_USER_AGENT ||
          "PraktikumsRadar/1.0 (schulprojekt@example.com)",
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return "Deutschland";
    const data = (await res.json()) as {
      address?: {
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        county?: string;
        state?: string;
      };
    };
    const a = data.address || {};
    return (
      a.city ||
      a.town ||
      a.village ||
      a.municipality ||
      a.county ||
      a.state ||
      "Deutschland"
    );
  } catch {
    return "Deutschland";
  }
}
