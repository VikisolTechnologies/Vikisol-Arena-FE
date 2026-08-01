import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          display: "flex",
          background:
            "radial-gradient(circle at 36% 30%, #6e2f12 0%, #241108 46%, #FF6B35 100%)",
        }}
      />
    ),
    { ...size },
  );
}
