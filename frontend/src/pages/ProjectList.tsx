import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listProjects } from "../api/projects";
import { useAuth } from "../context/AuthContext";
import { Project } from "../types/project";

function money(amount: string | number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount));
}

export default function ProjectList() {
  const { user } = useAuth();
  const [mineOnly, setMineOnly] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listProjects(mineOnly)
      .then(setProjects)
      .catch((err) => setError(err?.response?.data?.error ?? "Could not load projects"))
      .finally(() => setLoading(false));
  }, [mineOnly]);

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-slate-900">Projects</h1>
          <div className="flex gap-3">
            {user?.role === "entrepreneur" && (
              <button
                onClick={() => setMineOnly((v) => !v)}
                className="text-sm rounded border border-slate-300 px-3 py-1.5 text-slate-700"
              >
                {mineOnly ? "Show all projects" : "Show only my projects"}
              </button>
            )}
            {user?.role === "entrepreneur" && (
              <Link
                to="/projects/new"
                className="text-sm rounded bg-slate-900 text-white px-3 py-1.5 font-medium"
              >
                New project
              </Link>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {loading && <p className="text-sm text-slate-500">Loading...</p>}
        {!loading && projects.length === 0 && (
          <p className="text-sm text-slate-500">No projects to show yet.</p>
        )}

        <ul className="space-y-4">
          {projects.map((p) => {
            const goal = Number(p.goal_amount);
            const raised = p.raised_amount ?? 0;
            const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
            return (
              <li key={p.id} className="bg-white rounded-lg shadow p-5">
                <Link to={`/projects/${p.id}`} className="block">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-lg font-medium text-slate-900">{p.title}</h2>
                      <p className="text-sm text-slate-500">{p.location}</p>
                    </div>
                    <span className="text-xs uppercase tracking-wide font-medium bg-slate-100 text-slate-700 px-2 py-1 rounded">
                      {p.status}
                    </span>
                  </div>
                  {p.status !== "draft" && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>{money(raised, p.currency)} raised</span>
                        <span>Goal: {money(p.goal_amount, p.currency)}</span>
                      </div>
                      <div className="mt-1 h-1.5 bg-slate-200 rounded overflow-hidden">
                        <div className="h-full bg-slate-900" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
