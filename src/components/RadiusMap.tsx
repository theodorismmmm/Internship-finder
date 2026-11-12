"use client";

import { useEffect, useMemo } from "react";
import {
  Circle,
  CircleMarker,
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
  html: `<div style="width:18px;height:18px;border-radius:9999px;background:#0f766e;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function baIcon(selected: boolean) {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:9999px;background:${selected ? "#b45309" : "#0369a1"};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.3)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function osmIcon(selected: boolean) {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:3px;background:${selected ? "#b45309" : "#7c3aed"};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.3)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
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

function Recenter({ center, radiusKm }: { center: MapCenter; radiusKm: number }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLng(center.lat, center.lon).toBounds(radiusKm * 1000 * 2);
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

export default function RadiusMap({
  center,
  radiusKm,
  offers,
  selectedId,
  onCenterChange,
  onSelectOffer,
}: RadiusMapProps) {
  const markers = useMemo(() => offers, [offers]);

  return (
    <MapContainer
      center={[center.lat, center.lon]}
      zoom={11}
      className="h-full w-full rounded-2xl"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
          color: "#0f766e",
          fillColor: "#14b8a6",
          fillOpacity: 0.12,
          weight: 2,
        }}
      />
      <CircleMarker
        center={[center.lat, center.lon]}
        radius={4}
        pathOptions={{ color: "#0f766e", fillColor: "#0f766e", fillOpacity: 1 }}
      />
      {markers.map((offer) => (
        <Marker
          key={offer.id}
          position={[offer.lat, offer.lon]}
          icon={
            offer.source === "ba"
              ? baIcon(offer.id === selectedId)
              : osmIcon(offer.id === selectedId)
          }
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
                <em>Initiativbewerbung möglich</em>
              </>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
