/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
        },
        aqhi: {
          1: '#4ade80',
          4: '#fbbf24',
          7: '#fb923c',
          10: '#ef4444',
          11: '#7f1d1d',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '"Noto Sans HK"',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
