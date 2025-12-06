/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Crimson Pro', 'serif'],
        sans: ['Manrope', 'Noto Sans JP', 'sans-serif'],
      },
      colors: {
        accent: {
          DEFAULT: '#d4a574',
          light: '#e5c19d',
          dark: '#9c7f5a',
        },
        surface: {
          primary: '#0a0908',
          secondary: '#161412',
          tertiary: '#1f1b18',
          elevated: '#2a2520',
        },
      },
      boxShadow: {
        'refined': '0 1px 2px 0 rgba(0, 0, 0, 0.2)',
        'refined-md': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        'refined-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
}
