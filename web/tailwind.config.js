/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'cursive'],
        mono: ['"VT323"', 'monospace'],
      },
      colors: {
        space: {
          900: '#050510', // Deep void
          800: '#0b0b20',
          700: '#1a1a3a',
        },
        neon: {
          cyan: '#00f3ff',
          pink: '#ff00ff',
          green: '#00ff00',
          yellow: '#ffff00',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
