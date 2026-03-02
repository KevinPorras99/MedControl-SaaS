/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#EBF5FB',
          100: '#D6EAF8',
          500: '#2E86C1',
          700: '#1A5276',
          900: '#0D2B3E',
        },
      },
    },
  },
  plugins: [],
}
