import { ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
  size?: "small" | "medium" | "large";
}

export default function Container({
  children,
  size = "medium",
}: ContainerProps) {
  const maxWidth =
    size === "small"
      ? "700px"
      : size === "large"
      ? "1200px"
      : "900px";

  return (
    <div
      style={{
        maxWidth,
        margin: "0 auto",
        padding: "40px 20px",
        width: "100%",
      }}
    >
      {children}
    </div>
  );
}