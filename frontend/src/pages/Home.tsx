import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listProjects } from "../api/projects";
import Eyebrow from "../components/Eyebrow";
import HowItWorksVideo from "../components/HowItWorksVideo";
import Logo, { LogoMark } from "../components/Logo";
import ProjectCard from "../components/ProjectCard";
import { useAuth } from "../context/AuthContext";
import { Project } from "../types/project";

const TRUST_POINTS = [
  "Funds held by an independent escrow partner",
  "Released only against proof of work",
  "Every step tracked by a unique ID",
];

function compactMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
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

  // Real numbers from the public project list, not placeholders. Totals only
  // count USD projects so we never add different currencies together.
  const fundedCount = projects.filter((p) => p.status === "funded").length;
  const raisedUsd = projects
    .filter((p) => p.currency === "USD")
    .reduce((sum, p) => sum + Number(p.raised_amount ?? 0), 0);
  const stats = [
    { value: loading ? "—" : String(projects.length), label: "Projects listed" },
    { value: loading ? "—" : String(fundedCount), label: "Fully funded" },
    { value: loading ? "—" : compactMoney(raisedUsd), label: "Raised so far (USD)" },
  ];

  const startLink = user ? "/projects/new" : "/register";

  return (
    <div className="min-h-screen bg-neutral-50">
      <section className="relative overflow-hidden bg-black text-white">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(55% 70% at 85% 0%, rgba(234,88,12,0.38), transparent 65%), radial-gradient(40% 50% at 0% 100%, rgba(234,88,12,0.14), transparent 70%)",
          }}
          aria-hidden="true"
        />
        <LogoMark className="pointer-events-none absolute -right-16 top-1/2 hidden h-[26rem] w-[26rem] -translate-y-[58%] -rotate-6 opacity-[0.07] lg:block" />
        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-40">
          <Logo size="lg" />
          <div className="mt-10">
            <Eyebrow className="text-orange-400">Transparent project funding</Eyebrow>
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl sm:text-6xl font-bold leading-[1.08] tracking-tight">
            Fund real projects.{" "}
            <span className="text-orange-500">Track every dollar to delivery.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-neutral-300 leading-relaxed">
            AXUM connects project owners, contributors, and verified vendors around a shared,
            line-by-line budget — with funds held in escrow and released only against proof of work.
          </p>

          <form onSubmit={handleSearch} className="mt-9 max-w-xl flex gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects by name, country, city, zip..."
              className="flex-1 rounded-full px-5 py-3 text-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              type="submit"
              className="rounded-full bg-orange-600 hover:bg-orange-500 px-7 py-3 font-semibold shadow-lg shadow-orange-600/30 transition-colors"
            >
              Search
            </button>
          </form>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to={startLink}
              className="rounded-xl bg-white text-black hover:bg-neutral-200 px-6 py-3 font-semibold text-sm transition-colors"
            >
              Start a project
            </Link>
            <Link
              to="/projects"
              className="rounded-xl border border-white/30 hover:border-orange-500 hover:text-orange-400 px-6 py-3 font-semibold text-sm transition-colors"
            >
              Browse projects
            </Link>
          </div>

          <ul className="mt-9 flex flex-wrap gap-x-7 gap-y-2 text-sm text-neutral-300">
            {TRUST_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-2">
                <svg viewBox="0 0 20 20" className="h-4 w-4 fill-orange-500" aria-hidden="true">
                  <path d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zm4.03 6.78-4.5 5a.75.75 0 0 1-1.1.03l-2.25-2.25a.75.75 0 1 1 1.06-1.06l1.67 1.67 3.97-4.4a.75.75 0 1 1 1.11 1.01z" />
                </svg>
                {point}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="relative z-10 -mt-20 max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x divide-neutral-200 rounded-3xl border border-neutral-100 bg-white shadow-2xl">
          {stats.map((s) => (
            <div key={s.label} className="px-8 py-7">
              <p className="font-display text-4xl font-bold text-black">{s.value}</p>
              <p className="mt-1 text-sm text-neutral-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <section className="max-w-6xl mx-auto px-6 pt-20 pb-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <Eyebrow>Featured</Eyebrow>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-black">Popular projects</h2>
          </div>
          <Link to="/projects" className="text-sm text-orange-600 font-semibold hover:underline">
            See all &rarr;
          </Link>
        </div>

        {loading && <p className="text-sm text-neutral-500">Loading projects...</p>}
        {!loading && featured.length === 0 && (
          <p className="text-sm text-neutral-500">
            No projects are open yet.{" "}
            <Link to={startLink} className="text-orange-600 underline">
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

      <section className="relative overflow-hidden bg-black text-white">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(50% 90% at 50% 120%, rgba(234,88,12,0.35), transparent 70%)",
          }}
          aria-hidden="true"
        />
        <div className="relative max-w-3xl mx-auto px-6 py-20 text-center">
          <Eyebrow center className="text-orange-400">
            Get started
          </Eyebrow>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold">Have a project worth funding?</h2>
          <p className="mt-4 text-neutral-300 leading-relaxed">
            Post your budget, get contributors and vendors on board, and let AXUM handle
            transparent, trackable disbursement.
          </p>
          <Link
            to={startLink}
            className="mt-8 inline-block rounded-xl bg-orange-600 hover:bg-orange-500 px-8 py-3.5 font-semibold shadow-lg shadow-orange-600/30 transition-colors"
          >
            Start a project
          </Link>
        </div>
      </section>
    </div>
  );
}
