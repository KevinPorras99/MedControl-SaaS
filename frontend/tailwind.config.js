/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['selector', '[class~="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50:  '#fffef5',
          100: '#fffaeb',
          400: '#ffd93d',
          500: '#ffc107',
          600: '#ffb300',
          700: '#ffa000',
          900: '#ff8f00',
        },
        yellow: {
          50:  '#fffef5',
          100: '#fffaeb',
          200: '#fff59d',
          300: '#fff176',
          400: '#ffd93d',
          500: '#ffc107',
          600: '#ffb300',
          700: '#ffa000',
          800: '#ff8f00',
          900: '#ff6f00',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
