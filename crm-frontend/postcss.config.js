module.exports = {
  plugins: {
    // IMPORTANT: Order matters! postcss-import must come BEFORE tailwindcss
    'postcss-import': {},
    tailwindcss: {},
    autoprefixer: {},
  },
}
