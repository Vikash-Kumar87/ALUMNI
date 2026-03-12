import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { chatAPI } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiVideo, FiVideoOff, FiMic, FiMicOff, FiPhone, FiCopy,
  FiCheck, FiUsers, FiMaximize2, FiMinimize2, FiArrowLeft, FiShare2, FiMessageCircle,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    JitsiMeetExternalAPI: any;
  }
}

const VideoCallPage: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiRef = useRef<any>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  const peerName = searchParams.get('peer') || 'Peer';
  const rawRoom = searchParams.get('room') || '';
  const receiverId = searchParams.get('receiverId') || '';
  // Sanitize room to only alphanumeric + hyphens (Jitsi requirement)
  const roomName = rawRoom
    ? `alumniconnect-${rawRoom.replace(/[^a-zA-Z0-9]/g, '').slice(0, 48)}`
    : `alumniconnect-${Date.now()}`;

  const [callStarted, setCallStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Cleanup on unmount ─────────────────────────────────────── */
  useEffect(() => {
    return () => {
      if (apiRef.current) {
        try { apiRef.current.dispose(); } catch { /* ignore */ }
      }
      if (scriptRef.current) {
        scriptRef.current.remove();
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  /* ── Timer ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (callStarted) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimer(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callStarted]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  /* ── Load Jitsi & start call ───────────────────────────────── */
  const startCall = () => {
    setLoading(true);
    setCallStarted(true); // show container immediately so jitsiContainerRef.current is non-null AND visible

    const initJitsi = () => {
      if (!jitsiContainerRef.current) return;
      const domain = 'meet.jit.si';
      const options = {
        roomName,
        width: '100%',
        height: '100%',
        parentNode: jitsiContainerRef.current,
        userInfo: {
          displayName: userProfile?.name || 'AlumniConnect User',
          email: userProfile?.email || '',
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          toolbarButtons: [
            'microphone', 'camera', 'closedcaptions', 'desktop',
            'fullscreen', 'fodeviceselection', 'hangup', 'chat',
            'raisehand', 'videoquality', 'tileview', 'settings', 'shortcuts',
          ],
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          BRAND_WATERMARK_LINK: '',
          DEFAULT_BACKGROUND: '#0f0b2e',
          TOOLBAR_ALWAYS_VISIBLE: false,
          MOBILE_APP_PROMO: false,
        },
      };

      apiRef.current = new window.JitsiMeetExternalAPI(domain, options);

      // Hide our overlay immediately — Jitsi is mounted and ready for interaction
      setLoading(false);

      apiRef.current.addEventListener('videoConferenceJoined', () => {
        toast.success('Connected! Video call started 🎥');
      });

      apiRef.current.addEventListener('videoConferenceLeft', () => {
        setCallStarted(false);
        toast('Call ended', { icon: '📵' });
        navigate(-1);
      });

      apiRef.current.addEventListener('readyToClose', () => {
        setCallStarted(false);
        navigate(-1);
      });
    };

    if (window.JitsiMeetExternalAPI) {
      initJitsi();
    } else {
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = initJitsi;
      script.onerror = () => {
        setLoading(false);
        toast.error('Failed to load Jitsi. Check your internet connection.');
      };
      scriptRef.current = script;
      document.head.appendChild(script);
    }
  };

  /* ── Send call link to chat ─────────────────────────────── */
  const sendLinkToChat = async () => {
    if (!receiverId || !userProfile) return;
    const callLink = `${window.location.origin}/video-call?room=${rawRoom}&peer=${encodeURIComponent(userProfile.name || '')}`;
    try {
      await chatAPI.sendMessage(receiverId, callLink, { messageType: 'video_call_link' });
      setLinkSent(true);
      toast.success('Call link sent in chat!');
      setTimeout(() => setLinkSent(false), 3000);
    } catch {
      toast.error('Could not send link to chat');
    }
  };

  /* ── Copy room link ────────────────────────────────────────── */
  const copyLink = async () => {
    const link = `${window.location.origin}/video-call?room=${rawRoom}&peer=${encodeURIComponent(userProfile?.name || '')}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Call link copied!');
    setTimeout(() => setCopied(false), 2500);
  };

  /* ── End call ──────────────────────────────────────────────── */
  const endCall = () => {
    if (apiRef.current) {
      try { apiRef.current.executeCommand('hangup'); } catch { /* ignore */ }
    }
    setCallStarted(false);
    navigate(-1);
  };

  return (
    <div className="min-h-screen relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg,#0f0b2e 0%,#1a1040 40%,#0d1b3e 100%)' }}>

      {/* ── Animated background orbs ─────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-0">
        <div className="absolute w-[600px] h-[600px] rounded-full opacity-20 -top-40 -left-40"
          style={{ background: 'radial-gradient(circle,#6366f1,transparent 70%)', animation: 'blob1 14s ease-in-out infinite' }} />
        <div className="absolute w-[500px] h-[500px] rounded-full opacity-15 -bottom-32 -right-32"
          style={{ background: 'radial-gradient(circle,#7c3aed,transparent 70%)', animation: 'blob2 18s ease-in-out infinite 3s' }} />
        <div className="absolute w-[300px] h-[300px] rounded-full opacity-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ background: 'radial-gradient(circle,#06b6d4,transparent 70%)', animation: 'blob1 22s ease-in-out infinite 6s' }} />
      </div>

      <style>{`
        @keyframes blob1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-20px) scale(1.08)} 66%{transform:translate(-15px,25px) scale(0.95)} }
        @keyframes blob2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-25px,15px) scale(1.06)} 66%{transform:translate(20px,-20px) scale(0.97)} }
        @keyframes ringPulse { 0%,100%{transform:scale(1);opacity:0.6} 50%{transform:scale(1.15);opacity:0.15} }
        @keyframes callBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
      `}</style>

      {/* ── Top bar ──────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4">
        <button
          onClick={() => callStarted ? endCall() : navigate(-1)}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:bg-white/10"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            <FiArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium hidden sm:block">Back to Chat</span>
        </button>

        {/* Room info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <FiUsers className="w-3.5 h-3.5 text-indigo-300" />
            <span className="text-xs font-semibold text-white/80 hidden sm:block">
              {userProfile?.name} &amp; {peerName}
            </span>
            {callStarted && (
              <span className="text-xs font-bold text-emerald-400 font-mono">{formatTime(timer)}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
          {/* Send link to chat — only shown when there's a peer to send to */}
          {receiverId && (
            <button
              onClick={sendLinkToChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 text-white/80 hover:text-white"
              style={{ background: linkSent ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)', border: `1px solid ${linkSent ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.12)'}` }}
            >
              {linkSent ? <FiCheck className="w-3.5 h-3.5 text-emerald-400" /> : <FiMessageCircle className="w-3.5 h-3.5" />}
              <span className="hidden sm:block">{linkSent ? 'Sent!' : 'Send in Chat'}</span>
            </button>
          )}

          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 text-white/80 hover:text-white"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            {copied ? <FiCheck className="w-3.5 h-3.5 text-emerald-400" /> : <FiShare2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:block">{copied ? 'Copied!' : 'Share Link'}</span>
          </button>
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center px-4 pb-6"
        style={{ minHeight: 'calc(100vh - 80px)' }}>

        <AnimatePresence mode="wait">

          {/* ── PRE-CALL SCREEN ──────────────────────────────────── */}
          {!callStarted && (
            <motion.div
              key="pre-call"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="flex flex-col items-center text-center max-w-md w-full mt-8 sm:mt-14"
            >
              {/* Avatar ring animation */}
              <div className="relative w-36 h-36 mb-8">
                {[0, 1, 2].map(i => (
                  <div key={i}
                    className="absolute inset-0 rounded-full border border-indigo-400/30"
                    style={{ animation: `ringPulse 2.4s ease-in-out infinite ${i * 0.6}s`, transform: `scale(${1 + i * 0.22})` }}
                  />
                ))}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-28 h-28 rounded-full flex items-center justify-center shadow-2xl"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)', boxShadow: '0 0 40px rgba(99,102,241,0.5)' }}>
                    <span className="text-5xl font-extrabold text-white">
                      {peerName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
                Call with <span style={{ background: 'linear-gradient(135deg,#a5b4fc,#c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{peerName}</span>
              </h2>
              <p className="text-white/50 text-sm mb-8 max-w-xs">
                Powered by Jitsi Meet — secure, end-to-end encrypted video calls, no account needed.
              </p>

              {/* Feature pills */}
              <div className="flex flex-wrap justify-center gap-2 mb-10">
                {[
                  { icon: '🔒', text: 'Encrypted' },
                  { icon: '🎥', text: 'HD Video' },
                  { icon: '🔇', text: 'Mute Controls' },
                  { icon: '🖥️', text: 'Screen Share' },
                ].map(({ icon, text }) => (
                  <span key={text}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white/70"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {icon} {text}
                  </span>
                ))}
              </div>

              {/* Start call button */}
              <motion.button
                onClick={startCall}
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.04 }}
                whileTap={{ scale: loading ? 1 : 0.97 }}
                className="relative flex items-center gap-3 px-10 py-4 rounded-2xl text-white font-bold text-lg disabled:opacity-70 transition-all duration-300 overflow-hidden"
                style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 8px 32px rgba(34,197,94,0.45)' }}
              >
                {/* Shine sweep */}
                <span className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.18) 50%,transparent 100%)', animation: 'shine 2.5s linear infinite' }} />
                {loading ? (
                  <>
                    <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Connecting…
                  </>
                ) : (
                  <>
                    <div style={{ animation: 'callBounce 1.2s ease-in-out infinite' }}>
                      <FiVideo className="w-5 h-5" />
                    </div>
                    Start Video Call
                  </>
                )}
              </motion.button>

              {/* Room name */}
              <div className="mt-6 flex items-center gap-2 px-4 py-2.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span className="text-xs text-white/40 font-mono">{roomName}</span>
                <button onClick={copyLink} className="text-white/40 hover:text-white/80 transition-colors">
                  {copied ? <FiCheck className="w-3.5 h-3.5 text-emerald-400" /> : <FiCopy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <style>{`@keyframes shine{from{left:-100%}to{left:200%}}`}</style>
            </motion.div>
          )}

        </AnimatePresence>

        {/* ── ALWAYS-MOUNTED CALL AREA ─────────────────────────────
            jitsiContainerRef must be in the DOM BEFORE initJitsi() runs.
            We use display:flex/none instead of conditional rendering so
            the ref is non-null from the very first render.              */}
        <div
          className={`w-full ${fullscreen ? 'fixed inset-0 z-50' : 'max-w-5xl rounded-3xl overflow-hidden'}`}
          style={{
            display: callStarted ? 'flex' : 'none',
            flexDirection: 'column',
            ...(callStarted && !fullscreen
              ? { marginTop: '8px', boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)' }
              : {}),
          }}
        >
          {/* Call toolbar */}
          {!fullscreen && (
            <div className="flex items-center justify-between px-5 py-3"
              style={{ background: 'rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-emerald-400">Live</span>
                <span className="text-xs text-white/40 font-mono ml-1">{formatTime(timer)}</span>
              </div>
              <span className="text-sm font-semibold text-white/70">{peerName}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFullscreen(true)}
                  className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all"
                >
                  <FiMaximize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={endCall}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg,#f43f5e,#e11d48)', boxShadow: '0 4px 12px rgba(244,63,94,0.4)' }}
                >
                  <FiPhone className="w-3.5 h-3.5 rotate-[135deg]" />
                  End
                </button>
              </div>
            </div>
          )}

          {/* Fullscreen exit */}
          {fullscreen && (
            <div className="absolute top-4 right-4 z-50 flex gap-2">
              <button onClick={() => setFullscreen(false)}
                className="p-2 rounded-xl bg-black/40 text-white/70 hover:text-white hover:bg-black/60 transition-all backdrop-blur-sm">
                <FiMinimize2 className="w-4 h-4" />
              </button>
              <button onClick={endCall}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#f43f5e,#e11d48)' }}>
                <FiPhone className="w-3.5 h-3.5 rotate-[135deg]" /> End
              </button>
            </div>
          )}

          {/* Jitsi container — always in DOM so jitsiContainerRef.current is never null */}
          <div
            ref={jitsiContainerRef}
            style={{
              width: '100%',
              height: fullscreen ? '100vh' : 'min(70vh, 620px)',
              background: '#0f0b2e',
            }}
          />
        </div>

        {/* Loading overlay while Jitsi initialises */}
        <AnimatePresence>
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex flex-col items-center justify-center"
              style={{ background: 'rgba(15,11,46,0.8)', backdropFilter: 'blur(6px)' }}
            >
              <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20" />
                <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin" />
                <div className="absolute inset-3 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
                  <FiVideo className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-white font-bold text-lg">Connecting…</p>
              <p className="text-white/40 text-sm mt-1">Setting up your secure video call</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pre-call: bottom note */}
        {!callStarted && !loading && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="absolute bottom-6 text-xs text-white/25 text-center px-4"
          >
            Calls open in this tab using meet.jit.si — no download required.
          </motion.p>
        )}
      </div>
    </div>
  );
};

export default VideoCallPage;
