import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { listProjects } from "../api/projects";
import ProjectCard from "../components/ProjectCard";
import { useAuth } from "../context/AuthContext";
import { Project } from "../types/project";

export default function ProjectList() {
  const { user } = useAuth();
  const [mineOnly, setMineOnly] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

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
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.location.toLowerCase().includes(query) ||
          (p.country ?? "").toLowerCase().includes(query) ||
          (p.zip_code ?? "").toLowerCase().includes(query)
      )
    : projects;

  return (
    <div className="min-h-screen bg-neutral-50 py-10">
      <div className="max-w-5xl mx-auto px-6 space-y-6">
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

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
