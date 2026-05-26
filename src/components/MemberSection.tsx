/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useFamily, getDistanceMeters } from './FamilyStateContext';
import { 
  ShieldAlert, ShieldCheck, MapPin, Compass, Phone, Loader2, Signal, AlertOctagon, HelpCircle, RefreshCw,
  Navigation, Copy
} from 'lucide-react';
import { motion } from 'motion/react';

export default function MemberSection() {
  const { 
    members, 
    currentUser, 
    activeCircle,
    isBackendConnected, 
    simulateToggleSos, 
    simulateMemberMovement,
    selectedMemberId,
    setSelectedMemberId,
    mapCenter,
    setMapCenter,
    safeZones,
    removeMember
  } = useFamily();

  const [sosMsgInput, setSosMsgInput] = useState('Medical assistance required.');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmKickId, setConfirmKickId] = useState<string | null>(null);

  const isMeAdmin = members.find(m => m.userId === currentUser?.id)?.role === 'admin' || activeCircle?.createdById === currentUser?.id;

  // Quick preset locations to teleport simulated members to play
  const teleportPresets = [
    { label: '🏡 Home Sanctuary', lat: 37.42199, lng: -122.0840 },
    { label: '🏫 Greenwood High', lat: 37.4249, lng: -122.0910 },
    { label: '🛒 Mall / Gym', lat: 37.4230, lng: -122.0790 },
    { label: '⛰️ Hiking Trail', lat: 37.4190, lng: -122.0890 },
  ];

  const handleCopyCoords = (lat: number, lng: number) => {
    const coordsStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    navigator.clipboard.writeText(coordsStr).then(() => {
      setCopiedId(coordsStr);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div id="members-list-wrapper" className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-4 shadow-lg flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Signal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">
              {activeCircle ? activeCircle.name : 'Family Coordination'}
            </h3>
            <p className="text-[10px] text-white/50">Live locations and geofence diagnostic</p>
          </div>
        </div>
        <span className="text-[10px] bg-white/5 border border-white/10 text-white px-2.5 py-0.5 rounded-full font-mono font-bold">
          {members.length} Active
        </span>
      </div>

      {members.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-dashed border-white/10">
          <MapPin className="w-8 h-8 text-white/40 mb-2" />
          <p className="text-sm font-semibold text-white">No active members found</p>
          <p className="text-xs text-white/40 mt-1">Join or generate a circle to synchronize real-time updates.</p>
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          {members.map((member) => {
            const isMe = member.userId === currentUser?.id;
            const hasSOS = member.activeSOS;
            const isSelected = selectedMemberId === member.userId;

            // Calculate distance in KM
            let distanceKm: string | null = null;
            if (!isMe && currentUser?.latitude && currentUser?.longitude && member.latitude && member.longitude) {
              const meters = getDistanceMeters(
                currentUser.latitude,
                currentUser.longitude,
                member.latitude,
                member.longitude
              );
              distanceKm = (meters / 1000).toFixed(2);
            }

            return (
              <div
                key={member.userId}
                id={`member-row-${member.userId}`}
                onClick={() => {
                  setSelectedMemberId(isSelected ? null : member.userId);
                  if (!isSelected && member.latitude && member.longitude) {
                    setMapCenter({ lat: member.latitude, lng: member.longitude });
                  }
                }}
                className={`p-3.5 rounded-2xl border transition-all relative overflow-hidden cursor-pointer ${
                  isSelected
                    ? 'bg-slate-950/80 border-blue-500/80 shadow-md shadow-blue-950/10'
                    : hasSOS
                    ? 'bg-rose-500/10 border-rose-500/40 shadow-lg shadow-rose-950/20'
                    : isMe
                    ? 'bg-white/10 border-white/10 hover:bg-white/15'
                    : 'bg-white/5 border-white/5 hover:border-white/10'
                }`}
              >
                {/* Indicator Strip */}
                <div className={`absolute top-0 left-0 bottom-0 w-1 ${
                  hasSOS ? 'bg-rose-500' : isSelected ? 'bg-blue-400' : isMe ? 'bg-indigo-500/50' : 'bg-white/10'
                }`}></div>

                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {/* User profile avatar with indicator */}
                    <div className="relative">
                      {member.photoURL ? (
                        <img
                          src={member.photoURL}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-full border border-white/10 object-cover"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-white/10 border border-white/10 text-slate-300 font-bold flex items-center justify-center text-xs uppercase">
                          {member.displayName.substring(0, 2)}
                        </div>
                      )}
                      
                      {/* Safety badge icon */}
                      <span className="absolute -bottom-1 -right-1">
                        {hasSOS ? (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 ring-2 ring-[#0F172A] text-[9px]" title="SOS Active">
                            🚨
                          </span>
                        ) : (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-[#0F172A] text-[9px]" title="Safe Status">
                            🛡️
                          </span>
                        )}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-white">
                          {member.displayName}
                        </span>
                        {isMe && (
                          <span className="text-[8px] bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 px-1.5 py-0.2 rounded-full font-bold">
                            You
                          </span>
                        )}
                        <span className="text-[9px] text-white/40 capitalize">
                          {member.role}
                        </span>
                      </div>

                      {hasSOS ? (
                        <div className="space-y-1 mt-1">
                          <p className="text-[11px] text-rose-400 font-medium leading-tight animate-pulse flex items-center gap-1">
                            <AlertOctagon className="w-3 h-3 shrink-0 animate-bounce" />
                            SOS: "{member.sosMessage || 'Needs assistance!'}"
                          </p>
                          {distanceKm !== null && (
                            <p className="text-[10px] text-white/60 font-medium flex items-center gap-1">
                              <Compass className="w-3 h-3 text-rose-400 shrink-0" />
                              <span>{distanceKm} km away</span>
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-white/40 text-[10px] mt-0.5 flex-wrap">
                          <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span className="font-mono">
                            {member.latitude ? `${member.latitude.toFixed(4)}, ${member.longitude?.toFixed(4)}` : 'Scanning GP...'}
                          </span>
                          {distanceKm !== null && (
                            <span className="text-indigo-300 font-semibold">
                              ({distanceKm} km)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expand / Setup indicator badge */}
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md self-center transition-all ${
                    isSelected 
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' 
                      : 'bg-white/5 text-white/40 border border-white/5 hover:text-white/70'
                  }`}>
                    {isSelected ? 'OPEN' : 'INFO'}
                  </span>
                </div>

                {/* Highly-styled Expanded Details Panel */}
                {isSelected && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-3 pt-3 border-t border-white/5 space-y-3 cursor-default"
                    onClick={(e) => e.stopPropagation()} // Stop selection toggle when clicking dropdown details
                  >
                    {/* Geofence Guard Report */}
                    <div className="space-y-2 bg-slate-950/40 p-3 rounded-xl border border-white/5">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                        <span className="text-emerald-400">🛡️</span> Live Geofence Diagnostics
                      </p>
                      {safeZones.length === 0 ? (
                        <p className="text-[10px] text-white/30 italic">No safe zones configured for this circle.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {safeZones.map((zone) => {
                            let zoneDistanceM: number | null = null;
                            if (member.latitude && member.longitude && zone.latitude && zone.longitude) {
                              zoneDistanceM = getDistanceMeters(member.latitude, member.longitude, zone.latitude, zone.longitude);
                            }
                            const isInsideZone = zoneDistanceM !== null && zoneDistanceM <= zone.radius;
                            return (
                              <div key={zone.id} className="flex items-center justify-between text-[11px] py-1 border-b border-white/[0.03] last:border-0">
                                <span className="text-white/70">{zone.name}</span>
                                {zoneDistanceM !== null ? (
                                  <div className="flex items-center gap-1.5 font-mono">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                      isInsideZone 
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                        : 'bg-white/5 text-white/40 border border-white/5'
                                    }`}>
                                      {isInsideZone ? '● INSIDE' : '○ OUTSIDE'}
                                    </span>
                                    <span className="text-[10px] text-white/50">({Math.round(zoneDistanceM)}m)</span>
                                  </div>
                                ) : (
                                  <span className="text-white/30 text-[9px]">No GPS Coordinates</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Sensor Data Matrix */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-950/20 p-2.5 rounded-xl border border-white/5">
                      <div>
                        <span className="text-white/40 block">Live Tracker GPS</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="font-mono text-white/80 select-all block truncate">
                            {member.latitude?.toFixed(5) || '0.00'}, {member.longitude?.toFixed(5) || '0.00'}
                          </span>
                          <button
                            onClick={() => member.latitude && member.longitude && handleCopyCoords(member.latitude, member.longitude)}
                            className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white transition-all"
                            title="Copy coordinates"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        {copiedId && <span className="text-[8px] text-emerald-400 font-bold block">Coords Copied!</span>}
                      </div>
                      <div>
                        <span className="text-white/40 block">Diagnostic Refresh</span>
                        <span className="text-[#38BDF8] font-semibold block mt-0.5">
                          ● Ready (Real-time)
                        </span>
                      </div>
                    </div>

                    {/* Admin Actions Panel */}
                    {isMeAdmin && !isMe && (
                      <div className="bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl space-y-2 relative z-10" onClick={(e) => e.stopPropagation()}>
                        <p className="text-[9px] uppercase font-bold text-rose-450 tracking-wider flex items-center gap-1 text-rose-400">
                          ⚙️ Circle Administrator Panel
                        </p>
                        
                        {confirmKickId === member.userId ? (
                          <div className="space-y-1.5 bg-slate-950/40 p-2.5 rounded-lg border border-rose-500/20">
                            <p className="text-[10px] text-rose-200 font-medium">Are you sure? This action cannot be undone.</p>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmKickId(null);
                                }}
                                className="px-3 py-1 rounded bg-slate-800 text-white font-medium text-xs border border-white/10"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await removeMember(member.userId);
                                  setConfirmKickId(null);
                                }}
                                className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs border border-rose-500/30"
                              >
                                Yes, Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            id={`kick-member-btn-${member.userId}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmKickId(member.userId);
                            }}
                            className="w-full bg-rose-600/25 hover:bg-rose-600 text-rose-200 hover:text-white font-semibold py-1.5 px-3 rounded-lg text-xs transition-all border border-rose-500/25 flex items-center justify-center gap-1"
                          >
                            ❌ Remove Member From Circle
                          </button>
                        )}
                      </div>
                    )}

                    {/* Simulation Tools Panel (Only shown in simulator / sandboxed context) */}
                    <div className="bg-slate-950/35 border border-white/[0.03] p-3 rounded-xl space-y-2.5">
                      <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                        🛠️ Sandbox Simulator Controller
                      </p>

                      {/* SOS Panic Controls */}
                      {!hasSOS ? (
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-semibold text-white/50">
                            Simulate Emergency Message
                          </label>
                          <div className="flex gap-1">
                            <input
                              type="text"
                              placeholder="Simulate reason..."
                              value={sosMsgInput}
                              onChange={(e) => setSosMsgInput(e.target.value)}
                              className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white placeholder-white/20 focus:outline-none flex-1 font-sans"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                simulateToggleSos(member.userId, sosMsgInput);
                              }}
                              className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-2.5 py-1 rounded-xl text-xs transition-colors border border-white/10"
                            >
                              Panic
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
                          <span className="text-[10px] text-rose-300">SOS Active</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              simulateToggleSos(member.userId, '');
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1 rounded-xl text-xs border border-white/15 cursor-pointer"
                          >
                            Resolve SOS
                          </button>
                        </div>
                      )}

                      {/* Preset Teleporter Controls */}
                      <div className="space-y-1.5 pt-1">
                        <label className="text-[9px] font-semibold text-white/50">
                          Instant GPS Teleport presets
                        </label>
                        <div className="grid grid-cols-2 gap-1">
                          {teleportPresets.map((p, idx) => (
                            <button
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                simulateMemberMovement(member.userId, p.lat, p.lng);
                                setMapCenter({ lat: p.lat, lng: p.lng });
                              }}
                              className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-[9px] text-slate-300 text-left transition-colors font-sans truncate"
                              title={`Teleport to ${p.label}`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Nudge movement controls */}
                      <div className="grid grid-cols-2 gap-1 pt-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const curLat = member.latitude || 37.422;
                            const curLng = member.longitude || -122.084;
                            const nextLat = curLat + 0.0006;
                            const nextLng = curLng - 0.0004;
                            simulateMemberMovement(member.userId, nextLat, nextLng);
                            setMapCenter({ lat: nextLat, lng: nextLng });
                          }}
                          className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold rounded-lg text-[9px] border border-emerald-500/10 transition-colors"
                        >
                          Nudge North-West ↖️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const curLat = member.latitude || 37.422;
                            const curLng = member.longitude || -122.084;
                            const nextLat = curLat - 0.0006;
                            const nextLng = curLng + 0.0004;
                            simulateMemberMovement(member.userId, nextLat, nextLng);
                            setMapCenter({ lat: nextLat, lng: nextLng });
                          }}
                          className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold rounded-lg text-[9px] border border-emerald-500/10 transition-colors"
                        >
                          Nudge South-East ↘️
                        </button>
                      </div>

                      {/* Recenter Map trigger */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (member.latitude && member.longitude) {
                            setMapCenter({ lat: member.latitude, lng: member.longitude });
                          }
                        }}
                        className="w-full mt-1 bg-slate-950/60 hover:bg-slate-900 border border-white/5 text-xs text-white p-1 rounded-xl flex items-center justify-center gap-1 transition-all"
                      >
                        <Navigation className="w-3 h-3 text-sky-400 rotate-45" />
                        Focus Map on {member.displayName.split(' ')[0]}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
