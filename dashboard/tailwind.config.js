/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary — warm forest green
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Warm neutrals — tinted toward green
        surface: {
          0: '#ffffff',
          50: '#fafaf8',
          100: '#f5f5f0',
          200: '#e8e8e0',
          300: '#d4d4cb',
          400: '#a3a39a',
          500: '#73736b',
          600: '#52524c',
          700: '#3f3f3a',
          800: '#292925',
          900: '#141412',
        },
        // Semantic
        danger: {
          50: '#fef2f0',
          100: '#ffe4e0',
          200: '#ffcdc5',
          300: '#fda99c',
          400: '#f97366',
          500: '#ef4e3f',
          600: '#dc3528',
          700: '#b8281d',
          800: '#99251d',
          900: '#7f241e',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        info: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Category colors
        medication: '#16a34a',
        activity: '#f59e0b',
        diet: '#0ea5e9',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(20, 20, 18, 0.04), 0 1px 1px 0 rgba(20, 20, 18, 0.02)',
        'md': '0 4px 6px -1px rgba(20, 20, 18, 0.06), 0 2px 4px -2px rgba(20, 20, 18, 0.03)',
        'lg': '0 10px 15px -3px rgba(20, 20, 18, 0.08), 0 4px 6px -4px rgba(20, 20, 18, 0.03)',
        'xl': '0 20px 25px -5px rgba(20, 20, 18, 0.1), 0 8px 10px -6px rgba(20, 20, 18, 0.04)',
        'inner': 'inset 0 2px 4px 0 rgba(20, 20, 18, 0.04)',
      },
      borderRadius: {
        'sm': '6px',
        'DEFAULT': '8px',
        'md': '10px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
