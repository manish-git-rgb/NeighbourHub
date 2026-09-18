"use client";

import {
  Circle,
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { useEffect } from "react";

export type MapItem = {
  id: number;
  type: string;
  title: string;
  description?: string | null;
  status?: string | null;
  latitude: number;
  longitude: number;
};

type NeighborMapProps = {
  latitude: number;
  longitude: number;
  radiusKm: number;
  items: MapItem[];
};

function RecenterMap({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView([latitude, longitude], 13);
  }, [latitude, longitude, map]);

  return null;
}

function markerRadius(type: string): number {
  switch (type) {
    case "POST":
      return 9;
    case "EVENT":
      return 10;
    case "PLACE":
      return 11;
    case "SERVICE":
      return 11;
    default:
      return 9;
  }
}

function markerColor(type: string): string {
  switch (type) {
    case "POST":
      return "#2563eb";
    case "EVENT":
      return "#7c3aed";
    case "PLACE":
      return "#059669";
    case "SERVICE":
      return "#ea580c";
    default:
      return "#475569";
  }
}

export default function NeighborMap({
  latitude,
  longitude,
  radiusKm,
  items,
}: NeighborMapProps) {
  const center: LatLngExpression = [latitude, longitude];

  return (
    <div className="h-150 w-full overflow-hidden rounded-2xl border border-slate-200">
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RecenterMap
          latitude={latitude}
          longitude={longitude}
        />

        {/* Search radius */}
        <Circle
          center={center}
          radius={radiusKm * 1000}
          pathOptions={{
            fillOpacity: 0.08,
          }}
        />

        {/* Current location */}
        <CircleMarker
          center={center}
          radius={10}
          pathOptions={{
            fillOpacity: 1,
          }}
        >
          <Popup>
            <div>
              <strong>Your location</strong>
              <div className="mt-1 text-sm">
                {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </div>
            </div>
          </Popup>
        </CircleMarker>

        {/* Nearby items */}
        {items.map((item) => (
          <CircleMarker
            key={`${item.type}-${item.id}`}
            center={[item.latitude, item.longitude]}
            radius={markerRadius(item.type)}
            pathOptions={{
              fillColor: markerColor(item.type),
              color: markerColor(item.type),
              fillOpacity: 0.75,
            }}
          >
            <Popup>
              <div className="min-w-45">
                <div className="text-xs font-semibold uppercase tracking-wide">
                  {item.type}
                </div>

                <div className="mt-1 text-sm font-semibold">
                  {item.title}
                </div>

                {item.description && (
                  <p className="mt-2 text-sm text-slate-600">
                    {item.description}
                  </p>
                )}

                {item.status && (
                  <p className="mt-2 text-xs text-slate-500">
                    Status: {item.status}
                  </p>
                )}

                <p className="mt-2 text-xs text-slate-400">
                  {item.latitude.toFixed(5)},{" "}
                  {item.longitude.toFixed(5)}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}