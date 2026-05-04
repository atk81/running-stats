import type { CSSProperties, ReactNode } from "react";
import { Label } from "@/components/primitives";

export interface OnboardingStepProps {
  step: number;
  total: number;
  heading: string;
  description: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}

const sectionStyle: CSSProperties = {
  animation: "rs-fade-in 280ms var(--ease-out)",
};

const descriptionStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  color: "var(--fg-3)",
  fontSize: 16,
  maxWidth: 520,
  lineHeight: 1.5,
};

export function OnboardingStep({
  step,
  total,
  heading,
  description,
  footer,
  children,
}: OnboardingStepProps) {
  return (
    <section style={sectionStyle}>
      <Label>
        Step {step} of {total}
      </Label>
      <h1 className="rs-onboard-heading">{heading}</h1>
      <p style={descriptionStyle}>{description}</p>
      <div style={{ marginTop: 32 }}>{children}</div>
      <div className="rs-onboard-footer">{footer}</div>
    </section>
  );
}
