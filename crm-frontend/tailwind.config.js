/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Professional Color System
      colors: {
        background: 'rgb(var(--color-background) / <alpha-value>)',
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        
        text: {
          primary: 'rgb(var(--color-text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
        },
        
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          hover: 'rgb(var(--color-primary-hover) / <alpha-value>)',
        },
        
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        
        // Legacy colors (for migration)
        ivoire: '#FEFBF7',
        ardoise: '#2C3E50',
        bleu: '#3498DB',
        vert: '#27AE60',
        rouge: '#E74C3C',
        gris: '#95A5A6',
      },
      
      // Professional Spacing System (8px base)
      spacing: {
        'spacing-xs': 'var(--spacing-xs)',
        'spacing-sm': 'var(--spacing-sm)',
        'spacing-md': 'var(--spacing-md)',
        'spacing-lg': 'var(--spacing-lg)',
        'spacing-xl': 'var(--spacing-xl)',
        'spacing-2xl': 'var(--spacing-2xl)',
        'spacing-3xl': 'var(--spacing-3xl)',

        // ✨ Fluid Spacing with clamp() - Responsive V2
        'fluid-1': 'clamp(0.25rem, 0.5vw, 0.5rem)',   // 4-8px
        'fluid-2': 'clamp(0.5rem, 1vw, 0.75rem)',     // 8-12px
        'fluid-3': 'clamp(0.75rem, 1.5vw, 1rem)',     // 12-16px
        'fluid-4': 'clamp(1rem, 2vw, 1.5rem)',        // 16-24px
        'fluid-5': 'clamp(1.25rem, 2.5vw, 2rem)',     // 20-32px
        'fluid-6': 'clamp(1.5rem, 3vw, 2.5rem)',      // 24-40px
        'fluid-8': 'clamp(2rem, 4vw, 3.5rem)',        // 32-56px
        'fluid-12': 'clamp(3rem, 6vw, 5rem)',         // 48-80px
        'fluid-16': 'clamp(4rem, 8vw, 7rem)',         // 64-112px
      },
      
      // Border Radius System
      borderRadius: {
        'radius-sm': 'var(--radius-sm)',
        'radius-md': 'var(--radius-md)',
        'radius-lg': 'var(--radius-lg)',
        'radius-xl': 'var(--radius-xl)',
        'radius-2xl': 'var(--radius-2xl)',
      },
      
      // Professional Typography
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'SF Mono',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace',
        ],
      },
      
      // Font Sizes with Line Heights
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.875rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.75rem' }],
        '5xl': ['3rem', { lineHeight: '3.5rem' }],

        // ✨ Fluid Typography with clamp() - Responsive V2
        'fluid-xs': ['clamp(0.7rem, 0.9vw, 0.8rem)', { lineHeight: '1.4' }],
        'fluid-sm': ['clamp(0.8rem, 1vw, 0.9rem)', { lineHeight: '1.5' }],
        'fluid-base': ['clamp(0.9rem, 1.2vw, 1.1rem)', { lineHeight: '1.6' }],
        'fluid-lg': ['clamp(1rem, 1.5vw, 1.3rem)', { lineHeight: '1.6' }],
        'fluid-xl': ['clamp(1.1rem, 2vw, 1.5rem)', { lineHeight: '1.5' }],
        'fluid-2xl': ['clamp(1.3rem, 2.5vw, 1.9rem)', { lineHeight: '1.4' }],
        'fluid-3xl': ['clamp(1.6rem, 3vw, 2.4rem)', { lineHeight: '1.3' }],
        'fluid-4xl': ['clamp(2rem, 4vw, 3rem)', { lineHeight: '1.2' }],
        'fluid-5xl': ['clamp(2.5rem, 5vw, 4rem)', { lineHeight: '1.1' }],
      },
      
      // Professional Shadows
      boxShadow: {
        'shadow-sm': 'var(--shadow-sm)',
        'shadow-md': 'var(--shadow-md)',
        'shadow-lg': 'var(--shadow-lg)',
        'shadow-xl': 'var(--shadow-xl)',
        'inner-sm': 'inset 0 1px 1px 0 rgb(0 0 0 / 0.05)',
        'glow': '0 0 20px rgb(59 130 246 / 0.5)',
        'glow-lg': '0 0 40px rgb(59 130 246 / 0.4)',
      },
      
      // Animations
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-out': 'fadeOut 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-out': 'slideOut 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'zoom-in': 'zoomIn 0.2s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'bounce-soft': 'bounceSoft 1s infinite',
        'spin-slow': 'spin 3s linear infinite',
        'wave': 'wave 1.5s ease-in-out infinite',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeOut: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(10px)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideOut: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(100%)' },
        },
        zoomIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        wave: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      
      // Transition Timings
      transitionDuration: {
        'fast': 'var(--transition-fast)',
        'base': 'var(--transition-base)',
        'slow': 'var(--transition-slow)',
      },
      
      // Z-Index Scale
      zIndex: {
        dropdown: '1000',
        modal: '9000',
        popover: '9100',
        tooltip: '9200',
        toast: '9300',
      },
      
      // Backdrop Blur
      backdropBlur: {
        xs: '2px',
      },
      
      // Grid Template Columns
      gridTemplateColumns: {
        'auto-fill-100': 'repeat(auto-fill, minmax(100px, 1fr))',
        'auto-fill-200': 'repeat(auto-fill, minmax(200px, 1fr))',
        'auto-fill-300': 'repeat(auto-fill, minmax(300px, 1fr))',
      },
      
      // Container
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '2rem',
          lg: '4rem',
          xl: '6rem',
          '2xl': '8rem',
        },
      },
    },
  },
  plugins: [
    // ✨ Container Queries Plugin - Responsive V2
    require('@tailwindcss/container-queries'),

    // Custom plugin for additional utilities
    function ({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          /* Hide scrollbar for Chrome, Safari and Opera */
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          /* Hide scrollbar for IE, Edge and Firefox */
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
        },
        '.text-balance': {
          'text-wrap': 'balance',
        },
      });
    },
  ],
}
