/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#386A20',
        accent: '#B7F397',
        'accent-foreground': '#2c5a14',
        income: '#22c55e',
        expense: '#ef4444',
        border: '#E2E7D7',
        input: '#E2E7D7',
        foreground: '#1a2e0d',
        background: '#F7FBEF',
        surface: '#FFFFFF',
        secondary: '#EEF1E4',
        'muted-foreground': '#6b7280',
        destructive: '#ef4444',
      },
      fontFamily: {
        heebo: ['Heebo_400Regular'],
        'heebo-medium': ['Heebo_500Medium'],
        'heebo-semibold': ['Heebo_600SemiBold'],
        'heebo-bold': ['Heebo_700Bold'],
      },
    },
  },
};
