import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "#090b0a",
          borderRadius: 36,
          border: "8px solid #77f29b",
          color: "#77f29b",
          fontFamily: "sans-serif",
          fontWeight: 800,
          fontSize: 92,
          letterSpacing: -8,
          paddingRight: 8,
        }}
      >
        PT
      </div>
    ),
    size,
  );
}
