# PraktikumsRadar

Schülerpraktika finden (Klasse 8–10) – Karte, Umkreis, echte Angebote der Bundesagentur für Arbeit.

## Brauche ich API-Keys?

**Nein – keine Google Maps / Mapbox Keys.**

| Dienst | Key? | Woher |
|--------|------|--------|
| Karte (Leaflet + OSM/CARTO) | Nein | schon eingebaut |
| Adresssuche (Nominatim) | Nein | nur User-Agent in `.env.local` |
| Praktika (BA Jobsuche) | Nein | öffentliche Client-ID `jobboerse-jobsuche` |
| OSM-Betriebe (Overpass) | Nein | optional, kann langsam sein |

```bash
cp .env.example .env.local
# GEO_USER_AGENT mit deiner Mail anpassen – fertig
npm install && npm run dev
```

## Nutzung ohne Lebenslauf

1. Seite öffnen → Karte ist sofort da  
2. Adresse suchen oder auf die Karte tippen  
3. Radius einstellen → **Praktika suchen**  
4. Lebenslauf & Interessen sind optional (unten aufklappbar)

## Tech

Next.js · TypeScript · Tailwind · Leaflet · pdf-parse / mammoth
