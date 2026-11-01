import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { confirmContribution, myContributions } from "../api/contributions";
import Eyebrow from "../components/Eyebrow";
import { Contribution, ContributionStatus } from "../types/contribution";

function money(amount: string | number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount));
}

const STATUS_STYLE: Record<ContributionStatus, { label: string; className: string }> = {
  recorded: { label: "Received", className: "bg-green-100 text-green-800" },
  pending: { label: "Awaiting payment", className: "bg-amber-100 text-amber-800" },
  failed: { label: "Failed", className: "bg-red-100 text-red-700" },
  refunded: { label: "Refunded", className: "bg-neutral-200 text-neutral-700" },
};

const PROVIDER_LABEL: Record<string, string> = {
  stripe: "Card",
  flutterwave: "Mobile money / card",
  simulated: "Demo",
};

export default function MyContributions() {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState<string | null>(null);

  const load = useCallback(() => {
    myContributions()
      .then(setContributions)
      .catch((err) => setError(err?.response?.data?.error ?? "Could not load your contributions"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function checkStatus(id: string) {
    setChecking(id);
    setError(null);
    try {
      await confirmContribution(id);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not check on that payment");
    } finally {
      setChecking(null);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <Eyebrow>Your giving</Eyebrow>
            <h1 className="mt-2 text-3xl font-bold text-black">My contributions</h1>
          </div>
          <Link to="/projects" className="text-sm font-medium text-neutral-600 hover:text-orange-600">
            Browse projects
          </Link>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {loading && <p className="text-sm text-neutral-500">Loading...</p>}
        {!loading && contributions.length === 0 && (
          <p className="text-sm text-neutral-500">You haven't contributed to any projects yet.</p>
        )}

        <ul className="space-y-3">
          {contributions.map((c) => {
            const style = STATUS_STYLE[c.status] ?? STATUS_STYLE.pending;
            return (
              <li key={c.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 sm:p-6">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <Link to={`/projects/${c.project_id}`} className="font-medium text-black hover:text-orange-600">
                      {c.project_title}
                    </Link>
                    <p className="text-xs text-neutral-500 mt-1">
                      Tracking number: <span className="font-mono">{c.uin}</span>
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {PROVIDER_LABEL[c.provider] ?? c.provider}
                      {c.payment_method && c.payment_method !== "simulated" ? ` · ${c.payment_method}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-black">{money(c.amount, c.currency)}</div>
                    <span
                      className={`mt-1 inline-block text-xs uppercase tracking-wide font-semibold px-2.5 py-1 rounded-full ${style.className}`}
                    >
                      {style.label}
                    </span>
                  </div>
                </div>
                {c.status === "pending" && (
                  <button
                    onClick={() => checkStatus(c.id)}
                    disabled={checking === c.id}
                    className="mt-4 rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:border-orange-500 hover:text-orange-600 disabled:opacity-50"
                  >
                    {checking === c.id ? "Checking..." : "Check payment status"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
