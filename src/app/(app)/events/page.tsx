import { ComingSoon } from "@/components/chrome/ComingSoon";
import { Label } from "@/components/primitives";

const PROCAM_SERIES = [
  "TCS World 10K · Bangalore",
  "ADHM · Delhi",
  "Mumbai Marathon",
];

export default function EventsPage() {
  return (
    <ComingSoon
      eyebrow="Coming soon"
      title="Events"
      description="Multi-leg race series like Procam with their own visual treatment. We're designing this after v1."
    >
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
    </ComingSoon>
  );
}
