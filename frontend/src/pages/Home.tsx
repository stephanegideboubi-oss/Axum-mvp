import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listProjects } from "../api/projects";
import HowItWorksVideo from "../components/HowItWorksVideo";
import { useAuth } from "../context/AuthContext";
import { Project } from "../types/project";

function money(amount: string | number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(
    Number(amount)
  );
}

function ProjectCard({ project, big = false }: { project: Project; big?: boolean }) {
  const goal = Number(project.goal_amount);
  const raised = project.raised_amount ?? 0;
  const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
  const place = [project.location, project.country].filter(Boolean).join(", ");

  return (
    <Link to={`/projects/${project.id}`} className="block group">
      <div className={`relative rounded-xl overflow-hidden bg-neutral-200 ${big ? "aspect-[16/10]" : "aspect-[16/11]"}`}>
        {project.cover_image_url ? (
          <img
            src={project.cover_image_url}
            alt={project.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-black">
            <span className="text-white font-bold text-2xl tracking-wide">
              AX<span className="text-orange-500">UM</span>
            </span>
          </div>
        )}
        {place && (
          <span className="absolute bottom-3 left-3 bg-black/70 text-white text-xs px-2.5 py-1 rounded-full">
            {place}
          </span>
        )}
      </div>
      <h3 className={`mt-3 font-medium text-black group-hover:text-orange-700 ${big ? "text-xl" : "text-base"}`}>
        {project.title}
      </h3>
      <div className="mt-2 h-1.5 bg-neutral-200 rounded overflow-hidden">
        <div className="h-full bg-orange-600" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-sm text-neutral-600">
        <span className="font-medium text-black">{money(raised, project.currency)}</span> raised
      </p>
    </Link>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .finally(() => setLoading(false));
  }, []);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    navigate(search.trim() ? `/projects?q=${encodeURIComponent(search.trim())}` : "/projects");
  }

  const featured = projects.slice(0, 5);
  const [big, ...small] = featured;

  return (
    <div className="min-h-screen bg-neutral-50">
      <section className="bg-black text-white">
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight">
            Fund real projects.<br />
            <span className="text-orange-500">Track every dollar to delivery.</span>
          </h1>
          <p className="mt-5 text-neutral-300 max-w-2xl mx-auto">
            AXUM connects entrepreneurs, contributors, and verified vendors around a shared,
            line-by-line budget — with funds held in escrow and released only against proof of work.
          </p>

          <form onSubmit={handleSearch} className="mt-8 max-w-xl mx-auto flex gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects by name, country, city, zip..."
              className="flex-1 rounded-full px-5 py-3 text-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              type="submit"
              className="rounded-full bg-orange-600 hover:bg-orange-700 px-6 py-3 font-medium"
            >
              Search
            </button>
          </form>

          <div className="mt-6 flex justify-center gap-4">
            <Link
              to={user ? "/projects/new" : "/register"}
              className="rounded-full bg-white text-black hover:bg-neutral-200 px-6 py-2.5 font-medium text-sm"
            >
              Start a project
            </Link>
            <Link
              to="/projects"
              className="rounded-full border border-neutral-500 hover:border-white px-6 py-2.5 font-medium text-sm"
            >
              Browse projects
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl sm:text-3xl font-semibold text-black">Popular projects</h2>
          <Link to="/projects" className="text-sm text-orange-700 font-medium hover:underline">
            See all &rarr;
          </Link>
        </div>

        {loading && <p className="text-sm text-neutral-500">Loading projects...</p>}
        {!loading && featured.length === 0 && (
          <p className="text-sm text-neutral-500">
            No projects are open yet.{" "}
            <Link to={user ? "/projects/new" : "/register"} className="text-orange-700 underline">
              Be the first to start one.
            </Link>
          </p>
        )}

        {!loading && featured.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <ProjectCard project={big} big />
            </div>
            <div className="grid grid-cols-2 gap-6">
              {small.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          </div>
        )}
      </section>

      <HowItWorksVideo />

      <section className="bg-black text-white">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold">Have a project worth funding?</h2>
          <p className="mt-3 text-neutral-300">
            Post your budget, get contributors and vendors on board, and let AXUM handle
            transparent, trackable disbursement.
          </p>
          <Link
            to={user ? "/projects/new" : "/register"}
            className="mt-6 inline-block rounded-full bg-orange-600 hover:bg-orange-700 px-8 py-3 font-medium"
          >
            Start a project
          </Link>
        </div>
      </section>
    </div>
  );
}
