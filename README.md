# PraktikumsRadar

Schülerpraktika finden (Klasse 8–10) – Karte, Umkreis, echte Angebote der Bundesagentur für Arbeit.

## Hosting

- **Vercel:** https://internship-finder-sigma-two.vercel.app  
- **Supabase:** Projekt `praktikumsradar` (EU), Tabelle `favorites` für optionale Merkliste-Sync

## Brauche ich API-Keys?

**Nein – keine Google Maps / Mapbox Keys.**

| Dienst | Key? | Woher |
|--------|------|--------|
| Karte (CARTO Voyager Tiles) | Ja | `NEXT_PUBLIC_CARTO_API_KEY` |
| Adresssuche (Nominatim) | Nein | nur User-Agent in `.env.local` |
| Praktika (BA Jobsuche) | Nein | öffentliche Client-ID `jobboerse-jobsuche` |
| OSM-Betriebe (Overpass) | Nein | optional, kann langsam sein |
| Supabase | Ja (kostenlos) | Project Settings → API |

```bash
cp .env.example .env.local
# CARTO-, Supabase- und GEO_USER_AGENT-Werte eintragen
npm install && npm run dev
```


## Nutzung ohne Lebenslauf

1. Seite öffnen → Karte ist sofort da  
2. Adresse suchen oder auf die Karte tippen  
3. Radius einstellen → **Praktika suchen**  
4. Lebenslauf & Interessen sind optional (unten aufklappbar)

## Tech

Next.js · TypeScript · Tailwind · Leaflet · pdf-parse / mammoth
