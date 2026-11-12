import { NextResponse } from "next/server";
import { searchBaInternships, fetchBaJobDetails } from "@/lib/ba-api";
import { fieldSearchTerms } from "@/lib/fields";
import { searchOsmCompanies } from "@/lib/overpass";
import { sortOffers } from "@/lib/scoring";
import type { CareerFieldId, MapCenter, StudentProfile } from "@/lib/types";

interface JobsBody {
  center: MapCenter;
  radiusKm: number;
  fields: CareerFieldId[];
  profile: StudentProfile | null;
  includeOsm?: boolean;
  enrichDescriptions?: boolean;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as JobsBody;
    const { center, profile } = body;
    const radiusKm = Math.min(50, Math.max(1, Number(body.radiusKm) || 10));
    const fields = Array.isArray(body.fields) ? body.fields : [];
    const includeOsm = body.includeOsm !== false;

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

    const searchTerms = fieldSearchTerms(fields);

    const baPromise = searchBaInternships({
      center,
      radiusKm,
      searchTerms,
      selectedFields: fields,
      profile,
    });

    const osmPromise = includeOsm
      ? searchOsmCompanies({
          center,
          radiusKm,
          selectedFields: fields,
          profile,
          existingCompanyKeys: new Set(),
        }).then((offers) => ({ offers, error: null as string | null }))
      : Promise.resolve({
          offers: [] as Awaited<ReturnType<typeof searchOsmCompanies>>,
          error: null as string | null,
        });

    const [baOffers, osmResult] = await Promise.all([
      baPromise,
      osmPromise.catch((err: unknown) => ({
        offers: [] as Awaited<ReturnType<typeof searchOsmCompanies>>,
        error:
          err instanceof Error
            ? err.message
            : "OSM-Betriebe konnten nicht geladen werden.",
      })),
    ]);

    // Optional: kurze Beschreibung nachladen (begrenzt, um die API zu schonen)
    if (body.enrichDescriptions) {
      const top = baOffers.slice(0, 8);
      await Promise.all(
        top.map(async (offer) => {
          if (!offer.referenceNumber || offer.description) return;
          const desc = await fetchBaJobDetails(offer.referenceNumber);
          if (desc) offer.description = desc.slice(0, 2000);
        }),
      );
    }

    const baCompanyKeys = new Set(
      baOffers.map((o) => o.company.toLowerCase().replace(/\s+/g, " ").trim()),
    );
    const osmOffers = osmResult.offers.filter(
      (o) => !baCompanyKeys.has(o.company.toLowerCase().replace(/\s+/g, " ").trim()),
    );
    const osmError = osmResult.error;

    const offers = sortOffers([...baOffers, ...osmOffers], "match");

    return NextResponse.json({
      offers,
      meta: {
        baCount: baOffers.length,
        osmCount: osmOffers.length,
        osmError,
        disclaimer:
          "Passung, Schwierigkeit und Fahrzeiten sind automatische Schätzungen – keine Garantie.",
      },
    });
  } catch (error) {
    console.error("jobs error", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Praktikumsangebote konnten nicht geladen werden.",
      },
      { status: 500 },
    );
  }
}
