/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff7f0',
          100: '#ffede0',
          200: '#fed9c1',
          300: '#fcbf96',
          400: '#fa9c6a',
          500: '#f87a43',
          600: '#e66330',
          700: '#c24f26',
          800: '#9e4223',
          900: '#823b25',
          950: '#4a1e15',
        },
        secondary: {
          50: '#fff9f5',
          100: '#fef3e8',
          200: '#fde6d0',
          300: '#fbd4a8',
          400: '#f8bb7a',
          500: '#f5a252',
          600: '#d4863d',
          700: '#b06c35',
          800: '#8f5a33',
          900: '#754d32',
          950: '#43291e',
        },
        accent: {
          50: '#fff5f7',
          100: '#ffe9ef',
          200: '#ffd6df',
          300: '#ffb8c7',
          400: '#f993a9',
          500: '#f4728e',
          600: '#e15a7b',
          700: '#c0486b',
          800: '#a03e5f',
          900: '#873a5b',
          950: '#501f30',
        },
        warm: {
          50: '#fffaf5',
          100: '#fff5eb',
          200: '#ffe8d5',
          300: '#ffd6b3',
          400: '#ffbc8a',
          500: '#ffa05e',
          600: '#e88648',
          700: '#c46b3b',
          800: '#a25836',
          900: '#874b36',
          950: '#4d261d',
        },
        soft: {
          50: '#fdf8f6',
          100: '#f9f0eb',
          200: '#f2e2d6',
          300: '#e8cdbb',
          400: '#dab298',
          500: '#c99a7e',
          600: '#b5826c',
          700: '#9b6b5e',
          800: '#825a54',
          900: '#6f4e4e',
          950: '#402a2b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Merriweather', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'shine': 'shine 1.5s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shine: {
          '0%': { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [
    '@tailwindcss/typography',
  ],
  darkMode: 'class',
};

export default config;
