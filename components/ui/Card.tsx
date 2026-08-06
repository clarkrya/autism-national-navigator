"use client";

import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  selected?: boolean;
  onClick?: () => void;
  hover?: boolean;
}

export default function Card({
  children,
  title,
  subtitle,
  selected = false,
  hover = true,
  onClick,
}: CardProps) {
  const defaultShadow = selected
    ? "0 18px 45px rgba(37,99,235,.18)"
    : "0 10px 30px rgba(15,23,42,.08)";

  const hoverShadow = selected
    ? "0 24px 55px rgba(37,99,235,.24)"
    : "0 18px 45px rgba(15,23,42,.12)";

  return (
    <div
      onClick={onClick}
      style={{
        background: "#FFFFFF",

        borderRadius: "24px",

        padding: "36px",

        border: selected
          ? "2px solid #2563EB"
          : "1px solid #E2E8F0",

        boxShadow: defaultShadow,

        cursor: onClick ? "pointer" : "default",

        transition:
          "transform .25s ease, box-shadow .25s ease",

        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (!hover) return;

        e.currentTarget.style.transform =
          "translateY(-6px)";

        e.currentTarget.style.boxShadow =
          hoverShadow;
      }}
      onMouseLeave={(e) => {
        if (!hover) return;

        e.currentTarget.style.transform =
          "translateY(0)";

        e.currentTarget.style.boxShadow =
          defaultShadow;
      }}
    >
      {title && (
        <h3
          style={{
            margin: 0,
            marginBottom: "12px",

            color: "#0F172A",

            fontSize: "28px",

            fontWeight: 800,

            lineHeight: 1.2,
          }}
        >
          {title}
        </h3>
      )}

      {subtitle && (
        <p
          style={{
            marginTop: 0,
            marginBottom: "28px",

            color: "#64748B",

            fontSize: "17px",

            lineHeight: 1.8,
          }}
        >
          {subtitle}
        </p>
      )}

      {children}
    </div>
  );
}