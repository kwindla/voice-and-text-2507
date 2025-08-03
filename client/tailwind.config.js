/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@pipecat-ai/voice-ui-kit/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'terminal-green': '#00ff66',
        'terminal-black': '#000000',
      },
      fontFamily: {
        terminal: ['"Geist Mono Variable"', 'monospace'],
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        scanline: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 100%' },
        },
      },
      animation: {
        flicker: 'flicker 2s infinite',
        scanline: 'scanline 6s linear infinite',
      },
    },
  },
  plugins: [],
};