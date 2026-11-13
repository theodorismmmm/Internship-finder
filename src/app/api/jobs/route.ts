import { NextResponse } from "next/server";
import { searchBaInternships, fetchBaJobDetails } from "@/lib/ba-api";
import { fieldSearchTerms } from "@/lib/fields";
import { searchOsmCompanies } from "@/lib/overpass";
import { resolveBaPlace } from "@/lib/place";
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
    // Standard: auch Betriebe ohne offene Stelle laden
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
    const searchPlace = await resolveBaPlace(center);

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

    const [baResult, osmResult] = await Promise.all([
      baPromise.then((offers) => ({ offers, error: null as string | null })).catch(
        (err: unknown) => ({
          offers: [] as Awaited<ReturnType<typeof searchBaInternships>>,
          error:
            err instanceof Error
              ? err.message
              : "BA-Jobsuche fehlgeschlagen.",
        }),
      ),
      osmPromise.catch((err: unknown) => ({
        offers: [] as Awaited<ReturnType<typeof searchOsmCompanies>>,
        error:
          err instanceof Error
            ? err.message
            : "OSM-Betriebe konnten nicht geladen werden.",
      })),
    ]);

    const baOffers = baResult.offers;

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
      (o) =>
        !baCompanyKeys.has(o.company.toLowerCase().replace(/\s+/g, " ").trim()),
    );

    const offers = sortOffers([...baOffers, ...osmOffers], "distance");

    if (offers.length === 0) {
      return NextResponse.json({
        offers: [],
        meta: {
          baCount: 0,
          osmCount: 0,
          osmError: osmResult.error,
          baError: baResult.error,
          searchPlace,
          disclaimer:
            "Keine Treffer im Umkreis. Radius vergrößern oder anderen Ort wählen. Betriebe ohne Anzeige brauchen die Option „Alle Betriebe“.",
        },
      });
    }

    return NextResponse.json({
      offers,
      meta: {
        baCount: baOffers.length,
        osmCount: osmOffers.length,
        osmError: osmResult.error,
        baError: baResult.error,
        searchPlace,
        disclaimer:
          "Offene Stellen: Bundesagentur für Arbeit. Weitere Betriebe: OpenStreetMap (Initiativbewerbung). Bewertungen sind Schätzungen.",
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
