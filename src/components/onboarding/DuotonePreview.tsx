import type { CSSProperties } from "react";
import { Label } from "@/components/primitives";

interface AccentVariant {
  label: string;
  cssVar: string;
  key: string;
}

const VARIANTS: AccentVariant[] = [
  { label: "IGNITE", cssVar: "var(--ignite)", key: "ignite" },
  { label: "PULSE", cssVar: "var(--pulse)", key: "pulse" },
  { label: "CYAN", cssVar: "var(--cyan)", key: "cyan" },
];

const PLACEHOLDER_SRC = "/assets/placeholder-portrait.svg";

const tileFrameStyle: CSSProperties = {
  width: "100%",
  aspectRatio: "3 / 4",
  borderRadius: 8,
  overflow: "hidden",
};

const tileImageStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "block",
  objectFit: "cover",
  mixBlendMode: "luminosity",
  filter: "contrast(1.15) brightness(0.95)",
};

const captionStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "var(--fg-3)",
  marginTop: 8,
  textAlign: "center",
};

export interface DuotonePreviewProps {
  src?: string | null;
}

export function DuotonePreview({ src }: DuotonePreviewProps) {
  const imgSrc = src || PLACEHOLDER_SRC;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        height: "100%",
      }}
    >
      <div
        style={{
          flex: "1 1 auto",
          background: "var(--ink)",
          borderRadius: 16,
          padding: 20,
          color: "var(--bone)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <Label style={{ color: "var(--fg-3)" }}>Live preview — duotone</Label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {VARIANTS.map((v) => (
            <div key={v.key}>
              <div
                style={{
                  ...tileFrameStyle,
                  background: v.cssVar,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgSrc} alt="" style={tileImageStyle} />
              </div>
              <div style={captionStyle}>{v.label}</div>
            </div>
          ))}
        </div>
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-3)",
          lineHeight: 1.5,
        }}
      >
        duotone is applied at render-time, so you can switch accents per
        milestone.
      </p>
    </div>
  );
}
