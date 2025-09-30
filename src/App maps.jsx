import React, { useEffect, useRef, useState } from "react";
import "./App.css";

/*
 * Requires: VITE_GOOGLE_MAPS_API_KEY in .env
 */

const DEFAULT_CENTER = { lat: 40.73061, lng: -73.935242 }; // NYC
const DEFAULT_ZOOM = 11;

export default function App() {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const [status, setStatus] = useState("loading…");
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";


  useEffect(() => {
    if (!apiKey) {
      setStatus("error: missing VITE_GOOGLE_MAPS_API_KEY");
      return;
    }

    if (window.google?.maps) {
      initMap();
      return;
    }

    if (document.getElementById("gmaps-sdk")) return;

    const script = document.createElement("script");
    script.id = "gmaps-sdk";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.onload = () => initMap();
    script.onerror = () => setStatus("error: failed to load Google Maps JS");
    document.head.appendChild(script);
  }, [apiKey]);

  function initMap() {
    if (!mapEl.current) return;
    try {
      mapRef.current = new window.google.maps.Map(mapEl.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
        clickableIcons: false,
      });
      setStatus("ready");
    } catch (e) {
      console.error(e);
      setStatus("error: could not initialize map");
    }
  }

  return (
    <div className="app-root">
      <div className="hud">
        <div className="title">NYC Map</div>
        <div className="sub">Google Maps only (pre-MTA)</div>
        <div className="status">status: {status}</div>
      </div>
      <div ref={mapEl} className="map" />
      {!apiKey && (
        <div className="overlay-msg">
          Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to your <code>.env</code>
        </div>
      )}
    </div>
  );
}
