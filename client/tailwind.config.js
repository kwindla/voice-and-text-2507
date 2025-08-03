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
        'green': {
          300: '#33ff66',
          400: '#00ff41',
          500: '#00cc33',
          600: '#008822',
        },
        'amber': {
          400: '#ffb000',
        },
        'cyan': '#00ffff',
      },
      fontFamily: {
        'mono': ['VT323', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};