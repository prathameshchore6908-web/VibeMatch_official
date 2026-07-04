/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./App.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primarySky: '#0284C7',       // Sky 600
        primarySkyHover: '#0369A1',  // Sky 700
        primarySkyLight: '#F0F9FF',  // Sky 50
        primarySkyMuted: 'rgba(2, 132, 199, 0.1)',
        borderSlate: 'rgba(15, 23, 42, 0.08)',
        slateBg: '#F8FAFC',
        slateText: '#0F172A',
        
        // Adapt original variables to new Slate/Sky theme values for compatibility
        darkbg: '#0F172A',
        panelbg: 'rgba(30, 41, 59, 0.04)', // Minimalistic translucent card background
        bordercolor: 'rgba(15, 23, 42, 0.08)',
        accentPurple: '#0284C7', // Remapped purple to sky blue
        accentTeal: '#0EA5E9',   // Remapped teal to sky 500
        accentPink: '#EC4899',   // Red/Pink accent for warnings
      }
    },
  },
  plugins: [],
}
