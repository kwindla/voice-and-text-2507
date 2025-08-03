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
        "terminal-black": "#0D0D0D",
        "terminal-green": "#00FF41",
        "terminal-green-dark": "#00B32C",
      },
      fontFamily: {
        mono: ['"Share Tech Mono"', "monospace"],
      },
      boxShadow: {
        "green-glow": "0 0 5px #00FF41, 0 0 10px #00FF41",
      },
    },
  },
  plugins: [],
};