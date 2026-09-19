import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function NavBar() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-black px-6 py-4 flex justify-between items-center">
      <Link to="/projects" className="text-lg font-bold text-white tracking-wide">
        AX<span className="text-orange-500">UM</span>
      </Link>
      <div className="flex items-center gap-5">
        <Link to="/projects" className="text-sm text-neutral-300 hover:text-orange-500">
          Projects
        </Link>
        <Link to="/track" className="text-sm text-neutral-300 hover:text-orange-500">
          Track a project
        </Link>

        {user ? (
          <>
            <Link to="/dashboard" className="text-sm text-neutral-300 hover:text-orange-500">
              Dashboard
            </Link>
            {user.role === "contributor" && (
              <Link
                to="/my-contributions"
                className="text-sm text-neutral-300 hover:text-orange-500"
              >
                My contributions
              </Link>
            )}
            {user.role === "admin" && (
              <Link to="/admin" className="text-sm text-neutral-300 hover:text-orange-500">
                Admin
              </Link>
            )}
            <button onClick={logout} className="text-sm text-neutral-300 hover:text-orange-500">
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-sm text-neutral-300 hover:text-orange-500">
              Log in
            </Link>
            <Link
              to="/register"
              className="text-sm rounded bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 font-medium"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
