/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // KBEX gold palette (matches web design_guidelines)
        gold: {
          50:  '#fbf7e9',
          100: '#f5eccf',
          200: '#ecd89a',
          300: '#e1c164',
          400: '#d8ae3d',
          500: '#d4af37', // primary gold
          600: '#b8932b',
          700: '#967327',
          800: '#7a5d26',
          900: '#664e24',
          950: '#3c2d13',
        },
        // Near-black / zinc scale for backgrounds
        ink: {
          DEFAULT: '#0a0a0a',
          50:  '#f6f6f6',
          100: '#e7e7e7',
          200: '#d1d1d1',
          300: '#b0b0b0',
          400: '#888888',
          500: '#6d6d6d',
          600: '#5d5d5d',
          700: '#4f4f4f',
          800: '#1a1a1a',
          900: '#111111',
          950: '#0a0a0a',
        },
      },
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans: ['Manrope', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
