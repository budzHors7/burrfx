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

const timing = (frame: number, fps: number, from: number, to: number) =>
  interpolate(frame, [from * fps, to * fps], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

const fadeWindow = (frame: number, fps: number, from: number, hold: number) => {
  const fadeIn = timing(frame, fps, from, from + 0.7);
  const fadeOut = interpolate(frame, [(from + hold) * fps, (from + hold + 0.7) * fps], [1, 0], clamp);

  return Math.min(fadeIn, fadeOut);
};

const linePath =
  "M 12 190 L 92 162 L 160 174 L 238 118 L 316 130 L 408 84 L 488 96 L 590 50 L 704 72 L 810 34";

function BackgroundGrid({ scan = true }: { scan?: boolean }) {
  const frame = useCurrentFrame();
  const scanX = interpolate(frame % 120, [0, 120], [-200, 1400], clamp);

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(125deg, #070a09 0%, #0a1110 54%, #111816 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.052) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.052) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          opacity: 0.56,
        }}
      />
      {scan ? (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: scanX,
            width: 220,
            height: "100%",
            background:
              "linear-gradient(90deg, transparent, rgba(51,224,96,0.16), transparent)",
          }}
        />
      ) : null}
    </>
  );
}

function Logo({ size = 46 }: { size?: number }) {
  return (
    <div style={{ display: "flex", fontSize: size, fontWeight: 900 }}>
      Burr<span style={{ color: "#33e060" }}>Fx</span>
    </div>
  );
}

