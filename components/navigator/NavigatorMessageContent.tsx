"use client";

import ReactMarkdown from "react-markdown";

type NavigatorMessageContentProps = {
  text: string;
};

export default function NavigatorMessageContent({
  text,
}: NavigatorMessageContentProps) {
  return (
    <div
      style={{
        fontSize: "15px",
        lineHeight: 1.7,
        overflowWrap: "anywhere",
        whiteSpace: "normal",
      }}
    >
      <ReactMarkdown
        skipHtml
        urlTransform={(url) => {
          try {
            const parsed = new URL(url);

            return parsed.protocol === "https:" &&
              !parsed.username &&
              !parsed.password
              ? parsed.href
              : "";
          } catch {
            return "";
          }
        }}
        components={{
          h1: ({ children }) => (
            <h2
              style={{
                fontSize: "19px",
                fontWeight: 700,
                margin: "0 0 12px",
                color: "#204D6A",
              }}
            >
              {children}
            </h2>
          ),

          h2: ({ children }) => (
            <h3
              style={{
                fontSize: "17px",
                fontWeight: 700,
                margin: "20px 0 8px",
                color: "#204D6A",
              }}
            >
              {children}
            </h3>
          ),

          h3: ({ children }) => (
            <h4
              style={{
                fontSize: "15px",
                fontWeight: 700,
                margin: "16px 0 6px",
                color: "#204D6A",
              }}
            >
              {children}
            </h4>
          ),

          p: ({ children }) => (
            <p style={{ margin: "0 0 12px" }}>
              {children}
            </p>
          ),

          strong: ({ children }) => (
            <strong
              style={{
                fontWeight: 650,
                color: "#204D6A",
              }}
            >
              {children}
            </strong>
          ),

          ul: ({ children }) => (
            <ul
              style={{
                paddingLeft: "22px",
                margin: "8px 0 14px",
                listStyleType: "disc",
              }}
            >
              {children}
            </ul>
          ),

          ol: ({ children }) => (
            <ol
              style={{
                paddingLeft: "22px",
                margin: "8px 0 14px",
                listStyleType: "decimal",
              }}
            >
              {children}
            </ol>
          ),

          li: ({ children }) => (
            <li style={{ marginBottom: "8px" }}>
              {children}
            </li>
          ),

          a: ({ href, children }) =>
            href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#176B87",
                  fontWeight: 600,
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                }}
              >
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),

          hr: () => (
            <hr
              style={{
                border: 0,
                borderTop: "1px solid #D7E2E8",
                margin: "18px 0",
              }}
            />
          ),

          img: () => null,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}