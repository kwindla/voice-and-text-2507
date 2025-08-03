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
        'terminal-green': '#00ff7f',
      },
      fontFamily: {
        terminal: ['"Geist Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};