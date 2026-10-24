/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        card: 'var(--card)',
        tx: 'var(--tx)',
        mu: 'var(--mu)',
        pr: 'var(--pr)',
        lv: 'var(--lv)',
        bd: 'var(--bd)',
        bad: 'var(--bad)',
        ok: 'var(--ok)',
        wa: 'var(--wa)',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Tamil', 'sans-serif'],
        tamil: ['Noto Sans Tamil', 'Inter', 'sans-serif'],
      },
      keyframes: {
        fi: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        sp: {
          'to': { transform: 'rotate(360deg)' },
        },
        sk: {
          'to': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        fi: 'fi 0.35s ease-out',
        sp: 'sp 0.8s linear infinite',
        sk: 'sk 1.2s infinite',
      },
    },
  },
  plugins: [],
};
