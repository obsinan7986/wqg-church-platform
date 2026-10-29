/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        royal: {
          DEFAULT: '#013E97',
          dark: '#012F73',
          tint: '#F3F6FB',
          light: '#E6EDF8',
          50: '#F3F6FB',
          100: '#E6EDF8',
          200: '#C5D6F2',
          300: '#94B4E7',
          400: '#437CD4',
          500: '#013E97',
          600: '#013583',
          700: '#012F73',
          800: '#01255C',
          900: '#011A42',
        },
        gold: {
          DEFAULT: '#D4AF37',
          dark: '#B8942B',
          light: '#F8EEBD',
          tint: '#FCF9EA',
          300: '#EBD27A',
          400: '#DEC055',
          500: '#D4AF37',
          600: '#B8942B',
          700: '#94761B',
        },
        // Allowed neutral and helper tokens
        slate: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Ethiopic', 'system-ui', 'sans-serif'],
        ethiopic: ['Noto Sans Ethiopic', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 10px -2px rgba(1, 62, 151, 0.06), 0 4px 16px -4px rgba(15, 23, 42, 0.05)',
        gold: '0 4px 14px -2px rgba(212, 175, 55, 0.25)',
        royal: '0 4px 16px -2px rgba(1, 62, 151, 0.25)',
      }
    },
  },
  plugins: [],
}
