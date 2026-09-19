import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="max-w-2xl mx-auto mt-10 bg-white rounded-lg shadow p-8">
        <h2 className="text-xl font-semibold text-black">Welcome, {user?.name}</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-neutral-500">Email</dt>
            <dd className="text-black">{user?.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Role</dt>
            <dd className="text-black capitalize">{user?.role}</dd>
          </div>
          {user?.role === "vendor" && (
            <div className="flex justify-between">
              <dt className="text-neutral-500">Verification status</dt>
              <dd className="text-black capitalize">{user?.verification_status}</dd>
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
            className="mt-6 inline-block rounded bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-sm font-medium"
          >
            Start a new project
          </Link>
        )}
      </main>
    </div>
  );
}
