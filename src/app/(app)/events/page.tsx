import { Label } from "@/components/primitives";

const PROCAM_SERIES = [
  "TCS World 10K · Bangalore",
  "ADHM · Delhi",
  "Mumbai Marathon",
];

export default function EventsPage() {
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "72px 32px" }}>
      <Label>Coming soon</Label>
      <h1
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: 48,
          fontWeight: 700,
          margin: "8px 0 12px",
          color: "var(--bone)",
        }}
      >
        Events
      </h1>
      <p
        style={{
          fontFamily: "var(--font-body)",
          color: "var(--fg-3)",
          fontSize: 16,
          maxWidth: 560,
        }}
      >
        Multi-leg race series like Procam with their own visual treatment.
        We&apos;re designing this after v1.
      </p>
      <div
        style={{
          marginTop: 40,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
        }}
      >
        {PROCAM_SERIES.map((name) => (
          <div
            key={name}
            style={{
              background: "var(--ink-2)",
              border: "1px dashed var(--ink-3)",
              borderRadius: 16,
              padding: 24,
              minHeight: 160,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Label style={{ color: "var(--fg-4)" }}>Procam series</Label>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 26,
                letterSpacing: "-0.02em",
                color: "var(--fg-3)",
                lineHeight: 1.05,
              }}
            >
              {name}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-4)",
              }}
            >
              not yet available
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
