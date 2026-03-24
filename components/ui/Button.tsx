import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
}

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

  const variants = {
    primary: `${base} px-4 py-2 text-sm font-medium tracking-wide
      bg-gold text-[#0D1117] border-none rounded-sm
      hover:opacity-[0.88]`,
    ghost: `${base} px-3 py-2 text-sm
      bg-bg-surface-2 text-text-secondary border border-hi rounded-sm
      hover:text-text-primary hover:border-[rgba(255,255,255,0.20)]`,
  };

  return (
    <button
      className={`${variants[variant]} ${className}`}
      style={{
        fontFamily: "var(--font-condensed)",
        fontWeight: 600,
        fontSize: "11px",
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        borderRadius: "5px",
      }}
      {...props}
    >
      {children}
    </button>
  );
}
