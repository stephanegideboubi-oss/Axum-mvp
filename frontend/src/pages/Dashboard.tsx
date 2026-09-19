import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listProjects } from "../api/projects";
import { useAuth } from "../context/AuthContext";
import { Project } from "../types/project";

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-700",
  open: "bg-orange-100 text-orange-800",
  funded: "bg-green-100 text-green-800",
  closed: "bg-neutral-800 text-white",
  failed: "bg-red-100 text-red-700",
};

function money(amount: string | number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount));
}

export default function Dashboard() {
  const { user } = useAuth();
  const [myProjects, setMyProjects] = useState<Project[] | null>(null);

  useEffect(() => {
    if (user?.role === "entrepreneur") {
      listProjects(true)
        .then(setMyProjects)
        .catch(() => setMyProjects([]));
    }
  }, [user?.role]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="max-w-2xl mx-auto mt-10 space-y-6 pb-10">
        <div className="bg-white rounded-lg shadow p-8">
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
        </div>

        {user?.role === "entrepreneur" && (
          <div className="bg-white rounded-lg shadow p-8">
            <h3 className="text-lg font-semibold text-black mb-4">My projects</h3>
            {myProjects === null && <p className="text-sm text-neutral-500">Loading...</p>}
            {myProjects !== null && myProjects.length === 0 && (
              <p className="text-sm text-neutral-500">
                You haven't started a project yet — click "Start a new project" above.
              </p>
            )}
            <ul className="space-y-3">
              {myProjects?.map((p) => {
                const goal = Number(p.goal_amount);
                const raised = p.raised_amount ?? 0;
                const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
                return (
                  <li key={p.id}>
                    <Link
                      to={`/projects/${p.id}`}
                      className="block border border-neutral-200 rounded p-4 hover:border-orange-300"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-black">{p.title}</span>
                        <span
                          className={`text-xs uppercase tracking-wide font-medium px-2 py-1 rounded ${
                            STATUS_BADGE[p.status] ?? "bg-neutral-100 text-neutral-700"
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                      {p.status !== "draft" && (
                        <>
                          <div className="mt-2 flex justify-between text-xs text-neutral-600">
                            <span>{money(raised, p.currency)} raised</span>
                            <span>Goal: {money(p.goal_amount, p.currency)}</span>
                          </div>
                          <div className="mt-1 h-1.5 bg-neutral-200 rounded overflow-hidden">
                            <div className="h-full bg-orange-600" style={{ width: `${pct}%` }} />
                          </div>
                        </>
                      )}
                      <span className="mt-2 inline-block text-xs text-orange-700 underline">
                        View bids &amp; analytics
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
