import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 80px",
          backgroundColor: "#FAF7F2",
          position: "relative",
        }}
      >
        {/* Decorative corner accent */}
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: "360px",
            height: "360px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(45, 106, 79, 0.15) 0%, rgba(250, 247, 242, 0) 70%)",
          }}
        />

        {/* Top bar: Pill & Tagline */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "rgba(45, 106, 79, 0.1)",
              border: "1px solid rgba(45, 106, 79, 0.25)",
              color: "#2D6A4F",
              padding: "8px 20px",
              borderRadius: "9999px",
              fontSize: "18px",
              fontWeight: 700,
              letterSpacing: "1.5px",
            }}
          >
            HYPERLOCAL KERALA MARKETPLACE
          </div>

          <div
            style={{
              fontSize: "20px",
              color: "#7D5A3C",
              fontWeight: 600,
            }}
          >
            ഹൃദയപൂർവ്വം കേരളത്തിൽ നിന്നും 🌿
          </div>
        </div>

        {/* Center: Brand & Main Value Proposition */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              fontSize: "72px",
              fontWeight: 900,
              color: "#2D6A4F",
              letterSpacing: "-2px",
              lineHeight: 1,
            }}
          >
            MADETRUE
          </div>
          <div
            style={{
              fontSize: "36px",
              fontWeight: 700,
              color: "#1A1A1A",
              lineHeight: 1.25,
              maxWidth: "960px",
            }}
          >
            Real Kerala Spices, Organics & Traditional Crafts Direct from Local Makers
          </div>
          <div
            style={{
              fontSize: "22px",
              color: "#7D5A3C",
              lineHeight: 1.4,
              maxWidth: "880px",
            }}
          >
            Connecting spice farmers, artisanal creators & home kitchens directly with nearby neighbors.
          </div>
        </div>

        {/* Bottom bar: Trust Pillars */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "24px",
            borderTop: "2px solid rgba(125, 90, 60, 0.15)",
            fontSize: "18px",
            color: "#1A1A1A",
          }}
        >
          <div style={{ display: "flex", gap: "36px", fontWeight: 600 }}>
            <span>• Verified Kerala Makers</span>
            <span>• Doorstep & Self-Pickup</span>
            <span>• Fair Maker Split</span>
          </div>
          <div style={{ fontWeight: 800, color: "#2D6A4F", fontSize: "20px" }}>
            madetrue.in
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

