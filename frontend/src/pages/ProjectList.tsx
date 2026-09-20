import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listProjects } from "../api/projects";
import { useAuth } from "../context/AuthContext";
import { Project } from "../types/project";

function money(amount: string | number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount));
}

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-700",
  open: "bg-orange-100 text-orange-800",
  funded: "bg-green-100 text-green-800",
  closed: "bg-neutral-800 text-white",
  failed: "bg-red-100 text-red-700",
};

export default function ProjectList() {
  const { user } = useAuth();
  const [mineOnly, setMineOnly] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    listProjects(mineOnly)
      .then(setProjects)
      .catch((err) => setError(err?.response?.data?.error ?? "Could not load projects"))
      .finally(() => setLoading(false));
  }, [mineOnly]);

  const query = search.trim().toLowerCase();
  const filteredProjects = query
    ? projects.filter(
        (p) => p.title.toLowerCase().includes(query) || p.location.toLowerCase().includes(query)
      )
    : projects;

  return (
    <div className="min-h-screen bg-neutral-50 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-black">Projects</h1>
          <div className="flex gap-3">
            {user?.role === "entrepreneur" && (
              <button
                onClick={() => setMineOnly((v) => !v)}
                className="text-sm rounded border border-neutral-300 px-3 py-1.5 text-neutral-700"
              >
                {mineOnly ? "Show all projects" : "Show only my projects"}
              </button>
            )}
            {user?.role === "entrepreneur" && (
              <Link
                to="/projects/new"
                className="text-sm rounded bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 font-medium"
              >
                New project
              </Link>
            )}
          </div>
        </div>

        <input
          type="search"
          placeholder="Search by project name, country, city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded border border-neutral-300 px-4 py-2.5 bg-white"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}
        {loading && <p className="text-sm text-neutral-500">Loading...</p>}
        {!loading && projects.length === 0 && (
          <p className="text-sm text-neutral-500">No projects to show yet.</p>
        )}
        {!loading && projects.length > 0 && filteredProjects.length === 0 && (
          <p className="text-sm text-neutral-500">No projects match "{search}".</p>
        )}

        <ul className="space-y-4">
          {filteredProjects.map((p) => {
            const goal = Number(p.goal_amount);
            const raised = p.raised_amount ?? 0;
            const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
            return (
              <li key={p.id} className="bg-white rounded-lg shadow p-5">
                <Link to={`/projects/${p.id}`} className="block">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-lg font-medium text-black">{p.title}</h2>
                      <p className="text-sm text-neutral-500">{p.location}</p>
                    </div>
                    <span
                      className={`text-xs uppercase tracking-wide font-medium px-2 py-1 rounded ${
                        STATUS_BADGE[p.status] ?? "bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  {p.status !== "draft" && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-neutral-600">
                        <span>{money(raised, p.currency)} raised</span>
                        <span>Goal: {money(p.goal_amount, p.currency)}</span>
                      </div>
                      <div className="mt-1 h-1.5 bg-neutral-200 rounded overflow-hidden">
                        <div className="h-full bg-orange-600" style={{ width: `${pct}%` }} />
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
