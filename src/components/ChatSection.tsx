/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useFamily } from './FamilyStateContext';
import { MessageSquare, Send, Loader2, ShieldCheck } from 'lucide-react';

export default function ChatSection() {
  const { chats, sendChatMessage, currentUser, activeCircle } = useFamily();
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat window to support live scrolling experiences
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setSending(true);
    try {
      await sendChatMessage(inputText);
      setInputText('');
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const getSenderInitial = (name: string) => {
    return name.substring(0, 1).toUpperCase();
  };

  return (
    <div id="family-group-chat-wrapper" className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-lg flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">
              {activeCircle ? `${activeCircle.name} Chat` : 'Circle Coordination Chat'}
            </h3>
            <p className="text-[10px] text-white/50">Secure coordination announcements center</p>
          </div>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1 min-h-[220px]">
        {chats.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/30 select-none">
            <MessageSquare className="w-8 h-8 text-white/30 mb-1" />
            <p className="text-xs font-semibold text-white/40">Announcements channel empty</p>
            <p className="text-[10px] text-white/30 mt-0.5">Send a coordinate update, check-in, or group alert below.</p>
          </div>
        ) : (
          chats.map((chat) => {
            const isMe = chat.senderId === currentUser?.id;
            const isSystem = chat.senderId === 'system';

            if (isSystem) {
              return (
                <div key={chat.id} className="flex justify-center my-1.5 self-center w-full">
                  <span className="text-[10px] px-3.5 py-1.5 bg-white/5 border border-white/10 text-emerald-300 font-semibold font-mono rounded-xl shadow-inner max-w-[90%] text-center">
                    {chat.text}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={chat.id}
                className={`flex gap-2 w-full ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {!isMe && (
                  <div className="w-7 h-7 rounded-full bg-white/10 text-blue-300 border border-white/10 text-[10px] font-black uppercase flex items-center justify-center shrink-0">
                    {getSenderInitial(chat.senderName)}
                  </div>
                )}
                
                <div className={`max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* Sender title label */}
                  {!isMe && (
                    <span className="text-[10px] text-white/40 font-semibold mb-0.5 px-0.5">
                      {chat.senderName.split(' ')[0]}
                    </span>
                  )}

                  <div className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed border ${
                    isMe
                      ? 'bg-blue-500/80 border-white/20 text-white rounded-tr-none shadow-md'
                      : 'bg-white/5 text-white/90 border border-white/10 rounded-tl-none'
                  }`}>
                    <p>{chat.text}</p>
                    <span className={`block text-[8px] text-right mt-1 font-mono ${isMe ? 'text-blue-100/60' : 'text-white/40'}`}>
                      {new Date(chat.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef}></div>
      </div>

      {/* Message Sender Form */}
      <form onSubmit={handleSend} className="mt-auto pt-2">
        <div className="flex gap-2">
          <input
            id="chat-message-input"
            type="text"
            required
            disabled={!currentUser}
            placeholder={currentUser ? (activeCircle ? `Message ${activeCircle.name}...` : "Message your circle...") : "Select profile to chat..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/15 transition-all disabled:opacity-50"
            maxLength={1000}
          />
          <button
            id="send-chat-message-btn"
            type="submit"
            disabled={sending || !inputText.trim() || !currentUser}
            className="px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-800/30 text-white font-bold rounded-xl text-xs transition-colors shadow-lg flex items-center justify-center border border-white/15"
            title="Send Message"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}
