// The AXUM mark: a pointed "A" (an obelisk, nodding to Axum's stelae) on an orange tile.
// Keep in sync with public/favicon.svg.
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} role="img" aria-label="AXUM logo">
      <rect width="48" height="48" rx="12" fill="#EA580C" />
      <path
        fill="#fff"
        fillRule="evenodd"
        d="M24 8 38.5 40h-7l-2.7-6.5h-11.6L16.5 40h-7L24 8Zm0 13.2-3.6 8.6h7.2L24 21.2Z"
      />
    </svg>
  );
}

const SIZES = {
  sm: { mark: "h-7 w-7", text: "text-lg", gap: "gap-2" },
  md: { mark: "h-9 w-9", text: "text-xl", gap: "gap-2.5" },
  lg: { mark: "h-16 w-16", text: "text-5xl", gap: "gap-4" },
} as const;

// Mark plus wordmark. `onDark` picks the wordmark colour for the background it sits on.
export default function Logo({
  size = "md",
  onDark = true,
}: {
  size?: keyof typeof SIZES;
  onDark?: boolean;
}) {
  const s = SIZES[size];
  return (
    <span className={`inline-flex items-center ${s.gap}`}>
      <LogoMark className={`${s.mark} shrink-0`} />
      <span className={`font-display font-bold tracking-wide ${s.text} ${onDark ? "text-white" : "text-black"}`}>
        AX<span className="text-orange-500">UM</span>
      </span>
    </span>
  );
}
