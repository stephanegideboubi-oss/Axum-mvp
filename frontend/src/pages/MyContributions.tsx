import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { myContributions } from "../api/contributions";
import { Contribution } from "../types/contribution";

function money(amount: string | number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount));
}

export default function MyContributions() {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    myContributions()
      .then(setContributions)
      .catch((err) => setError(err?.response?.data?.error ?? "Could not load your contributions"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-slate-900">My contributions</h1>
          <Link to="/projects" className="text-sm text-slate-600 underline">
            Browse projects
          </Link>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {loading && <p className="text-sm text-slate-500">Loading...</p>}
        {!loading && contributions.length === 0 && (
          <p className="text-sm text-slate-500">
            You haven't contributed to any projects yet.
          </p>
        )}

        <ul className="space-y-3">
          {contributions.map((c) => (
            <li key={c.id} className="bg-white rounded-lg shadow p-5">
              <div className="flex justify-between items-start">
                <div>
                  <Link to={`/projects/${c.project_id}`} className="font-medium text-slate-900 underline">
                    {c.project_title}
                  </Link>
                  <p className="text-xs text-slate-500 mt-1">
                    Tracking number: <span className="font-mono">{c.uin}</span>
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-slate-900">{money(c.amount, c.currency)}</div>
                  <span className="text-xs uppercase tracking-wide font-medium bg-slate-100 text-slate-700 px-2 py-1 rounded">
                    {c.status}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
