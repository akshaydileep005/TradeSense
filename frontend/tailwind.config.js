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
        dark: {
          950: '#070a0f',
          900: '#0a0e14', // Primary dark background
          850: '#0d121a',
          800: '#121824', // Card background
          750: '#171f2e',
          700: '#1c2638', // Hover / border
          600: '#253248',
          500: '#334155'
        },
        bull: {
          light: '#00ff88',
          DEFAULT: '#00E676', // Electric green for gains/buy
          dark: '#00b359',
          bg: 'rgba(0, 230, 118, 0.12)'
        },
        bear: {
          light: '#ff5252',
          DEFAULT: '#FF3B30', // Electric red for losses/sell
          dark: '#d32f2f',
          bg: 'rgba(255, 59, 48, 0.12)'
        },
        doji: {
          light: '#a78bfa',
          DEFAULT: '#8B5CF6', // Electric Violet Doji identity
          dark: '#6D28D9',
          accent: '#6366F1',
          bg: 'rgba(139, 92, 246, 0.15)',
          glow: '0 0 25px rgba(139, 92, 246, 0.45)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'doji-pulse': 'dojiPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'marquee': 'marquee 30s linear infinite',
      },
      keyframes: {
        dojiPulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)', boxShadow: '0 0 15px rgba(139, 92, 246, 0.5)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)', boxShadow: '0 0 25px rgba(139, 92, 246, 0.8)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        }
      }
    },
  },
  plugins: [],
}
