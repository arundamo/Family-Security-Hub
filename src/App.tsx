/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FamilyProvider, useFamily } from './components/FamilyStateContext';
import MapContainer from './components/MapContainer';
import CircleManager from './components/CircleManager';
import MemberSection from './components/MemberSection';
import ChatSection from './components/ChatSection';
import SafeZoneSection from './components/SafeZoneSection';
import { 
  ShieldAlert, ShieldCheck, ShieldX, LifeBuoy, HeartHandshake, LogOut, LogIn, AlertCircle, Sparkles, Orbit, Signal, Layers, MessageSquare, MapPin,
  ChevronLeft, ChevronRight, Menu, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function Dashboard() {
  const { 
    currentUser, 
    activeCircle, 
    googleLogin, 
    logout, 
    isBackendConnected, 
    triggerSOS, 
    resolveSOS, 
    sosAlerts,
    members
  } = useFamily();

  const [activeTab, setActiveTab] = useState<'members' | 'chat' | 'safezones'>('members');
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [panicOpen, setPanicOpen] = useState(false);
  const [panicMessage, setPanicMessage] = useState('Safety compromised! Need immediate assistance.');
  const [submittingPanic, setSubmittingPanic] = useState(false);

  // Check if there are active SOS alerts in our family circle
  const activeSOSSignals = sosAlerts.filter(s => s.active);
  const hasGlobalSOS = activeSOSSignals.length > 0;

  const meAsMember = members.find(m => m.userId === currentUser?.id);
  const isMeAdmin = meAsMember?.role === 'admin' || activeCircle?.createdById === currentUser?.id;
  const canResolveFirstSOS = activeSOSSignals[0] && (isMeAdmin || activeSOSSignals[0].userId === currentUser?.id);

  const handleTriggerPanic = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPanic(true);
    try {
      await triggerSOS(panicMessage);
      setPanicOpen(false);
    } catch {
      // handled
    } finally {
      setSubmittingPanic(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col font-sans transition-colors duration-300 relative overflow-x-hidden">
      
      {/* Background Mesh Gradient Layer */}
      <div className="absolute inset-0 opacity-30 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_30%,#3B82F6_0%,transparent_50%),radial-gradient(circle_at_80%_70%,#8B5CF6_0%,transparent_50%)]"></div>
        <div className="absolute top-[10%] left-[15%] w-[600px] h-[400px] bg-blue-500 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] bg-purple-600 rounded-full blur-[100px]"></div>
      </div>

      {/* GLOBAL HIGH-ALERT EMERGENCY ALARM BANNER */}
      {hasGlobalSOS && (
        <div id="master-sos-alarm-banner" className="relative z-50 bg-rose-600/95 backdrop-blur-md text-white font-sans py-3.5 px-6 flex flex-wrap items-center justify-between gap-3 shadow-2xl border-b border-rose-500/40 animate-pulse">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white text-rose-600 flex items-center justify-center font-black text-sm shrink-0">
              🚨
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-wider">
                FAMILY ALERT: Active Emergency SOS
              </p>
              <p className="text-xs text-rose-100 leading-tight">
                {activeSOSSignals[0].userName}: "{activeSOSSignals[0].message}"
              </p>
            </div>
          </div>
          
          {canResolveFirstSOS ? (
            <button
              id="global-sos-resolve-btn"
              onClick={() => resolveSOS(activeSOSSignals[0].id)}
              className="bg-white hover:bg-slate-100 text-rose-700 font-bold px-4 py-1.5 rounded-lg text-xs transition-colors shadow-md border border-white/20"
            >
              Mark Safe & Resolve SOS
            </button>
          ) : (
            <div className="bg-slate-950/40 border border-white/10 px-3.5 py-1.5 rounded-lg text-[11px] font-bold text-rose-200 flex items-center gap-1.5 font-sans">
              🔒 Awaiting Admin or Sender Resolve
            </div>
          )}
        </div>
      )}

      {/* CORE FRAMEWORK TOP HEADER BAR */}
      <header className="relative z-40 border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center overflow-hidden shadow-lg border border-white/20 shrink-0">
              <img
                src="/src/assets/images/howl_simple_logo_1779830055097.png"
                alt="Howl Logo"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-md sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                Howl
              </h1>
              <p className="text-[10px] sm:text-xs text-blue-200/60 font-mono tracking-normal leading-none mt-0.5">
                Real-Time Pack Coordination & Alerts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Status Pill */}
            <div className="hidden md:flex items-center gap-1.5 bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[10px] font-mono font-medium text-white/70">
              <span className={`w-1.5 h-1.5 rounded-full ${isBackendConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span>
                {isBackendConnected ? 'Online' : 'Offline sandbox'}
              </span>
            </div>

            {/* Emergency Panic button on right */}
            {activeCircle && (
              <button
                id="header-panic-alert-trigger-btn"
                onClick={() => {
                  if (currentUser?.activeSOS) {
                    // Resolve mine instantly
                    const mine = sosAlerts.find(s => s.userId === currentUser.id && s.active);
                    if (mine) resolveSOS(mine.id);
                  } else {
                    setPanicOpen(true);
                  }
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide uppercase transition-transform duration-300 hover:scale-105 select-none border border-white/20 ${
                  currentUser?.activeSOS
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]'
                }`}
              >
                {currentUser?.activeSOS ? '🛡️ Clear SOS' : '🚨 Trigger SOS'}
              </button>
            )}

            {/* Google Authentication Section */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-1 border-l border-white/10">
                {currentUser.photoURL && (
                  <img
                    id="user-avatar-badge"
                    src={currentUser.photoURL}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full border border-white/20 hidden sm:block object-cover"
                  />
                )}
                <button
                  id="header-sign-out-btn"
                  onClick={logout}
                  className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/10"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="header-sign-in-btn"
                onClick={googleLogin}
                className="px-3.5 py-1.5 bg-white/5 hover:bg-white/15 border border-white/20 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 backdrop-blur-md"
              >
                <LogIn className="w-3.5 h-3.5" />
                Auth Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* CORE LAYOUT DASHBOARD */}
      <main className="relative z-10 flex-1 w-full flex overflow-hidden h-[calc(100vh-73px)]">
        {/* Full Viewport Map Background Canvas */}
        <div className="absolute inset-0 w-full h-full z-0">
          <MapContainer />
        </div>

        {/* LEFT COLLAPSIBLE FLOATING PANEL - SAFETY & ACTIONS DASHBOARD */}
        <AnimatePresence>
          {leftOpen && (
            <motion.div
              initial={{ y: 600, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 600, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              className="absolute left-4 top-4 bottom-4 w-96 max-w-[calc(100vw-32px)] bg-[#0F172A]/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl flex flex-col z-20 overflow-hidden"
            >
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Micro-stat Header */}
                <div className="px-4 pt-4 pb-2 border-b border-white/5 flex items-center justify-between bg-slate-950/20">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                    <span className="text-[10px] text-white/50 font-mono tracking-wider uppercase font-bold">
                      {activeCircle ? activeCircle.name : 'Security Terminal'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="text-[9px] text-blue-200 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full font-semibold">
                      {members.length} {members.length === 1 ? 'Member' : 'Members'} Active
                    </div>
                    {/* Native visual collapse button inside boundaries */}
                    <button
                      onClick={() => setLeftOpen(false)}
                      className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                      title="Collapse Safety Panel"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* tabbed actions dashboard */}
                {activeCircle ? (
                  <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/5">
                    
                    {/* Tab Selector Links */}
                    <div className="grid grid-cols-3 bg-[#0F172A]/80 rounded-2xl p-1 font-sans border border-white/5 mb-3 mx-3 mt-3 shrink-0 shadow-inner">
                      <button
                        onClick={() => setActiveTab('members')}
                        className={`py-2 px-1 rounded-xl text-xs font-black tracking-tight transition-all flex items-center justify-center gap-1.5 ${
                          activeTab === 'members'
                            ? 'bg-white/10 text-white shadow-md border border-white/10'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Signal className="w-3.5 h-3.5" />
                        Circles
                      </button>
                      <button
                        onClick={() => setActiveTab('chat')}
                        className={`py-2 px-1 rounded-xl text-xs font-black tracking-tight transition-all flex items-center justify-center gap-1.5 ${
                          activeTab === 'chat'
                            ? 'bg-white/10 text-white shadow-md border border-white/10'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Chat
                      </button>
                      <button
                        onClick={() => setActiveTab('safezones')}
                        className={`py-2 px-1 rounded-xl text-xs font-black tracking-tight transition-all flex items-center justify-center gap-1.5 ${
                          activeTab === 'safezones'
                            ? 'bg-white/10 text-white shadow-md border border-white/10'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Orbit className="w-3.5 h-3.5" />
                        Zones
                      </button>
                    </div>

                    {/* Active Tab Panel */}
                    <div className="flex-1 overflow-y-auto px-3 pb-3 min-h-0">
                      {activeTab === 'members' && <MemberSection />}
                      {activeTab === 'chat' && <ChatSection />}
                      {activeTab === 'safezones' && <SafeZoneSection />}
                    </div>

                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-5 bg-[#0F172A]/40 m-3 border border-white/5 rounded-2xl overflow-hidden relative shadow-2xl">
                    <img 
                      src="/src/assets/images/howl_pack_banner_1779829864851.png"
                      alt="Howl Vigilant Guard"
                      className="w-full h-32 object-cover rounded-xl mb-4 border border-white/10 shadow-lg"
                      referrerPolicy="no-referrer"
                    />
                    <h4 className="font-bold text-white text-sm">Assemble Your Guard Pack</h4>
                    <p className="text-xs text-white/50 mt-1.5 leading-relaxed max-w-xs">
                      Join an active security circle with a 6-digit code or deploy your own custom Pack to start tracking locations, monitoring safety zones, and safeguarding your family.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Restore safety dashboard FAB if closed */}
        {!leftOpen && (
          <button
            onClick={() => setLeftOpen(true)}
            className="absolute left-4 bottom-4 bg-[#0F172A]/90 hover:bg-slate-900 border border-white/15 text-white hover:border-white/30 z-30 px-3.5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-semibold backdrop-blur-md transition-all active:scale-95 duration-200"
            title="Show Safety Panel"
          >
            <Menu className="w-4 h-4 text-blue-400" />
            <span>Show Safety Dashboard</span>
          </button>
        )}

        {/* RIGHT COLLAPSIBLE FLOATING PANEL - CIRCLE SYNCHRONIZER & HUB */}
        <AnimatePresence>
          {rightOpen && (
            <motion.div
              initial={{ y: 600, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 600, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              className="absolute right-4 top-4 bottom-4 w-96 max-w-[calc(100vw-32px)] bg-[#0F172A]/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl flex flex-col z-20 overflow-hidden"
            >
              <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Orbit className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">Syncing &amp; Circles</h3>
                      <p className="text-[10px] text-white/50">Manage dynamic invite links &amp; circles</p>
                    </div>
                  </div>
                  {/* Native visual collapse button inside boundaries */}
                  <button
                    onClick={() => setRightOpen(false)}
                    className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    title="Collapse Circle Hub"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                <CircleManager />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Restore right circle selector hub FAB if closed */}
        {!rightOpen && (
          <button
            onClick={() => setRightOpen(true)}
            className="absolute right-4 bottom-4 bg-[#0F172A]/90 hover:bg-slate-900 border border-white/15 text-white hover:border-white/30 z-30 px-3.5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-semibold backdrop-blur-md transition-all active:scale-95 duration-200"
            title="Show Sync Hub Panel"
          >
            <Orbit className="w-4 h-4 text-emerald-400" />
            <span>Show Circle Hub</span>
          </button>
        )}
      </main>

      {/* DETAILED TRIGGER SOS OVERLAY BLOCK */}
      <AnimatePresence>
        {panicOpen && (
          <div id="sos-panic-overlay-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/70 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/10 backdrop-blur-3xl border border-white/25 rounded-3xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden"
            >
              {/* Alert stripes decoration */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-600"></div>

              <div className="flex items-center gap-2.5 mb-4 text-rose-400">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
                <h3 className="text-lg font-bold text-white">Trigger Emergency Distress Call</h3>
              </div>

              <p className="text-xs text-white/70 leading-relaxed mb-4">
                This triggers a critical priority SOS alarm banner on all synchronized screens globally. Please input an optional statement or coordinates to support assistance.
              </p>

              <form onSubmit={handleTriggerPanic} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-white/50 tracking-wider font-mono">
                    Emergency Message
                  </label>
                  <textarea
                    id="panic-message-textarea"
                    required
                    value={panicMessage}
                    onChange={(e) => setPanicMessage(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/20 h-24 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 resize-none"
                    maxLength={300}
                  ></textarea>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    id="cancel-panic-modal-btn"
                    type="button"
                    onClick={() => setPanicOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs bg-white/5 hover:bg-white/10 hover:text-white text-white/70 font-bold transition-all border border-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    id="confirm-panic-modal-btn"
                    type="submit"
                    disabled={submittingPanic}
                    className="px-5 py-2 rounded-xl text-xs bg-rose-600 hover:bg-rose-500 disabled:bg-rose-955/40 font-black tracking-wide text-white transition-all shadow-lg shadow-rose-950/30 border border-white/20"
                  >
                    {submittingPanic ? 'Sending SOS Alerts...' : '⚠️ ACTIVATE ALARM NOW'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER BAR CREDITS */}
      <footer className="relative z-10 border-t border-white/5 bg-[#0F172A]/40 backdrop-blur-md p-4 text-center mt-auto">
        <p className="text-[10px] text-white/40 font-mono tracking-tight">
          🛡️ Zero-Trust Security Encrypted Profile Coordination • 2026
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <FamilyProvider>
      <Dashboard />
    </FamilyProvider>
  );
}
