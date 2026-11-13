"use client";

import { useEffect, useMemo } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { InternshipOffer, MapCenter } from "@/lib/types";
import "leaflet/dist/leaflet.css";

const centerIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:9999px;background:#0a0a0a;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.35)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function offerIcon(selected: boolean, initiative: boolean) {
  const size = selected ? 14 : 11;
  const shape = initiative ? "2px" : "9999px";
  const bg = selected ? "#0a0a0a" : initiative ? "#737373" : "#404040";
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:${shape};background:${bg};border:2px solid #fff;box-shadow:0 1px 2px rgba(0,0,0,.3)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function MapClickHandler({
  onCenterChange,
}: {
  onCenterChange: (center: MapCenter) => void;
}) {
  useMapEvents({
    click(e) {
      onCenterChange({
        lat: e.latlng.lat,
        lon: e.latlng.lng,
        label: `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`,
      });
    },
  });
  return null;
}

function Recenter({
  center,
  radiusKm,
}: {
  center: MapCenter;
  radiusKm: number;
}) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLng(center.lat, center.lon).toBounds(
      radiusKm * 1000 * 2,
    );
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 13 });
  }, [center.lat, center.lon, radiusKm, map]);
  return null;
}

interface RadiusMapProps {
  center: MapCenter;
  radiusKm: number;
  offers: InternshipOffer[];
  selectedId: string | null;
  onCenterChange: (center: MapCenter) => void;
  onSelectOffer: (id: string) => void;
}

function cartoTileUrl(): string {
  const key = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim();
  if (key) {
    return `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`;
  }
  // Fallback ohne Key (free tier / light)
  return "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
}

export default function RadiusMap({
  center,
  radiusKm,
  offers,
  selectedId,
  onCenterChange,
  onSelectOffer,
}: RadiusMapProps) {
  const markers = useMemo(() => offers, [offers]);
  const tileUrl = useMemo(() => cartoTileUrl(), []);

  return (
    <MapContainer
      center={[center.lat, center.lon]}
      zoom={11}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url={tileUrl}
      />
      <MapClickHandler onCenterChange={onCenterChange} />
      <Recenter center={center} radiusKm={radiusKm} />
      <Marker position={[center.lat, center.lon]} icon={centerIcon}>
        <Popup>Suchmittelpunkt</Popup>
      </Marker>
      <Circle
        center={[center.lat, center.lon]}
        radius={radiusKm * 1000}
        pathOptions={{
          color: "#0a0a0a",
          fillColor: "#0a0a0a",
          fillOpacity: 0.06,
          weight: 1.5,
        }}
      />
      {markers.map((offer) => (
        <Marker
          key={offer.id}
          position={[offer.lat, offer.lon]}
          icon={offerIcon(offer.id === selectedId, offer.isInitiative)}
          eventHandlers={{
            click: () => onSelectOffer(offer.id),
          }}
        >
          <Popup>
            <strong>{offer.title}</strong>
            <br />
            {offer.company}
            {offer.isInitiative && (
              <>
                <br />
                Initiativbewerbung möglich
              </>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