function TradingTerminal({ progress }: { progress: number }) {
  return (
    <div
      style={{
        position: "absolute",
        right: 64,
        top: 108,
        width: 560,
        height: 408,
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 16,
        background: "rgba(255,255,255,0.055)",
        padding: 22,
        boxShadow: "0 34px 90px rgba(0,0,0,0.42)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ color: "#33e060", fontWeight: 900, fontSize: 18 }}>
            MT5 command center
          </div>
          <div
            style={{
              marginTop: 4,
              color: "rgba(255,255,255,0.46)",
              fontSize: 14,
              fontWeight: 800,
              textTransform: "uppercase",
            }}
          >
            Multi-signal scan
          </div>
        </div>
        <div
          style={{
            display: "flex",
            background: "#33e060",
            color: "#070a09",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 14,
            fontWeight: 900,
          }}
        >
          Running
        </div>
      </div>

      <svg width="516" height="250" viewBox="0 0 840 250" style={{ marginTop: 28 }}>
        <path
          d={linePath}
          fill="none"
          stroke="#33e060"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="10"
          strokeDasharray="950"
          strokeDashoffset={(1 - progress) * 950}
        />
        <path
          d="M 12 212 L 92 188 L 160 196 L 238 146 L 316 154 L 408 112 L 488 120 L 590 78 L 704 96 L 810 64"
          fill="none"
          stroke="#1f66ff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
          strokeDasharray="950"
          strokeDashoffset={(1 - progress) * 950}
          opacity="0.9"
        />
        {[238, 408, 590, 704].map((x, index) => (
          <circle
            key={x}
            cx={x}
            cy={[118, 84, 50, 72][index]}
            r="14"
            fill="#070a09"
            stroke={index === 2 ? "#f2a51a" : "#33e060"}
            strokeWidth="7"
          />
        ))}
      </svg>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        {["MA crossover", "Trendline PA", "SMC sweep"].map((item, index) => (
          <div
            key={item}
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10,
              padding: 14,
              background: index === 1 ? "rgba(51,224,96,0.12)" : "rgba(0,0,0,0.24)",
            }}
          >
            <div
              style={{
                color: index === 1 ? "#33e060" : "rgba(255,255,255,0.48)",
                fontSize: 13,
                fontWeight: 900,
                textTransform: "uppercase",
              }}
            >
              Strategy
            </div>
            <div style={{ marginTop: 6, fontSize: 18, fontWeight: 900 }}>
              {item}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskChecklist({ active }: { active: number }) {
  const rows = ["Spread ok", "Session ok", "Rollover clear", "Position cap ok"];

  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        bottom: 66,
        display: "flex",
        gap: 12,
      }}
    >
      {rows.map((row, index) => {
        const enabled = active >= index;

        return (
          <div
            key={row}
            style={{
              width: 188,
              border: `1px solid ${enabled ? "#33e060" : "rgba(255,255,255,0.12)"}`,
              borderRadius: 10,
              background: enabled ? "rgba(51,224,96,0.12)" : "rgba(255,255,255,0.05)",
              padding: 14,
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 20,
                background: enabled ? "#33e060" : "rgba(255,255,255,0.18)",
              }}
            />
            <div style={{ fontSize: 17, fontWeight: 900 }}>{row}</div>
          </div>
        );
      })}
    </div>
  );
}

export const BurrFxProductShowcase = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const intro = timing(frame, fps, 0, 1.1);
  const chartProgress = timing(frame, fps, 1.2, 5.2);
  const riskActive = Math.floor(interpolate(frame, [5 * fps, 8.2 * fps], [0, 4], clamp));
  const apiPulse = timing(frame, fps, 8.4, 10.5);

  const headlineA = fadeWindow(frame, fps, 0.4, 3.2);
  const headlineB = fadeWindow(frame, fps, 4.2, 3.2);
  const headlineC = timing(frame, fps, 8.4, 9.3);

  return (
    <AbsoluteFill style={{ color: "white", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <BackgroundGrid />
      <div
        style={{
          position: "absolute",
          left: 64,
          top: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: 1152,
          opacity: intro,
          transform: `translateY(${(1 - intro) * 18}px)`,
        }}
      >
        <Logo />
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: 8,
            padding: "10px 16px",
            color: "#33e060",
            fontWeight: 900,
            fontSize: 16,
            textTransform: "uppercase",
          }}
        >
          Product showreel
        </div>
      </div>

      <div style={{ position: "absolute", left: 64, top: 152, width: 560 }}>
        <div
          style={{
            position: "absolute",
            opacity: headlineA,
            transform: `translateY(${(1 - headlineA) * 22}px)`,
          }}
        >
          <div style={{ fontSize: 78, lineHeight: 0.92, fontWeight: 900 }}>
            Scan market data. Score every setup.
          </div>
          <div style={{ marginTop: 24, fontSize: 25, lineHeight: 1.32, color: "rgba(255,255,255,0.68)", fontWeight: 700 }}>
            BurrFx watches candles, spreads, account state, and strategy context around MetaTrader 5.
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            opacity: headlineB,
            transform: `translateY(${(1 - headlineB) * 22}px)`,
          }}
        >
          <div style={{ fontSize: 78, lineHeight: 0.92, fontWeight: 900 }}>
            Risk rules fire before execution.
          </div>
          <div style={{ marginTop: 24, fontSize: 25, lineHeight: 1.32, color: "rgba(255,255,255,0.68)", fontWeight: 700 }}>
            Profiles, spread filters, rollover protection, and position caps keep the bot accountable.
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            opacity: headlineC,
            transform: `translateY(${(1 - headlineC) * 22}px)`,
          }}
        >
          <div style={{ fontSize: 78, lineHeight: 0.92, fontWeight: 900 }}>
            Control the bot from API and mobile.
          </div>
          <div style={{ marginTop: 24, fontSize: 25, lineHeight: 1.32, color: "rgba(255,255,255,0.68)", fontWeight: 700 }}>
            Start, stop, monitor logs, and audit trading state from one self-hosted workflow.
          </div>
        </div>
      </div>

      <TradingTerminal progress={chartProgress} />
      <RiskChecklist active={riskActive} />

      <div
        style={{
          position: "absolute",
          right: 108,
          bottom: 74,
          width: 320,
          height: 92,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          opacity: apiPulse,
          boxShadow: "0 0 58px rgba(31,102,255,0.24)",
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: 18,
            background: "#33e060",
            boxShadow: "0 0 28px rgba(51,224,96,0.8)",
          }}
        />
        <div style={{ fontSize: 24, fontWeight: 900 }}>API + mobile online</div>
      </div>
    </AbsoluteFill>
  );
};

