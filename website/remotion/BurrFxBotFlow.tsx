import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const steps = [
  {
    title: "DATA",
    label: "Market feed",
    color: "#1f66ff",
    icon: "M 14 66 L70 42 L116 54 L168 24 L226 34 L284 14",
  },
  {
    title: "STRATEGY",
    label: "Signal scan",
    color: "#33e060",
    icon: "M52 26 L84 58 L52 90 L20 58 Z",
  },
  {
    title: "RISK",
    label: "Guardrails",
    color: "#f2a51a",
    icon: "M54 16 L94 30 L86 76 L54 102 L22 76 L14 30 Z",
  },
  {
    title: "MT5",
    label: "Execution",
    color: "#33e060",
    icon: "M22 30 H88 V92 H22 Z M34 48 H76 M34 62 H76 M34 76 H58",
  },
  {
    title: "MOBILE",
    label: "Monitor",
    color: "#1f66ff",
    icon: "M36 18 H82 V104 H36 Z M50 86 H68",
  },
];

export const BurrFxBotFlow = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const intro = interpolate(frame, [0, fps * 0.8], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const loop = interpolate(frame, [fps * 0.75, fps * 4.8], [0, 1], clamp);
  const pulse = (Math.sin(frame / 6) + 1) / 2;
  const scanX = interpolate(frame % 90, [0, 90], [-80, 1040], clamp);

  return (
    <AbsoluteFill
      style={{
        background: "#070a09",
        color: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          opacity: 0.45,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: scanX,
          top: 0,
          width: 180,
          height: 540,
          background:
            "linear-gradient(90deg, transparent, rgba(51,224,96,0.18), transparent)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 54,
          top: 38,
          opacity: intro,
          transform: `translateY(${(1 - intro) * 18}px)`,
        }}
      >
        <div style={{ fontSize: 42, fontWeight: 900, lineHeight: 1 }}>
          Burr<span style={{ color: "#33e060" }}>Fx</span>
        </div>
        <div
          style={{
            marginTop: 8,
            color: "rgba(255,255,255,0.58)",
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          From signal to controlled execution
        </div>
      </div>

      <svg
        width="900"
        height="150"
        viewBox="0 0 900 150"
        style={{ position: "absolute", left: 30, top: 120, opacity: 0.72 }}
      >
        <path
          d="M10 112 L96 88 L166 103 L238 58 L318 69 L412 38 L492 48 L578 24 L670 40 L772 18 L890 30"
          fill="none"
          stroke="#33e060"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="6"
          strokeDasharray="960"
          strokeDashoffset={interpolate(frame, [12, 82], [960, 0], clamp)}
        />
        <path
          d="M10 124 L96 100 L166 115 L238 70 L318 81 L412 50 L492 60 L578 36 L670 52 L772 30 L890 42"
          fill="none"
          stroke="#1f66ff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          strokeDasharray="960"
          strokeDashoffset={interpolate(frame, [24, 94], [960, 0], clamp)}
          opacity="0.8"
        />
      </svg>

      <div
        style={{
          position: "absolute",
          left: 50,
          top: 228,
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 16,
          width: 860,
        }}
      >
        {steps.map((step, index) => {
          const start = 24 + index * 20;
          const cardIn = spring({
            frame: frame - start,
            fps,
            config: { damping: 180, stiffness: 140 },
          });
          const active = loop >= index / (steps.length - 1);
          const glow = active ? 0.18 + pulse * 0.22 : 0.06;

          return (
            <div key={step.title} style={{ position: "relative" }}>
              <div
                style={{
                  boxSizing: "border-box",
                  height: 190,
                  border: `1px solid ${active ? step.color : "rgba(255,255,255,0.14)"}`,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.055)",
                  boxShadow: `0 24px 60px rgba(0,0,0,0.32), 0 0 42px rgba(51,224,96,${glow})`,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  opacity: cardIn,
                  transform: `translateY(${(1 - cardIn) * 24}px) scale(${0.96 + cardIn * 0.04})`,
                }}
              >
                <div
                  style={{
                    color: step.color,
                    fontSize: 18,
                    fontWeight: 900,
                  }}
                >
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                  <svg width="102" height="82" viewBox="0 0 116 116">
                    <path
                      d={step.icon}
                      fill="none"
                      stroke={step.color}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="7"
                      opacity={active ? 1 : 0.52}
                    />
                  </svg>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 900,
                      lineHeight: 1,
                    }}
                  >
                    {step.title}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      color: "rgba(255,255,255,0.58)",
                      fontSize: 13,
                      fontWeight: 700,
                      lineHeight: 1.2,
                    }}
                  >
                    {step.label}
                  </div>
                </div>
              </div>

              {index < steps.length - 1 ? (
                <div
                  style={{
                    position: "absolute",
                    right: -18,
                    top: 98,
                    width: 20,
                    height: 4,
                    borderRadius: 8,
                    background:
                      loop > (index + 0.25) / (steps.length - 1)
                        ? "#33e060"
                        : "rgba(255,255,255,0.24)",
                    boxShadow:
                      loop > (index + 0.25) / (steps.length - 1)
                        ? "0 0 28px rgba(51,224,96,0.65)"
                        : "none",
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          left: 50,
          bottom: 36,
          right: 50,
          height: 62,
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.055)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          opacity: interpolate(frame, [78, 110], [0, 1], clamp),
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 20,
              background: "#33e060",
              boxShadow: "0 0 28px rgba(51,224,96,0.8)",
            }}
          />
          <span style={{ fontSize: 18, fontWeight: 900 }}>
            Real-time feedback loop
          </span>
        </div>
        <span
          style={{
            color: "#f2a51a",
            fontSize: 15,
            fontWeight: 800,
            textTransform: "uppercase",
          }}
        >
          Risk rules before execution
        </span>
      </div>
    </AbsoluteFill>
  );
};
