import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "BurrFx MetaTrader 5 trading bot control system with strategy, risk, API, and mobile monitoring";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#070a09",
          color: "#ffffff",
          padding: 58,
          fontFamily: "Arial, Helvetica, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            opacity: 0.22,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", fontSize: 54, fontWeight: 900 }}>
            Burr<span style={{ color: "#33e060" }}>Fx</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 8,
              padding: "12px 18px",
              color: "rgba(255,255,255,0.72)",
              fontSize: 18,
              fontWeight: 800,
            }}
          >
            MT5 Automation
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 44,
            flex: 1,
            position: "relative",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                fontSize: 92,
                lineHeight: 0.92,
                fontWeight: 900,
                letterSpacing: 0,
                maxWidth: 700,
              }}
            >
              Turn MT5 signals into{" "}
              <span style={{ color: "#33e060" }}>controlled</span> execution.
            </div>
            <div
              style={{
                marginTop: 28,
                display: "flex",
                color: "rgba(255,255,255,0.68)",
                fontSize: 28,
                lineHeight: 1.35,
                maxWidth: 650,
              }}
            >
              Strategy automation, risk guardrails, API controls, and mobile
              visibility for self-hosted trading workflows.
            </div>
          </div>

          <div
            style={{
              width: 340,
              height: 300,
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 16,
              background: "rgba(255,255,255,0.06)",
              padding: 22,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 24px 70px rgba(51,224,96,0.18)",
            }}
          >
            {["Data feed", "Strategy", "Risk", "MT5", "Mobile"].map(
              (item, index) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom:
                      index === 4
                        ? "0"
                        : "1px solid rgba(255,255,255,0.12)",
                    paddingBottom: index === 4 ? 0 : 12,
                    color: index === 2 ? "#f2a51a" : "#ffffff",
                    fontSize: 24,
                    fontWeight: 900,
                  }}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span>{item}</span>
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
