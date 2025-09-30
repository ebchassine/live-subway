import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { LoadScript, GoogleMap, MarkerF } from "@react-google-maps/api";
import protobuf from "protobufjs";
import "./App.css";

// -------------------- CONFIG --------------------
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

// Choose a feed (this example: BDFM). You can swap to ACE, NQRW, etc.
const FEED_URL =
  "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm";

const REFRESH_MS = 10000;
const DEFAULT_CENTER = { lat: 40.73061, lng: -73.935242 };
const DEFAULT_ZOOM = 11;

// Inline SVG icon (avoid touching window.google before script loads)
const TRAIN_ICON_URL =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"><circle cx="7" cy="7" r="6" fill="#ff7a00"/></svg>`
  );

// -------------------- HELPERS --------------------
async function loadStopsTxt() {
  const resp = await fetch("/stops.txt");
  if (!resp.ok) throw new Error("stops.txt not found in /public");
  const text = await resp.text();

  const lines = text.trim().split(/\r?\n/);
  if (lines.length <= 1) return {};

  const header = lines[0].split(",");
  const idIdx = header.indexOf("stop_id");
  const nameIdx = header.indexOf("stop_name");
  const latIdx = header.indexOf("stop_lat");
  const lonIdx = header.indexOf("stop_lon");

  const stops = {};
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (!row) continue;
    const cols = row.split(",");
    const stop_id = cols[idIdx];
    const stop_name = cols[nameIdx];
    const stop_lat = parseFloat(cols[latIdx]);
    const stop_lon = parseFloat(cols[lonIdx]);
    if (stop_id && Number.isFinite(stop_lat) && Number.isFinite(stop_lon)) {
      stops[stop_id] = { name: stop_name, lat: stop_lat, lon: stop_lon };
    }
  }
  return stops;
}

// -------------------- APP --------------------
export default function App() {
  const [status, setStatus] = useState("idle");
  const [vehicles, setVehicles] = useState([]); // [{lat,lng,title}]
  const [mapReady, setMapReady] = useState(false);

  const protoRootRef = useRef(null);
  const stopsRef = useRef({});
  const pollRef = useRef(null);

  const mapOptions = useMemo(
    () => ({
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true,
      clickableIcons: false,
    }),
    []
  );

  // Load proto + stops once
  const ensureStatics = useCallback(async () => {
    if (!protoRootRef.current) {
      const root = await protobuf.load("/gtfs-realtime.proto");
      protoRootRef.current = root;
      console.log("GTFS proto loaded");
    }
    if (!Object.keys(stopsRef.current).length) {
      const stops = await loadStopsTxt();
      stopsRef.current = stops;
      console.log("Stops loaded:", Object.keys(stops).length);
    }
  }, []);

  // Fetch + decode vehicles → markers
  const refreshVehicles = useCallback(async () => {
    if (!protoRootRef.current) return;

    setStatus("fetching");
    try {
      const FeedMessage =
        protoRootRef.current.lookupType("transit_realtime.FeedMessage");

      // No headers (no API key)
      const resp = await fetch(FEED_URL, { mode: "cors" });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(`MTA feed ${resp.status} ${text.slice(0, 120)}`);
      }

      const buffer = await resp.arrayBuffer();
      const feed = FeedMessage.decode(new Uint8Array(buffer));

      const markers = [];

      // 1) Vehicle.position when present
      for (const entity of feed.entity || []) {
        const pos = entity?.vehicle?.position;
        if (pos && Number.isFinite(pos.latitude) && Number.isFinite(pos.longitude)) {
          markers.push({
            lat: pos.latitude,
            lng: pos.longitude,
            title: `Trip ${entity?.vehicle?.trip?.tripId || ""}`,
          });
        }
      }

      // 2) Fallback via next stop from tripUpdate
      for (const entity of feed.entity || []) {
        const hasVeh =
          !!(entity?.vehicle?.position && Number.isFinite(entity.vehicle.position.latitude));
        if (hasVeh) continue;
        const updates = entity?.tripUpdate?.stopTimeUpdate;
        if (updates && updates.length > 0) {
          const stopId = updates[0]?.stopId;
          const stop = stopId ? stopsRef.current[stopId] : null;
          if (stop) {
            markers.push({
              lat: stop.lat,
              lng: stop.lon,
              title: `Next stop ${stop.name}`,
            });
          }
        }
      }

      setVehicles(markers);
      setStatus(`ok (${markers.length} trains)`);
      console.log("Train markers added:", markers.length);
    } catch (err) {
      console.error("Error fetching/decoding vehicles:", err);
      setStatus(`error: ${err.message}`);
      setVehicles([]);
    }
  }, []);

  // Start once Google Map has mounted
  useEffect(() => {
    if (!mapReady) return;

    let cancelled = false;
    (async () => {
      try {
        setStatus("loading");
        await ensureStatics();
        if (cancelled) return;

        await refreshVehicles();
        if (cancelled) return;

        pollRef.current = setInterval(refreshVehicles, REFRESH_MS);
      } catch (e) {
        console.error(e);
        if (!cancelled) setStatus(`error: ${e.message}`);
      }
    })();

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [mapReady, ensureStatics, refreshVehicles]);

  return (
    <LoadScript
      googleMapsApiKey={GOOGLE_MAPS_API_KEY}
      onError={(e) => {
        console.error("Google Maps script failed to load", e);
        setStatus(
          "error: Google Maps failed to load (check API key, billing, or referrer restrictions)"
        );
      }}
    >
      <div className="map-container">
        {/* HUD */}
        <div className="hud">
          <div className="status">status: {status}</div>
        </div>

        <GoogleMap
          mapContainerClassName="map-container"
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          options={mapOptions}
          onLoad={() => setMapReady(true)}
        >
          {vehicles.map((v, i) => (
            <MarkerF
              key={i}
              position={{ lat: v.lat, lng: v.lng }}
              title={v.title}
              icon={{ url: TRAIN_ICON_URL }}
            />
          ))}
        </GoogleMap>
      </div>
    </LoadScript>
  );
}
