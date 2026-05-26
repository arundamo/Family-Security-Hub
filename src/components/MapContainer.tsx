/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useAdvancedMarkerRef, useMap } from '@vis.gl/react-google-maps';
import { useFamily, getDistanceMeters } from './FamilyStateContext';
import { Map as MapIcon, Layers, Settings, Compass, HelpCircle, Shield, AlertTriangle, Info, MapPin, Search, Navigation } from 'lucide-react';
import { motion } from 'motion/react';

const LOCATION_PRESETS = [
  { name: 'Cook Residence 🏠', lat: 37.4223, lng: -122.0844, description: 'Family Home Base' },
  { name: 'Stanford Park Mall 🛍️', lat: 37.4430, lng: -122.1712, description: 'Shopping Centers Area' },
  { name: 'Palo Alto High School 🏫', lat: 37.4371, lng: -122.1332, description: 'Emily’s Daily High School' },
  { name: 'Googleplex HQ Complex 💻', lat: 37.4220, lng: -122.0841, description: 'Google Corporate Headquarters' },
  { name: 'Stevens Creek Trail 🌲', lat: 37.4115, lng: -122.0722, description: 'Wooded Outdoor Nature Preserve' },
  { name: 'San Francisco Bay Marina ⛵', lat: 37.8078, lng: -122.4411, description: 'Waterfront recreation zone' }
];

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY' && API_KEY.trim() !== '';

