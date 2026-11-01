import { ReactNode } from "react";

// Small uppercase label with a leading dash, used above section headings.
export default function Eyebrow({
  children,
  className = "text-orange-600",
  center = false,
}: {
  children: ReactNode;
  className?: string;
  center?: boolean;
}) {
  return (
    <p
      className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-widest ${
        center ? "justify-center" : ""
      } ${className}`}
    >
      <span className="h-0.5 w-6 bg-current" aria-hidden="true" />
      {children}
    </p>
  );
}
