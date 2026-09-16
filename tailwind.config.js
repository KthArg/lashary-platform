/** @type {import('tailwindcss').Config} */

// Tema del sitio público (US-LAND-01, diseño "LASHARY Beauty Studio"). Vive aparte del tema
// `lashary` del panel y el portal: solo lo usa lo que está bajo `data-theme="lashary-site"`.
// El contraste AA de cada par de texto lo fija src/shared/__tests__/site-theme-contrast.test.ts.
const siteColors = {
  paper: '#EDE7E1', // fondo
  ink: '#1B1310', // texto principal y botón primario
  'ink-soft': '#4A3B37', // texto secundario
  'ink-muted': '#6B5750', // texto atenuado
  clay: '#7A5C55', // acento sobre fondo claro (cursivas, numeración)
  rose: '#C68A8A', // acento decorativo; no alcanza 3:1 sobre `paper`, así que no marca foco ahí
  focus: '#9E6E6E', // anillo de foco: ≥ 3:1 sobre paper, ink y night (UI-004)
  taupe: '#B9A196', // relleno de imagen sin cargar; texto atenuado sobre `night`
  line: '#C9B9B0', // filetes sobre fondo claro
  night: '#17110F', // fondo oscuro (menú)
  'night-rule': '#332824', // filetes sobre fondo oscuro
}

module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
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
        site: siteColors,
      },
      zIndex: {
        modal: '50',
        'modal-top': '60',
        'site-header': '120',
        'site-menu': '150',
      },
      screens: {
        // Ancho desde el que la cabecera del sitio muestra la navegación completa.
        'site-nav': '860px',
        // Pantallas bajas (móvil en horizontal): el hero no cabe centrado bajo la cabecera.
        'site-short': { raw: '(max-height: 500px)' },
      },
      fontSize: {
        '2xs': '0.625rem',
        '3xs': '0.5625rem',
        // Escala fluida del sitio: [tamaño, { interlineado, tracking }] tomados del diseño.
        'site-logo': ['1.1875rem', { lineHeight: '1', letterSpacing: '0.24em' }],
        'site-logo-sub': ['0.5625rem', { lineHeight: '1', letterSpacing: '0.3em' }],
        'site-nav': ['0.8125rem', { lineHeight: '1.2' }],
        'site-caption': ['0.6875rem', { lineHeight: '1.5' }],
        'site-body': ['clamp(0.9375rem, 1.1vw, 1.0625rem)', { lineHeight: '1.6' }],
        'site-cta': ['0.9375rem', { lineHeight: '1.2' }],
        'site-hero-lead': ['clamp(1.35rem, 4.6vw, 4.2rem)', { lineHeight: '1.02', letterSpacing: '-0.045em' }],
        'site-hero-emphasis': ['clamp(2.9rem, 12.6vw, 11.5rem)', { lineHeight: '0.92', letterSpacing: '-0.03em' }],
        'site-statement': ['clamp(1.5rem, 3vw, 2.5rem)', { lineHeight: '1.2', letterSpacing: '-0.015em' }],
        'site-closing': ['clamp(2rem, 6vw, 5.4rem)', { lineHeight: '1.02', letterSpacing: '-0.03em' }],
        'site-menu': ['clamp(1.7rem, 5.4vw, 3.4rem)', { lineHeight: '1.06', letterSpacing: '-0.02em' }],
      },
      letterSpacing: {
        'widest-plus': '0.2em',
        'super-wide': '0.25em',
      },
      fontFamily: {
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'sans-serif'],
        'site-display': ['var(--font-site-display)', 'Georgia', 'serif'],
        'site-sans': ['var(--font-site-sans)', 'system-ui', 'sans-serif'],
      },
      spacing: {
        'site-gutter': 'clamp(1.125rem, 3vw, 2.75rem)',
        'site-section': 'clamp(4rem, 12vh, 8.75rem)',
        // Hero: aire arriba (bajo la cabecera) y abajo (donde asoma la foto).
        'site-hero-top': 'clamp(6rem, 15vh, 10.625rem)',
        'site-hero-bottom': 'clamp(8.75rem, 22vh, 15rem)',
        'site-hero-gap': 'clamp(1.375rem, 4vh, 2.75rem)',
        'site-hero-cta-gap': 'clamp(1.125rem, 3vh, 1.875rem)',
        'site-emphasis-gap': 'clamp(0.125rem, 0.8vw, 0.875rem)',
      },
      height: {
        // Recorrido de scroll de la apertura de la foto, y la pantalla que queda fija mientras tanto.
        'site-opening': '300vh',
        'site-screen': '100svh',
        'site-pill': '8svh',
      },
      width: {
        'site-pill': '68vw',
      },
      translate: {
        // Posición inicial de la foto: fuera de cuadro, debajo del título.
        'site-pill-start': 'calc(-50% + 56vh)',
      },
      borderRadius: {
        'site-pill': '50% / 100%',
      },
      maxWidth: {
        site: '105rem',
        'site-statement': '26ch',
        'site-text': '46ch',
        'site-subtitle': '34ch',
      },
      transitionTimingFunction: {
        'site-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'site-in': {
          from: { opacity: '0', transform: 'translateY(0.2em)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'site-in': 'site-in 900ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'site-in-late': 'site-in 900ms cubic-bezier(0.16, 1, 0.3, 1) 260ms both',
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
      {
        'lashary-site': {
          primary: siteColors.ink,
          'primary-content': siteColors.paper,
          secondary: siteColors.clay,
          'secondary-content': siteColors.paper,
          accent: siteColors.rose,
          'accent-content': siteColors.ink,
          neutral: siteColors.night,
          'neutral-content': siteColors.paper,
          'base-100': siteColors.paper,
          'base-300': siteColors.line,
          'base-content': siteColors.ink,
          // El diseño es de esquinas rectas y sin rebote en los botones.
          '--rounded-box': '0',
          '--rounded-btn': '0',
          '--rounded-badge': '0',
          '--animation-btn': '0',
          '--btn-focus-scale': '1',
        },
      },
      'light',
    ],
  },
}
