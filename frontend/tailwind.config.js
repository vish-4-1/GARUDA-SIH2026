/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        swiss: {
          obsidian: '#08090B',
          graphite: '#111318',
          elevated: '#191C23',
          slate: '#222631',
          borderSoft: 'rgba(255, 255, 255, 0.12)',
          borderStrong: 'rgba(255, 255, 255, 0.20)',
          textPrimary: '#F4F5F7',
          textSecondary: '#B3B7C2',
          textMuted: '#858B99',
          textDisabled: '#626875',
          cyan: '#00CFE8',
          amethyst: '#7047C8',
          orange: '#E9A23B',
          green: '#10B981',
          red: '#EF4444',
        },
        garuda: {
          bg: '#08090B',
          jet: '#08090B',
          charcoal: '#111318',
          bgSecondary: '#111318',
          surface: '#111318',
          elevated: '#191C23',
          slate: '#222631',
          amethyst: '#7047C8',
          amethystMuted: '#241D35',
          amethystSurface: '#191C23',
          amethystGlass: 'rgba(112, 71, 200, 0.12)',
          cyan: '#00CFE8',
          cyanMuted: 'rgba(0, 207, 232, 0.10)',
          darkGlass: 'rgba(17, 19, 24, 0.78)',
          glassBorder: 'rgba(255, 255, 255, 0.12)',
          text: '#F4F5F7',
          textPrimary: '#F4F5F7',
          textSecondary: '#B3B7C2',
          textMuted: '#858B99',
          divider: 'rgba(255, 255, 255, 0.12)',
          green: '#10B981',
          amber: '#E9A23B',
          red: '#EF4444',
        }
      },
      boxShadow: {
        'level1': '0 1px 3px rgba(0, 0, 0, 0.3)',
        'level2': '0 8px 28px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.035)',
        'level3': '0 16px 36px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'glass-subtle': '0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.03)',
        'glass': '0 8px 28px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.035)',
        'glass-elevated': '0 16px 36px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}


