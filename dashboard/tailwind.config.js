/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cyber-black': '#090a0f',
        'cyber-darker': '#0f111a',
        'cyber-dark': '#151926',
        'cyber-gray': '#22283b',
        'cyber-green': '#00ff87',
        'cyber-red': '#ff4655',
        'cyber-blue': '#00e5ff',
        'cyber-yellow': '#ffb300',
        'cyber-purple': '#bf55ec',
        'cyber-orange': '#ff793f',
        'cyber-pink': '#ff007f'
      },
      boxShadow: {
        'neon-green': '0 0 15px rgba(0, 255, 135, 0.2)',
        'neon-red': '0 0 15px rgba(255, 70, 85, 0.2)',
        'neon-blue': '0 0 15px rgba(0, 229, 255, 0.2)',
        'glow': '0 0 20px rgba(0, 255, 135, 0.35)'
      }
    },
  },
  plugins: [],
}

