# PraktikumsRadar

Web-App für Schülerinnen und Schüler (Klasse 8–10) in Deutschland: Lebenslauf auswerten, Berufsfelder wählen, Umkreis auf der Karte setzen und echte Praktikumsangebote der Bundesagentur für Arbeit finden.

## Tech

- Next.js (App Router) + TypeScript + Tailwind CSS
- Leaflet + OpenStreetMap
- pdf-parse / mammoth (Lebenslauf, nur temporär im Speicher)
- Jobsuche-API der BA, Nominatim, Overpass
- Deployment: Vercel

## Start

```bash
cp .env.example .env.local
npm install
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

## Testen – Schritte

1. **Karte + Radius:** Adresse suchen oder auf die Karte klicken, Slider 1–50 km – Kreis muss sichtbar sein.
2. **API:** „Praktika in der Nähe suchen“ – BA-Anzeigen erscheinen als Marker/Liste (keine erfundenen Daten).
3. **Lebenslauf:** PDF/DOCX hochladen – Profil wird befüllt, Datei wird nicht gespeichert (Datenschutzhinweis).
4. **Bewertung:** Passung %, Schwierigkeit, Fahrzeiten; Tooltip/Details erklären die Schätzung.
5. **Merkliste / Anschreiben:** Merken (localStorage), Anschreiben-Entwurf erzeugen und kopieren.

## Struktur

Siehe [docs/KOMPONENTEN.md](docs/KOMPONENTEN.md).

## Hinweise

- Bewertungen und Fahrzeiten sind **automatische Schätzungen**.
- OSM-Treffer sind klar als **Initiativbewerbung** gekennzeichnet.
- API-Keys nur in `.env.local`.
