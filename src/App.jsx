import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { LoadScript, GoogleMap, MarkerF } from "@react-google-maps/api";
import protobuf from "protobufjs";
import "./App.css";
import React from "react";


// -------------------- CONFIG --------------------
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

// Feed groups from https://api.mta.info/#/subwayRealTimeFeeds
const FEED_URLS = {
  "123456S": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
  "ACE":      "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace",
  "BDFM":     "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm",
  "NQRW":     "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw",
  "L":        "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l",
  "G":        "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g",
  "JZ":       "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz",
};

// Route → feed group
const FEED_GROUP_FOR_ROUTE = {
  "1":"123456S","2":"123456S","3":"123456S","4":"123456S","5":"123456S","6":"123456S","S":"123456S",
  "A":"ACE","C":"ACE","E":"ACE",
  "B":"BDFM","D":"BDFM","F":"BDFM","M":"BDFM",
  "N":"NQRW","Q":"NQRW","R":"NQRW","W":"NQRW",
  "L":"L",
  "G":"G",
  "J":"JZ","Z":"JZ"
};

const ROUTES = ["A","C","E","B","D","F","M","1","2","3","4","5","6","N","Q","R","W","L","G","J","Z","S"];

const REFRESH_MS = 8000;
const DEFAULT_CENTER = { lat: 40.73061, lng: -73.935242 };
const DEFAULT_ZOOM = 11;

// -------------------- ROUTE COLORS --------------------
// Official-ish MTA palette
const ROUTE_COLORS = {
  "A":"#0039A6","C":"#0039A6","E":"#0039A6",          // Blue
  "B":"#FF6319","D":"#FF6319","F":"#FF6319","M":"#FF6319", // Orange
  "G":"#6CBE45",                                       // Light green
  "J":"#996633","Z":"#996633",                         // Brown
  "L":"#A7A9AC",                                       // Gray
  "N":"#FCCC0A","Q":"#FCCC0A","R":"#FCCC0A","W":"#FCCC0A", // Yellow
  "1":"#EE352E","2":"#EE352E","3":"#EE352E",           // Red
  "4":"#00933C","5":"#00933C","6":"#00933C",           // Green
  "7":"#B933AD",                                       // Purple
  "S":"#808183"                                        // Shuttle dark gray
};

// Build an SVG data URL for a colored dot
const coloredDot = (hex) =>
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14">
       <circle cx="7" cy="7" r="6" fill="${hex}"/>
     </svg>`
  );

// -------------------- helpers --------------------
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

function routeFromEntity(entity) {
  return (
    entity?.vehicle?.trip?.routeId ||
    entity?.tripUpdate?.trip?.routeId ||
    null
  );
}

// -------------------- APP --------------------
export default function App() {
  const [status, setStatus] = useState("idle");
  const [markers, setMarkers] = useState([]); // {lat,lng,title}
  const [mapReady, setMapReady] = useState(false);
  const [routeId, setRouteId] = useState("A");
  const [feedGroup, setFeedGroup] = useState(FEED_GROUP_FOR_ROUTE["A"]);

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

  useEffect(() => {
    const g = FEED_GROUP_FOR_ROUTE[routeId] || "123456S";
    setFeedGroup(g);
  }, [routeId]);

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

  const refreshVehicles = useCallback(async () => {
    if (!protoRootRef.current) return;

    setStatus("fetching");
    try {
      const url = FEED_URLS[feedGroup];
      if (!url) throw new Error(`No feed URL for group ${feedGroup}`);

      const FeedMessage =
        protoRootRef.current.lookupType("transit_realtime.FeedMessage");

      const resp = await fetch(url, { mode: "cors" });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(`MTA ${feedGroup} ${resp.status} ${text.slice(0,120)}`);
      }

      const buffer = await resp.arrayBuffer();
      const feed = FeedMessage.decode(new Uint8Array(buffer));

      const out = [];
      const seen = new Set();

      for (const entity of feed.entity || []) {
        const r = routeFromEntity(entity);
        if (r && r.toUpperCase() !== routeId.toUpperCase()) continue;

        const updates = entity?.tripUpdate?.stopTimeUpdate;
        if (updates && updates.length > 0) {
          const stopId = updates[0]?.stopId;
          const stop = stopId ? stopsRef.current[stopId] : null;
          if (stop && !seen.has(stopId)) {
            seen.add(stopId);
            out.push({
              lat: stop.lat,
              lng: stop.lon,
              title: `${routeId} • ${stop.name}`,
            });
          }
        }
      }

      setMarkers(out);
      setStatus(`ok (${out.length} trains on ${routeId})`);
    } catch (err) {
      console.error("Fetch/decode error:", err);
      setStatus(`error: ${err.message}`);
      setMarkers([]);
    }
  }, [feedGroup, routeId]);

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

        if (pollRef.current) clearInterval(pollRef.current);
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
  }, [mapReady, routeId, feedGroup, ensureStatics, refreshVehicles]);

  const dotUrl = useMemo(
    () => coloredDot(ROUTE_COLORS[routeId] || "#ff7a00"),
    [routeId]
  );

  return (
    <LoadScript
      googleMapsApiKey={GOOGLE_MAPS_API_KEY}
      onError={(e) => {
        console.error("Google Maps script failed to load", e);
        setStatus("error: Google Maps failed to load (check API key/billing/referrer)");
      }}
    >
      <div className="map-container">
        {/* HUD */}
        <div className="hud">
          <div className="routes">
            {ROUTES.map(r => (
              <button
                key={r}
                className={`route-btn ${r === routeId ? "active" : ""}`}
                onClick={() => setRouteId(r)}
                title={`Show ${r} trains`}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="status">{status}</div>
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
              icon={{ url: dotUrl }}
            />
          ))}
        </GoogleMap>
      </div>
    </LoadScript>
  );
}
