import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { listProjects } from "../api/projects";
import Eyebrow from "../components/Eyebrow";
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
    <div className="min-h-screen bg-neutral-50 py-12">
      <div className="max-w-6xl mx-auto px-6 space-y-8">
        <div className="flex justify-between items-end gap-4">
          <div>
            <Eyebrow>Browse</Eyebrow>
            <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-black">Projects</h1>
          </div>
          <div className="flex gap-3">
            {user?.role === "entrepreneur" && (
              <button
                onClick={() => setMineOnly((v) => !v)}
                className="text-sm rounded-xl border border-neutral-300 bg-white px-4 py-2 text-neutral-700 hover:border-orange-500 hover:text-orange-600 transition-colors"
              >
                {mineOnly ? "Show all projects" : "Show only my projects"}
              </button>
            )}
            {user?.role === "entrepreneur" && (
              <Link
                to="/projects/new"
                className="text-sm rounded-xl bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 font-semibold shadow-lg shadow-orange-600/30 transition-colors"
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
          className="w-full rounded-full border border-neutral-300 px-5 py-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
