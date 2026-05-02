import { Label } from "@/components/primitives";

export default function DashboardPage() {
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "72px 32px" }}>
      <Label>Coming in Phase 3</Label>
      <h1
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: 48,
          fontWeight: 700,
          margin: "8px 0 12px",
          color: "var(--bone)",
        }}
      >
        Dashboard
      </h1>
      <p
        style={{
          fontFamily: "var(--font-body)",
          color: "var(--fg-3)",
          fontSize: 16,
          maxWidth: 560,
        }}
      >
        Volume hero, goal cards, milestone feed and recent runs land in Phase 3.
      </p>
    </div>
  );
}
