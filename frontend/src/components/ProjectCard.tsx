import { Link } from "react-router-dom";
import { Project } from "../types/project";

function money(amount: string | number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(
    Number(amount)
  );
}

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-neutral-200 text-neutral-800",
  open: "bg-orange-100 text-orange-800",
  funded: "bg-green-100 text-green-800",
  closed: "bg-neutral-800 text-white",
  failed: "bg-red-100 text-red-700",
};

export default function ProjectCard({ project, big = false }: { project: Project; big?: boolean }) {
  const goal = Number(project.goal_amount);
  const raised = project.raised_amount ?? 0;
  const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
  const place = [project.location, project.country].filter(Boolean).join(", ");
  const isDraft = project.status === "draft";

  return (
    <Link
      to={`/projects/${project.id}`}
      className="group block overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className={`relative overflow-hidden bg-neutral-200 ${big ? "aspect-[16/10]" : "aspect-[16/11]"}`}>
        {project.cover_image_url ? (
          <img
            src={project.cover_image_url}
            alt={project.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-black">
            <span className="font-display text-white font-bold text-2xl tracking-wide">
              AX<span className="text-orange-500">UM</span>
            </span>
          </div>
        )}
        {place && (
          <span className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full">
            {place}
          </span>
        )}
        <span
          className={`absolute top-3 right-3 text-xs uppercase tracking-wide font-semibold px-2.5 py-1 rounded-full ${
            STATUS_BADGE[project.status] ?? "bg-neutral-100 text-neutral-700"
          }`}
        >
          {project.status}
        </span>
      </div>

      <div className="p-4">
        <h3
          className={`font-display font-semibold text-black group-hover:text-orange-600 transition-colors ${
            big ? "text-xl" : "text-base"
          }`}
        >
          {project.title}
        </h3>
        {!isDraft && (
          <>
            <div className="mt-3 h-2 bg-neutral-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-orange-600" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-2 flex items-baseline justify-between text-sm text-neutral-600">
              <span>
                <span className="font-semibold text-black">{money(raised, project.currency)}</span> raised
              </span>
              <span className="text-xs font-semibold text-orange-600">{pct}%</span>
            </div>
          </>
        )}
      </div>
    </Link>
  );
}
