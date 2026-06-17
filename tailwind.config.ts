import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: { '2xl': '1400px' }
		},
		extend: {
			fontFamily: {
				pixel: ['"Press Start 2P"', 'monospace'],
				vt323: ['VT323', 'monospace'],
				rubik: ['Rubik', 'sans-serif'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				g0: '#1c1c1c',
				g1: '#333333',
				g2: '#2a8c2a',
				g3: '#36aa36',
				g4: '#52c852',
				g5: '#c8e8c8',
				g6: '#f0f0ee',
				g7: '#f9f9f7',
				ink: '#1c1c1c',
				paper: '#f7f7f5',
			},
			borderRadius: {
				lg: '0px',
				md: '0px',
				sm: '0px',
			},
			boxShadow: {
				pixel: '4px 4px 0 #0a2e0a',
				'pixel-sm': '2px 2px 0 #0a2e0a',
				'pixel-lg': '6px 6px 0 #0a2e0a',
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				fadeIn: {
					from: { opacity: '0', transform: 'translateY(8px)' },
					to: { opacity: '1', transform: 'translateY(0)' },
				},
				scaleIn: {
					from: { opacity: '0', transform: 'scale(0.9)' },
					to: { opacity: '1', transform: 'scale(1)' },
				},
				blink: {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0' },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s steps(4) ease-out',
				'accordion-up': 'accordion-up 0.2s steps(4) ease-out',
				'fade-in': 'fadeIn 0.2s steps(4) forwards',
				'scale-in': 'scaleIn 0.15s steps(3) forwards',
				'blink': 'blink 1s steps(1) infinite',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;