/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        garuda: {
          bg: '#050505',
          jet: '#050505',
          bgSecondary: '#0D0B12',
          surface: '#15121C',
          amethyst: '#3B0A6B',
          amethystSurface: '#241039',
          amethystGlass: 'rgba(59, 10, 107, 0.22)',
          cyan: '#00E5FF',
          cyanHighlight: 'rgba(0, 229, 255, 0.14)',
          glass: 'rgba(255, 255, 255, 0.045)',
          border: 'rgba(255, 255, 255, 0.10)',
          text: '#F7F5FA',
          textSecondary: '#AAA3B5',
          divider: 'rgba(255, 255, 255, 0.10)',
          green: '#10B981',
          amber: '#F59E0B',
          red: '#EF4444',
        }
      },
      boxShadow: {
        'cyan-sm': '0 0 15px rgba(0, 229, 255, 0.20)',
        'cyan-md': '0 0 25px rgba(0, 229, 255, 0.35)',
        'cyan-lg': '0 0 45px rgba(0, 229, 255, 0.50)',
        'amethyst-sm': '0 0 15px rgba(59, 10, 107, 0.40)',
        'amethyst-md': '0 0 25px rgba(59, 10, 107, 0.60)',
        'amethyst-lg': '0 0 45px rgba(59, 10, 107, 0.75)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.55)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

