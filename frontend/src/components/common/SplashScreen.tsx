/**
 * SplashScreen Component
 * Animated splash screen shown on PWA launch.
 * Features a polished logo animation, app name reveal, and smooth fade-out.
 */
import { useState, useEffect } from 'react';

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [phase, setPhase] = useState<'logo' | 'text' | 'exit'>('logo');

  useEffect(() => {
    // Phase 1: logo scales in (0 → 600ms)
    // Phase 2: text fades in (600ms → 1400ms)
    const t1 = setTimeout(() => setPhase('text'), 600);
    // Phase 3: exit (fade out entire screen)
    const t2 = setTimeout(() => setPhase('exit'), 2200);
    // Remove from DOM
    const t3 = setTimeout(onFinish, 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-500 ${
        phase === 'exit' ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4338ca 60%, #6366f1 100%)' }}
    >
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[15%] left-[10%] w-48 h-48 bg-indigo-400/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-[60%] right-[8%] w-64 h-64 bg-purple-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-[10%] left-[30%] w-40 h-40 bg-blue-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Logo */}
      <div
        className={`relative transition-all duration-700 ease-out ${
          phase === 'logo' ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        {/* Glow ring behind logo */}
        <div className="absolute -inset-6 bg-indigo-400/20 rounded-full blur-2xl animate-pulse" />

        {/* Logo container */}
        <div className="relative w-28 h-28 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-2xl border border-white/20">
          <svg viewBox="0 0 32 32" className="w-16 h-16 drop-shadow-lg">
            <circle cx="13" cy="11" r="3.8" fill="white" opacity="0.95" />
            <path d="M6.5 22.5c0-3.8 2.9-5.8 6.5-5.8s6.5 2 6.5 5.8" fill="white" opacity="0.95" />
            <circle cx="23.5" cy="22" r="6.5" fill="#34D399" />
            <circle cx="23.5" cy="22" r="6.5" fill="none" stroke="white" strokeWidth="0.8" opacity="0.3" />
            <path
              d="M20.2 22l2.3 2.3 3.8-3.8"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>
      </div>

      {/* App name & tagline */}
      <div
        className={`mt-8 text-center transition-all duration-700 ${
          phase === 'text' || phase === 'exit'
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4'
        }`}
      >
        <h1 className="text-4xl font-extrabold text-white tracking-tight">
          Invitees
        </h1>
        <div className="mt-2 flex items-center justify-center gap-2">
          <div className="h-px w-8 bg-gradient-to-r from-transparent to-indigo-300/60" />
          <p className="text-indigo-200 text-sm font-medium tracking-widest uppercase">
            Management System
          </p>
          <div className="h-px w-8 bg-gradient-to-l from-transparent to-indigo-300/60" />
        </div>
      </div>

      {/* Loading indicator */}
      <div
        className={`mt-12 transition-all duration-700 ${
          phase === 'text' || phase === 'exit'
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-white/60"
              style={{
                animation: 'splash-dot 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Dot animation keyframes */}
      <style>{`
        @keyframes splash-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
