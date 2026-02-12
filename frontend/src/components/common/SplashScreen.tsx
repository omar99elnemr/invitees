/**
 * SplashScreen Component
 * Native-OS style animated splash shown on PWA launch.
 * Shows a contact-scanning animation: records slide through a scanner line,
 * each one gets approved (✓) or flagged, then the app name reveals.
 */
import { useState, useEffect } from 'react';

const RECORDS = [
  { name: 'Sarah Ramzy', status: 'approved' as const },
  { name: 'John Emad', status: 'approved' as const },
  { name: 'Nadia Rashid', status: 'rejected' as const },
  { name: 'Ali El-Sayed', status: 'approved' as const },
];

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [phase, setPhase] = useState<'init' | 'scan' | 'reveal' | 'exit'>('init');
  const [activeRecord, setActiveRecord] = useState(-1);
  const [scannedRecords, setScannedRecords] = useState<number[]>([]);

  useEffect(() => {
    // Phase 1: init → show logo (0-400ms)
    const t0 = setTimeout(() => setPhase('scan'), 400);

    // Phase 2: scan records one by one (400ms-2000ms)
    const scanTimers = RECORDS.map((_, i) => {
      return setTimeout(() => {
        setActiveRecord(i);
        setTimeout(() => setScannedRecords(prev => [...prev, i]), 300);
      }, 500 + i * 400);
    });

    // Phase 3: reveal app name (2200ms)
    const t1 = setTimeout(() => setPhase('reveal'), 2200);
    // Phase 4: exit (3200ms)
    const t2 = setTimeout(() => setPhase('exit'), 3200);
    // Remove from DOM (3800ms)
    const t3 = setTimeout(onFinish, 3800);

    return () => {
      clearTimeout(t0);
      scanTimers.forEach(clearTimeout);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-500 ${
        phase === 'exit' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 40%, #312e81 100%)' }}
    >
      {/* Subtle scan-line sweep */}
      {phase === 'scan' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="splash-scanline absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />
        </div>
      )}

      {/* Logo — always visible */}
      <div
        className={`transition-all duration-500 ease-out ${
          phase === 'init' ? 'scale-75 opacity-0' : 'scale-100 opacity-100'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        <div className="relative w-20 h-20 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-2xl border border-white/15">
          <svg viewBox="0 0 32 32" className="w-11 h-11">
            <circle cx="13" cy="11" r="3.8" fill="white" opacity="0.95" />
            <path d="M6.5 22.5c0-3.8 2.9-5.8 6.5-5.8s6.5 2 6.5 5.8" fill="white" opacity="0.95" />
            <circle cx="23.5" cy="22" r="6.5" fill="#34D399" />
            <path d="M20.2 22l2.3 2.3 3.8-3.8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>
      </div>

      {/* Scanning records */}
      <div className="mt-8 w-64 space-y-2">
        {RECORDS.map((rec, i) => {
          const isActive = activeRecord === i;
          const isScanned = scannedRecords.includes(i);
          const show = phase === 'scan' || phase === 'reveal';
          return (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 ${
                !show || activeRecord < i
                  ? 'opacity-0 translate-x-8'
                  : isActive && !isScanned
                  ? 'opacity-100 translate-x-0 bg-white/10 border border-indigo-400/40'
                  : isScanned
                  ? 'opacity-80 translate-x-0 bg-white/5 border border-transparent'
                  : 'opacity-40 translate-x-0 bg-white/5 border border-transparent'
              }`}
              style={{ transitionDelay: `${i * 50}ms` }}
            >
              {/* Person icon */}
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 20 20" className="w-4 h-4" fill="rgba(255,255,255,0.7)">
                  <circle cx="10" cy="7" r="3" />
                  <path d="M3 18c0-3.5 3-5.5 7-5.5s7 2 7 5.5" />
                </svg>
              </div>
              {/* Name */}
              <span className="text-sm text-white/80 font-medium flex-1 truncate">
                {rec.name}
              </span>
              {/* Status badge */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isScanned
                    ? rec.status === 'approved'
                      ? 'bg-emerald-500 scale-100'
                      : 'bg-red-500 scale-100'
                    : isActive
                    ? 'bg-indigo-500/50 scale-100'
                    : 'bg-white/10 scale-75'
                }`}
              >
                {isScanned ? (
                  rec.status === 'approved' ? (
                    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 splash-pop">
                      <path d="M4 8.5l2.5 2.5 5.5-5.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 splash-pop">
                      <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
                    </svg>
                  )
                ) : isActive ? (
                  <div className="w-2 h-2 rounded-full bg-white/70 animate-pulse" />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* App name reveal */}
      <div
        className={`mt-10 text-center transition-all duration-600 ${
          phase === 'reveal' || phase === 'exit'
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-6'
        }`}
      >
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Invitees
        </h1>
        <p className="mt-1 text-indigo-300/70 text-xs font-medium tracking-[0.2em] uppercase">
          Management System
        </p>
      </div>

      <style>{`
        .splash-scanline {
          animation: splash-sweep 2s ease-in-out infinite;
        }
        @keyframes splash-sweep {
          0% { top: 20%; opacity: 0; }
          30% { opacity: 1; }
          70% { opacity: 1; }
          100% { top: 80%; opacity: 0; }
        }
        .splash-pop {
          animation: splash-pop-in 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes splash-pop-in {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
