"use client";

/**
 * Brand mark from /public/assets/logo.png (served as /assets/logo.png).
 */
export default function BrandLogo({ size = 40, spinning = false, className = "", alt = "" }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/assets/logo.png"
      alt={alt}
      width={size}
      height={size}
      className={`rp-brand-logo ${spinning ? "rp-brand-logo--spin" : ""} ${className}`.trim()}
    />
  );
}
