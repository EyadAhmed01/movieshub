"use client";

import { useState } from "react";

/**
 * Prefer /assets/logo.png; falls back to /assets/logo.svg if PNG is missing.
 * Raster logos use 2× intrinsic dimensions so they stay sharp on HiDPI screens.
 */
export default function BrandLogo({ size = 48, spinning = false, className = "", alt = "" }) {
  const [src, setSrc] = useState("/assets/logo.png");
  const isSvg = src.endsWith(".svg");
  const intrinsic = isSvg ? size : size * 2;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={intrinsic}
      height={intrinsic}
      decoding="async"
      onError={() => setSrc("/assets/logo.svg")}
      className={`rp-brand-logo ${spinning ? "rp-brand-logo--spin" : ""} ${className}`.trim()}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
      }}
    />
  );
}
