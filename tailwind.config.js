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
    // Dynamic gradient classes — must be safelisted or Tailwind purges them
    { pattern: /^(from|via|to)-(red|amber|pink|indigo|green|purple|white|gray)-(50|100|200|300|400|500|600|700|800|900)$/ },
    { pattern: /^bg-gradient-to-(r|l|t|b|tr|tl|br|bl)$/ },
    { pattern: /^animate-(ping|pulse|spin|bounce)$/ },
    { pattern: /^(opacity|scale)-(0|100|95)$/ },
  ],
  plugins: [],
}
