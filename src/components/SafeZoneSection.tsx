/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useFamily } from './FamilyStateContext';
import { 
  Home, Map, Compass, Trash2, ShieldAlert, Plus, Check, Loader2, Sparkles, Orbit 
} from 'lucide-react';

export default function SafeZoneSection() {
  const { 
    safeZones, 
    addSafeZone, 
    deleteSafeZone, 
    currentUser, 
    isBackendConnected 
  } = useFamily();

  const [zoneName, setZoneName] = useState('');
  const [zoneRadius, setZoneRadius] = useState(150); // in meters
  const [submitting, setSubmitting] = useState(false);

  // Position source selector
  const [locationSource, setLocationSource] = useState<'current' | 'preset'>('current');
  const [presetIndex, setPresetIndex] = useState(0);

  const presets = [
    { name: 'Home Base', lat: 37.4220, lng: -122.0841 },
    { name: 'Public School', lat: 37.4249, lng: -122.0910 },
    { name: 'Sports Academy', lat: 37.4231, lng: -122.0792 },
    { name: 'Safe Office', lat: 37.4190, lng: -122.0890 }
  ];

  const handleAddZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneName.trim() || !currentUser) return;
    setSubmitting(true);
    
    // Choose coordinates
    let targetLat = currentUser.latitude || 37.422;
    let targetLng = currentUser.longitude || -122.084;

    if (locationSource === 'preset') {
      const p = presets[presetIndex];
      targetLat = p.lat;
      targetLng = p.lng;
    }

    try {
      await addSafeZone(zoneName, targetLat, targetLng, Number(zoneRadius));
      setZoneName('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="safe-zones-section-wrapper" className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-lg flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Orbit className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Safe Zones Configuration</h3>
            <p className="text-[10px] text-white/50">Geofence guard boundaries and monitors</p>
          </div>
        </div>
      </div>

      {/* Add Safe Zone Trigger Form */}
      <form onSubmit={handleAddZone} className="space-y-3 bg-white/5 border border-white/10 p-4 rounded-2xl mb-4">
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-white/50 tracking-wider">
            Safe Boundary Title
          </label>
          <input
            id="zone-name-input"
            type="text"
            required
            placeholder="E.g., Home, Greenwood High..."
            value={zoneName}
            onChange={(e) => setZoneName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/30"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-white/50 tracking-wider">
              Security Radius Size
            </label>
            <select
              id="zone-radius-select"
              value={zoneRadius}
              onChange={(e) => setZoneRadius(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-white/30"
            >
              <option value={80} className="bg-[#1e1e38] text-white">Narrow (80 meters)</option>
              <option value={150} className="bg-[#1e1e38] text-white">Standard (150 meters)</option>
              <option value={300} className="bg-[#1e1e38] text-white">Broad (300 meters)</option>
              <option value={500} className="bg-[#1e1e38] text-white">Atmosphere (500 meters)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-white/50 tracking-wider">
              Pin Location At
            </label>
            <select
              id="zone-location-source"
              value={locationSource}
              onChange={(e) => setLocationSource(e.target.value as any)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-white/30"
            >
              <option value="current" className="bg-[#1e1e38] text-white">Your GPS Coords</option>
              <option value="preset" className="bg-[#1e1e38] text-white">Coordinate Preset</option>
            </select>
          </div>
        </div>

        {locationSource === 'preset' && (
          <div className="space-y-1 py-1">
            <label className="text-[9px] uppercase font-bold text-white/40 tracking-wider">
              Select Preset Target Area
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPresetIndex(idx)}
                  className={`px-2 py-1.5 rounded-xl text-[10px] font-medium border text-left transition-all ${
                    presetIndex === idx
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/20'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          id="add-safe-zone-btn"
          type="submit"
          disabled={submitting || !currentUser}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-850/30 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 border border-white/10 shadow-lg"
        >
          {submitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          Insert Safe Perimeter
        </button>
      </form>

      {/* Safe Zones List */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
        {safeZones.length === 0 ? (
          <div className="text-center p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-dashed border-white/10 text-white/50 flex flex-col items-center justify-center">
            <Home className="w-8 h-8 text-white/30 mb-1.5" />
            <p className="text-xs font-semibold text-white">No Safe Zones Defined</p>
            <p className="text-[10px] text-white/40 mt-0.5">Use the coordinates selector to flag your Home, Work, or School boundaries.</p>
          </div>
        ) : (
          safeZones.map((zone) => (
            <div
              key={zone.id}
              className="p-3 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between gap-3 group hover:border-white/15 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  🏠
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{zone.name}</h4>
                  <p className="text-[10px] text-white/50 mt-0.5">
                    Radius: <strong className="text-emerald-300 font-mono">{zone.radius}m</strong> • Coords: <span className="font-mono">{zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)}</span>
                  </p>
                </div>
              </div>

              <button
                id={`delete-zone-btn-${zone.id}`}
                onClick={() => {
                  if (confirm(`Remove safe zone: "${zone.name}"?`)) {
                    deleteSafeZone(zone.id);
                  }
                }}
                className="p-1.5 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors border border-transparent hover:border-rose-500/20"
                title="Delete Geofence"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
