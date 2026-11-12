# PraktikumsRadar – Projektstruktur

## Überblick

Next.js App Router + TypeScript + Tailwind. Karte: Leaflet/OSM. Daten: BA Jobsuche (`/pc/v6/jobs`), Nominatim, Overpass. Lebenslauf nur temporär im API-Route-Speicher.

```
src/
  app/
    page.tsx                 # Einstieg → AppShell
    layout.tsx               # Fonts, Meta, DE
    globals.css              # Theme, Radar-Motion
    api/
      parse-cv/route.ts      # PDF/DOCX → Profil (kein Persistieren)
      geocode/route.ts       # Nominatim-Proxy
      jobs/route.ts          # BA + optional OSM, Scoring
  components/
    AppShell.tsx             # Orchestrierung, State, localStorage
    Header.tsx               # Brand + Merkliste
    CvUpload.tsx             # Upload + Datenschutzhinweis
    ProfileEditor.tsx        # Bearbeitbares Profil
    FieldSelector.tsx        # Berufsfeld-Checkboxen
    MapSearch.tsx            # Adresse, Slider, Suche-Button
    RadiusMap.tsx            # Leaflet: Mittelpunkt, Kreis, Marker
    ResultsPanel.tsx         # Sortierung, Filter, Details
    ResultCard.tsx           # Passung/Schwierigkeit/Fahrzeit
    MerklisteModal.tsx
    CoverLetterModal.tsx
  lib/
    types.ts, fields.ts, cv-parser.ts, scoring.ts
    ba-api.ts, overpass.ts, geo.ts, cover-letter.ts, storage.ts
```

## Ablauf für Nutzer

1. Lebenslauf hochladen oder manuell Profil füllen  
2. Berufsfelder wählen (Vorschläge aus CV)  
3. Kartenmittelpunkt + Radius 1–50 km  
4. Ergebnisse laden, filtern, merken, Anschreiben-Entwurf

## Env

Siehe `.env.example` → `.env.local` (`BA_API_KEY`, `GEO_USER_AGENT`).
