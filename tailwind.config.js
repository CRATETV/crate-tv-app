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
    extend: {
      keyframes: {
        'slow-pan': {
          '0%': { transform: 'scale(1.1) rotate(-5deg) translateY(0)' },
          '50%': { transform: 'scale(1.1) rotate(-5deg) translateY(-3%)' },
          '100%': { transform: 'scale(1.1) rotate(-5deg) translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'count-up-in': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'slow-pan': 'slow-pan 30s ease-in-out infinite',
        marquee: 'marquee 40s linear infinite',
        'count-up-in': 'count-up-in 0.6s ease-out forwards',
      },
    },
  },
  safelist: [
    // Dynamic gradient classes — must be safelisted or Tailwind purges them
    { pattern: /^(from|via|to)-(red|amber|pink|indigo|green|purple|white|gray)-(50|100|200|300|400|500|600|700|800|900)$/ },
    { pattern: /^bg-gradient-to-(r|l|t|b|tr|tl|br|bl)$/ },
    { pattern: /^animate-(ping|pulse|spin|bounce|slow-pan|marquee|count-up-in)$/ },
    { pattern: /^(opacity|scale)-(0|100|95)$/ },
  ],
  plugins: [],
}
