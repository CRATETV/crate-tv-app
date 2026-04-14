/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./components/**/*.{ts,tsx}",
    "./contexts/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./services/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  safelist: [
    // Only safelist classes that are truly dynamic (built at runtime)
    { pattern: /^(from|via|to)-(red|amber|pink|indigo|green|purple|white|gray)-(600|900)$/ },
    { pattern: /^bg-gradient-to-(r|l|t|b)$/ },
    { pattern: /^animate-(ping|pulse|spin|bounce)$/ },
    { pattern: /^(opacity|scale)-(0|100|95)$/ },
  ],
  plugins: [],
}
