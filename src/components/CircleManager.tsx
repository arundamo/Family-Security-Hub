/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useFamily } from './FamilyStateContext';
import { 
  Users, UserPlus, Copy, Check, LogOut, Loader2, Sparkles, AlertCircle, ChevronDown, ChevronUp, Plus, ArrowLeft 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function CircleManager() {
  const { 
    currentUser, 
    activeCircle, 
    members,
    createCircle, 
    joinCircle, 
    leaveCircle, 
    isBackendConnected,
    loading,
    joinedCirclesList,
    switchActiveCircle
  } = useFamily();

  const isMeAdmin = members.find(m => m.userId === currentUser?.id)?.role === 'admin' || activeCircle?.createdById === currentUser?.id;

  const [mode, setMode] = useState<'create' | 'join'>('join');
  const [circleName, setCircleName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [detectedInvite, setDetectedInvite] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  // Selector & collapse states
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('family_circle_manager_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('family_circle_manager_collapsed', String(next));
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    if (invite && invite.length === 6) {
      const formatted = invite.toUpperCase();
      setInviteCode(formatted);
      setDetectedInvite(formatted);
      setMode('join');
      localStorage.setItem('pending_invite_code', formatted);
    } else {
      const stored = localStorage.getItem('pending_invite_code');
      if (stored && stored.length === 6) {
        setInviteCode(stored);
        setDetectedInvite(stored);
        setMode('join');
      }
    }
  }, []);

  const handleCopyCode = () => {
    if (!activeCircle?.code) return;
    navigator.clipboard.writeText(activeCircle.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    if (!activeCircle?.code) return;
    let customOrigin = window.location.origin;
    if (customOrigin.includes('-dev-')) {
      customOrigin = customOrigin.replace('-dev-', '-pre-');
    }
    const shareLink = `${customOrigin}${window.location.pathname}?invite=${activeCircle.code}`;
    navigator.clipboard.writeText(shareLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!circleName.trim()) return;
    setSubmitting(true);
    setLocalErr(null);
    try {
      await createCircle(circleName);
      setCircleName('');
      setIsAddingNew(false);
    } catch (err: any) {
      setLocalErr(err.message || 'Failed to create family circle.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setSubmitting(true);
    setLocalErr(null);
    try {
      await joinCircle(inviteCode);
      setInviteCode('');
      setDetectedInvite(null);
      setIsAddingNew(false);
      localStorage.removeItem('pending_invite_code');
      // Clean query parameters from URL quietly
      const url = new URL(window.location.href);
      if (url.searchParams.has('invite')) {
        url.searchParams.delete('invite');
        window.history.replaceState({}, document.title, url.toString());
      }
    } catch (err: any) {
      setLocalErr('Invalid invitation code. Check and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-xl relative overflow-hidden">
      {/* Background soft lighting effects */}
      <div className="absolute top-0 right-0 w-44 h-44 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {activeCircle && !isAddingNew ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="relative flex-1 mr-2">
              <span className="text-[10px] uppercase tracking-wider font-bold text-blue-300 font-mono block">
                Synchronizing Circle
              </span>
              
              {/* Dropdown Toggle Button */}
              <button
                id="circle-dropdown-toggle-btn"
                onClick={() => setShowDropdown(!showDropdown)}
                className="mt-1 flex items-center gap-1.5 hover:bg-white/10 px-2.5 py-1.5 rounded-xl text-left transition-all border border-white/5 hover:border-white/10 group max-w-full"
              >
                <span id="active-circle-title" className="text-md sm:text-lg font-bold font-sans text-white truncate max-w-[130px] sm:max-w-[200px]">
                  {activeCircle.name}
                </span>
                <ChevronDown className="w-4 h-4 text-white/50 group-hover:text-white transition-colors shrink-0" />
              </button>

              {/* Custom Dropdown Dialog/Menu */}
              <AnimatePresence>
                {showDropdown && (
                  <>
                    {/* Click backdrop to close */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowDropdown(false)}
                    />
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0, y: -5 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.95, opacity: 0, y: -5 }}
                      className="absolute left-0 mt-2 w-72 bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-2 z-50 overflow-hidden divide-y divide-white/10"
                    >
                      {/* Circle list */}
                      <div className="py-1 max-h-48 overflow-y-auto space-y-1">
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono font-bold px-3 py-1.5">Your Saved Circles</p>
                        {joinedCirclesList.map((circle) => {
                          const isActive = circle.id === activeCircle.id;
                          return (
                            <button
                              key={circle.id}
                              onClick={() => {
                                switchActiveCircle(circle.id);
                                setShowDropdown(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                                isActive 
                                  ? 'bg-blue-600/30 text-blue-200 border border-blue-500/20' 
                                  : 'text-white/70 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              <div className="truncate">
                                <p className="truncate font-sans font-bold">{circle.name}</p>
                                <p className="text-[9px] font-mono opacity-50 truncate">Code: {circle.code}</p>
                              </div>
                              {isActive && (
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0 ml-1"></span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Dropdown Action Buttons */}
                      <div className="pt-2 px-1 pb-1 space-y-1">
                        <button
                          onClick={() => {
                            setIsAddingNew(true);
                            setShowDropdown(false);
                          }}
                          className="w-full text-left px-2 py-1.5 text-xs font-bold font-sans text-emerald-400 hover:text-emerald-300 hover:bg-white/5 rounded-xl transition-colors flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Join &amp; Switch Circles
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            
            <div className="flex items-center gap-1 shrink-0">
              {/* Expand/Collapse Toggle Button */}
              <button
                onClick={toggleCollapse}
                className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all border border-transparent"
                title={isCollapsed ? "Expand Details" : "Collapse Details"}
              >
                {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>

              {/* Exit Button */}
              <button
                id="leave-circle-btn"
                onClick={() => {
                  if(window.confirm('Are you sure you want to exit this family circle? You will lose coordinate sync.')) {
                    leaveCircle();
                  }
                }}
                className="p-2 text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/20 flex items-center gap-1 text-xs font-semibold"
                title="Leave Circle"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Exit</span>
              </button>
            </div>
          </div>

          {/* Invitation code and actions box (Collapsible) */}
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-3"
              >
                {isMeAdmin ? (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-white/50 font-medium font-sans">Invitation Invite Code</p>
                      <div className="flex items-center gap-2">
                        <span id="circle-invite-code" className="text-2xl font-black font-mono tracking-widest text-emerald-400 drop-shadow-md">
                          {activeCircle.code}
                        </span>
                        <span className="text-[10px] text-white/50 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10 font-bold uppercase tracking-wider font-mono">
                          6 Chars Code
                        </span>
                      </div>
                      <p className="text-[10px] text-white/40 leading-relaxed font-sans mt-1">
                        Provide either the 6-character code or share the direct invitation link for instant onboarding.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto shrink-0">
                      <button
                        id="copy-invite-code-btn"
                        onClick={handleCopyCode}
                        className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 border border-white/10 ${
                          copied 
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold' 
                            : 'bg-white/5 hover:bg-white/10 text-white'
                        }`}
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied Code' : 'Copy Code'}
                      </button>

                      <button
                        id="copy-invite-link-btn"
                        onClick={handleCopyLink}
                        className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 border border-white/10 ${
                          copiedLink 
                            ? 'bg-blue-500 text-white border-blue-400' 
                            : 'bg-indigo-600/40 hover:bg-indigo-600/60 text-white'
                        }`}
                      >
                        {copiedLink ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />}
                        {copiedLink ? 'Copied Link' : 'Copy Invite Link'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950/40 rounded-2xl p-4 border border-white/5 text-center flex flex-col items-center justify-center py-6">
                    <p className="text-xl mb-1.5">🔒</p>
                    <p className="text-xs font-bold text-white">Invitation Code Locked</p>
                    <p className="text-[10px] text-white/45 mt-1 max-w-[280px]">
                      Only Circle Admins can add new family members or access invitation credentials and direct links.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex gap-4">
              <button
                onClick={() => { setMode('join'); setLocalErr(null); }}
                className={`pb-2 text-center text-sm font-bold border-b-2 transition-all ${
                  mode === 'join' 
                    ? 'text-white border-blue-500' 
                    : 'text-white/45 border-transparent hover:text-white/70'
                }`}
              >
                Join Existing Circle
              </button>
              <button
                onClick={() => { setMode('create'); setLocalErr(null); }}
                className={`pb-2 text-center text-sm font-bold border-b-2 transition-all ${
                  mode === 'create' 
                    ? 'text-white border-blue-500' 
                    : 'text-white/45 border-transparent hover:text-white/70'
                }`}
              >
                Create New Circle
              </button>
            </div>
            
            {activeCircle && (
              <button
                onClick={() => { setIsAddingNew(false); setLocalErr(null); }}
                className="py-1 px-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-[11px] font-bold text-white/70 hover:text-white flex items-center gap-1 transition-all"
              >
                <ArrowLeft className="w-3 h-3" />
                Cancel
              </button>
            )}
          </div>

          {localErr && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{localErr}</span>
            </div>
          )}

          {mode === 'join' && detectedInvite && (
            <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-200 text-xs flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold text-white">Direct Invitation Detected</span>
              </div>
              <p className="text-[11px] text-white/70 leading-relaxed">
                We pre-filled code <strong className="text-emerald-400 font-mono tracking-wider">{detectedInvite}</strong> from your link. Authenticate or click "Secure Join Circle" to coordinate instantly.
              </p>
            </div>
          )}

          {mode === 'join' ? (
            <form onSubmit={handleJoin} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-white/50 font-semibold font-sans">Secret Invite Code</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-white/20 font-mono text-xs">🔑</span>
                  <input
                    id="join-circle-input"
                    type="text"
                    required
                    placeholder="E.g., CK8291"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm font-mono tracking-widest text-white placeholder-white/20 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/15 transition-all uppercase"
                    maxLength={6}
                  />
                </div>
              </div>

              <button
                id="submit-join-circle-btn"
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-800/40 disabled:text-slate-400 font-bold rounded-xl text-sm transition-all text-white flex items-center justify-center gap-2 border border-white/10 shadow-lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Finding circle...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Secure Join Circle
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-white/50 font-semibold font-sans">Circle Name</label>
                <input
                  id="create-circle-name-input"
                  type="text"
                  required
                  placeholder="E.g., Friends Circle, Cook Family, etc."
                  value={circleName}
                  onChange={(e) => setCircleName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/15 transition-all"
                  maxLength={50}
                />
              </div>

              <button
                id="submit-create-circle-btn"
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800/40 disabled:text-slate-400 font-bold rounded-xl text-sm transition-all text-white flex items-center justify-center gap-2 border border-white/10 shadow-lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deploying circle...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    Generate Secure Circle
                  </>
                )}
              </button>
            </form>
          )}

          {!isBackendConnected && (
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-white/60 text-[11px] leading-relaxed flex items-start gap-1.5 font-sans">
              <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-300 animate-pulse" />
              <span>
                <strong>Sandbox Simulation:</strong> You are currently coordinating in local storage mockup mode. You can instantly create/join circles (like "Friends Circle") to test here! They save in your local browser sandbox context.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
