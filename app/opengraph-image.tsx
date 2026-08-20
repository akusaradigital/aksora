import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";

export const alt = "Aksora — One Team. One Flow.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const logoBase64 = fs.readFileSync(
  path.join(process.cwd(), "public", "icon-light.png")
).toString("base64");
const logoDataUri = `data:image/png;base64,${logoBase64}`;

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#030712",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* Grid pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.05,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "32px",
            }}
          >
            <div
              style={{
                display: "flex",
                width: "64px",
                height: "64px",
                borderRadius: "16px",
                backgroundColor: "white",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img src={logoDataUri} width={48} height={48} />
            </div>
            <span style={{ color: "white", fontSize: "28px", fontWeight: 700 }}>
              Aksora
            </span>
          </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            maxWidth: "800px",
          }}
        >
          <h1
            style={{
              color: "white",
              fontSize: "52px",
              fontWeight: 700,
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            Test Management &
          </h1>
          <h1
            style={{
              fontSize: "52px",
              fontWeight: 700,
              lineHeight: 1.2,
              margin: 0,
              background: "linear-gradient(to right, #60a5fa, #67e8f9)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Bug Tracking Platform
          </h1>
          <p
            style={{
              color: "#9ca3af",
              fontSize: "20px",
              marginTop: "16px",
            }}
          >
            One Team. One Flow.
          </p>
        </div>

        {/* Bottom badge */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            display: "flex",
            gap: "24px",
            color: "#6b7280",
            fontSize: "14px",
          }}
        >
          <span>• Free for small teams</span>
          <span>• Setup in 2 minutes</span>
          <span>• No credit card required</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
