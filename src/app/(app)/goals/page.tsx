import { Label } from "@/components/primitives";

export default function GoalsPage() {
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
        Goals
      </h1>
      <p
        style={{
          fontFamily: "var(--font-body)",
          color: "var(--fg-3)",
          fontSize: 16,
          maxWidth: 560,
        }}
      >
        Goal editor with built-in time goals, volume target and custom presets
        lands in Phase 3.
      </p>
    </div>
  );
}
