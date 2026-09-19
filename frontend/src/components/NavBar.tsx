import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function NavBar() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
      <Link to="/projects" className="text-lg font-semibold text-slate-900">
        AXUM
      </Link>
      <div className="flex items-center gap-4">
        <Link to="/projects" className="text-sm text-slate-600 underline">
          Projects
        </Link>
        <Link to="/track" className="text-sm text-slate-600 underline">
          Track a project
        </Link>

        {user ? (
          <>
            <Link to="/dashboard" className="text-sm text-slate-600 underline">
              Dashboard
            </Link>
            {user.role === "contributor" && (
              <Link to="/my-contributions" className="text-sm text-slate-600 underline">
                My contributions
              </Link>
            )}
            {user.role === "admin" && (
              <Link to="/admin" className="text-sm text-slate-600 underline">
                Admin
              </Link>
            )}
            <button onClick={logout} className="text-sm text-slate-600 underline">
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-sm text-slate-600 underline">
              Log in
            </Link>
            <Link
              to="/register"
              className="text-sm rounded bg-slate-900 text-white px-3 py-1.5 font-medium"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
