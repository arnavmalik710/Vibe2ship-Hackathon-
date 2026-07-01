import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Issue } from "../types";
import { Locate } from "lucide-react";

interface CitizenMapProps {
  issues: Issue[];
  selectedIssue: Issue | null;
  onSelectIssue: (issue: Issue) => void;
  center?: [number, number];
  zoom?: number;
}

export default function CitizenMap({
  issues,
  selectedIssue,
  onSelectIssue,
  center = [12.9716, 77.5946], // Bangalore center
  zoom = 13
}: CitizenMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);

  const [userMarkerAdded, setUserMarkerAdded] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Status-to-color configuration matching UI Guide
  const markerColors: { [key: string]: string } = {
    reported: "#FF9933",     // saffron circle
    verified: "#000080",     // navy circle
    inProgress: "#e3a008",   // amber circle
    resolved: "#138808"      // green circle
  };

  // Helper to get status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "reported": return "Reported";
      case "verified": return "Verified";
      case "inProgress": return "In Progress";
      case "resolved": return "Resolved";
      default: return status;
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Create Map Instance - clean road-map style (CartoDB Voyager)
    const map = L.map(mapContainerRef.current, {
      zoomControl: false // Custom placement in bottom right
    }).setView(center, zoom);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20
    }).addTo(map);

    // Add zoom controls to bottom-right
    L.control.zoom({
      position: "bottomright"
    }).addTo(map);

    mapInstanceRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      userMarkerRef.current = null;
    };
  }, []);

  // Sync markers when issues list changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;

    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    issues.forEach((issue) => {
      const { lat, lng } = issue.location;
      if (!lat || !lng) return;

      // Create a clean circular marker: 14px diameter (7px radius) with 2px white border
      const marker = L.circleMarker([lat, lng], {
        radius: 7,
        fillColor: markerColors[issue.status] || "#FF9933",
        color: "#ffffff",
        weight: 2,
        fillOpacity: 1.0
      });

      // Simple tooltip showing title + status badge
      const badgeStyle = `
        display: inline-block;
        padding: 2px 6px;
        font-size: 10px;
        font-weight: 600;
        border-radius: 4px;
        margin-top: 4px;
        color: ${markerColors[issue.status]};
        background-color: ${issue.status === 'reported' ? '#fff7ed' : issue.status === 'verified' ? '#eff6ff' : issue.status === 'inProgress' ? '#fefce8' : '#f0fdf4'};
        border: 1px solid ${issue.status === 'reported' ? '#fed7aa' : issue.status === 'verified' ? '#bfdbfe' : issue.status === 'inProgress' ? '#fde68a' : '#bbf7d0'};
      `;

      const tooltipContent = `
        <div style="font-family: 'Inter', sans-serif; font-size: 13px; color: #1a1a1a;">
          <div style="font-weight: 600;">${issue.title}</div>
          <div style="${badgeStyle}">${getStatusLabel(issue.status)}</div>
        </div>
      `;

      marker.bindTooltip(tooltipContent, {
        direction: "top",
        offset: [0, -5],
        className: "custom-map-tooltip"
      });

      // Handle marker click
      marker.on("click", () => {
        onSelectIssue(issue);
        map.flyTo([lat, lng], 15, { duration: 1.5 });
      });

      marker.addTo(markersLayer);
    });

    // --- Feature 3: Issue Heatmap Pulse Animation ---
    // Group unresolved issues by grid (2 decimal places of lat/lng)
    const unresolved = issues.filter(i => i.status !== "resolved");
    const zones: { [key: string]: { latSum: number; lngSum: number; count: number } } = {};

    unresolved.forEach((issue) => {
      const { lat, lng } = issue.location;
      if (!lat || !lng) return;
      const key = `${lat.toFixed(2)}_${lng.toFixed(2)}`;
      if (!zones[key]) {
        zones[key] = { latSum: 0, lngSum: 0, count: 0 };
      }
      zones[key].latSum += lat;
      zones[key].lngSum += lng;
      zones[key].count += 1;
    });

    Object.values(zones).forEach((zone) => {
      if (zone.count >= 3) {
        const avgLat = zone.latSum / zone.count;
        const avgLng = zone.lngSum / zone.count;
        
        const isMajor = zone.count >= 5;
        const sizeClass = isMajor ? "major-pulse" : "standard-pulse";

        const pulseIcon = L.divIcon({
          html: `<div class="heat-pulse-container"><div class="heat-pulse ${sizeClass}"></div></div>`,
          className: "custom-pulse-marker",
          iconSize: [0, 0],
          iconAnchor: [0, 0]
        });

        const pulseMarker = L.marker([avgLat, avgLng], {
          icon: pulseIcon,
          interactive: false
        });

        pulseMarker.addTo(markersLayer);
      }
    });
  }, [issues]);

  // Sync map center if selectedIssue changes externally
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedIssue) return;

    const { lat, lng } = selectedIssue.location;
    if (lat && lng) {
      map.flyTo([lat, lng], 15, { duration: 1.2 });
    }
  }, [selectedIssue]);

  // "Near Me" Geolocator trigger
  const handleLocateUser = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.flyTo([latitude, longitude], 15, { duration: 1.5 });

          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([latitude, longitude]);
          } else {
            // Elegant blue pulsing circle for user location
            const userMarker = L.circleMarker([latitude, longitude], {
              radius: 8,
              fillColor: "#3b82f6",
              color: "#ffffff",
              weight: 3,
              fillOpacity: 1.0
            }).addTo(map);

            userMarker.bindTooltip("You are here", {
              permanent: false,
              direction: "top"
            });
            userMarkerRef.current = userMarker;
          }
          setUserMarkerAdded(true);
          setLocationError(null);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLocationError("Could not access location. Please check browser permissions.");
          setTimeout(() => setLocationError(null), 4000);
        },
        { enableHighAccuracy: true }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser.");
      setTimeout(() => setLocationError(null), 4000);
    }
  };

  return (
    <div id="citizen_map_wrapper" className="relative w-full h-full overflow-hidden bg-transparent">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Modern, elegant Error Toast Banner */}
      {locationError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-rose-50 text-rose-700 px-4 py-2.5 rounded-[6px] border border-rose-200 shadow-md text-xs font-semibold z-50 animate-bounce">
          {locationError}
        </div>
      )}

      {/* Map Legend Overlay */}
      <div
        id="map_legend"
        style={{ zIndex: 1000, pointerEvents: "auto" }}
        className="absolute bottom-[16px] left-[16px] bg-white p-[10px_14px] border border-[#e5e7eb] rounded-[8px] text-[12px] font-medium text-[#1a1a1a] min-w-[120px] flex flex-col gap-2"
      >
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: "#FF9933" }} />
          <span>Reported</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: "#000080" }} />
          <span>Verified</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: "#e3a008" }} />
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: "#138808" }} />
          <span>Resolved</span>
        </div>
      </div>

      {/* Locate Me Floating Action Pill */}
      <button
        id="map_btn_near_me"
        type="button"
        onClick={handleLocateUser}
        title="Locate Me"
        style={{ zIndex: 1000, pointerEvents: "auto" }}
        className="absolute bottom-[16px] right-[16px] bg-white hover:bg-slate-50 text-[#1a1a1a] shadow-sm px-[12px] py-[8px] rounded-[8px] border border-[#e5e7eb] flex items-center gap-2 transition-all duration-150 text-[13px] font-medium cursor-pointer"
      >
        <Locate className="w-4 h-4 text-[#000080]" />
        <span>Locate Me</span>
      </button>
    </div>
  );
}
