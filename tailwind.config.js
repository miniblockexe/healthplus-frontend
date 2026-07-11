/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      keyframes: {
        slideDown: {
          '0%':   { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',     opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0'  },
        },
      },
      animation: {
        'slide-down': 'slideDown 0.25s cubic-bezier(0.4,0,0.2,1)',
        'fade-in':    'fadeIn 0.2s ease',
        'shimmer':    'shimmer 1.4s infinite linear',
      },
    },
  },
  plugins: [],
};
