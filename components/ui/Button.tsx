"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline";
  fullWidth?: boolean;
}

export default function Button({
  children,
  variant = "primary",
  fullWidth = false,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const background =
    variant === "primary"
      ? "#2563EB"
      : variant === "secondary"
      ? "#14B8A6"
      : "#FFFFFF";

  const color =
    variant === "outline"
      ? "#2563EB"
      : "#FFFFFF";

  const border =
    variant === "outline"
      ? "2px solid #2563EB"
      : "none";

  const defaultShadow =
    variant === "primary"
      ? "0 12px 30px rgba(37,99,235,.25)"
      : variant === "secondary"
      ? "0 10px 25px rgba(20,184,166,.20)"
      : "none";

  const hoverShadow =
    variant === "primary"
      ? "0 18px 40px rgba(37,99,235,.30)"
      : variant === "secondary"
      ? "0 16px 34px rgba(20,184,166,.28)"
      : "none";

  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        background,
        color,
        border,

        borderRadius: "16px",

        padding: "18px 34px",

        minHeight: "58px",

        fontSize: "18px",

        fontWeight: 700,

        lineHeight: 1.2,

        cursor: disabled ? "not-allowed" : "pointer",

        width: fullWidth ? "100%" : "auto",

        transition:
          "transform .25s ease, box-shadow .25s ease",

        boxShadow: defaultShadow,

        opacity: disabled ? 0.55 : 1,

        outline: "none",

        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = "translateY(-3px)";
          e.currentTarget.style.boxShadow = hoverShadow;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = defaultShadow;
      }}
    >
      {children}
    </button>
  );
}