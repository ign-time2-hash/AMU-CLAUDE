/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['K2D', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: '#C2C9B9',
        background: '#F9F9F9',
        foreground: '#40493C',
        primary: {
          DEFAULT: '#6AA151',
          foreground: '#FFFFFF',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#40493C',
        },
        muted: {
          DEFAULT: '#F4F3F3',
          foreground: '#828F7C',
        },
      },
      borderRadius: {
        lg: '1rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
