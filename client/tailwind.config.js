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
        'terminal-green': '#00ff99',
        'terminal-dark': '#001b00',
      },
      fontFamily: {
        mono: ['"Geist Mono"', 'monospace'],
      },
      boxShadow: {
        'terminal-glow': '0 0 5px rgba(0,255,153,0.7), 0 0 20px rgba(0,255,153,0.5)',
      },
    },
  },
  plugins: [],
};