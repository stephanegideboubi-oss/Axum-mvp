import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function linkClass({ isActive }: { isActive: boolean }) {
  return `relative whitespace-nowrap py-1 text-sm transition-colors ${
    isActive
      ? "text-white after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-orange-500"
      : "text-neutral-300 hover:text-orange-500"
  }`;
}

export default function NavBar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/90 backdrop-blur">
      <div className="px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center gap-4">
        <Link to="/" className="shrink-0 font-display text-xl font-bold text-white tracking-wide">
          AX<span className="text-orange-500">UM</span>
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 sm:gap-x-6">
          <NavLink to="/projects" className={linkClass}>
            Projects
          </NavLink>
          <NavLink to="/track" className={linkClass}>
            <span className="sm:hidden">Track</span>
            <span className="hidden sm:inline">Track a project</span>
          </NavLink>

          {user ? (
            <>
              <NavLink to="/dashboard" className={linkClass}>
                Dashboard
              </NavLink>
              {user.role === "contributor" && (
                <NavLink to="/my-contributions" className={linkClass}>
                  My contributions
                </NavLink>
              )}
              {user.role === "vendor" && (
                <NavLink to="/my-bids" className={linkClass}>
                  My bids
                </NavLink>
              )}
              {user.role === "admin" && (
                <NavLink to="/admin" className={linkClass}>
                  Admin
                </NavLink>
              )}
              {user.role === "escrow_partner" && (
                <NavLink to="/escrow" className={linkClass}>
                  Escrow
                </NavLink>
              )}
              <button
                onClick={logout}
                className="whitespace-nowrap rounded-xl border border-white/20 px-4 py-1.5 text-sm text-neutral-200 hover:border-orange-500 hover:text-orange-500 transition-colors"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={linkClass}>
                Log in
              </NavLink>
              <Link
                to="/register"
                className="whitespace-nowrap rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-1.5 text-sm font-semibold text-white shadow-lg shadow-orange-600/30 transition-colors"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
