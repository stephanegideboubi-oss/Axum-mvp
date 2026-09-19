import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <h1 className="text-lg font-semibold text-slate-900">AXUM</h1>
        <div className="flex items-center gap-4">
          <Link to="/projects" className="text-sm text-slate-600 underline">
            Projects
          </Link>
          {user?.role === "contributor" && (
            <Link to="/my-contributions" className="text-sm text-slate-600 underline">
              My contributions
            </Link>
          )}
          <Link to="/track" className="text-sm text-slate-600 underline">
            Track a project
          </Link>
          {user?.role === "admin" && (
            <Link to="/admin" className="text-sm text-slate-600 underline">
              Admin
            </Link>
          )}
          <button onClick={logout} className="text-sm text-slate-600 underline">
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto mt-10 bg-white rounded-lg shadow p-8">
        <h2 className="text-xl font-semibold text-slate-900">Welcome, {user?.name}</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Email</dt>
            <dd className="text-slate-900">{user?.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Role</dt>
            <dd className="text-slate-900 capitalize">{user?.role}</dd>
          </div>
          {user?.role === "vendor" && (
            <div className="flex justify-between">
              <dt className="text-slate-500">Verification status</dt>
              <dd className="text-slate-900 capitalize">{user?.verification_status}</dd>
            </div>
          )}
        </dl>

        {user?.role === "vendor" && user.verification_status === "pending" && (
          <p className="mt-4 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-3">
            Your account is awaiting admin verification. You'll be able to bid on line items once
            approved.
          </p>
        )}

        {user?.role === "entrepreneur" && (
          <Link
            to="/projects/new"
            className="mt-6 inline-block rounded bg-slate-900 text-white px-4 py-2 text-sm font-medium"
          >
            Start a new project
          </Link>
        )}

        <p className="mt-6 text-sm text-slate-500">
          Bidding, contributions, and the admin tools land in the next pieces.
        </p>
      </main>
    </div>
  );
}
