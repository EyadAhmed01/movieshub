"use client";

import { useState } from "react";

/**
 * Prefer /assets/logo.png; falls back to /assets/logo.svg if PNG is missing.
 */
export default function BrandLogo({ size = 40, spinning = false, className = "", alt = "" }) {
  const [src, setSrc] = useState("/assets/logo.png");
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      onError={() => setSrc("/assets/logo.svg")}
      className={`rp-brand-logo ${spinning ? "rp-brand-logo--spin" : ""} ${className}`.trim()}
    />
  );
}
