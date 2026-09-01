/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: '#9A7B3E',
          'gold-light': '#B39356',
          cream: '#FAF7F2',
          surface: '#FFFFFF',
          dark: '#1A1815',
          border: '#E8E2D9',
          muted: '#736B63',
        },
      },
      fontSize: {
        '2xs': '0.625rem', // 10px
        '3xs': '0.5625rem', // 9px
      },
      letterSpacing: {
        'widest-plus': '0.2em',
        'super-wide': '0.25em',
      },
      fontFamily: {
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        lashary: {
          primary: '#1A1815',
          'primary-content': '#FFFFFF',
          secondary: '#9A7B3E',
          'secondary-content': '#FFFFFF',
          accent: '#B39356',
          neutral: '#1A1815',
          'base-100': '#FAF7F2',
          'base-200': '#F3ECE2',
          'base-300': '#E8E2D9',
          'base-content': '#1A1815',
        },
      },
      'light',
    ],
  },
}
