import Image from "next/image";
import { Icon, Pill } from "@/components/primitives";
import { Wordmark } from "@/components/chrome/Wordmark";
import { DEFAULT_ACCENT_COLOR } from "@/lib/constants";

const STRAVA_OAUTH_PATH = "/api/auth/strava";

const FEATURE_BULLETS = [
  "Auto-generated on every PR",
  "IG square · story · reel · GIF",
  "No data sold. ever.",
];

const stravaButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "14px 26px",
  fontFamily: "var(--font-body)",
  fontSize: 16,
  fontWeight: 600,
  borderRadius: 12,
  background: "#FC4C02",
  color: "var(--accent-fg)",
  textDecoration: "none",
  boxShadow: "0 4px 16px rgba(252,76,2,0.28)",
} as const;

export function ConnectScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ink)",
        color: "var(--bone)",
        display: "grid",
        gridTemplateColumns: "1.1fr 1fr",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "56px 72px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          zIndex: 2,
        }}
      >
        <Wordmark size="md" accent={DEFAULT_ACCENT_COLOR} />

        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 124,
              lineHeight: 0.88,
              letterSpacing: "-0.02em",
              margin: 0,
              fontWeight: 400,
              color: "var(--bone)",
            }}
          >
            YOUR RUNS,
            <br />
            WORTH
            <br />
            <span style={{ color: DEFAULT_ACCENT_COLOR }}>SHARING.</span>
          </h1>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 18,
              color: "var(--fg-2)",
              maxWidth: 480,
              marginTop: 28,
              lineHeight: 1.5,
            }}
          >
            Connect Strava. Set your goals. Every PR and milestone becomes a
            video, image, or GIF — ready to post.
          </p>
          <div
            style={{
              marginTop: 36,
              display: "flex",
              gap: 16,
              alignItems: "center",
            }}
          >
            <a href={STRAVA_OAUTH_PATH} style={stravaButtonStyle}>
              <Image
                src="/assets/strava-mark.svg"
                width={20}
                height={20}
                alt=""
                style={{ borderRadius: 4 }}
              />
              Connect Strava
            </a>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--fg-3)",
              }}
            >
              free · open source
            </span>
          </div>
          <div
            style={{
              marginTop: 28,
              display: "flex",
              gap: 24,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {FEATURE_BULLETS.map((b) => (
              <span
                key={b}
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  color: "var(--fg-3)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Icon name="check" size={14} color={DEFAULT_ACCENT_COLOR} />
                {b}
              </span>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 32,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-3)",
          }}
        >
          <span>github.com/atk81/running-stats</span>
        </div>
      </div>

      <div
        aria-hidden="true"
        style={{
          position: "relative",
          padding: 48,
          display: "grid",
          placeItems: "center",
          borderLeft: "1px solid var(--ink-3)",
          overflow: "hidden",
        }}
      >
        <svg
          width="100%"
          height="100%"
          style={{ position: "absolute", inset: 0, opacity: 0.05 }}
        >
          <defs>
            <pattern id="rs-connect-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#rs-connect-grid)" />
        </svg>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 360,
              aspectRatio: "1 / 1",
              background: "var(--ink-2)",
              borderRadius: 16,
              overflow: "hidden",
              display: "grid",
              gridTemplateColumns: "1.1fr 1fr",
              boxShadow: "0 40px 80px rgba(0,0,0,0.5)",
              transform: "rotate(-3deg)",
              animation: "rs-fade-in 600ms var(--ease-out)",
            }}
          >
            <div
              style={{
                padding: 20,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <Pill tone="ignite">NEW 5K PR</Pill>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 76,
                    color: "var(--bone)",
                    letterSpacing: "-0.02em",
                    lineHeight: 0.9,
                  }}
                >
                  21<span style={{ color: DEFAULT_ACCENT_COLOR }}>:</span>49
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    color: "var(--fg-3)",
                    marginTop: 6,
                  }}
                >
                  PREV 22:15 · −26s
                </div>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 18,
                  color: "var(--fg-3)",
                  letterSpacing: "-0.02em",
                }}
              >
                RUNSTATS<span style={{ color: DEFAULT_ACCENT_COLOR }}>.</span>
              </div>
            </div>
            <div style={{ background: DEFAULT_ACCENT_COLOR, position: "relative" }}>
              <Image
                src="/assets/placeholder-portrait.svg"
                alt=""
                fill
                style={{ objectFit: "cover" }}
                sizes="200px"
              />
            </div>
          </div>
          <div
            style={{
              width: 240,
              aspectRatio: "9/16",
              background: "var(--ink-2)",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
              transform: "rotate(4deg) translate(140px, -120px)",
              display: "grid",
              gridTemplateRows: "1.1fr 1fr",
              position: "absolute",
              right: 40,
              top: "38%",
            }}
          >
            <div style={{ background: "var(--pulse)", position: "relative" }}>
              <Image
                src="/assets/placeholder-portrait-pulse.svg"
                alt=""
                fill
                style={{ objectFit: "cover" }}
                sizes="240px"
              />
            </div>
            <div
              style={{
                padding: 16,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                background: "var(--ink-2)",
              }}
            >
              <Pill tone="pulse" style={{ alignSelf: "flex-start" }}>
                VOLUME +1%
              </Pill>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 54,
                    color: "var(--bone)",
                    letterSpacing: "-0.02em",
                    lineHeight: 0.9,
                  }}
                >
                  36<span style={{ color: "var(--pulse)" }}>%</span>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    color: "var(--fg-3)",
                    marginTop: 6,
                  }}
                >
                  of 1000 km · 2026
                </div>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 13,
                  color: "var(--fg-3)",
                  letterSpacing: "-0.02em",
                }}
              >
                RUNSTATS<span style={{ color: "var(--pulse)" }}>.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
