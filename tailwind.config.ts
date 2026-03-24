import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        "bg-base": "var(--bg-base)",
        "bg-surface-1": "var(--bg-surface-1)",
        "bg-surface-2": "var(--bg-surface-2)",
        "bg-surface-3": "var(--bg-surface-3)",

        // Text
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",

        // Gold accent
        gold: "var(--gold)",
        "gold-dim": "var(--gold-dim)",
        "gold-glow": "var(--gold-glow)",
        "gold-border": "var(--gold-border)",

        // Actor colors
        "actor-us": "var(--actor-us)",
        "actor-iran": "var(--actor-iran)",
        "actor-israel": "var(--actor-israel)",
        "actor-russia": "var(--actor-russia)",
        "actor-china": "var(--actor-china)",
        "actor-generic": "var(--actor-generic)",

        // Status
        "status-critical": "var(--status-critical)",
        "status-critical-bg": "var(--status-critical-bg)",
        "status-critical-border": "var(--status-critical-border)",
        "status-warning": "var(--status-warning)",
        "status-warning-bg": "var(--status-warning-bg)",
        "status-stable": "var(--status-stable)",
        "status-stable-bg": "var(--status-stable-bg)",
        "status-stable-border": "var(--status-stable-border)",
        "status-info": "var(--status-info)",
        "status-info-bg": "var(--status-info-bg)",
        "status-info-border": "var(--status-info-border)",
      },
      borderColor: {
        subtle: "var(--border-subtle)",
        hi: "var(--border-hi)",
        gold: "var(--gold-border)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
        condensed: ["var(--font-condensed)"],
      },
      fontSize: {
        "2xs": ["9px", { lineHeight: "1.4" }],
        xs: ["10px", { lineHeight: "1.4" }],
        sm: ["11px", { lineHeight: "1.5" }],
        base: ["12px", { lineHeight: "1.5" }],
        md: ["13px", { lineHeight: "1.5" }],
        lg: ["15px", { lineHeight: "1.6" }],
        xl: ["17px", { lineHeight: "1.4" }],
        "2xl": ["18px", { lineHeight: "1.3" }],
      },
      borderRadius: {
        tag: "4px",
        card: "6px",
        sm: "5px",
      },
      spacing: {
        "panel-x": "14px",
        "panel-y": "12px",
        "topbar": "42px",
        "banner": "24px",
      },
      transitionDuration: {
        "150": "150ms",
        "200": "200ms",
        "300": "300ms",
      },
    },
  },
  plugins: [],
};
export default config;
