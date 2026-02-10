/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        'primary-dark': '#2563EB',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      boxShadow: {
        'glow-indigo': '0 0 20px rgba(99,102,241,0.25)',
        'glow-emerald': '0 0 20px rgba(16,185,129,0.25)',
        'elevated': '0 8px 30px rgba(0,0,0,0.08)',
        'elevated-lg': '0 12px 40px rgba(0,0,0,0.12)',
        'card-hover': '0 12px 24px -4px rgba(0,0,0,0.1), 0 4px 8px -2px rgba(0,0,0,0.06)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255,255,255,0.1)',
      },
      animation: {
        'slide-up': 'slideUp 0.35s cubic-bezier(.21,1.02,.73,1)',
        'slide-down': 'slideDown 0.35s cubic-bezier(.21,1.02,.73,1)',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 2s infinite linear',
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(99,102,241,0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(99,102,241,0.5)' },
        },
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(.21,1.02,.73,1)',
      },
    },
  },
  plugins: [],
}
