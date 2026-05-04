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

const headingStyle: CSSProperties = {
  fontFamily: "var(--font-heading)",
  letterSpacing: "-0.01em",
  margin: "8px 0 12px",
  color: "var(--ink)",
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
      <h1
        className="text-[36px] leading-[1.1] md:text-[54px] md:leading-[1.05]"
        style={headingStyle}
      >
        {heading}
      </h1>
      <p style={descriptionStyle}>{description}</p>
      <div className="mt-8">{children}</div>
      <div className="mt-8 flex flex-wrap justify-end gap-3">{footer}</div>
    </section>
  );
}
