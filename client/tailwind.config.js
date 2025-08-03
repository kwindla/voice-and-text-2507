/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@pipecat-ai/voice-ui-kit/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['VT323', 'monospace'],
      },
      colors: {
        'retro-green': {
          DEFAULT: '#0f0',
          'dark': '#0a0',
          'light': '#8f8',
        },
      },
    },
  },
  plugins: [],
};