export default function MapContainer() {
  const { 
    members, 
    safeZones, 
    sosAlerts, 
    currentUser, 
    updateUserLocation, 
    simulateMemberMovement,
    gpsStatus,
    setGpsStatus,
    selectedMemberId,
    setSelectedMemberId,
    mapCenter,
    setMapCenter
  } = useFamily();

  // Toggle between high-fidelity local vector simulator and official Google Maps
  const [mapMode, setMapMode] = useState<'simulated' | 'google'>(hasValidKey ? 'google' : 'simulated');
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  // Manual Coordinates Override UI Panel state
  const [isManualSelectorOpen, setIsManualSelectorOpen] = useState(false);
  const [manualLat, setManualLat] = useState('37.422');
  const [manualLng, setManualLng] = useState('-122.084');
  const [presetSearch, setPresetSearch] = useState('');

  useEffect(() => {
    if (currentUser?.latitude && currentUser?.longitude) {
      setManualLat(currentUser.latitude.toFixed(6));
      setManualLng(currentUser.longitude.toFixed(6));
    }
  }, [currentUser?.latitude, currentUser?.longitude]);

  // Handle applying coordinates overrides
  const handleApplyManualLocation = (latVal: number, lngVal: number) => {
    if (isNaN(latVal) || isNaN(lngVal)) return;
    
    // Toggle auto GPS update status since manual override is active
    if (gpsStatus !== 'disabled' && gpsStatus !== 'unsupported') {
      setGpsStatus('disabled');
    }
    
    updateUserLocation(latVal, lngVal);
    setMapCenter({ lat: latVal, lng: lngVal });
  };

  // Focus coordinates (default Mountain View, CA if user location is not available)
  const centerLat = currentUser?.latitude || 37.422;
  const centerLng = currentUser?.longitude || -122.084;

  const [hasCentered, setHasCentered] = useState(false);

  // Track map status info windows
  const [googleAnchorMarker, setGoogleAnchorMarker] = useState<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [activeInfoWindowUid, setActiveInfoWindowUid] = useState<string | null>(null);

  // Handles clicking the simulated canvas to move the user
  const handleSimulatedCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Map canvas coordinates (0-500) to lat/lng limits around center
    // Scale: x=250 is centerLng, y=250 is centerLat
    // Lat range: 37.418 to 37.426 (0.008 range)
    // Lng range: -122.092 to -122.076 (0.016 range)
    const clickedLng = centerLng + ((x - 250) / 250) * 0.008;
    const clickedLat = centerLat - ((y - 250) / 250) * 0.004;

    updateUserLocation(clickedLat, clickedLng);
  };

  const getCanvasCoords = (lat: number, lng: number) => {
    const x = 250 + ((lng - centerLng) / 0.008) * 250;
    const y = 250 - ((lat - centerLat) / 0.004) * 250;
    return { x, y };
  };

  return (
    <div id="map-section-wrapper" className="relative w-full h-full bg-[#0B0F19] overflow-hidden flex flex-col">
      {/* RENDER MODE A: LOCAL HIGH-FIDELITY VECTOR MAP GRAPHIC */}
      {mapMode === 'simulated' && (
        <div className="relative flex-1 w-full h-full flex flex-col justify-between">
          {/* Main SVG Vector Canvas */}
          <div className="relative flex-1 w-full h-full cursor-crosshair">
            <svg
              id="vector-map-canvas"
              viewBox="0 0 500 500"
              className="w-full h-full bg-[#0F172A]/30 backdrop-blur-sm select-none"
              onClick={handleSimulatedCanvasClick}
            >
              {/* Grid Background Lines representing coordinates */}
              <defs>
                <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
                  <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="0.5" />
                </pattern>
                <radialGradient id="map-glow" cx="50%" cy="50%" r="55%">
                  <stop offset="0%" stopColor="rgba(59, 130, 246, 0.15)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="rgba(15, 23, 42, 0.7)" stopOpacity="1" />
                </radialGradient>
              </defs>
              <rect width="100%" height="100%" fill="url(#map-glow)" />
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Draw Roads / Coordinate references */}
              <line x1="50" y1="0" x2="50" y2="500" stroke="#334155" strokeWidth="1" strokeDasharray="3,3" />
              <line x1="250" y1="0" x2="250" y2="500" stroke="#334155" strokeWidth="1.5" strokeDasharray="4,4" />
              <line x1="450" y1="0" x2="450" y2="500" stroke="#334155" strokeWidth="1" strokeDasharray="3,3" />
              <line x1="0" y1="125" x2="500" y2="125" stroke="#334155" strokeWidth="1" />
              <line x1="0" y1="250" x2="500" y2="250" stroke="#334155" strokeWidth="1.5" />
              <line x1="0" y1="375" x2="500" y2="375" stroke="#334155" strokeWidth="1" />

              {/* Render Safe Zones (Geofences) on Simulator */}
              {safeZones.map((zone) => {
                const coords = getCanvasCoords(zone.latitude, zone.longitude);
                // Convert radius in meters to canvas px.
                // Scaler calculation: 0.008 lng is approx 700 meters across 500px canvas length.
                // 1 px ~= 1.4 meters.
                const rPx = Math.max(25, zone.radius / 1.4);
                const isSelected = selectedZoneId === zone.id;

                return (
                  <g key={zone.id}>
                    <circle
                      cx={coords.x}
                      cy={coords.y}
                      r={rPx}
                      fill="rgba(16, 185, 129, 0.08)"
                      stroke={isSelected ? '#34d399' : '#10b981'}
                      strokeWidth={isSelected ? '2' : '1.5'}
                      strokeDasharray="4,2"
                      className="transition-all duration-300 pointer-events-auto cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedZoneId(isSelected ? null : zone.id);
                        setSelectedMemberId(null);
                      }}
                    />
                    <text
                      x={coords.x}
                      y={coords.y - rPx - 6}
                      fill="#10b981"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="font-mono bg-slate-950 px-1"
                    >
                      🛡️ {zone.name}
                    </text>
                  </g>
                );
              })}

              {/* Render Family Member Locations */}
              {members.map((member) => {
                const activeLat = member.latitude ?? centerLat;
                const activeLng = member.longitude ?? centerLng;
                const coords = getCanvasCoords(activeLat, activeLng);
                const isSelected = selectedMemberId === member.userId;
                const hasSOS = member.activeSOS;

                return (
                  <g key={member.userId}>
                    {/* SOS Pulse Indicators */}
                    {hasSOS && (
                      <>
                        <circle
                          cx={coords.x}
                          cy={coords.y}
                          r="32"
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="2"
                          className="animate-ping"
                          style={{ transformOrigin: `${coords.x}px ${coords.y}px`, animationDuration: '2s' }}
                        />
                        <circle
                          cx={coords.x}
                          cy={coords.y}
                          r="18"
                          fill="rgba(239, 68, 68, 0.2)"
                          stroke="#ef4444"
                          strokeWidth="1.5"
                        />
                      </>
                    )}

                    {/* Member Pin Anchor */}
                    <circle
                      cx={coords.x}
                      cy={coords.y}
                      r={hasSOS ? '12' : '10'}
                      fill={hasSOS ? '#ef4444' : isSelected ? '#6366f1' : '#475569'}
                      stroke="#fff"
                      strokeWidth="2"
                      className="cursor-pointer pointer-events-auto transition-all duration-300 hover:scale-125"
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextSelect = isSelected ? null : member.userId;
                        setSelectedMemberId(nextSelect);
                        setSelectedZoneId(null);
                        if (nextSelect) {
                          setMapCenter({ lat: activeLat, lng: activeLng });
                        }
                      }}
                    />

                    {/* Simple Initial Overlay */}
                    <text
                      x={coords.x}
                      y={coords.y + 3}
                      fill="#fff"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="pointer-events-none"
                    >
                      {member.displayName.substring(0, 1)}
                    </text>

                    {/* Live labels */}
                    <text
                      x={coords.x}
                      y={coords.y + (hasSOS ? 22 : 18)}
                      fill={hasSOS ? '#f87171' : '#f8fafc'}
                      fontSize="9"
                      fontWeight="semibold"
                      textAnchor="middle"
                      className="drop-shadow-lg"
                    >
                      {member.userId === currentUser?.id ? 'You' : member.displayName.split(' ')[0]}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Simulated Map Guideline Info Banner */}
            <div className="absolute bottom-4 left-4 right-4 bg-[#0F172A]/70 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-md flex items-start gap-2 text-xs">
              <Info className="text-sky-300 w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium">✨ Interactive Vector Simulator Mode</p>
                <p className="text-white/60 mt-0.5 leading-relaxed">
                  Click anywhere inside the dark canvas grid to <strong>move your cursor (Your Live Location)</strong>. Use movement tools on the members tab to drag Dad and Emily around to watch SafeZone triggers!
                </p>
              </div>
            </div>
          </div>

          {/* Expanded Simulation Info Panel (Shown when element selected) */}
          {selectedMemberId && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white/5 backdrop-blur-xl border-t border-white/10 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 z-10"
            >
              {(() => {
                const target = members.find((m) => m.userId === selectedMemberId);
                if (!target) return null;
                const isMe = target.userId === currentUser?.id;
                return (
                  <>
                    <div className="flex items-center gap-3">
                      {target.photoURL ? (
                        <img
                          src={target.photoURL}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-full border-2 border-indigo-400 object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-white/10 text-slate-300 font-bold flex items-center justify-center uppercase border border-white/10">
                          {target.displayName.substring(0, 2)}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white">{target.displayName}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            target.role === 'admin' ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30' : 'bg-white/5 text-white/50 border border-white/10'
                          }`}>
                            {target.role}
                          </span>
                        </div>
                        <p className="text-xs text-white/50 font-mono">
                          Lat: {target.latitude?.toFixed(5) || 'No core'}, Lng: {target.longitude?.toFixed(5) || 'No core'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-white/40 text-xs text-right mr-2 hidden md:inline">
                        Simulate Actions:
                      </span>
                      {/* Control buttons to nudge locations in sandbox */}
                      <button
                        onClick={() => {
                          const currentLat = target.latitude ?? centerLat;
                          const currentLng = target.longitude ?? centerLng;
                          simulateMemberMovement(target.userId, currentLat + 0.0006, currentLng - 0.0004);
                        }}
                        className="px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs hover:bg-white/10 transition-colors"
                      >
                        Nudge North-West ↖️
                      </button>
                      <button
                        onClick={() => {
                          const currentLat = target.latitude ?? centerLat;
                          const currentLng = target.longitude ?? centerLng;
                          simulateMemberMovement(target.userId, currentLat - 0.0006, currentLng + 0.0004);
                        }}
                        className="px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs hover:bg-white/10 transition-colors"
                      >
                        Nudge South-East ↘️
                      </button>
                      <button
                        onClick={() => {
                          // Standard teleport to school
                          simulateMemberMovement(target.userId, 37.4249, -122.091);
                        }}
                        className="px-2.5 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-500/40 text-indigo-200 rounded-xl text-xs transition-colors"
                      >
                        Teleport: School 🏫
                      </button>
                      <button
                        onClick={() => setSelectedMemberId(null)}
                        className="px-2.5 py-1.5 bg-white/10 text-white/70 rounded-xl text-xs hover:text-white border border-white/10"
                      >
                        Close
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          )}

          {selectedZoneId && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white/5 backdrop-blur-xl border-t border-white/10 p-4 flex items-center justify-between z-10"
            >
              {(() => {
                const zone = safeZones.find((z) => z.id === selectedZoneId);
                if (!zone) return null;
                return (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                        🏠
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{zone.name}</p>
                        <p className="text-xs text-white/50">
                          Security boundary radius size: <strong>{zone.radius}m</strong>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedZoneId(null)}
                      className="px-3 py-1.5 bg-white/10 text-white/70 rounded-xl text-xs hover:bg-white/15 hover:text-white border border-white/10"
                    >
                      Deselect
                    </button>
                  </>
                );
              })()}
            </motion.div>
          )}
        </div>
      )}

      {/* RENDER MODE B: OFFICIAL GOOGLE MAPS + OPTIONAL SPLASH SCREEN */}
      {mapMode === 'google' && (
        <div className="w-full h-full flex flex-col justify-center items-center relative">
          {/* Conditional Splash Overlay Render when Key is Absent */}
          {!hasValidKey ? (
            <div className="p-6 md:p-8 max-w-lg text-center font-sans h-full bg-[#0F172A]/40 backdrop-blur-md flex flex-col justify-center items-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center mb-4 text-indigo-400">
                <Shield className="w-6 h-6 animate-pulse" />
              </div>

              <h3 className="text-lg font-bold text-white">Google Maps Integration Required</h3>
              <p className="text-white/60 text-xs mt-2 leading-relaxed">
                To experience live satellite imagery overlays and standard geo-location queries, link your active API Key credentials safely following the official guidelines.
              </p>

              <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 my-5 text-left text-xs text-white/80 font-mono space-y-3 shadow-inner backdrop-blur-md">
                <p className="font-semibold text-white border-b border-white/10 pb-1.5 flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-indigo-300" />
                  API KEY INSTRUCTIONS
                </p>
                <div className="space-y-2 text-white/60">
                  <p><strong>1. Get a Cloud Key:</strong> <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:underline">Click to request key from Google Cloud Console</a></p>
                  <p><strong>2. Configure in AI Studio:</strong> Open the <strong>Settings</strong> button (⚙️ gear icon, top-right panel in screen) → Click <strong>Secrets</strong> → Type name: <code>GOOGLE_MAPS_PLATFORM_KEY</code> → Paste key into value. Press Enter.</p>
                  <p><strong>3. Auto Reload:</strong> The application automatically rebuilds itself upon key insertion - no browser page reload is necessary.</p>
                </div>
              </div>

              <button
                onClick={() => setMapMode('simulated')}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 font-semibold text-white rounded-xl text-xs transition-colors flex items-center gap-1.5 border border-white/10"
              >
                <Compass className="w-4 h-4" />
                Return to Sandbox Simulator Map
              </button>
            </div>
          ) : (
            // Render Live Maps when API Key exists
            <APIProvider apiKey={API_KEY} version="weekly">
              <div className="relative w-full h-full">
                <Map
                  key="gmap-active"
                  defaultCenter={mapCenter}
                  defaultZoom={14}
                  mapId="DEMO_MAP_ID"
                  style={{ width: '100%', height: '100%' }}
                  onClick={(e) => {
                    if (e.detail?.latLng) {
                      const { lat, lng } = e.detail.latLng;
                      updateUserLocation(lat, lng);
                    }
                  }}
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                >
                  <MapCenterHandler center={mapCenter} />
                  {/* Advanced Markers for family members */}
                  {members.map((member) => {
                    const mLat = member.latitude ?? centerLat;
                    const mLng = member.longitude ?? centerLng;
                    
                    return (
                      <AdvancedMarker
                        key={member.userId}
                        position={{ lat: mLat, lng: mLng }}
                        title={member.displayName}
                        onClick={() => {
                          const isSelected = selectedMemberId === member.userId;
                          setSelectedMemberId(isSelected ? null : member.userId);
                          if (!isSelected) {
                            setMapCenter({ lat: mLat, lng: mLng });
                          }
                        }}
                      >
                        <Pin
                          background={member.activeSOS ? '#ef4444' : '#6366f1'}
                          glyphColor="#fff"
                          glyph={member.displayName.substring(0, 1)}
                        />
                      </AdvancedMarker>
                    );
                  })}
                </Map>

                {/* Floating Recenter Button */}
                <button
                  id="recenter-map-btn"
                  onClick={() => {
                    if (currentUser?.latitude && currentUser?.longitude) {
                      setMapCenter({ lat: currentUser.latitude, lng: currentUser.longitude });
                    }
                  }}
                  className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-md hover:bg-slate-900 border border-white/10 px-4 py-2.5 rounded-2xl text-white hover:text-white transition-all shadow-lg flex items-center justify-center gap-2 text-xs font-bold"
                >
                  <Compass className="w-4 h-4 text-sky-400" />
                  Center on Me
                </button>
              </div>
            </APIProvider>
          )}
        </div>
      )}

      {/* Absolute Slide-Over for Manual Location Override */}
      {isManualSelectorOpen && (
        <motion.div
          id="manual-location-panel"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          className="absolute right-4 top-16 bottom-4 w-80 max-w-full bg-[#1e293b]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 flex flex-col z-20 text-white overflow-hidden"
        >
          <div className="flex justify-between items-center pb-2 border-b border-white/10 mb-3 font-sans">
            <h4 className="font-bold text-xs tracking-wider uppercase text-sky-400 flex items-center gap-1.5 font-sans">
              <MapPin className="w-4 h-4" />
              Location Override
            </h4>
            <button
              onClick={() => setIsManualSelectorOpen(false)}
              className="text-white/45 hover:text-white text-[10px] uppercase font-bold bg-white/5 px-2 py-1 rounded-lg border border-white/10 hover:bg-white/15 transition-all font-sans"
            >
              Close
            </button>
          </div>

          <p className="text-[10px] text-white/60 leading-normal mb-1 font-sans">
            {gpsStatus === 'denied' || gpsStatus === 'unsupported'
              ? '⚠️ Browser Geolocation is blocked. Type custom coordinates or select from presets below.'
              : 'Directly modify Your Position coordinates below to override device sensors and test geofences.'}
          </p>

          <div id="sf-warning-text" className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 md:p-2.5 leading-normal mb-3 font-sans">
            💡 <strong>Sandbox Note:</strong> If your map centered on San Francisco, it is because browser GPS resolving via your ISP, VPN, or cloud workspace often defaults to SF. Use a preset below or type coordinates to pin your exact location!
          </div>

          {/* Quick toggle to re-enable device GPS */}
          <div className="bg-white/5 border border-white/5 p-2 rounded-xl text-[10px] mb-3 flex items-center justify-between font-sans">
            <div>
              <p className="font-bold">Device GPS Syncing</p>
              <p className="text-white/50">Sensor: <span className="font-mono text-xs font-sans">{gpsStatus.toUpperCase()}</span></p>
            </div>
            {gpsStatus === 'disabled' ? (
              <button
                onClick={() => setGpsStatus('fetching')}
                className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded-lg font-bold transition-all font-sans"
              >
                Re-Enable
              </button>
            ) : (
              <span className="text-emerald-400 font-bold px-2 py-1 bg-emerald-400/10 rounded-lg font-sans">Syncing</span>
            )}
          </div>

          {/* Custom coordinate form inputs */}
          <div className="space-y-2 mb-3 font-sans">
            <div>
              <label className="block text-[10px] font-bold text-white/50 uppercase font-mono mb-1 font-sans">Latitude</label>
              <input
                type="number"
                step="any"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-sky-500/50 font-sans"
                placeholder="e.g. 37.422"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-white/50 uppercase font-mono mb-1 font-sans">Longitude</label>
              <input
                type="number"
                step="any"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-sky-500/50 font-sans"
                placeholder="e.g. -122.084"
              />
            </div>

            <button
              onClick={() => {
                const parsedLat = parseFloat(manualLat);
                const parsedLng = parseFloat(manualLng);
                if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
                  handleApplyManualLocation(parsedLat, parsedLng);
                }
              }}
              className="w-full bg-sky-500 hover:bg-sky-600 border border-sky-400 text-white font-bold py-2 rounded-xl text-xs transition-colors mt-2 font-sans"
            >
              Set Live Coordinates Pin
            </button>
          </div>

          {/* Searchable Preset Locations Section */}
          <div className="flex-1 flex flex-col min-h-0 border-t border-white/10 pt-3 font-sans">
            <p className="text-[10px] font-bold text-white/50 uppercase font-mono mb-2 font-sans">Location Presets</p>
            <div className="relative mb-2 shrink-0 font-sans">
              <Search className="w-3.5 h-3.5 text-white/30 absolute left-2.5 top-2" />
              <input
                type="text"
                value={presetSearch}
                onChange={(e) => setPresetSearch(e.target.value)}
                placeholder="Filter preset destinations..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-sky-500/50 font-sans"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0 font-sans">
              {LOCATION_PRESETS.filter(p => p.name.toLowerCase().includes(presetSearch.toLowerCase()) || p.description.toLowerCase().includes(presetSearch.toLowerCase())).map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setManualLat(preset.lat.toFixed(6));
                    setManualLng(preset.lng.toFixed(6));
                    handleApplyManualLocation(preset.lat, preset.lng);
                  }}
                  className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl p-2 transition-all flex items-start gap-2 font-sans"
                >
                  <Navigation className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5 rotate-45" />
                  <div>
                    <p className="text-[11px] font-semibold text-sky-100 font-sans">{preset.name}</p>
                    <p className="text-[9px] text-white/40 leading-normal font-sans">{preset.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Helper to pan map when mapCenter state changes smoothly without component remounting
function MapCenterHandler({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    if (map && center) {
      map.panTo(center);
    }
  }, [map, center.lat, center.lng]);
  return null;
}

