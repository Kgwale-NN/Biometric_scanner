import React, { useEffect, useRef } from "react";

type Loc = { lat: number; lng: number; title?: string; subtitle?: string };

interface LeafletMapProps {
  current?: Loc;
  locations?: Array<{ address?: string; title?: string; subtitle?: string }>;
}

// Simple known-location lookup to avoid geocoding for common city/place names.
const KNOWN_COORDS: Record<string, { lat: number; lng: number }> = {
  "Johannesburg, Gauteng": { lat: -26.2041, lng: 28.0473 },
  "Johannesburg, Gauteng, South Africa": { lat: -26.2041, lng: 28.0473 },
  "Sandton City, Johannesburg": { lat: -26.1071, lng: 28.0565 },
  "Midrand, Johannesburg": { lat: -25.9989, lng: 28.1688 },
  "Pretoria, Gauteng": { lat: -25.7461, lng: 28.1881 },
};

export default function LeafletMap({ current, locations = [] }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const containerId = "leaflet-map-root";

  useEffect(() => {
    let mapInstance: any = null;
    let cleanupNeeded = false;
    
    // Load Leaflet CSS + JS from CDN if not already loaded
    if (!document.querySelector("link[data-leaflet]")) {
      const link = document.createElement("link");
      link.setAttribute("data-leaflet", "1");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    
    const loadMap = () => {
      if (!(window as any).L) {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.async = true;
        script.onload = () => {
          if (cleanupNeeded) return;
          initMap();
        };
        document.body.appendChild(script);
      } else {
        initMap();
      }
    };
    
    loadMap();

    function initMap() {
      try {
        const L = (window as any).L;
        if (!mapRef.current) return;
        // clear existing map container (if hot reload)
        mapRef.current.innerHTML = "";
        const center = current ? [current.lat, current.lng] : [0, 0];
        mapInstance = L.map(containerId).setView(center as any, 11);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
          minZoom: 2
        }).addTo(mapInstance);

        const points: Array<[number, number]> = [];

        if (current) {
          points.push([current.lat, current.lng]);
          const m = L.marker([current.lat, current.lng]).addTo(mapInstance);
          m.bindPopup(`<strong>${current.title || "Current"}</strong><div>${current.subtitle || ""}</div>`);
        }

        const geocodeFallback = async (address: string) => {
          // Try known lookup first
          const key = address.trim();
          if (KNOWN_COORDS[key]) return KNOWN_COORDS[key];
          // Fallback: use Nominatim (free but rate-limited). Use politely.
          try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
            const res = await fetch(url, { headers: { "User-Agent": "BiometricScanner/1.0 (contact)" } });
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            }
          } catch (err) {
            console.warn("Nominatim geocode error", err);
          }
          return null;
        };

        (async () => {
          for (const loc of locations) {
            if (!loc.address) continue;
            const coords = await geocodeFallback(loc.address);
            if (!coords) continue;
            points.push([coords.lat, coords.lng]);
            const mk = L.marker([coords.lat, coords.lng]).addTo(mapInstance);
            mk.bindPopup(`<strong>${loc.title || loc.address}</strong><div>${loc.subtitle || ""}</div>`);
          }

          if (points.length > 0) {
            const latlngs = points as any;
            L.polyline(latlngs, { color: "#1976d2" }).addTo(mapInstance);
            const bounds = L.latLngBounds(latlngs);
            mapInstance.fitBounds(bounds, { padding: [40, 40] });
          }
        })();
      } catch (err) {
        console.error("Leaflet init failed", err);
      }
    }

    return () => {
      cleanupNeeded = true;
      if (mapInstance) {
        mapInstance.remove();
        mapInstance = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, locations]);

  return <div id={containerId} ref={mapRef} className="w-full h-full" style={{ minHeight: 360 }} />;
}
