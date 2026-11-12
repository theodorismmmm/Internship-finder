import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json(
      { error: "Bitte einen Suchbegriff eingeben." },
      { status: 400 },
    );
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "de");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent":
        process.env.GEO_USER_AGENT ||
        "PraktikumsRadar/1.0 (schulprojekt@example.com)",
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `Adresssuche fehlgeschlagen (HTTP ${res.status}).` },
      { status: 502 },
    );
  }

  const data = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;

  return NextResponse.json({
    results: data.map((r) => ({
      lat: Number(r.lat),
      lon: Number(r.lon),
      label: r.display_name,
    })),
  });
}
