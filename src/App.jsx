import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { LoadScript, GoogleMap, MarkerF } from "@react-google-maps/api";
import protobuf from "protobufjs";
import "./App.css";

// -------------------- CONFIG --------------------
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

// Choose a feed (this example: BDFM). You can swap to ACE, NQRW, etc.
const FEED_URL =
  "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm";

const REFRESH_MS = 5000;        // poll faster so movement is more obvious
const STALE_MS = 180000;        // ignore vehicles older than 3 minutes
const DEFAULT_CENTER = { lat: 40.73061, lng: -73.935242 };
const DEFAULT_ZOOM = 11;

// Inline SVG icons (no window.google dependency at render time)
const LIVE_ICON_URL =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14">
       <circle cx="7" cy="7" r="6" fill="#ff7a00"/>
     </svg>`
  );

const EST_ICON_URL =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14">
       <circle cx="7" cy="7" r="5.5" fill="white" stroke="#606060" stroke-width="1.5"/>
     </svg>`
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
  const [markers, setMarkers] = useState([]); // {lat,lng,title,live,ageSec}
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

      const resp = await fetch(FEED_URL, { mode: "cors" });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(`MTA feed ${resp.status} ${text.slice(0, 120)}`);
      }

      const buffer = await resp.arrayBuffer();
      const feed = FeedMessage.decode(new Uint8Array(buffer));

      const now = Date.now();
      const out = [];

      // 1) Vehicle.position (live)
      for (const entity of feed.entity || []) {
        const veh = entity?.vehicle;
        const pos = veh?.position;
        if (pos && Number.isFinite(pos.latitude) && Number.isFinite(pos.longitude)) {
          const ts = veh?.timestamp ? veh.timestamp * 1000 : now;
          const ageMs = Math.max(0, now - ts);
          if (ageMs <= STALE_MS) {
            out.push({
              lat: pos.latitude,
              lng: pos.longitude,
              title: `Live • ${veh?.trip?.tripId || "—"} • ${Math.round(ageMs / 1000)}s ago`,
              live: true,
              ageSec: Math.round(ageMs / 1000),
            });
          }
        }
      }

      // 2) Fallback via next stop from tripUpdate (estimated)
      for (const entity of feed.entity || []) {
        const hasVeh =
          !!(entity?.vehicle?.position && Number.isFinite(entity.vehicle.position.latitude));
        if (hasVeh) continue;

        const updates = entity?.tripUpdate?.stopTimeUpdate;
        if (updates && updates.length > 0) {
          const stopId = updates[0]?.stopId;
          const stop = stopId ? stopsRef.current[stopId] : null;
          if (stop) {
            out.push({
              lat: stop.lat,
              lng: stop.lon,
              title: `Est. at stop • ${stop.name}`,
              live: false,
              ageSec: null,
            });
          }
        }
      }

      setMarkers(out);
      const liveCount = out.filter(m => m.live).length;
      const estCount  = out.length - liveCount;
      setStatus(`ok (${out.length} trains • ${liveCount} live, ${estCount} est.)`);
      console.log("Train markers added:", out.length);
    } catch (err) {
      console.error("Error fetching/decoding vehicles:", err);
      setStatus(`error: ${err.message}`);
      setMarkers([]);
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
          <div className="status">{status}</div>
          <div className="legend">
            <span className="legend-item">
              <span className="dot live" /> live position
            </span>
            <span className="legend-item">
              <span className="dot est" /> estimated (next stop)
            </span>
          </div>
        </div>

        <GoogleMap
          mapContainerClassName="map-container"
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          options={mapOptions}
          onLoad={() => setMapReady(true)}
        >
          {markers.map((m, i) => (
            <MarkerF
              key={i}
              position={{ lat: m.lat, lng: m.lng }}
              title={m.title}
              icon={{ url: m.live ? LIVE_ICON_URL : EST_ICON_URL }}
            />
          ))}
        </GoogleMap>
      </div>
    </LoadScript>
  );
}
