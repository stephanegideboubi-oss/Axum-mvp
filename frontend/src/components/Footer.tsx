import { Link } from "react-router-dom";

// Placeholder URLs — swap in the real profile links once the accounts exist.
const SOCIAL_LINKS = [
  {
    name: "X (Twitter)",
    href: "#",
    icon: (
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    ),
  },
  {
    name: "LinkedIn",
    href: "#",
    icon: (
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124M7.114 20.452H3.558V9h3.556zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z" />
    ),
  },
  {
    name: "Facebook",
    href: "#",
    icon: (
      <path d="M22 12.06C22 6.505 17.523 2 12 2S2 6.505 2 12.06c0 5.02 3.657 9.184 8.438 9.94v-7.03H7.898v-2.91h2.54V9.845c0-2.507 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562v1.878h2.773l-.443 2.91h-2.33V22c4.78-.756 8.437-4.92 8.437-9.94z" />
    ),
  },
  {
    name: "Instagram",
    href: "#",
    icon: (
      <g fillRule="evenodd" clipRule="evenodd">
        <path d="M12 0C8.741 0 8.332.014 7.052.072 2.695.272.273 2.69.073 7.052.014 8.332 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.332 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.668-.072-4.948-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.204-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z" />
        <path d="M12 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zM18.406 4.155a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </g>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="bg-black text-neutral-400 mt-auto">
      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
        <Link to="/" className="text-lg font-bold text-white tracking-wide">
          AX<span className="text-orange-500">UM</span>
        </Link>

        <div className="flex items-center gap-5 text-sm">
          <Link to="/about" className="hover:text-orange-500">
            About us
          </Link>
          <Link to="/track" className="hover:text-orange-500">
            Track a project
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {SOCIAL_LINKS.map((s) => (
            <a
              key={s.name}
              href={s.href}
              aria-label={s.name}
              className="text-neutral-400 hover:text-orange-500"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                {s.icon}
              </svg>
            </a>
          ))}
        </div>
      </div>

      <div className="border-t border-neutral-800">
        <div className="max-w-5xl mx-auto px-6 py-4 text-center text-xs text-neutral-500">
          &copy; September 2026 AXUM. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
