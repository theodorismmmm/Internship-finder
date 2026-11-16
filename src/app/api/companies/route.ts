import { NextResponse } from "next/server";
import { searchBaTrainingCompanies } from "@/lib/ba-api";
import { searchOsmCompanies } from "@/lib/overpass";
import { searchNearbyPois } from "@/lib/poi-companies";
import type { CareerFieldId, MapCenter, StudentProfile } from "@/lib/types";

interface Body {
  center: MapCenter;
  radiusKm: number;
  fields?: CareerFieldId[];
  profile?: StudentProfile | null;
  excludeCompanies?: string[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const { center, profile } = body;
    const radiusKm = Math.min(50, Math.max(1, Number(body.radiusKm) || 15));
    const fields = Array.isArray(body.fields) ? body.fields : [];

    if (
      !center ||
      typeof center.lat !== "number" ||
      typeof center.lon !== "number"
    ) {
      return NextResponse.json(
        { error: "Bitte einen Kartenmittelpunkt setzen." },
        { status: 400 },
      );
    }

    const existing = new Set(
      (body.excludeCompanies || []).map((c) =>
        c.toLowerCase().replace(/\s+/g, " ").trim(),
      ),
    );

    const [training, pois] = await Promise.all([
      searchBaTrainingCompanies({
        center,
        radiusKm,
        selectedFields: fields,
        profile: profile ?? null,
        existingCompanyKeys: existing,
      }),
      searchNearbyPois({
        center,
        radiusKm,
        selectedFields: fields,
        profile: profile ?? null,
        existingCompanyKeys: existing,
      }),
    ]);

    for (const o of [...training, ...pois]) {
      existing.add(o.company.toLowerCase().replace(/\s+/g, " ").trim());
    }

    let osm: typeof training = [];
    let osmError: string | null = null;
    try {
      osm = await searchOsmCompanies({
        center,
        radiusKm,
        selectedFields: fields,
        profile: profile ?? null,
        existingCompanyKeys: existing,
      });
    } catch (err) {
      osmError =
        err instanceof Error
          ? err.message
          : "OSM-Betriebe gerade nicht erreichbar.";
    }

    const offers = [...training, ...pois, ...osm];

    return NextResponse.json({
      offers,
      meta: {
        count: offers.length,
        trainingCount: training.length,
        poiCount: pois.length,
        osmCount: osm.length,
        osmError,
        disclaimer:
          "Betriebe ohne Schülerpraktikums-Anzeige aus BA (Ausbildung/Intern) und OpenStreetMap – Initiativbewerbung möglich. Keine erfundenen Firmen.",
      },
    });
  } catch (error) {
    console.error("companies error", error);
    return NextResponse.json(
      {
        offers: [],
        error:
          error instanceof Error
            ? error.message
            : "Betriebe konnten nicht geladen werden.",
      },
      { status: 200 },
    );
  }
}
