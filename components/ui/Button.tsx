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
    "inline-flex items-center justify-center font-label font-semibold text-sm tracking-wide uppercase rounded-none transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

  const variants = {
    primary: `${base} px-4 py-2 bg-gold text-[#0D1117] border-none hover:opacity-[0.88]`,
    ghost: `${base} px-3 py-2 bg-bg-surface text-text-secondary border border-border-hi hover:text-text-primary hover:border-[rgba(255,255,255,0.20)]`,
  };

  return (
    <button
      className={`${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
