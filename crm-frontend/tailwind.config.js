/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Couleurs TPM Finance (cohérent avec votre branding)
        ivoire: '#FEFBF7',
        ardoise: '#2C3E50',
        bleu: '#3498DB',
        vert: '#27AE60',
        rouge: '#E74C3C',
        gris: '#95A5A6',
      },
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};