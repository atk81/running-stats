"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

export interface CountUpProps {
  to: number;
  duration?: number;
  format?: (value: number) => string;
  trigger?: number;
  style?: CSSProperties;
}

const defaultFormat = (v: number) => v.toFixed(0);

export function CountUp({
  to,
  duration = 1200,
  format = defaultFormat,
  trigger = 0,
  style,
}: CountUpProps) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    let raf = 0;
    let start: number | undefined;
    const step = (t: number) => {
      if (start === undefined) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(eased * to);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration, trigger]);

  return (
    <span style={{ fontVariantNumeric: "tabular-nums", ...style }}>
      {format(val)}
    </span>
  );
}