export const BurrFxMobileControl = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const intro = timing(frame, fps, 0, 0.9);
  const state = Math.floor(interpolate(frame, [1.2 * fps, 8.5 * fps], [0, 4], clamp));
  const phoneIn = spring({
    frame: frame - 12,
    fps,
    config: { damping: 190, stiffness: 130 },
  });

  const status = state >= 2 ? "Running" : state >= 1 ? "Armed" : "Ready";
  const statusColor = state >= 2 ? "#33e060" : state >= 1 ? "#f2a51a" : "#ffffff";

  return (
    <AbsoluteFill style={{ color: "white", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <BackgroundGrid scan={false} />
      <div
        style={{
          position: "absolute",
          left: 46,
          top: 48,
          opacity: intro,
          transform: `translateY(${(1 - intro) * 20}px)`,
        }}
      >
        <Logo size={52} />
        <div
          style={{
            marginTop: 18,
            fontSize: 54,
            lineHeight: 0.94,
            fontWeight: 900,
            width: 590,
          }}
        >
          Mobile control for your self-hosted MT5 bot.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 80,
          top: 332,
          width: 560,
          height: 816,
          borderRadius: 54,
          border: "2px solid rgba(255,255,255,0.2)",
          background: "#111615",
          padding: 28,
          boxShadow: "0 36px 90px rgba(0,0,0,0.52)",
          transform: `translateY(${(1 - phoneIn) * 52}px) scale(${0.92 + phoneIn * 0.08})`,
          opacity: phoneIn,
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 36,
            background: "#070a09",
            border: "1px solid rgba(255,255,255,0.12)",
            padding: 30,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Logo size={34} />
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 14,
                background: statusColor,
                marginTop: 12,
                boxShadow: `0 0 24px ${statusColor}`,
              }}
            />
          </div>

          <div
            style={{
              marginTop: 34,
              borderRadius: 18,
              border: `1px solid ${statusColor}`,
              background: "rgba(255,255,255,0.06)",
              padding: 24,
            }}
          >
            <div style={{ color: "rgba(255,255,255,0.52)", fontSize: 21, fontWeight: 800 }}>
              Bot status
            </div>
            <div style={{ marginTop: 8, color: statusColor, fontSize: 45, fontWeight: 900 }}>
              {status}
            </div>
          </div>

          <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              ["Equity", "12,842.75"],
              ["Daily P/L", state >= 3 ? "+214.08" : "+172.43"],
              ["Open", state >= 2 ? "3" : "0"],
              ["Risk", state >= 2 ? "28%" : "0%"],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.05)",
                  padding: 18,
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 800, color: "rgba(255,255,255,0.48)" }}>
                  {label}
                </div>
                <div style={{ marginTop: 8, fontSize: 31, fontWeight: 900, color: value.startsWith("+") ? "#33e060" : "#ffffff" }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 24,
              borderRadius: 18,
              background: state >= 2 ? "#f2a51a" : "#33e060",
              color: "#070a09",
              padding: 22,
              fontSize: 30,
              fontWeight: 900,
              textAlign: "center",
            }}
          >
            {state >= 2 ? "Stop bot" : "Start bot"}
          </div>

          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 13 }}>
            {[
              "Session authenticated",
              "Strategy cycle synced",
              "Risk checks passed",
              "Open trade alert sent",
            ].map((row, index) => {
              const active = state >= index;

              return (
                <div
                  key={row}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    color: active ? "#ffffff" : "rgba(255,255,255,0.38)",
                    fontSize: 21,
                    fontWeight: 800,
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 16,
                      background: active ? "#33e060" : "rgba(255,255,255,0.16)",
                    }}
                  />
                  {row}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
