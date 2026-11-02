/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0B1220',
          panel: '#111A2C',
          panelHover: '#16233B',
          border: '#1E2A44',
          text: '#E6EDF7',
          muted: '#8A9AB4',
        },
        accent: {
          teal: '#2DD4BF',
          amber: '#FBBF24',
          rose: '#FB7185',
          emerald: '#34D399',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'card': '12px',
      }
    },
  },
  plugins: [],
}
