import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: false, // 'media' | 'class' — pick what you prefer
  content: [
    './app/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config