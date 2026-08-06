import { ReactNode } from "react";

interface SectionProps {
  children: ReactNode;
  spacing?: "small" | "medium" | "large";
}

export default function Section({
  children,
  spacing = "medium",
}: SectionProps) {
  const marginBottom =
    spacing === "small"
      ? "30px"
      : spacing === "large"
      ? "80px"
      : "50px";

  return (
    <section
      style={{
        marginBottom,
        width: "100%",
      }}
    >
      {children}
    </section>
  );
}