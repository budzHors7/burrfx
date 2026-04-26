import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "BurrFx product card showing MT5 automation, risk profiles, API control, and mobile visibility";
export const size = {
  width: 1200,
  height: 675,
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
          background: "#f4f1e8",
          color: "#080b0a",
          padding: 54,
          fontFamily: "Arial, Helvetica, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -80,
            top: -40,
            width: 520,
            height: 520,
            borderRadius: 520,
            border: "72px solid #33e060",
            opacity: 0.18,
          }}
        />
        <div
          style={{
            width: "100%",
            borderRadius: 18,
            background: "#070a09",
            color: "#ffffff",
            padding: 48,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              opacity: 0.18,
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
              backgroundSize: "70px 70px",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div style={{ display: "flex", fontSize: 50, fontWeight: 900 }}>
              Burr<span style={{ color: "#33e060" }}>Fx</span>
            </div>
            <div
              style={{
                display: "flex",
                color: "#33e060",
                fontSize: 20,
                fontWeight: 900,
                textTransform: "uppercase",
              }}
            >
              Self-hosted MT5 control
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 34,
              alignItems: "flex-end",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 86,
                  lineHeight: 0.92,
                  fontWeight: 900,
                  maxWidth: 690,
                }}
              >
                Automate with confidence. Stay in control.
              </div>
              <div
                style={{
                  display: "flex",
                  marginTop: 24,
                  fontSize: 25,
                  lineHeight: 1.35,
                  color: "rgba(255,255,255,0.66)",
                  maxWidth: 700,
                }}
              >
                Strategy logic, risk profiles, FastAPI controls, and mobile
                monitoring around your MetaTrader 5 workflow.
              </div>
            </div>
            <div
              style={{
                width: 276,
                height: 402,
                border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: 26,
                background: "rgba(255,255,255,0.07)",
                padding: 18,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {[
                ["Equity", "12,842.75"],
                ["Daily P/L", "+172.43"],
                ["Open positions", "3"],
                ["Risk usage", "28%"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12,
                    padding: 13,
                    background: "rgba(0,0,0,0.22)",
                  }}
                >
                  <span
                    style={{
                      color: "rgba(255,255,255,0.5)",
                      fontSize: 15,
                      fontWeight: 800,
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      color: value.startsWith("+") ? "#33e060" : "#ffffff",
                      fontSize: 26,
                      fontWeight: 900,
                      marginTop: 4,
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
