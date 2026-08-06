interface HeadingProps {
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  color?: string;
}

export default function Heading({
  title,
  subtitle,
  align = "center",
  color,
}: HeadingProps) {
  const headingColor = color ?? "#1E3A8A";
  const subtitleColor = color
    ? "rgba(255,255,255,0.90)"
    : "#64748B";

  return (
    <div
      style={{
        textAlign: align,
        marginBottom: "50px",
      }}
    >
      <h1
        style={{
          margin: 0,
          marginBottom: "16px",
          fontSize: "48px",
          fontWeight: 800,
          color: headingColor,
          lineHeight: 1.15,
          letterSpacing: "-1px",
        }}
      >
        {title}
      </h1>

      {subtitle && (
        <p
          style={{
            margin: 0,
            maxWidth: "760px",
            marginLeft: align === "center" ? "auto" : 0,
            marginRight: align === "center" ? "auto" : 0,
            fontSize: "20px",
            lineHeight: 1.8,
            color: subtitleColor,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}