import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: false, // 'media' | 'class' — pick what you prefer
  content: [
    './app/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'settings-text': 'var(--color-settings-text)',
        'settings-sidebar-selected': 'var(--color-settings-sidebar-selected)',
        'palette-rich-teal': '#046A7A',
        'palette-aqua-green': '#6AB4A9',
        'palette-powder-blue': '#E0EFEF',
        'palette-peach-puff': '#FBE4DD',
        'palette-sandy-brown': '#E6A895',
      },
      fontFamily: {
        inter: ['var(--font-inter)'],
        mono: ['var(--font-mono)'],
      },
    },
  },
  plugins: [],
};
export default config;
