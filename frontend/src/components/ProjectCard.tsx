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
        <span
          className={`absolute top-3 right-3 text-xs uppercase tracking-wide font-medium px-2 py-1 rounded-full ${
            STATUS_BADGE[project.status] ?? "bg-neutral-100 text-neutral-700"
          }`}
        >
          {project.status}
        </span>
      </div>
      <h3 className={`mt-3 font-medium text-black group-hover:text-orange-700 ${big ? "text-xl" : "text-base"}`}>
        {project.title}
      </h3>
      {!isDraft && (
        <>
          <div className="mt-2 h-1.5 bg-neutral-200 rounded overflow-hidden">
            <div className="h-full bg-orange-600" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 text-sm text-neutral-600">
            <span className="font-medium text-black">{money(raised, project.currency)}</span> raised
          </p>
        </>
      )}
    </Link>
  );
}
